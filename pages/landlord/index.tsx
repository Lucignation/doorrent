import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import AlertBanner from "../../components/ui/AlertBanner";
import BarChart from "../../components/ui/BarChart";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  landlordCollection,
  landlordHighlights,
  landlordNav,
  landlordRecentPayments,
  landlordStats,
  landlordUser,
} from "../../data/landlord";
import type { PaymentRecord, TableColumn } from "../../types/app";

export default function LandlordDashboardPage() {
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

  return (
    <>
      <PageMeta title="DoorRent — Landlord Overview" />
      <AppShell
        user={landlordUser}
        topbarTitle="Overview"
        breadcrumb="Dashboard → Overview"
        navSections={landlordNav}
      >
        <PageHeader
          title="Good morning, Babatunde 👋"
          description="Saturday, March 21, 2026 · Here's your portfolio at a glance"
          actions={[
            { label: "Send Notice", modal: "send-notice", variant: "secondary" },
            { label: "Add Property", modal: "add-property", variant: "primary" },
          ]}
        />

        {landlordHighlights.map((item) => (
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
          {landlordStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <SectionCard
            title="Rent Collection (12 months)"
            subtitle="Monthly rent received in ₦M"
            actionLabel="Full report →"
            actionHref="/landlord/payments"
          >
            <BarChart data={landlordCollection} accent="forest" />
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
                  <circle cx="60" cy="60" r="46" fill="none" stroke="var(--border)" strokeWidth="14" />
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="var(--green)"
                    strokeWidth="14"
                    strokeDasharray="248 40"
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="var(--accent2)"
                    strokeWidth="14"
                    strokeDasharray="17 271"
                    strokeDashoffset="-248"
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="var(--border2)"
                    strokeWidth="14"
                    strokeDasharray="23 265"
                    strokeDashoffset="-265"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="donut-center">
                  <div className="donut-pct">87%</div>
                  <div className="donut-sub">Occupied</div>
                </div>
              </div>
              <div className="legend-list">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--green)" }} />
                  Occupied — 21 units
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--accent2)" }} />
                  Expiring soon — 2 units
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--border2)" }} />
                  Vacant — 3 units
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
          <DataTable columns={paymentColumns} rows={landlordRecentPayments} />
        </SectionCard>
      </AppShell>
    </>
  );
}
