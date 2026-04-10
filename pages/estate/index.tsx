import Link from "next/link";
import { useEffect, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { formatEstateCurrency, type EstateDashboardData } from "../../lib/estate-preview";

export default function EstateOverviewPage() {
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;

  const [data, setData] = useState<EstateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    apiRequest<EstateDashboardData>("/estate/dashboard", { token })
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load overview."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const estateName = data?.estate?.name ?? estateAdminSession?.landlord?.companyName ?? "Estate";
  const activeHouses = (data?.residences ?? []).filter((r) => r.status === "ACTIVE").length;
  const activeResidents = (data?.residents ?? []).filter((r) => r.status === "ACTIVE").length;
  const totalRaised = (data?.contributions ?? []).filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0);
  const pendingExpenses = (data?.expenses ?? []).filter((e) => e.status === "PENDING").length;
  const activeCauses = (data?.causes ?? []).filter((c) => c.status === "ACTIVE").length;
  const activeCharges = (data?.charges ?? []).filter((c) => c.status === "ACTIVE").length;

  return (
    <EstatePortalShell topbarTitle="Overview" breadcrumb="Overview">
      <PageMeta title={`Overview — ${estateName}`} />
      <PageHeader
        title={estateName}
        description={data?.estate?.description ?? "Estate administration workspace"}
      />

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
        </div>
      ) : null}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Houses</div>
          <div className="stat-value">{loading ? "—" : activeHouses}</div>
          <div className="stat-sub">{loading ? "" : `${(data?.residences ?? []).length} total`}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Residents</div>
          <div className="stat-value">{loading ? "—" : activeResidents}</div>
          <div className="stat-sub">{loading ? "" : `${(data?.residents ?? []).length} total`}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Charges</div>
          <div className="stat-value">{loading ? "—" : activeCharges}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Raised</div>
          <div className="stat-value">{loading ? "—" : formatEstateCurrency(totalRaised)}</div>
          <div className="stat-sub">{loading ? "" : `${activeCauses} active cause(s)`}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Expenses</div>
          <div className="stat-value">{loading ? "—" : pendingExpenses}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Workers</div>
          <div className="stat-value">{loading ? "—" : (data?.workers ?? []).length}</div>
        </div>
      </div>

      {/* Module quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        <ModuleCard
          href="/estate/houses"
          title="Houses & Residents"
          description="Manage your estate houses and their residents."
          stat={loading ? null : `${activeHouses} active houses · ${activeResidents} residents`}
        />
        <ModuleCard
          href="/estate/dues"
          title="Estate Dues"
          description="Configure charges billed per house or per resident."
          stat={loading ? null : `${activeCharges} charge type(s)`}
        />
        <ModuleCard
          href="/estate/treasury"
          title="Treasury"
          description="Record and approve estate expenses."
          stat={loading ? null : `${(data?.expenses ?? []).length} expense(s) · ${pendingExpenses} pending`}
        />
        <ModuleCard
          href="/estate/contributions"
          title="Contributions"
          description="Create causes and track resident contributions."
          stat={loading ? null : `${activeCauses} active cause(s) · ${formatEstateCurrency(totalRaised)} raised`}
        />
        <ModuleCard
          href="/estate/workforce"
          title="Workers"
          description="Manage estate workers, roles, and schedules."
          stat={loading ? null : `${(data?.workers ?? []).length} worker(s)`}
        />
        <ModuleCard
          href="/estate/passes"
          title="Pass Centre"
          description="Issue and track visitor access passes."
          stat={loading ? null : `${(data?.passes ?? []).length} pass(es) on record`}
        />
        <ModuleCard
          href="/estate/governance"
          title="Governance"
          description="Manage approvals, meetings, and resolutions."
          stat={null}
        />
        <ModuleCard
          href="/estate/landing"
          title="Landing Page Builder"
          description="Choose approved templates, reorder sections, and preview the public estate page."
          stat={null}
        />
        <ModuleCard
          href="/estate/audit"
          title="Audit Log"
          description="View a history of all actions in this workspace."
          stat={null}
        />
        <ModuleCard
          href="/estate/settings"
          title="Settings"
          description="Update profile, branding, and team members."
          stat={null}
        />
      </div>
    </EstatePortalShell>
  );
}

function ModuleCard({
  href,
  title,
  description,
  stat,
}: {
  href: string;
  title: string;
  description: string;
  stat: string | null;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        className="card"
        style={{
          padding: "20px 22px",
          cursor: "pointer",
          transition: "box-shadow 0.15s",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink1)" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.5 }}>{description}</div>
        {stat ? <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)" }}>{stat}</div> : null}
      </div>
    </Link>
  );
}
