import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminPortalShell from "../../../components/auth/AdminPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { useAdminPortalSession } from "../../../context/TenantSessionContext";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { apiRequest } from "../../../lib/api";
import type { BadgeTone, TableColumn } from "../../../types/app";

interface RecentPaymentRow {
  id: string;
  reference: string;
  amount: string;
  status: string;
  paidAt: string;
  channel: string;
}

interface PropertySummaryRow {
  id: string;
  name: string;
  location: string;
  units: number;
  occupied: number;
}

interface FoundingBetaSummary {
  enabled: boolean;
  isActive: boolean;
  isEnded: boolean;
  status: "inactive" | "active" | "ended";
  statusLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  billingResumesAt: string | null;
  note: string | null;
  daysRemaining: number | null;
  durationDays: number | null;
}

interface LandlordDetail {
  id: string;
  name: string;
  companyName: string;
  workspaceMode: "SOLO_LANDLORD" | "PROPERTY_MANAGER_COMPANY" | "ESTATE_ADMIN";
  workspaceModeLabel: string;
  workspaceSlug: string | null;
  email: string;
  phone: string | null;
  status: string;
  plan: string;
  planRaw: string;
  subscriptionModel: string;
  commissionRatePercent: number;
  joinedAt: string;
  emailVerifiedAt: string | null;
  propertiesCount: number;
  tenantsCount: number;
  totalUnits: number;
  occupiedUnits: number;
  mrr: string;
  mrrRaw: number;
  foundingBeta?: FoundingBetaSummary | null;
  recentPayments: RecentPaymentRow[];
  properties: PropertySummaryRow[];
}

function statusTone(status: string): BadgeTone {
  if (status === "active") return "green";
  if (status === "trial") return "amber";
  return "red";
}

function planTone(plan: string): BadgeTone {
  if (plan === "Enterprise") return "gold";
  if (plan === "Pro") return "blue";
  return "gray";
}

function paymentTone(status: string): BadgeTone {
  if (status === "paid") return "green";
  if (status === "pending") return "amber";
  return "red";
}

function formatDateTimeInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (num: number) => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function betaTone(beta?: FoundingBetaSummary | null): BadgeTone {
  if (beta?.isActive) return "blue";
  if (beta?.isEnded) return "amber";
  return "gray";
}

