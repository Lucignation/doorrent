import { useEffect, useState } from "react";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import BarChart from "../../components/ui/BarChart";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { ChartPoint, StatItem } from "../../types/app";

interface ReportsResponse {
  stats: StatItem[];
  monthlyRevenue: ChartPoint[];
}

export default function AdminReportsPage() {
  const { adminSession } = useAdminPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminSession?.token) return;
    const token = adminSession.token;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: result } = await apiRequest<ReportsResponse>("/admin/reports", { token });
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load reports.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [dataRefreshVersion, adminSession?.token]);

  return (
    <>
      <PageMeta title="DoorRent — Reports & Analytics" />
      <AdminPortalShell topbarTitle="Reports & Analytics" breadcrumb="Dashboard → Reports & Analytics">
        <PageHeader
          title="Reports & Analytics"
          description="Platform-wide performance metrics"
        />

        {error ? (
          <div className="card">
            <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              {(data?.stats ?? []).map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <SectionCard
              title="Monthly Revenue (6 months)"
              subtitle="Total platform payment volume per month"
            >
              <BarChart data={data?.monthlyRevenue ?? []} accent="forest" />
            </SectionCard>

            {loading && !data ? (
              <div className="card">
                <div className="card-body" style={{ color: "var(--ink2)" }}>Loading reports...</div>
              </div>
            ) : null}
          </>
        )}
      </AdminPortalShell>
    </>
  );
}
