import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import AlertBanner from "../../components/ui/AlertBanner";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { buildTenantQuickActions } from "../../data/tenant";
import { resolveLandlordCapabilities } from "../../lib/landlord-access";
import { apiRequest } from "../../lib/api";
import type { HighlightTone, TableColumn } from "../../types/app";

interface RentHistoryRow {
  id: string;
  amount: string;
  date: string;
  status: string;
  periodLabel: string;
}

interface TenantDashboardResponse {
  tenant: {
    id: string;
    name: string;
    email: string;
  };
  property: {
    id: string;
    name: string;
    unitNumber: string;
    unitType: string;
  };
  rent: {
    billingSchedule: string;
    currentDue: number;
    currentDueFormatted: string;
    totalPaidThisLeaseFormatted: string;
    leaseTotalFormatted: string;
    leaseEndLabel: string;
    paymentStatus: "paid" | "part_paid" | "unpaid";
  };
  agreement: {
    id: string;
    title: string;
    status: string;
    sentAt: string;
  } | null;
  gracePeriod: {
    defaultId: string;
    workflowStatus:
      | "AWAITING_TENANT_SIGNATURE"
      | "AWAITING_LANDLORD_APPROVAL"
      | "GRANTED";
    workflowLabel: string;
    outstandingAmount: number;
    agreedAmount: number;
    currency?: string;
    newDeadline: string;
    newDeadlineLabel: string;
    tenantSignedAt?: string | null;
    landlordApprovedAt?: string | null;
  } | null;
  paymentHistory: RentHistoryRow[];
}

interface DashboardPaymentRow {
  period: string;
  amount: string;
  date: string;
  status: string;
}

