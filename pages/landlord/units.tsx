import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { landlordNav, landlordUnits, landlordUser } from "../../data/landlord";
import type { BadgeTone, LandlordUnitRow, TableColumn } from "../../types/app";

function statusTone(status: LandlordUnitRow["status"]): BadgeTone {
  if (status === "occupied") {
    return "green";
  }

  if (status === "vacant") {
    return "gray";
  }

  if (status === "maintenance") {
    return "blue";
  }

  if (status === "expiring") {
    return "amber";
  }

  return "red";
}

export default function LandlordUnitsPage() {
  const { openModal } = usePrototypeUI();
  const unitColumns: TableColumn<LandlordUnitRow>[] = [
    {
      key: "unit",
      label: "Unit",
      render: (row) => <span style={{ fontWeight: 600 }}>{row.unit}</span>,
    },
    {
      key: "property",
      label: "Property",
      render: (row) => <span className="td-muted">{row.property}</span>,
    },
    { key: "type", label: "Type" },
    {
      key: "tenant",
      label: "Tenant",
      render: (row) =>
        row.tenant === "—" ? (
          <span className="td-muted">—</span>
        ) : (
          <IdentityCell primary={row.tenant} secondary={row.tenantEmail} />
        ),
    },
    {
      key: "rent",
      label: "Rent/mo",
      render: (row) => <span style={{ fontWeight: 600 }}>{row.rent}</span>,
    },
    {
      key: "leaseEnd",
      label: "Lease End",
      render: (row) => <span className="td-muted">{row.leaseEnd}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" className="btn btn-ghost btn-xs">
            Edit
          </button>
          {row.status === "vacant" ? (
            <button type="button" className="btn btn-secondary btn-xs" onClick={() => openModal("add-tenant")}>
              Assign
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Units" />
      <AppShell
        user={landlordUser}
        topbarTitle="Units"
        breadcrumb="Dashboard → Units"
        navSections={landlordNav}
      >
        <PageHeader
          title="Units"
          description="24 units across all properties"
          actions={[{ label: "+ Add Unit", toastMessage: "Select a property first to add a unit", toastTone: "info", variant: "primary" }]}
        />

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input className="search-input" placeholder="Search units or tenants…" />
          </div>
          <select className="filter-select" defaultValue="All Properties">
            <option>All Properties</option>
            <option>Lekki Gardens</option>
            <option>VI Towers</option>
            <option>Ikoyi Residences</option>
          </select>
          <select className="filter-select" defaultValue="All Status">
            <option>All Status</option>
            <option>Occupied</option>
            <option>Vacant</option>
            <option>Maintenance</option>
          </select>
          <select className="filter-select" defaultValue="All Types">
            <option>All Types</option>
            <option>Studio</option>
            <option>1 Bedroom</option>
            <option>2 Bedroom</option>
            <option>3 Bedroom</option>
          </select>
        </div>

        <div className="card">
          <DataTable columns={unitColumns} rows={landlordUnits} />
          <div className="pagination">
            <span>Showing 9 of 24 units</span>
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
