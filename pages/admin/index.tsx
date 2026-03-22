import { useEffect, useState } from "react";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import BarChart from "../../components/ui/BarChart";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { AdminActivityRow, BadgeTone, ChartPoint, StatItem, TableColumn } from "../../types/app";

interface AdminOverviewResponse {
  hero: {
    title: string;
    description: string;
  };
  stats: StatItem[];
  signups: ChartPoint[];
  recentActivity: Array<AdminActivityRow & { id: string; companyName: string; joined: string }>;
}

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
  const { adminSession } = useAdminPortalSession();
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  type RecentActivityRow = AdminActivityRow & { id: string; companyName: string };

  useEffect(() => {
    if (!adminSession?.token) {
      return;
    }

    const adminToken = adminSession.token;
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<AdminOverviewResponse>("/admin/overview", {
          token: adminToken,
        });

        if (!cancelled) {
          setOverview(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load the platform overview.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [adminSession?.token]);

  const activityColumns: TableColumn<RecentActivityRow>[] = [
    {
      key: "landlord",
      label: "Landlord",
      render: (row) => <IdentityCell primary={row.landlord} secondary={row.companyName} />,
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
      <AdminPortalShell
        topbarTitle="Platform Overview"
        breadcrumb="Dashboard → Platform Overview"
      >
        <PageHeader
          title={overview?.hero.title ?? "Loading platform overview..."}
          description={
            overview?.hero.description ??
            (loading ? "Fetching live platform metrics..." : error || "No overview data.")
          }
          actions={[{ label: "Download Report", variant: "secondary" }]}
        />

        <div className="stats-grid">
          {(overview?.stats ?? []).map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <SectionCard title="Landlord Signups (12 months)" subtitle="New landlords per month">
            <BarChart data={overview?.signups ?? []} accent="gold" />
          </SectionCard>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Landlord Activity</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={activityColumns}
                rows={overview?.recentActivity ?? []}
                emptyMessage={loading ? "Loading activity..." : "No landlord activity yet."}
              />
            </div>
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
