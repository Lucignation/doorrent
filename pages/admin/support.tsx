import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { adminSupportStats, adminTickets } from "../../data/admin";
import type { AdminTicketRow, BadgeTone, TableColumn } from "../../types/app";

function priorityTone(priority: AdminTicketRow["priority"]): BadgeTone {
  if (priority === "critical") {
    return "red";
  }

  if (priority === "high") {
    return "amber";
  }

  return "gray";
}

function queueTone(status: AdminTicketRow["status"]): BadgeTone {
  if (status === "open") {
    return "red";
  }

  if (status === "in_progress") {
    return "blue";
  }

  return "green";
}

export default function AdminSupportPage() {
  const ticketColumns: TableColumn<AdminTicketRow>[] = [
    {
      key: "ticket",
      label: "Ticket",
      render: (row) => <span style={{ fontSize: 11, color: "var(--ink3)" }}>{row.ticket}</span>,
    },
    { key: "requester", label: "Submitter" },
    {
      key: "subject",
      label: "Subject",
      render: (row) => <span style={{ fontSize: 13, maxWidth: 260, display: "block" }}>{row.subject}</span>,
    },
    {
      key: "priority",
      label: "Priority",
      render: (row) => <StatusBadge tone={priorityTone(row.priority)}>{row.priority}</StatusBadge>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={queueTone(row.status)}>{row.status}</StatusBadge>,
    },
    { key: "owner", label: "Assigned" },
    { key: "opened", label: "Created" },
    {
      key: "actions",
      label: "Action",
      render: () => (
        <button type="button" className="btn btn-ghost btn-xs">
          Open
        </button>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Support Center" />
      <AdminPortalShell
        topbarTitle="Support Center"
        breadcrumb="Dashboard → Support Center"
      >
        <PageHeader
          title="Support Center"
          description="47 open tickets · 5 critical"
        />

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {adminSupportStats.map((stat) => (
            <div key={stat.label} className={`stat-card accent-${stat.accent}`}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <DataTable columns={ticketColumns} rows={adminTickets} />
        </div>
      </AdminPortalShell>
    </>
  );
}
