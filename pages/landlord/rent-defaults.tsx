import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone } from "../../types/app";

interface DefaultRow {
  id: string;
  status: "GRACE_PERIOD" | "DEFAULTED" | "LEGAL_ESCALATION" | "RESOLVED";
  outstandingAmount: number;
  currency: string;
  createdAt: string;
  resolvedAt: string | null;
  tenant: { name: string; email: string };
  property: { name: string; address: string };
  unit: string | null;
  deadline: string | null;
  bothAcknowledged: boolean;
  noticeCount: number;
  workflowStatus:
    | "AWAITING_TENANT_SIGNATURE"
    | "AWAITING_LANDLORD_APPROVAL"
    | "GRANTED"
    | null;
  workflowLabel: string | null;
  tenantSigned: boolean;
  landlordApproved: boolean;
}

interface RentDefaultsResponse {
  summary: {
    total: number;
    gracePeriod: number;
    defaulted: number;
    legalEscalation: number;
    resolved: number;
  };
  defaults: DefaultRow[];
}

interface TenantOption {
  id: string;
  name: string;
  email: string;
  propertyId: string;
  unitId?: string;
}

interface PropertyOption {
  id: string;
  name: string;
}

type FilterStatus = "ALL" | "GRACE_PERIOD" | "DEFAULTED" | "LEGAL_ESCALATION" | "RESOLVED";

const STATUS_LABELS: Record<DefaultRow["status"], string> = {
  GRACE_PERIOD: "Grace Period",
  DEFAULTED: "Defaulted",
  LEGAL_ESCALATION: "Legal Escalation",
  RESOLVED: "Resolved",
};

