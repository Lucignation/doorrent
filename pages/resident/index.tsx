import { useEffect, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { formatEstateCurrency } from "../../lib/estate-preview";

interface ResidentGateAccess {
  mode: "SHORT_LIVED_QR";
  token: string;
  expiresAt: string;
  gateUrl: string;
  instructions: string;
}

interface ResidentDashboardData {
  balance: number;
  charges: Array<{ id: string; title: string; amount: number; frequency: string }>;
  activeCauses: Array<{ id: string; title: string; targetAmount: number; contributedAmount: number; deadline?: string | null }>;
  recentNotifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
  gateAccess?: ResidentGateAccess;
  officeAccess?: {
    offices: Array<{
      id: string;
      position: string;
      tenureStartDate: string;
      tenureEndDate: string;
    }>;
    permissions: string[];
  };
}

function buildGateQrUrl(gateUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    gateUrl,
  )}`;
}

export default function ResidentDashboardPage() {
  const { residentSession } = useResidentPortalSession();
  const token = residentSession?.token;
  const resident = residentSession?.resident;

  const [data, setData] = useState<ResidentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateAccess, setGateAccess] = useState<ResidentGateAccess | null>(null);
  const [refreshingGateAccess, setRefreshingGateAccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<ResidentDashboardData>("/resident/dashboard", { token })
      .then(({ data: d }) => {
        setData(d);
        setGateAccess(d.gateAccess ?? null);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [token]);

  async function refreshGateAccess() {
    if (!token) {
      return;
    }

    setRefreshingGateAccess(true);

    try {
      const response = await apiRequest<ResidentGateAccess>("/resident/gate-access", {
        token,
      });
      setGateAccess(response.data);
    } catch {
      // Keep the last valid gate proof on screen if refresh fails.
    } finally {
      setRefreshingGateAccess(false);
    }
  }

  return (
    <ResidentPortalShell topbarTitle="My Home" breadcrumb="Overview">
      <PageMeta title="Resident Portal" />
      <PageHeader
        title={`Welcome, ${resident?.fullName ?? ""}!`}
        description={`House ${resident?.houseNumber ?? ""}${resident?.block ? ` · Block ${resident.block}` : ""} · ${resident?.estateName ?? "Estate"}`}
      />

      {/* Live gate access */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><strong>Live Gate Access</strong></div>
        <div
          className="card-body"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 240px) 1fr",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 10,
              justifyItems: "center",
              padding: 16,
              borderRadius: 18,
              background: "var(--bg)",
            }}
          >
            {gateAccess ? (
              <img
                src={buildGateQrUrl(gateAccess.gateUrl)}
                alt="Live gate access QR"
                width={220}
                height={220}
                style={{ width: "100%", maxWidth: 220, borderRadius: 16 }}
              />
            ) : (
              <div
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 16,
                  background: "var(--surface)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--ink3)",
                  textAlign: "center",
                  padding: 20,
                }}
              >
                Live gate QR unavailable right now.
              </div>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void refreshGateAccess()}
              disabled={refreshingGateAccess}
            >
              {refreshingGateAccess ? "Refreshing..." : "Refresh Live QR"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.7 }}>
              {gateAccess?.instructions ??
                "Use the resident gate QR for entry and exit. Static resident codes are no longer accepted at the estate gate."}
            </div>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(177, 133, 48, 0.12)",
                color: "var(--amber)",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Shared resident or house codes can be abused. This live QR expires quickly and is now the
              gate-valid proof for resident access.
            </div>
            <div style={{ fontSize: 12, color: "var(--ink3)" }}>
              Expires:{" "}
              <strong>
                {gateAccess?.expiresAt
                  ? new Date(gateAccess.expiresAt).toLocaleString("en-NG")
                  : "—"}
              </strong>
            </div>
            {gateAccess?.token ? (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink3)",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  FALLBACK TOKEN
                </div>
                <code
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--bg)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    overflowWrap: "anywhere",
                  }}
                >
                  {gateAccess.token}
                </code>
              </div>
            ) : null}
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
            <div className="stat-card">
              <div className="stat-label">Estate Offices</div>
              <div className="stat-value">{data?.officeAccess?.offices.length ?? 0}</div>
            </div>
          </div>

          {data?.officeAccess?.offices.length ? (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header"><strong>Current Estate Office Access</strong></div>
              <div className="card-body" style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {data.officeAccess.offices.map((office) => (
                    <StatusBadge key={office.id} tone="green">
                      {office.position}
                    </StatusBadge>
                  ))}
                </div>
                <div className="td-muted" style={{ fontSize: 13 }}>
                  {data.officeAccess.permissions.length > 0
                    ? `Workspace access enabled: ${data.officeAccess.permissions.join(", ")}`
                    : "Your estate office access is active."}
                </div>
                {data.officeAccess.permissions.length > 0 ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {data.officeAccess.permissions.includes("finance_overview") ? (
                      <a className="btn btn-secondary btn-sm" href="/resident/office/finance">
                        {data.officeAccess.permissions.includes("finance_management")
                          ? "Finance Office"
                          : "Finance Overview"}
                      </a>
                    ) : null}
                    {data.officeAccess.permissions.includes("gate_coordination") ? (
                      <a className="btn btn-secondary btn-sm" href="/resident/office/gate">
                        Gate Console
                      </a>
                    ) : null}
                    {data.officeAccess.permissions.includes("meetings_overview") ? (
                      <a className="btn btn-secondary btn-sm" href="/resident/office/meetings">
                        {data.officeAccess.permissions.includes("meetings_management")
                          ? "Meetings Office"
                          : "Meetings Overview"}
                      </a>
                    ) : null}
                    {data.officeAccess.permissions.includes("treasury_overview") ? (
                      <a className="btn btn-secondary btn-sm" href="/resident/office/treasury">
                        Treasury Overview
                      </a>
                    ) : null}
                    {data.officeAccess.permissions.includes("governance_management") ? (
                      <a className="btn btn-secondary btn-sm" href="/resident/office/exco">
                        ExCo & Elections
                      </a>
                    ) : null}
                    {data.officeAccess.permissions.includes("governance_overview") ? (
                      <a className="btn btn-secondary btn-sm" href="/resident/office/governance">
                        Governance Overview
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

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
