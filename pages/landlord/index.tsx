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
  const { dataRefreshVersion } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [overview, setOverview] = useState<LandlordOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        {error ? (
          <AlertBanner
            tone="red"
            title="Overview unavailable"
            description={error}
          />
        ) : null}

        {overview?.highlights.map((item) => (
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
          {(overview?.stats ?? []).map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <SectionCard
            title="Rent Collection (12 months)"
            subtitle="Monthly rent received from live payments"
            actionLabel="Full report →"
            actionHref="/landlord/payments"
          >
            <BarChart data={overview?.collectionSeries ?? []} accent="forest" />
          </SectionCard>

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
      </LandlordPortalShell>
    </>
  );
}
