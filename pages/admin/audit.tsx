import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { adminAuditLogs, adminNav, adminUser } from "../../data/admin";
import type { AdminAuditRow, BadgeTone, TableColumn } from "../../types/app";

function roleTone(role: AdminAuditRow["role"]): BadgeTone {
  if (role === "super_admin") {
    return "red";
  }

  if (role === "landlord") {
    return "blue";
  }

  return "gray";
}

export default function AdminAuditPage() {
  const auditColumns: TableColumn<AdminAuditRow>[] = [
    {
      key: "timestamp",
      label: "Timestamp",
      render: (row) => (
        <span style={{ fontSize: 11, color: "var(--ink3)", whiteSpace: "nowrap" }}>
          {row.timestamp}
        </span>
      ),
    },
    {
      key: "actor",
      label: "Actor",
      render: (row) => <IdentityCell primary={row.actor} />,
    },
    {
      key: "role",
      label: "Role",
      render: (row) => <StatusBadge tone={roleTone(row.role)}>{row.role}</StatusBadge>,
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <code style={{ fontSize: 11, background: "var(--bg)", padding: "2px 6px", borderRadius: 3 }}>
          {row.action}
        </code>
      ),
    },
    {
      key: "entity",
      label: "Entity",
      render: (row) => <span className="td-muted">{row.entity}</span>,
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (row) => (
        <span style={{ fontSize: 11, color: "var(--ink3)", fontFamily: "monospace" }}>
          {row.ipAddress}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Audit Logs" />
      <AppShell
        user={adminUser}
        topbarTitle="Audit Logs"
        breadcrumb="Dashboard → Audit Logs"
        navSections={adminNav}
      >
        <PageHeader
          title="Audit Logs"
          description="Full platform activity trail"
          actions={[{ label: "Export CSV", variant: "secondary" }]}
        />

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input className="search-input" placeholder="Search actions…" />
          </div>
          <select className="filter-select" defaultValue="All Actions">
            <option>All Actions</option>
            <option>Login</option>
            <option>Create</option>
            <option>Update</option>
            <option>Delete</option>
            <option>Suspend</option>
          </select>
          <select className="filter-select" defaultValue="All Roles">
            <option>All Roles</option>
            <option>Super Admin</option>
            <option>Landlord</option>
            <option>Tenant</option>
          </select>
          <select className="filter-select" defaultValue="Last 24h">
            <option>Last 24h</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>

        <div className="card">
          <DataTable columns={auditColumns} rows={adminAuditLogs} />
          <div className="pagination">
            <span>Showing 6 of 24,180 events</span>
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
