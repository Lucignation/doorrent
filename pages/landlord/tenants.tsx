import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { landlordNav, landlordTenants, landlordUser } from "../../data/landlord";
import type { BadgeTone, TableColumn, TenantLedgerRow } from "../../types/app";

function statusTone(status: TenantLedgerRow["status"]): BadgeTone {
  if (status === "current") {
    return "green";
  }

  if (status === "expiring") {
    return "amber";
  }

  return "red";
}

export default function LandlordTenantsPage() {
  const { openModal } = usePrototypeUI();
  const tenantColumns: TableColumn<TenantLedgerRow>[] = [
    {
      key: "tenant",
      label: "Tenant",
      render: (row) => <IdentityCell primary={row.tenant} secondary={row.email} />,
    },
    { key: "unit", label: "Unit" },
    { key: "rent", label: "Rent/mo" },
    { key: "leaseEnd", label: "Lease End" },
    {
      key: "balance",
      label: "Balance",
      render: (row) =>
        row.balance === "—" ? (
          <StatusBadge tone="green">None</StatusBadge>
        ) : (
          <span style={{ color: "var(--red)", fontWeight: 600 }}>{row.balance}</span>
        ),
    },
    {
      key: "status",
      label: "Payment Status",
      render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" className="btn btn-ghost btn-xs">
            View
          </button>
          {row.status === "overdue" ? (
            <button type="button" className="btn btn-danger btn-xs" onClick={() => openModal("send-notice")}>
              Remind
            </button>
          ) : null}
          {row.status === "expiring" ? (
            <button type="button" className="btn btn-secondary btn-xs" onClick={() => openModal("send-notice")}>
              Renew
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Tenants" />
      <AppShell
        user={landlordUser}
        topbarTitle="Tenants"
        breadcrumb="Dashboard → Tenants"
        navSections={landlordNav}
      >
        <PageHeader
          title="Tenants"
          description="21 active tenants across 4 properties"
          actions={[
            { label: "Send Bulk Notice", modal: "send-notice", variant: "secondary" },
            { label: "+ Add Tenant", modal: "add-tenant", variant: "primary" },
          ]}
        />

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input className="search-input" placeholder="Search tenants…" />
          </div>
          <select className="filter-select" defaultValue="All Properties">
            <option>All Properties</option>
            <option>Lekki Gardens</option>
            <option>VI Towers</option>
          </select>
          <select className="filter-select" defaultValue="All Status">
            <option>All Status</option>
            <option>Current</option>
            <option>Overdue</option>
            <option>Expiring</option>
          </select>
        </div>

        <div className="card">
          <DataTable columns={tenantColumns} rows={landlordTenants} />
          <div className="pagination">
            <span>Showing 7 of 21 tenants</span>
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
