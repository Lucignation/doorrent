import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import DataTable from "../../components/ui/DataTable";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { adminLandlords, adminNav, adminUser } from "../../data/admin";
import type { AdminLandlordRow, BadgeTone, TableColumn } from "../../types/app";

function planTone(plan: AdminLandlordRow["plan"]): BadgeTone {
  if (plan === "Enterprise") {
    return "gold";
  }

  if (plan === "Pro") {
    return "blue";
  }

  return "gray";
}

function statusTone(status: AdminLandlordRow["status"]): BadgeTone {
  if (status === "active") {
    return "green";
  }

  if (status === "trial") {
    return "amber";
  }

  return "red";
}

export default function AdminLandlordsPage() {
  const { showToast } = usePrototypeUI();
  const landlordColumns: TableColumn<AdminLandlordRow>[] = [
    {
      key: "landlord",
      label: "Landlord",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="tenant-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
            {row.landlord
              .split(" ")
              .map((word) => word[0])
              .join("")}
          </div>
          <span style={{ fontWeight: 500 }}>{row.landlord}</span>
        </div>
      ),
    },
    { key: "email", label: "Email" },
    {
      key: "plan",
      label: "Plan",
      render: (row) => <StatusBadge tone={planTone(row.plan)}>{row.plan}</StatusBadge>,
    },
    { key: "properties", label: "Properties" },
    { key: "tenants", label: "Tenants" },
    { key: "mrr", label: "MRR" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
    },
    { key: "joined", label: "Joined" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" className="btn btn-ghost btn-xs">
            View
          </button>
          {row.status === "suspended" ? (
            <button type="button" className="btn btn-secondary btn-xs" onClick={() => showToast("Account activated", "success")}>
              Activate
            </button>
          ) : (
            <button type="button" className="btn btn-danger btn-xs" onClick={() => showToast("Account suspended", "success")}>
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Landlord Management" />
      <AppShell
        user={adminUser}
        topbarTitle="Landlord Management"
        breadcrumb="Dashboard → Landlord Management"
        navSections={adminNav}
      >
        <PageHeader
          title="Landlord Management"
          description="1,284 landlords on the platform"
          actions={[
            { label: "Export CSV", variant: "secondary" },
            { label: "+ Add Landlord", toastMessage: "Create landlord form", toastTone: "info", variant: "primary" },
          ]}
        />

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input className="search-input" placeholder="Search landlords…" />
          </div>
          <select className="filter-select" defaultValue="All Status">
            <option>All Status</option>
            <option>Active</option>
            <option>Suspended</option>
            <option>Trial</option>
          </select>
          <select className="filter-select" defaultValue="All Plans">
            <option>All Plans</option>
            <option>Starter</option>
            <option>Pro</option>
            <option>Enterprise</option>
          </select>
          <select className="filter-select" defaultValue="All States">
            <option>All States</option>
            <option>Lagos</option>
            <option>Abuja</option>
            <option>Kano</option>
          </select>
        </div>

        <div className="card">
          <DataTable columns={landlordColumns} rows={adminLandlords} />
          <div className="pagination">
            <span>Showing 6 of 1,284 landlords</span>
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