export default function AdminLandlordDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { adminSession } = useAdminPortalSession();
  const { showToast } = usePrototypeUI();
  const [detail, setDetail] = useState<LandlordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [betaEndsAt, setBetaEndsAt] = useState("");
  const [betaNotes, setBetaNotes] = useState("");
  const [savingBeta, setSavingBeta] = useState(false);

  useEffect(() => {
    const token = adminSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest<LandlordDetail>(`/admin/landlords/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load landlord.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, adminSession?.token]);

  useEffect(() => {
    setBetaEndsAt(formatDateTimeInput(detail?.foundingBeta?.endsAt));
    setBetaNotes(detail?.foundingBeta?.note ?? "");
  }, [detail?.foundingBeta?.endsAt, detail?.foundingBeta?.note]);

  async function handleSaveFoundingBeta() {
    const token = adminSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    if (!betaEndsAt) {
      showToast("Choose when the founding beta should end.", "error");
      return;
    }

    setSavingBeta(true);
    try {
      const response = await apiRequest<LandlordDetail>(`/admin/landlords/${id}/founding-beta`, {
        token,
        method: "PATCH",
        body: {
          endsAt: new Date(betaEndsAt).toISOString(),
          notes: betaNotes.trim() || undefined,
        },
      });
      setDetail(response.data);
      showToast(
        detail?.foundingBeta?.isActive
          ? "Founding beta updated."
          : "Founding beta activated.",
        "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Could not update founding beta.",
        "error",
      );
    } finally {
      setSavingBeta(false);
    }
  }

  async function handleEndFoundingBetaNow() {
    const token = adminSession?.token;
    if (!token || !id || Array.isArray(id)) return;

    setSavingBeta(true);
    try {
      const response = await apiRequest<LandlordDetail>(`/admin/landlords/${id}/founding-beta`, {
        token,
        method: "PATCH",
        body: { endNow: true },
      });
      setDetail(response.data);
      showToast("Founding beta ended.", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Could not end founding beta.",
        "error",
      );
    } finally {
      setSavingBeta(false);
    }
  }

  const paymentColumns: TableColumn<RecentPaymentRow>[] = [
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink3)" }}>
          {row.reference}
        </span>
      ),
    },
    { key: "amount", label: "Amount" },
    { key: "channel", label: "Channel" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={paymentTone(row.status)}>{row.status}</StatusBadge>,
    },
    { key: "paidAt", label: "Date" },
  ];

  const propertyColumns: TableColumn<PropertySummaryRow>[] = [
    { key: "name", label: "Property" },
    { key: "location", label: "Location" },
    { key: "units", label: "Units" },
    { key: "occupied", label: "Occupied" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => void router.push(`/admin/properties/${row.id}`)}
        >
          View
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminPortalShell topbarTitle="Landlords" breadcrumb="Dashboard → Landlords → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading landlord...</div>
      </AdminPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <AdminPortalShell topbarTitle="Landlords" breadcrumb="Dashboard → Landlords → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Landlord not found."}</div>
      </AdminPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent Admin — ${detail.companyName}`} urlPath={`/admin/landlords/${detail.id}`} />
      <AdminPortalShell topbarTitle="Landlords" breadcrumb="Dashboard → Landlords → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/admin/landlords")}
          >
            ← Back to Landlords
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{detail.companyName}</h1>
            <div style={{ color: "var(--ink2)", fontSize: 14, marginTop: 4 }}>{detail.name} · {detail.email}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={statusTone(detail.status)}>{detail.status}</StatusBadge>
            <StatusBadge tone={planTone(detail.plan)}>{detail.plan}</StatusBadge>
            <button
              type="button"
              className={`btn ${detail.status === "suspended" ? "btn-secondary" : "btn-danger"} btn-sm`}
              onClick={() =>
                showToast(
                  detail.status === "suspended"
                    ? "Landlord activation controls coming soon."
                    : "Landlord suspension controls coming soon.",
                  "info",
                )
              }
            >
              {detail.status === "suspended" ? "Activate Account" : "Suspend Account"}
            </button>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
          <div className="stat-card accent-blue">
            <div className="stat-label">Properties</div>
            <div className="stat-value">{detail.propertiesCount}</div>
            <div className="stat-sub">Active listings</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Tenants</div>
            <div className="stat-value">{detail.tenantsCount}</div>
            <div className="stat-sub">Active tenancies</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Units</div>
            <div className="stat-value">{detail.occupiedUnits}/{detail.totalUnits}</div>
            <div className="stat-sub">Occupied / Total</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">MRR (This Month)</div>
            <div className="stat-value">{detail.mrr}</div>
            <div className="stat-sub">
              {detail.subscriptionModel === "COMMISSION"
                ? `${detail.commissionRatePercent}% commission`
                : "Subscription plan"}
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Account Details</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Workspace Type</div>
                  <div style={{ fontWeight: 500 }}>{detail.workspaceModeLabel}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Phone</div>
                  <div style={{ fontWeight: 500 }}>{detail.phone ?? "—"}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Workspace Slug</div>
                  <div style={{ fontWeight: 500 }}>{detail.workspaceSlug ?? "—"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Joined</div>
                  <div style={{ fontWeight: 500 }}>{detail.joinedAt}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Email Verified</div>
                  <div style={{ fontWeight: 500 }}>{detail.emailVerifiedAt ?? "Not verified"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Billing Model</div>
                  <div style={{ fontWeight: 500 }}>{detail.subscriptionModel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Founding Beta</div>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Status</div>
                  <div style={{ marginTop: 6 }}>
                    <StatusBadge tone={betaTone(detail.foundingBeta)}>
                      {detail.foundingBeta?.statusLabel ?? "No founding beta"}
                    </StatusBadge>
                  </div>
                </div>
                {detail.foundingBeta?.isActive && detail.foundingBeta.daysRemaining !== null ? (
                  <div style={{ textAlign: "right" }}>
                    <div className="td-muted" style={{ fontSize: 12 }}>Days left</div>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>
                      {detail.foundingBeta.daysRemaining}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Started</div>
                  <div style={{ fontWeight: 500 }}>
                    {detail.foundingBeta?.startsAt
                      ? new Date(detail.foundingBeta.startsAt).toLocaleString("en-NG")
                      : "Starts when activated"}
                  </div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Ends</div>
                  <div style={{ fontWeight: 500 }}>
                    {detail.foundingBeta?.endsAt
                      ? new Date(detail.foundingBeta.endsAt).toLocaleString("en-NG")
                      : "Not scheduled"}
                  </div>
                </div>
              </div>

              {detail.foundingBeta?.billingResumesAt ? (
                <div style={{ marginTop: 16 }}>
                  <div className="td-muted" style={{ fontSize: 12 }}>Billing resumes</div>
                  <div style={{ fontWeight: 500 }}>
                    {new Date(detail.foundingBeta.billingResumesAt).toLocaleString("en-NG")}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 16 }}>
                <label className="form-label">End Beta At</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={betaEndsAt}
                  onChange={(event) => setBetaEndsAt(event.target.value)}
                />
                <div className="form-help">
                  The beta clock starts the moment you activate it here and runs until this date.
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="form-label">Admin Note</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={betaNotes}
                  onChange={(event) => setBetaNotes(event.target.value)}
                  placeholder="Optional note about the pilot terms, testimonial agreement, or onboarding context."
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void handleSaveFoundingBeta()}
                  disabled={savingBeta}
                >
                  {savingBeta
                    ? "Saving..."
                    : detail.foundingBeta?.isActive
                      ? "Update Beta Window"
                      : "Activate Founding Beta"}
                </button>
                {detail.foundingBeta?.isActive ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void handleEndFoundingBetaNow()}
                    disabled={savingBeta}
                  >
                    End Beta Now
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Properties</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={propertyColumns}
                rows={detail.properties}
                emptyMessage="No properties."
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Payments</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={paymentColumns}
              rows={detail.recentPayments}
              emptyMessage="No payments recorded."
            />
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