function statusTone(status: DefaultRow["status"]): BadgeTone {
  if (status === "GRACE_PERIOD") return "amber";
  if (status === "RESOLVED") return "green";
  return "red";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

const initForm = {
  tenantId: "",
  propertyId: "",
  unitId: "",
  outstandingAmount: "",
  newDeadline: "",
  agreedAmount: "",
  notes: "",
};

export default function RentDefaultsPage() {
  const router = useRouter();
  const { landlordSession } = useLandlordPortalSession();
  const { activeModal, closeModal, dataRefreshVersion, openModal, refreshData, showToast } =
    usePrototypeUI();

  const [pageData, setPageData] = useState<RentDefaultsResponse | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [form, setForm] = useState(initForm);

  useEffect(() => {
    const token = landlordSession?.token;
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [defaultsRes, tenantsRes, propertiesRes] = await Promise.all([
          apiRequest<RentDefaultsResponse>("/landlord/rent-defaults", { token }),
          apiRequest<{ tenants: TenantOption[] }>("/landlord/tenants", { token }),
          apiRequest<{ properties: PropertyOption[] }>("/landlord/properties", { token }),
        ]);
        if (!cancelled) {
          setPageData(defaultsRes.data);
          setTenants(
            (tenantsRes.data?.tenants ?? []).map((t: any) => ({
              id: t.id,
              name: t.name ?? `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim(),
              email: t.email,
              propertyId: t.propertyId,
              unitId: t.unitId,
            })),
          );
          setProperties(propertiesRes.data?.properties ?? []);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Could not load rent defaults.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [dataRefreshVersion, landlordSession?.token]);

  const visibleRows = useMemo(() => {
    if (!pageData) return [];
    if (filterStatus === "ALL") return pageData.defaults;
    return pageData.defaults.filter((r) => r.status === filterStatus);
  }, [pageData, filterStatus]);

  const selectedTenant = tenants.find((t) => t.id === form.tenantId);

  useEffect(() => {
    if (selectedTenant) {
      setForm((f) => ({
        ...f,
        propertyId: selectedTenant.propertyId,
        unitId: selectedTenant.unitId ?? "",
      }));
    }
  }, [selectedTenant]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = landlordSession?.token;
    if (!token) return;

    setSaving(true);
    try {
      await apiRequest("/landlord/rent-defaults", {
        method: "POST",
        token,
        body: {
          tenantId: form.tenantId,
          propertyId: form.propertyId,
          unitId: form.unitId || undefined,
          outstandingAmount: parseInt(form.outstandingAmount, 10),
          newDeadline: new Date(form.newDeadline).toISOString(),
          agreedAmount: parseInt(form.agreedAmount, 10),
          notes: form.notes || undefined,
        },
      });
      showToast("Default case initiated.", "success");
      closeModal();
      setForm(initForm);
      refreshData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not initiate case.", "error");
    } finally {
      setSaving(false);
    }
  }

  const tabs: Array<{ key: FilterStatus; label: string; count: number }> = [
    { key: "ALL", label: "All", count: pageData?.summary.total ?? 0 },
    { key: "GRACE_PERIOD", label: "Grace Period", count: pageData?.summary.gracePeriod ?? 0 },
    { key: "DEFAULTED", label: "Defaulted", count: pageData?.summary.defaulted ?? 0 },
    { key: "LEGAL_ESCALATION", label: "Legal", count: pageData?.summary.legalEscalation ?? 0 },
    { key: "RESOLVED", label: "Resolved", count: pageData?.summary.resolved ?? 0 },
  ];

  return (
    <>
      <PageMeta title="DoorRent - Rent Defaults" urlPath="/landlord/rent-defaults" />
      <LandlordPortalShell topbarTitle="Rent Defaults" breadcrumb="Dashboard -> Rent Defaults">
        <PageHeader
          title="Rent Default Management"
          description="Manage grace periods, escalations, and legal proceedings for rent defaults."
          actions={[{ label: "+ New Default Case", variant: "primary", modal: "new-default" }]}
        />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
          </div>
        ) : null}

        <div className="rd-summary-row">
          {[
            { label: "Total Cases", value: pageData?.summary.total ?? 0, tone: "" },
            { label: "Grace Period", value: pageData?.summary.gracePeriod ?? 0, tone: "amber" },
            { label: "Defaulted", value: pageData?.summary.defaulted ?? 0, tone: "red" },
            { label: "Legal", value: pageData?.summary.legalEscalation ?? 0, tone: "red" },
            { label: "Resolved", value: pageData?.summary.resolved ?? 0, tone: "green" },
          ].map((item) => (
            <div key={item.label} className={`rd-stat-card ${item.tone ? `tone-${item.tone}` : ""}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="rd-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={filterStatus === tab.key ? "is-active" : ""}
              onClick={() => setFilterStatus(tab.key)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="rd-table-card">
          <div className="rd-table-head">
            <span>Tenant</span>
            <span>Property</span>
            <span>Outstanding</span>
            <span>Deadline</span>
            <span>Stage</span>
            <span>Opened</span>
          </div>
          <div className="rd-table-body">
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <article
                  key={row.id}
                  className="rd-row"
                  onClick={() => router.push(`/landlord/rent-defaults/${row.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/landlord/rent-defaults/${row.id}`)}
                >
                  <div className="rd-tenant">
                    <strong>{row.tenant.name}</strong>
                    <span>{row.tenant.email}</span>
                  </div>
                  <div className="rd-property">
                    <strong>{row.property.name}</strong>
                    {row.unit ? <span>Unit {row.unit}</span> : null}
                  </div>
                  <div className="rd-amount">{fmtMoney(row.outstandingAmount)}</div>
                  <div className="rd-deadline">
                    {row.deadline ? fmtDate(row.deadline) : "—"}
                  </div>
                  <div>
                    <div className="rd-stage-cell">
                      <StatusBadge tone={statusTone(row.status)}>
                        {STATUS_LABELS[row.status]}
                      </StatusBadge>
                      {row.status === "GRACE_PERIOD" && row.workflowLabel ? (
                        <span className="rd-stage-meta">{row.workflowLabel}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="rd-date">{fmtDate(row.createdAt)}</div>
                </article>
              ))
            ) : (
              <div className="rd-empty">
                {loading ? "Loading cases..." : "No default cases found."}
              </div>
            )}
          </div>
        </div>

        {activeModal === "new-default" ? (
          <div
            className="rd-modal-backdrop"
            onClick={() => { closeModal(); setForm(initForm); }}
          >
            <div
              className="rd-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rd-modal-title"
            >
              <form onSubmit={handleSubmit}>
                <div className="rd-modal-head">
                  <h2 id="rd-modal-title">Initiate Default Case</h2>
                  <button
                    type="button"
                    className="rd-modal-close"
                    onClick={() => { closeModal(); setForm(initForm); }}
                  >
                    x
                  </button>
                </div>
                <div className="rd-modal-body">
                  <div className="form-group">
                    <label className="form-label">Tenant *</label>
                    <select
                      className="form-input"
                      value={form.tenantId}
                      onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                      required
                    >
                      <option value="">Select a tenant</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Outstanding Amount (₦) *</label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      value={form.outstandingAmount}
                      onChange={(e) => setForm((f) => ({ ...f, outstandingAmount: e.target.value }))}
                      placeholder="e.g. 500000"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Payment Deadline *</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.newDeadline}
                      onChange={(e) => setForm((f) => ({ ...f, newDeadline: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Agreed Payment Amount (₦) *</label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      value={form.agreedAmount}
                      onChange={(e) => setForm((f) => ({ ...f, agreedAmount: e.target.value }))}
                      placeholder="Amount agreed to be paid by deadline"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: 80 }}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Any additional context..."
                    />
                  </div>
                </div>
                <div className="rd-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { closeModal(); setForm(initForm); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Initiating..." : "Initiate Case"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <style jsx global>{`
          .rd-summary-row {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 24px;
          }

          .rd-stat-card {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 18px 20px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: var(--surface);
          }

          .rd-stat-card span {
            font-size: 12px;
            color: var(--ink2);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
          }

          .rd-stat-card strong {
            font-size: 28px;
          }

          .rd-stat-card.tone-amber strong { color: var(--amber, #b45309); }
          .rd-stat-card.tone-red strong { color: var(--red, #dc2626); }
          .rd-stat-card.tone-green strong { color: var(--green, #15803d); }

          .rd-tabs {
            display: flex;
            gap: 24px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 18px;
            flex-wrap: wrap;
          }

          .rd-tabs button {
            background: none;
            border: 0;
            border-bottom: 3px solid transparent;
            padding: 0 0 14px;
            font-size: 14px;
            font-weight: 600;
            color: var(--ink2);
            cursor: pointer;
          }

          .rd-tabs button.is-active {
            color: var(--accent);
            border-bottom-color: var(--accent);
          }

          .rd-table-card {
            border: 1px solid var(--border);
            border-radius: 20px;
            overflow: hidden;
            background: var(--surface);
            box-shadow: var(--shadow-sm);
          }

          .rd-table-head,
          .rd-row {
            display: grid;
            grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) 0.7fr 0.7fr 0.8fr 0.6fr;
            gap: 16px;
            align-items: center;
          }

          .rd-table-head {
            padding: 16px 22px;
            background: var(--surface2);
            color: var(--ink3);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .rd-row {
            padding: 20px 22px;
            border-top: 1px solid var(--border);
            cursor: pointer;
            transition: background 0.12s;
          }

          .rd-row:hover { background: var(--surface2); }
          .rd-row:first-child { border-top: 0; }

          .rd-tenant, .rd-property {
            display: grid;
            gap: 4px;
          }

          .rd-tenant strong, .rd-property strong { font-size: 14px; }
          .rd-tenant span, .rd-property span, .rd-date, .rd-deadline { color: var(--ink2); font-size: 13px; }

          .rd-amount { font-size: 15px; font-weight: 700; }

          .rd-stage-cell {
            display: grid;
            gap: 6px;
            justify-items: start;
          }

          .rd-stage-meta {
            font-size: 12px;
            color: var(--ink2);
          }

          .rd-empty {
            padding: 40px 22px;
            color: var(--ink2);
            font-size: 14px;
          }

          .rd-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 120;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(15, 18, 18, 0.35);
            backdrop-filter: blur(8px);
          }

          .rd-modal {
            width: min(100%, 600px);
            border-radius: 28px;
            background: var(--surface);
            box-shadow: var(--shadow-lg);
            overflow: hidden;
          }

          .rd-modal-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 28px 32px 20px;
            border-bottom: 1px solid var(--border);
          }

          .rd-modal-head h2 {
            margin: 0;
            font-size: 24px;
            font-family: var(--font-display);
          }

          .rd-modal-close {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            border: 1px solid var(--border);
            background: var(--surface2);
            color: var(--ink2);
            cursor: pointer;
          }

          .rd-modal-body {
            display: grid;
            gap: 16px;
            padding: 24px 32px 12px;
            max-height: 60vh;
            overflow-y: auto;
          }

          .rd-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 32px 28px;
            border-top: 1px solid var(--border);
          }

          @media (max-width: 960px) {
            .rd-summary-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .rd-table-head { display: none; }
            .rd-row { grid-template-columns: 1fr; gap: 8px; }
          }

          @media (max-width: 540px) {
            .rd-summary-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }

            .rd-modal-backdrop {
              align-items: flex-end;
              justify-content: flex-end;
              padding: 0;
            }

            .rd-modal {
              width: 100%;
              max-height: min(88vh, calc(100dvh - 8px));
              border-radius: 24px 24px 0 0;
            }

            .rd-modal-head,
            .rd-modal-body,
            .rd-modal-actions {
              padding-left: 18px;
              padding-right: 18px;
            }

            .rd-modal-body {
              max-height: none;
              flex: 1 1 auto;
            }

            .rd-modal-actions {
              padding-bottom: calc(18px + env(safe-area-inset-bottom));
              flex-wrap: wrap;
            }

            .rd-modal-actions > * {
              flex: 1 1 100%;
            }
          }
        `}</style>
      </LandlordPortalShell>
    </>
  );
}
