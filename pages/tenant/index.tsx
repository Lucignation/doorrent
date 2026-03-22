import Link from "next/link";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import AlertBanner from "../../components/ui/AlertBanner";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  tenantAgreementAlert,
  tenantPaymentHistory,
  tenantQuickActions,
  tenantStats,
} from "../../data/tenant";
import type { TableColumn, TenantPaymentHistoryRow } from "../../types/app";

export default function TenantDashboardPage() {
  const paymentColumns: TableColumn<TenantPaymentHistoryRow>[] = [
    { key: "period", label: "Period" },
    { key: "amount", label: "Amount" },
    { key: "date", label: "Date" },
    {
      key: "status",
      label: "Status",
      render: () => <StatusBadge tone="green">Paid</StatusBadge>,
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Tenant Dashboard" />
      <TenantPortalShell topbarTitle="My Dashboard" breadcrumb="Dashboard → My Dashboard">
        <PageHeader
          title="Good morning, Amaka 👋"
          description="Unit A3 · Lekki Gardens Estate · Lekki Phase 1, Lagos"
        />

        <AlertBanner
          tone={tenantAgreementAlert.tone}
          title={tenantAgreementAlert.title}
          description={tenantAgreementAlert.body}
          actionLabel={tenantAgreementAlert.cta.label}
          actionHref={tenantAgreementAlert.cta.href}
        />

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {tenantStats.map((stat) => (
            <div key={stat.label} className={`stat-card accent-${stat.accent}`}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-sub">{stat.subtext}</div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Quick Actions</div>
            </div>
            <div className="card-body">
              {tenantQuickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
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
                    <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                      {action.description}
                    </div>
                  </div>
                  <span style={{ color: "var(--ink3)" }}>→</span>
                </Link>
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
              <DataTable columns={paymentColumns} rows={tenantPaymentHistory} />
            </div>
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
