import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import BarChart from "../../components/ui/BarChart";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  adminNav,
  adminRecentActivity,
  adminSignups,
  adminStats,
  adminUser,
} from "../../data/admin";
import type { AdminActivityRow, BadgeTone, TableColumn } from "../../types/app";

function planTone(plan: AdminActivityRow["plan"]): BadgeTone {
  if (plan === "Enterprise") {
    return "gold";
  }

  if (plan === "Pro") {
    return "blue";
  }

  return "gray";
}

function statusTone(status: AdminActivityRow["status"]): BadgeTone {
  if (status === "active") {
    return "green";
  }

  if (status === "trial") {
    return "amber";
  }

  return "red";
}

export default function AdminDashboardPage() {
  const activityColumns: TableColumn<AdminActivityRow>[] = [
    {
      key: "landlord",
      label: "Landlord",
      render: (row) => <IdentityCell primary={row.landlord} />,
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) => <StatusBadge tone={planTone(row.plan)}>{row.plan}</StatusBadge>,
    },
    { key: "properties", label: "Properties" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Platform Overview" />
      <AppShell
        user={adminUser}
        topbarTitle="Platform Overview"
        breadcrumb="Dashboard → Platform Overview"
        navSections={adminNav}
      >
        <PageHeader
          title="Platform Overview"
          description="Saturday, March 21, 2026 · All metrics across DoorRent"
          actions={[
            { label: "Download Report", variant: "secondary" },
          ]}
        />

        <div className="stats-grid">
          {adminStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <SectionCard title="Landlord Signups (12 months)" subtitle="New landlords per month">
            <BarChart data={adminSignups} accent="gold" />
          </SectionCard>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Landlord Activity</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable columns={activityColumns} rows={adminRecentActivity} />
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
