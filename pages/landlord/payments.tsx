import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  landlordArrears,
  landlordNav,
  landlordPaymentHistory,
  landlordUser,
} from "../../data/landlord";
import type {
  ArrearsRow,
  PaymentHistoryRow,
  TableColumn,
} from "../../types/app";

export default function LandlordPaymentsPage() {
  const { openModal, showToast } = usePrototypeUI();
  const arrearsColumns: TableColumn<ArrearsRow>[] = [
    { key: "tenant", label: "Tenant" },
    { key: "unit", label: "Unit" },
    {
      key: "amount",
      label: "Amount Due",
      render: (row) => (
        <span style={{ color: "var(--red)", fontWeight: 600 }}>{row.amount}</span>
      ),
    },
    {
      key: "overdueDays",
      label: "Days Overdue",
      render: (row) => (
        <StatusBadge tone={row.overdueDays > 14 ? "red" : "amber"}>
          {row.overdueDays} days
        </StatusBadge>
      ),
    },
    { key: "reminder", label: "Last Reminder" },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <button type="button" className="btn btn-danger btn-xs" onClick={() => openModal("send-notice")}>
          Send Reminder
        </button>
      ),
    },
  ];

  const historyColumns: TableColumn<PaymentHistoryRow>[] = [
    {
      key: "reference",
      label: "Ref",
      render: (row) => <span className="td-muted" style={{ fontSize: 11 }}>{row.reference}</span>,
    },
    {
      key: "tenant",
      label: "Tenant",
      render: (row) => <IdentityCell primary={row.tenant} />,
    },
    { key: "amount", label: "Amount" },
    { key: "date", label: "Date" },
    { key: "channel", label: "Method" },
    {
      key: "status",
      label: "Status",
      render: () => <StatusBadge tone="green">Paid</StatusBadge>,
    },
    {
      key: "receipt",
      label: "Receipt",
      render: () => (
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => showToast("Receipt downloaded", "success")}>
          ↓ PDF
        </button>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Payments" />
      <AppShell
        user={landlordUser}
        topbarTitle="Payments"
        breadcrumb="Dashboard → Payments"
        navSections={landlordNav}
      >
        <PageHeader
          title="Payments"
          description="Invoices, history & arrears management"
          actions={[
            { label: "Export CSV", variant: "secondary" },
            { label: "+ Create Invoice", toastMessage: "Invoice created", toastTone: "success", variant: "primary" },
          ]}
        />

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          <div className="stat-card accent-green">
            <div className="stat-label">Collected (Mar)</div>
            <div className="stat-value">₦3.12M</div>
            <div className="stat-sub stat-up">↑ 12% vs Feb</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Outstanding</div>
            <div className="stat-value">₦780K</div>
            <div className="stat-sub stat-down">3 tenants</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Due This Month</div>
            <div className="stat-value">₦560K</div>
            <div className="stat-sub">7 invoices</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">YTD Revenue</div>
            <div className="stat-value">₦8.4M</div>
            <div className="stat-sub">Jan–Mar 2026</div>
          </div>
        </div>

        <div
          style={{
            marginBottom: 16,
            padding: "16px 20px",
            background: "var(--red-light)",
            border: "1px solid rgba(192,57,43,0.2)",
            borderRadius: "var(--radius)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", marginBottom: 12 }}>
            ⚠ Arrears — ₦780,000 outstanding
          </div>
          <DataTable columns={arrearsColumns} rows={landlordArrears} />
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Payment History</div>
            <div className="filters-bar" style={{ margin: 0 }}>
              <select className="filter-select" defaultValue="All Properties">
                <option>All Properties</option>
              </select>
              <select className="filter-select" defaultValue="Last 30 days">
                <option>Last 30 days</option>
                <option>Last 3 months</option>
                <option>This year</option>
              </select>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable columns={historyColumns} rows={landlordPaymentHistory} />
          </div>
          <div className="pagination">
            <span>Showing 6 of 48 payments</span>
            <div className="pagination-pages">
              <div className="page-btn active">1</div>
              <div className="page-btn">2</div>
              <div className="page-btn">3</div>
              <div className="page-btn">→</div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