export default function TenantDashboardPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [dashboardData, setDashboardData] = useState<TenantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tenantCapabilities = resolveLandlordCapabilities({
    capabilities: tenantSession?.tenant.capabilities,
    subscriptionModel: tenantSession?.tenant.subscriptionModel,
    plan: tenantSession?.tenant.planKey ?? tenantSession?.tenant.plan,
  });
  const quickActions = useMemo(
    () => buildTenantQuickActions(tenantSession?.tenant.capabilities),
    [tenantSession?.tenant.capabilities],
  );

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantDashboardResponse>("/tenant/rent", {
          token: tenantToken,
        });

        if (!cancelled) {
          setDashboardData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your tenant dashboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, tenantSession?.token]);

  const paymentColumns: TableColumn<DashboardPaymentRow>[] = [
    { key: "period", label: "Period" },
    { key: "amount", label: "Amount" },
    { key: "date", label: "Date" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={row.status === "paid" ? "green" : "amber"}>
          {row.status === "paid" ? "Paid" : row.status}
        </StatusBadge>
      ),
    },
  ];

  const paymentRows: DashboardPaymentRow[] = (dashboardData?.paymentHistory ?? [])
    .slice(0, 5)
    .map((payment) => ({
      period: payment.periodLabel,
      amount: payment.amount,
      date: payment.date,
      status: payment.status,
    }));

  const alertConfig = useMemo(() => {
    if (!dashboardData) {
      return null as
        | {
            tone: HighlightTone;
            title: string;
            description: string;
            actionLabel: string;
            actionHref: string;
          }
        | null;
    }

    if (dashboardData.gracePeriod) {
      return {
        tone: (
          dashboardData.gracePeriod.workflowStatus === "GRANTED"
            ? "green"
            : dashboardData.gracePeriod.workflowStatus === "AWAITING_LANDLORD_APPROVAL"
              ? "blue"
              : "amber"
        ) as HighlightTone,
        title:
          dashboardData.gracePeriod.workflowStatus === "AWAITING_TENANT_SIGNATURE"
            ? "Your landlord offered a grace arrangement"
            : dashboardData.gracePeriod.workflowStatus === "AWAITING_LANDLORD_APPROVAL"
              ? "Your signed grace agreement is pending approval"
              : "Your grace period has been granted",
        description:
          dashboardData.gracePeriod.workflowStatus === "AWAITING_TENANT_SIGNATURE"
            ? `Review and sign the grace agreement before ${dashboardData.gracePeriod.newDeadlineLabel}.`
            : dashboardData.gracePeriod.workflowStatus === "AWAITING_LANDLORD_APPROVAL"
              ? "The landlord has received your signed grace agreement and will review it next."
              : `Your landlord approved the grace arrangement through ${dashboardData.gracePeriod.newDeadlineLabel}.`,
        actionLabel:
          dashboardData.gracePeriod.workflowStatus === "AWAITING_TENANT_SIGNATURE"
            ? "Review and sign"
            : "View grace agreement",
        actionHref: "/tenant/grace-period",
      };
    }

    if (dashboardData.agreement && dashboardData.agreement.status !== "signed") {
      return {
        tone: "amber" as HighlightTone,
        title: "Your tenancy agreement is awaiting signature",
        description: `${dashboardData.agreement.title} was last shared ${dashboardData.agreement.sentAt}.`,
        actionLabel: "Review agreement",
        actionHref: "/tenant/agreement",
      };
    }

    if (dashboardData.rent.currentDue > 0) {
      return {
        tone: "red" as HighlightTone,
        title: "You have an outstanding rent balance",
        description: `${dashboardData.rent.currentDueFormatted} is currently due on this lease.`,
        actionLabel: "Pay rent now",
        actionHref: tenantCapabilities.canAcceptOnlinePayments
          ? "/tenant/pay"
          : "/tenant/rent",
      };
    }

    return {
      tone: "green" as HighlightTone,
      title: "Your lease is up to date",
      description: `You have paid ${dashboardData.rent.totalPaidThisLeaseFormatted} on this lease so far.`,
      actionLabel: "View receipts",
      actionHref: "/tenant/receipts",
    };
  }, [dashboardData, tenantCapabilities.canAcceptOnlinePayments]);

  const firstName =
    tenantSession?.tenant.firstName ??
    dashboardData?.tenant.name.split(" ")[0] ??
    "there";
  const description = dashboardData
    ? `Unit ${dashboardData.property.unitNumber} · ${dashboardData.property.name} · ${dashboardData.rent.billingSchedule}`
    : loading
      ? "Loading your live tenancy overview..."
      : error || "Your tenant dashboard is unavailable.";

  return (
    <>
      <PageMeta title="DoorRent — Tenant Dashboard" />
      <TenantPortalShell topbarTitle="My Dashboard" breadcrumb="Dashboard → My Dashboard">
        <PageHeader title={`Welcome back, ${firstName}`} description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        {alertConfig ? (
          <AlertBanner
            tone={alertConfig.tone}
            title={alertConfig.title}
            description={alertConfig.description}
            actionLabel={alertConfig.actionLabel}
            actionHref={alertConfig.actionHref}
          />
        ) : null}

        {tenantCapabilities.canManageEmergency ? (
          <Link
            href="/tenant/emergency"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--red-light, #fff1f1)",
              border: "1.5px solid var(--red)",
              borderRadius: "var(--radius)",
              padding: "14px 20px",
              marginBottom: 24,
              textDecoration: "none",
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 0 3px rgba(220,38,38,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              🆘
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{ fontSize: 14, fontWeight: 700, color: "var(--red)", marginBottom: 2 }}
              >
                Emergency
              </div>
              <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.4 }}>
                Report an urgent safety issue, building emergency, or call for immediate help.
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--red)",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Get help →
            </div>
          </Link>
        ) : null}

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="stat-card accent-gold">
            <div className="stat-label">Billing Cycle</div>
            <div className="stat-value">{dashboardData?.rent.billingSchedule ?? "—"}</div>
            <div className="stat-sub">Live rent terms from your landlord</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Current Due</div>
            <div className="stat-value">{dashboardData?.rent.currentDueFormatted ?? "—"}</div>
            <div className="stat-sub">
              {dashboardData?.rent.paymentStatus === "paid"
                ? "No outstanding balance"
                : "Amount currently outstanding"}
            </div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Lease Ends</div>
            <div className="stat-value">{dashboardData?.rent.leaseEndLabel ?? "—"}</div>
            <div className="stat-sub">
              Lease total: {dashboardData?.rent.leaseTotalFormatted ?? "—"}
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Quick Actions</div>
            </div>
            <div className="card-body">
              {quickActions.map((action) => (
                (() => {
                  const isGraceAction =
                    tenantCapabilities.canManageRiskWorkflows &&
                    action.label === "Sign Agreement" &&
                    dashboardData?.gracePeriod;
                  const actionHref = isGraceAction ? "/tenant/grace-period" : action.href;
                  const actionDescription =
                    action.label === "Pay Rent Now" && dashboardData
                      ? `Outstanding: ${dashboardData.rent.currentDueFormatted}`
                      : action.label === "Download Receipt" && dashboardData?.paymentHistory[0]
                        ? `Last receipt: ${dashboardData.paymentHistory[0].date}`
                        : isGraceAction
                          ? dashboardData.gracePeriod?.workflowStatus === "AWAITING_TENANT_SIGNATURE"
                            ? `Grace deadline ${dashboardData.gracePeriod.newDeadlineLabel}`
                            : dashboardData.gracePeriod?.workflowStatus === "AWAITING_LANDLORD_APPROVAL"
                              ? "Signed and waiting for approval"
                              : `Approved until ${dashboardData.gracePeriod?.newDeadlineLabel ?? "—"}`
                          : action.label === "Sign Agreement" &&
                              dashboardData?.agreement &&
                              dashboardData.agreement.status !== "signed"
                            ? `Last shared ${dashboardData.agreement.sentAt}`
                            : action.description;

                  return (
                <Link
                  key={action.label}
                  href={actionHref}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {action.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{action.label}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)" }}>{actionDescription}</div>
                  </div>
                  <span style={{ color: "var(--ink3)" }}>→</span>
                </Link>
                  );
                })()
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Payment History</div>
              <Link href="/tenant/receipts" className="btn btn-ghost btn-xs">
                View all
              </Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={paymentColumns}
                rows={paymentRows}
                emptyMessage={loading ? "Loading payments..." : "No rent payments yet."}
              />
            </div>
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
