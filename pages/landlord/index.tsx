import { useEffect, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import AlertBanner from "../../components/ui/AlertBanner";
import BarChart from "../../components/ui/BarChart";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import {
  canAccessLandlordPath,
  resolveLandlordCapabilities,
} from "../../lib/landlord-access";
import type {
  HighlightBanner,
  PaymentRecord,
  StatItem,
  TableColumn,
} from "../../types/app";

interface CollectionPoint {
  label: string;
  value: number;
  display: string;
}

interface OccupancyBreakdown {
  occupied: number;
  expiring: number;
  vacant: number;
  maintenance: number;
  total: number;
  percent: number;
}

interface LandlordOverviewResponse {
  landlord: {
    id: string;
    name: string;
    companyName: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  hero: {
    title: string;
    description: string;
  };
  highlights: HighlightBanner[];
  stats: StatItem[];
  collectionSeries: CollectionPoint[];
  occupancyBreakdown: OccupancyBreakdown;
  recentPayments: Array<
    PaymentRecord & {
      id: string;
      status: "paid" | "overdue";
    }
  >;
}

const circleRadius = 46;
const circleCircumference = 2 * Math.PI * circleRadius;

export default function LandlordDashboardPage() {
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [overview, setOverview] = useState<LandlordOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);

  async function handleResendVerification() {
    if (!landlordSession?.token || resendingVerification) return;
    setResendingVerification(true);
    try {
      await apiRequest("/landlord/verify/resend", {
        method: "POST",
        token: landlordSession.token,
      });
      showToast("Verification email sent. Check your inbox.", "success");
    } catch {
      showToast("Could not send verification email. Try again later.", "error");
    } finally {
      setResendingVerification(false);
    }
  }

  useEffect(() => {
    if (!landlordSession?.token) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordOverviewResponse>(
          "/landlord/overview",
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setOverview(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your landlord overview.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token]);

  const paymentColumns: TableColumn<PaymentRecord>[] = [
    {
      key: "tenant",
      label: "Tenant",
      render: (row) => <IdentityCell primary={row.tenant} />,
    },
    { key: "unit", label: "Property / Unit" },
    { key: "amount", label: "Amount" },
    { key: "date", label: "Date" },
    { key: "method", label: "Method" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={row.status === "paid" ? "green" : "red"}>
          {row.status === "paid" ? "Paid" : "Overdue"}
        </StatusBadge>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button type="button" className="btn btn-ghost btn-xs">
          {row.status === "paid" ? "Receipt" : "Remind"}
        </button>
      ),
    },
  ];

  const occupiedPercent = overview?.occupancyBreakdown.percent ?? 0;
  const occupiedDash = (occupiedPercent / 100) * circleCircumference;
  const landlordCapabilities = resolveLandlordCapabilities({
    capabilities: landlordSession?.landlord.capabilities,
    subscriptionModel: landlordSession?.landlord.subscriptionModel,
    plan: landlordSession?.landlord.planKey ?? landlordSession?.landlord.plan,
  });
  const visibleHighlights = (overview?.highlights ?? []).filter((item) =>
    canAccessLandlordPath(item.cta.href, landlordCapabilities),
  );
  const visibleStats = (overview?.stats ?? []).filter((item) =>
    canAccessLandlordPath(item.href, landlordCapabilities),
  );

  return (
    <>
      <PageMeta title="DoorRent — Landlord Overview" />
      <LandlordPortalShell
        topbarTitle="Overview"
        breadcrumb="Dashboard → Overview"
      >
        <PageHeader
          title={overview?.hero.title ?? "Loading overview..."}
          description={
            overview?.hero.description ??
            "Fetching your live portfolio summary from DoorRent."
          }
          actions={[
            { label: "Send Notice", modal: "send-notice", variant: "secondary" },
            { label: "Add Property", modal: "add-property", variant: "primary" },
          ]}
        />

        {overview && (!overview.landlord.emailVerified || !overview.landlord.phoneVerified) ? (
          <AlertBanner
            tone="amber"
            title="Complete your account verification"
            description={
              !overview.landlord.emailVerified && !overview.landlord.phoneVerified
                ? "Your email address and phone number have not been verified. Check your inbox for the verification link and use the 6-digit OTP from the registration page to complete setup."
                : !overview.landlord.emailVerified
                  ? "Your email address has not been verified. Check your inbox for a verification link."
                  : "Your phone number has not been verified. Return to the registration page and enter the 6-digit OTP to complete verification."
            }
            actionLabel={resendingVerification ? "Sending..." : "Resend verification email"}
            onAction={handleResendVerification}
          />
        ) : null}

        {error ? (
          <AlertBanner
            tone="red"
            title="Overview unavailable"
            description={error}
          />
        ) : null}

        {visibleHighlights.map((item) => (
          <AlertBanner
            key={item.title}
            tone={item.tone}
            title={item.title}
            description={item.body}
            actionLabel={item.cta.label}
            actionHref={item.cta.href}
          />
        ))}

        <div className="stats-grid">
          {visibleStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {landlordCapabilities.canManagePayments ? (
            <SectionCard
              title="Rent Collection (12 months)"
              subtitle="Monthly rent received from live payments"
              actionLabel="Full report →"
              actionHref="/landlord/payments"
            >
              <BarChart data={overview?.collectionSeries ?? []} accent="forest" />
            </SectionCard>
          ) : null}

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Unit Occupancy</div>
                <div className="card-subtitle">Across all properties</div>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div className="donut-wrap">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={circleRadius}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="14"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={circleRadius}
                    fill="none"
                    stroke="var(--green)"
                    strokeWidth="14"
                    strokeDasharray={`${occupiedDash} ${circleCircumference}`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="donut-center">
                  <div className="donut-pct">{occupiedPercent}%</div>
                  <div className="donut-sub">Occupied</div>
                </div>
              </div>
              <div className="legend-list">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--green)" }} />
                  Occupied — {overview?.occupancyBreakdown.occupied ?? 0} units
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--accent2)" }} />
                  Expiring soon — {overview?.occupancyBreakdown.expiring ?? 0} units
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--border2)" }} />
                  Vacant — {overview?.occupancyBreakdown.vacant ?? 0} units
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--blue)" }} />
                  Maintenance — {overview?.occupancyBreakdown.maintenance ?? 0} units
                </div>
              </div>
            </div>
          </div>
        </div>

        {landlordCapabilities.canManagePayments ? (
          <SectionCard
            title="Recent Payments"
            actionLabel="View all"
            actionHref="/landlord/payments"
          >
            <DataTable
              columns={paymentColumns}
              rows={overview?.recentPayments ?? []}
              emptyMessage={loading ? "Loading payments..." : "No payments yet."}
            />
          </SectionCard>
        ) : null}
      </LandlordPortalShell>
    </>
  );
}
