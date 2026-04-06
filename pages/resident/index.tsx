import { useEffect, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { formatEstateCurrency } from "../../lib/estate-preview";

interface ResidentDashboardData {
  balance: number;
  charges: Array<{ id: string; title: string; amount: number; frequency: string }>;
  activeCauses: Array<{ id: string; title: string; targetAmount: number; contributedAmount: number; deadline?: string | null }>;
  recentNotifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
}

export default function ResidentDashboardPage() {
  const { residentSession } = useResidentPortalSession();
  const token = residentSession?.token;
  const resident = residentSession?.resident;

  const [data, setData] = useState<ResidentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<ResidentDashboardData>("/resident/dashboard", { token })
      .then(({ data: d }) => setData(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <ResidentPortalShell topbarTitle="My Home" breadcrumb="Overview">
      <PageMeta title="Resident Portal" />
      <PageHeader
        title={`Welcome, ${resident?.fullName ?? ""}!`}
        description={`House ${resident?.houseNumber ?? ""}${resident?.block ? ` · Block ${resident.block}` : ""} · ${resident?.estateName ?? "Estate"}`}
      />

      {/* Access codes */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: 1, marginBottom: 8 }}>ENTRY CODE</div>
            <code style={{ fontSize: 28, fontWeight: 800, letterSpacing: 5, background: "var(--bg)", padding: "12px 20px", borderRadius: 10, display: "inline-block" }}>
              {resident?.accessCode ?? "—"}
            </code>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: 1, marginBottom: 8 }}>EXIT CODE</div>
            <code style={{ fontSize: 28, fontWeight: 800, letterSpacing: 5, background: "var(--bg)", padding: "12px 20px", borderRadius: 10, display: "inline-block" }}>
              {resident?.exitCode ?? "—"}
            </code>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading your dashboard…</p></div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Outstanding Balance</div>
              <div className="stat-value">{formatEstateCurrency(data?.balance ?? 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Charges</div>
              <div className="stat-value">{data?.charges.length ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Open Causes</div>
              <div className="stat-value">{data?.activeCauses.length ?? 0}</div>
            </div>
          </div>

          {/* Active causes summary */}
          {data && data.activeCauses.length > 0 ? (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header"><strong>Active Contribution Causes</strong></div>
              <div style={{ padding: "0 0 4px" }}>
                {data.activeCauses.map((cause) => {
                  const pct = cause.targetAmount > 0 ? Math.min(100, (cause.contributedAmount / cause.targetAmount) * 100) : 0;
                  return (
                    <div key={cause.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <strong style={{ fontSize: 14 }}>{cause.title}</strong>
                        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{formatEstateCurrency(cause.contributedAmount)} / {formatEstateCurrency(cause.targetAmount)}</span>
                      </div>
                      <div style={{ background: "var(--bg)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--green)", borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Recent notifications */}
          {data && data.recentNotifications.length > 0 ? (
            <div className="card">
              <div className="card-header"><strong>Recent Updates</strong></div>
              {data.recentNotifications.map((n) => (
                <div key={n.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{n.body}</div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </ResidentPortalShell>
  );
}
