import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../../components/auth/LandlordPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useLandlordPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import { printPreLegalLetter, printAuditExport } from "../../../lib/rent-default-print";
import type { BadgeTone } from "../../../types/app";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reminder {
  id: string;
  daysBeforeExpiry: number;
  scheduledFor: string;
  sentAt: string | null;
  deliveryConfirmed: boolean;
}

interface GracePeriod {
  id: string;
  newDeadline: string;
  agreedAmount: number;
  initiatedBy: string;
  initiatedAt: string;
  landlordApprovedAt: string | null;
  landlordAcknowledgedAt: string | null;
  tenantAcknowledgedAt: string | null;
  notes: string | null;
  reminders: Reminder[];
}

interface Notice {
  id: string;
  type: string;
  sentAt: string;
  deliveryConfirmed: boolean;
  content: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  actorType: string;
  actorId: string;
  actorName: string | null;
  metadata: unknown;
  timestamp: string;
}

interface DefaultDetail {
  id: string;
  status: "GRACE_PERIOD" | "DEFAULTED" | "LEGAL_ESCALATION" | "RESOLVED";
  outstandingAmount: number;
  currency: string;
  createdAt: string;
  resolvedAt: string | null;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    leaseStart: string | null;
    leaseEnd: string | null;
    guarantor: { fullName: string; phone: string; email: string } | null;
    recentPayments: Array<{ amount: number; status: string; paidAt: string | null; method: string; createdAt: string }>;
  };
  property: { id: string; name: string; address: string; city: string; state: string };
  unit: { unitNumber: string } | null;
  gracePeriod: GracePeriod | null;
  notices: Notice[];
  auditLogs: AuditLog[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DefaultDetail["status"], string> = {
  GRACE_PERIOD: "Grace Period",
  DEFAULTED: "Defaulted",
  LEGAL_ESCALATION: "Legal Escalation",
  RESOLVED: "Resolved",
};

function statusTone(s: DefaultDetail["status"]): BadgeTone {
  if (s === "GRACE_PERIOD") return "amber";
  if (s === "RESOLVED") return "green";
  return "red";
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function money(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

const ACTION_LABELS: Record<string, string> = {
  GRACE_PERIOD_INITIATED: "Grace period initiated",
  GRACE_PERIOD_APPROVED: "Grace period approved by landlord",
  LANDLORD_ACKNOWLEDGED: "Landlord acknowledged agreement",
  TENANT_ACKNOWLEDGED: "Tenant acknowledged agreement",
  AUTO_ESCALATED_TO_DEFAULT: "Automatically escalated to default (deadline passed)",
  ESCALATED_TO_DEFAULT: "Manually escalated to default",
  ESCALATION_NOTICE_SENT: "Escalation notice sent to tenant",
  PAYMENT_DEMAND_SENT: "Formal payment demand sent",
  LEGAL_ESCALATION_TRIGGERED: "Escalated to legal proceedings",
  PRE_LEGAL_LETTER_GENERATED: "Pre-legal demand letter generated",
  CASE_RESOLVED: "Case marked as resolved",
};

function actionLabel(action: string) {
  if (action.startsWith("REMINDER_SENT_")) {
    const days = action.replace("REMINDER_SENT_", "").replace("D", "");
    return `Reminder sent — ${days} day(s) before deadline`;
  }
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RentDefaultDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { landlordSession } = useLandlordPortalSession();

  const [detail, setDetail] = useState<DefaultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    const token = landlordSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<DefaultDetail>(`/landlord/rent-defaults/${id}`, { token });
      setDetail(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load case.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id, landlordSession?.token]);

  async function doAction(path: string, body?: unknown) {
    const token = landlordSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    setActing(path);
    try {
      const res = await apiRequest<unknown>(`/landlord/rent-defaults/${id}/${path}`, {
        method: "POST",
        token,
        body,
      });
      showToast((res as any).message ?? "Done.", "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setActing(null);
    }
  }

  async function handlePrintPreLegal() {
    const token = landlordSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    try {
      const res = await apiRequest<any>(`/landlord/rent-defaults/${id}/pre-legal`, { token });
      printPreLegalLetter(res.data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not generate letter.", "error");
    }
  }

  function handlePrintAudit() {
    if (!detail) return;
    printAuditExport({
      id: detail.id,
      tenant: { name: detail.tenant.name, email: detail.tenant.email },
      property: { name: detail.property.name, address: `${detail.property.address}, ${detail.property.city}` },
      unit: detail.unit?.unitNumber ?? null,
      outstandingAmount: detail.outstandingAmount,
      currency: detail.currency,
      status: detail.status,
      createdAt: detail.createdAt,
      resolvedAt: detail.resolvedAt,
      auditLogs: detail.auditLogs,
    });
  }

  if (loading) {
    return (
      <LandlordPortalShell topbarTitle="Rent Defaults" breadcrumb="Dashboard -> Rent Defaults -> Case">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading case...</div>
      </LandlordPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <LandlordPortalShell topbarTitle="Rent Defaults" breadcrumb="Dashboard -> Rent Defaults -> Case">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Case not found."}</div>
      </LandlordPortalShell>
    );
  }

  const gp = detail.gracePeriod;
  const isGrace = detail.status === "GRACE_PERIOD";
  const isDefaulted = detail.status === "DEFAULTED";
  const isLegal = detail.status === "LEGAL_ESCALATION";
  const isResolved = detail.status === "RESOLVED";

  const paymentDemandSent = detail.notices.some((n) => n.type === "PAYMENT_DEMAND");
  const preLegalSent = detail.notices.some((n) => n.type === "PRE_LEGAL_LETTER");

  return (
    <>
      <PageMeta title="DoorRent - Default Case" urlPath={`/landlord/rent-defaults/${detail.id}`} />
      <LandlordPortalShell topbarTitle="Rent Defaults" breadcrumb="Dashboard -> Rent Defaults -> Case">

        {toast ? (
          <div className={`rd-toast ${toast.type}`}>{toast.msg}</div>
        ) : null}

        {/* Header */}
        <div className="rd-detail-header">
          <div>
            <button
              type="button"
              className="rd-back-btn"
              onClick={() => router.push("/landlord/rent-defaults")}
            >
              ← Back to Cases
            </button>
            <h1 className="rd-detail-title">{detail.tenant.name}</h1>
            <div className="rd-detail-sub">
              {detail.property.name}
              {detail.unit ? ` · Unit ${detail.unit.unitNumber}` : ""}
              {" · "}
              {detail.tenant.email}
            </div>
          </div>
          <div className="rd-detail-header-right">
            <StatusBadge tone={statusTone(detail.status)}>
              {STATUS_LABELS[detail.status]}
            </StatusBadge>
            <div className="rd-outstanding">{money(detail.outstandingAmount)}</div>
            <div className="rd-outstanding-label">outstanding</div>
          </div>
        </div>

        <div className="rd-detail-grid">
          {/* Left column: stages */}
          <div className="rd-stages">

            {/* Stage 1 — Grace Period */}
            <section className="rd-stage-card">
              <div className="rd-stage-label stage-1">Stage 1</div>
              <h2 className="rd-stage-title">Grace Period Agreement</h2>

              {gp ? (
                <div className="rd-stage-body">
                  <div className="rd-info-grid">
                    <div className="rd-info-box">
                      <span>New Deadline</span>
                      <strong>{fmt(gp.newDeadline)}</strong>
                    </div>
                    <div className="rd-info-box">
                      <span>Agreed Amount</span>
                      <strong>{money(gp.agreedAmount)}</strong>
                    </div>
                    <div className="rd-info-box">
                      <span>Initiated By</span>
                      <strong>{gp.initiatedBy === "LANDLORD" ? "Landlord" : "Tenant"}</strong>
                    </div>
                    <div className="rd-info-box">
                      <span>Initiated</span>
                      <strong>{fmt(gp.initiatedAt)}</strong>
                    </div>
                  </div>

                  {gp.notes ? (
                    <p className="rd-notes">Notes: {gp.notes}</p>
                  ) : null}

                  {/* Approval */}
                  <div className="rd-checks">
                    <div className={`rd-check ${gp.landlordApprovedAt ? "done" : ""}`}>
                      <span className="rd-check-dot" />
                      <div>
                        <strong>Landlord Approval</strong>
                        <span>{gp.landlordApprovedAt ? fmt(gp.landlordApprovedAt) : "Pending"}</span>
                      </div>
                    </div>
                    <div className={`rd-check ${gp.landlordAcknowledgedAt ? "done" : ""}`}>
                      <span className="rd-check-dot" />
                      <div>
                        <strong>Landlord Acknowledged</strong>
                        <span>{gp.landlordAcknowledgedAt ? fmt(gp.landlordAcknowledgedAt) : "Pending"}</span>
                      </div>
                    </div>
                    <div className={`rd-check ${gp.tenantAcknowledgedAt ? "done" : ""}`}>
                      <span className="rd-check-dot" />
                      <div>
                        <strong>Tenant Acknowledged</strong>
                        <span>{gp.tenantAcknowledgedAt ? fmt(gp.tenantAcknowledgedAt) : "Pending"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reminders */}
                  {gp.reminders.length > 0 ? (
                    <div className="rd-reminders">
                      <div className="rd-reminders-label">Scheduled Reminders</div>
                      {gp.reminders.map((r) => (
                        <div key={r.id} className="rd-reminder-row">
                          <span className={`rd-reminder-dot ${r.sentAt ? "sent" : ""}`} />
                          <span>{r.daysBeforeExpiry}d before deadline</span>
                          <span style={{ marginLeft: "auto", color: "var(--ink2)", fontSize: 12 }}>
                            {r.sentAt ? `Sent ${fmt(r.sentAt)}` : `Due ${fmt(r.scheduledFor)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Actions */}
                  {isGrace ? (
                    <div className="rd-action-row">
                      {!gp.landlordApprovedAt ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={acting === "approve"}
                          onClick={() => doAction("approve")}
                        >
                          {acting === "approve" ? "Approving..." : "Approve Grace Period"}
                        </button>
                      ) : null}
                      {gp.landlordApprovedAt && !gp.landlordAcknowledgedAt ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={acting === "acknowledge-landlord"}
                          onClick={() => doAction("acknowledge", { actorType: "LANDLORD" })}
                        >
                          {acting === "acknowledge-landlord" ? "Recording..." : "I Acknowledge (Landlord)"}
                        </button>
                      ) : null}
                      {gp.landlordApprovedAt && !gp.tenantAcknowledgedAt ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={acting === "acknowledge-tenant"}
                          onClick={() => doAction("acknowledge", { actorType: "TENANT" })}
                        >
                          {acting === "acknowledge-tenant" ? "Recording..." : "Record Tenant Acknowledgement"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="rd-stage-empty">No grace period agreement on record.</p>
              )}
            </section>

            {/* Stage 2 — Automatic Escalation */}
            <section className={`rd-stage-card ${!isGrace && !isResolved ? "" : "rd-stage-locked"}`}>
              <div className="rd-stage-label stage-2">Stage 2</div>
              <h2 className="rd-stage-title">Escalation</h2>

              <div className="rd-stage-body">
                <p className="rd-stage-desc">
                  When the grace period expires unpaid, the tenancy is recorded as defaulted and formal
                  notices are issued. Escalation also triggers automatically when the deadline passes.
                </p>

                {!isGrace ? (
                  <>
                    <div className="rd-notice-list">
                      {detail.notices.filter((n) => n.type === "ESCALATION_NOTICE").map((n) => (
                        <div key={n.id} className="rd-notice-row">
                          <span className={`rd-notice-dot ${n.deliveryConfirmed ? "confirmed" : ""}`} />
                          <div>
                            <strong>Escalation Notice</strong>
                            <span>{fmtDateTime(n.sentAt)} · {n.deliveryConfirmed ? "Delivered" : "Sent"}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {isDefaulted ? (
                      <div className="rd-action-row">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={!!acting || paymentDemandSent}
                          onClick={() => doAction("payment-demand")}
                          title={paymentDemandSent ? "Payment demand already sent" : ""}
                        >
                          {acting === "payment-demand"
                            ? "Sending..."
                            : paymentDemandSent
                              ? "Payment Demand Sent"
                              : "Send Payment Demand"}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="rd-stage-empty">
                    Escalation is triggered automatically when the grace period deadline passes.
                  </p>
                )}

                {isGrace && gp?.landlordApprovedAt ? (
                  <div className="rd-action-row">
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={!!acting}
                      onClick={() => doAction("escalate")}
                    >
                      {acting === "escalate" ? "Escalating..." : "Escalate Now"}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Stage 3 — Legal Escalation */}
            <section className={`rd-stage-card ${isDefaulted || isLegal ? "" : "rd-stage-locked"}`}>
              <div className="rd-stage-label stage-3">Stage 3</div>
              <h2 className="rd-stage-title">Legal Escalation</h2>

              <div className="rd-stage-body">
                <p className="rd-stage-desc">
                  Generate a pre-legal demand letter auto-populated with all case data, payment history,
                  and notices. Connect with a vetted property lawyer with the full case file pre-loaded.
                </p>

                {isDefaulted || isLegal ? (
                  <div className="rd-action-row" style={{ flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handlePrintPreLegal}
                    >
                      Generate Pre-Legal Letter (PDF)
                    </button>
                    {isDefaulted ? (
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={!!acting}
                        onClick={() => doAction("legal-escalation")}
                      >
                        {acting === "legal-escalation" ? "Escalating..." : "Escalate to Legal"}
                      </button>
                    ) : null}
                    {isLegal ? (
                      <div className="rd-legal-connect">
                        <strong>Connect with a Lawyer</strong>
                        <span>
                          Your case file is ready. A vetted property lawyer will receive the full default
                          history, notices, and payment records automatically.
                        </span>
                        <button type="button" className="btn btn-primary" disabled>
                          Lawyer Connection (Coming Soon)
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="rd-stage-empty">
                    Available after the case is escalated to default status.
                  </p>
                )}

                {detail.notices.filter((n) => n.type === "PRE_LEGAL_LETTER" || n.type === "PAYMENT_DEMAND").length > 0 ? (
                  <div className="rd-notice-list" style={{ marginTop: 16 }}>
                    {detail.notices
                      .filter((n) => n.type === "PRE_LEGAL_LETTER" || n.type === "PAYMENT_DEMAND")
                      .map((n) => (
                        <div key={n.id} className="rd-notice-row">
                          <span className={`rd-notice-dot ${n.deliveryConfirmed ? "confirmed" : ""}`} />
                          <div>
                            <strong>{n.type === "PAYMENT_DEMAND" ? "Payment Demand" : "Pre-Legal Letter"}</strong>
                            <span>{fmtDateTime(n.sentAt)} · {n.deliveryConfirmed ? "Delivered" : "Logged"}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            </section>

            {/* Stage 4 — Audit Trail */}
            <section className="rd-stage-card">
              <div className="rd-stage-label stage-4">Stage 4</div>
              <h2 className="rd-stage-title">Audit Trail</h2>

              <div className="rd-stage-body">
                <div className="rd-audit-actions">
                  <span>{detail.auditLogs.length} event(s) recorded</span>
                  <button
                    type="button"
                    className="btn btn-secondary rd-audit-export-btn"
                    onClick={handlePrintAudit}
                  >
                    Export Full History (PDF)
                  </button>
                </div>

                <div className="rd-audit-log">
                  {detail.auditLogs.map((log) => (
                    <div key={log.id} className="rd-audit-entry">
                      <div className="rd-audit-time">{fmtDateTime(log.timestamp)}</div>
                      <div className="rd-audit-action">{actionLabel(log.action)}</div>
                      <div className="rd-audit-actor">
                        {log.actorType === "SYSTEM" ? "System" : log.actorName ?? log.actorType}
                      </div>
                    </div>
                  ))}
                  {detail.auditLogs.length === 0 ? (
                    <p className="rd-stage-empty">No activity recorded yet.</p>
                  ) : null}
                </div>
              </div>
            </section>

          </div>

          {/* Right sidebar */}
          <aside className="rd-sidebar">
            <div className="rd-sidebar-card">
              <div className="rd-sidebar-label">Tenant</div>
              <strong>{detail.tenant.name}</strong>
              <span>{detail.tenant.email}</span>
              <span>{detail.tenant.phone}</span>
              {detail.tenant.leaseStart ? (
                <span>Lease: {fmt(detail.tenant.leaseStart)} — {fmt(detail.tenant.leaseEnd)}</span>
              ) : null}
            </div>

            {detail.tenant.guarantor ? (
              <div className="rd-sidebar-card">
                <div className="rd-sidebar-label">Guarantor</div>
                <strong>{detail.tenant.guarantor.fullName}</strong>
                <span>{detail.tenant.guarantor.email}</span>
                <span>{detail.tenant.guarantor.phone}</span>
              </div>
            ) : null}

            <div className="rd-sidebar-card">
              <div className="rd-sidebar-label">Recent Payments</div>
              {detail.tenant.recentPayments.length ? (
                detail.tenant.recentPayments.slice(0, 5).map((p, i) => (
                  <div key={i} className="rd-payment-row">
                    <span>{money(p.amount)}</span>
                    <span className={`rd-payment-status ${p.status.toLowerCase()}`}>{p.status}</span>
                    <span style={{ fontSize: 12, color: "var(--ink2)" }}>{p.paidAt ? fmt(p.paidAt) : fmt(p.createdAt)}</span>
                  </div>
                ))
              ) : (
                <span style={{ color: "var(--ink2)", fontSize: 13 }}>No payments recorded.</span>
              )}
            </div>

            {!isResolved ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%" }}
                disabled={!!acting}
                onClick={() => doAction("resolve")}
              >
                {acting === "resolve" ? "Resolving..." : "Mark as Resolved"}
              </button>
            ) : (
              <div className="rd-resolved-badge">
                Case resolved {fmt(detail.resolvedAt)}
              </div>
            )}
          </aside>
        </div>

        <style jsx global>{`
          .rd-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 200;
            padding: 14px 20px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 8px 32px rgba(0,0,0,0.18);
            animation: rd-fadein 0.2s ease;
          }
          .rd-toast.success { background: #1f7857; color: #fff; }
          .rd-toast.error { background: #dc4040; color: #fff; }
          @keyframes rd-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

          .rd-back-btn {
            background: none;
            border: 0;
            padding: 0 0 10px;
            color: var(--ink2);
            font-size: 13px;
            cursor: pointer;
          }

          .rd-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-bottom: 28px;
          }

          .rd-detail-title {
            margin: 0 0 6px;
            font-size: 28px;
            font-family: var(--font-display);
          }

          .rd-detail-sub {
            font-size: 14px;
            color: var(--ink2);
          }

          .rd-detail-header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
            flex-shrink: 0;
          }

          .rd-outstanding {
            font-size: 28px;
            font-weight: 800;
            color: var(--red, #dc2626);
          }

          .rd-outstanding-label {
            font-size: 12px;
            color: var(--ink2);
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .rd-detail-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.4fr) 340px;
            gap: 24px;
            align-items: start;
          }

          .rd-stages {
            display: grid;
            gap: 20px;
          }

          .rd-stage-card {
            border: 1px solid var(--border);
            border-radius: 20px;
            background: var(--surface);
            box-shadow: var(--shadow-sm);
            overflow: hidden;
          }

          .rd-stage-card.rd-stage-locked {
            opacity: 0.6;
          }

          .rd-stage-label {
            display: inline-block;
            padding: 4px 12px;
            margin: 20px 22px 0;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .rd-stage-label.stage-1 { background: rgba(236,191,108,0.2); color: #a16207; }
          .rd-stage-label.stage-2 { background: rgba(220,103,80,0.12); color: #9b2a1a; }
          .rd-stage-label.stage-3 { background: rgba(139,92,246,0.12); color: #6d28d9; }
          .rd-stage-label.stage-4 { background: rgba(31,120,87,0.1); color: #1f7857; }

          .rd-stage-title {
            margin: 8px 22px 0;
            font-size: 18px;
            font-family: var(--font-display);
          }

          .rd-stage-body {
            padding: 16px 22px 22px;
          }

          .rd-stage-desc {
            font-size: 13px;
            color: var(--ink2);
            line-height: 1.6;
            margin: 0 0 16px;
          }

          .rd-stage-empty {
            font-size: 13px;
            color: var(--ink2);
            padding: 6px 22px 22px;
            margin: 0;
          }

          .rd-info-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }

          .rd-info-box {
            display: grid;
            gap: 4px;
            padding: 14px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: var(--surface2);
          }

          .rd-info-box span {
            font-size: 11px;
            color: var(--ink2);
            text-transform: uppercase;
            letter-spacing: 0.07em;
            font-weight: 700;
          }

          .rd-info-box strong { font-size: 15px; }

          .rd-notes {
            font-size: 13px;
            color: var(--ink2);
            background: var(--surface2);
            border-radius: 12px;
            padding: 12px 14px;
            margin: 0 0 16px;
            line-height: 1.6;
          }

          .rd-checks {
            display: grid;
            gap: 10px;
            margin-bottom: 16px;
          }

          .rd-check {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 14px;
            border: 1px solid var(--border);
            background: var(--surface2);
          }

          .rd-check.done {
            border-color: rgba(31,120,87,0.3);
            background: rgba(31,120,87,0.06);
          }

          .rd-check-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: var(--ink3);
            flex-shrink: 0;
          }

          .rd-check.done .rd-check-dot { background: #1f7857; }

          .rd-check > div {
            display: grid;
            gap: 2px;
          }

          .rd-check strong { font-size: 14px; }
          .rd-check span { font-size: 12px; color: var(--ink2); }

          .rd-reminders {
            margin-bottom: 16px;
          }

          .rd-reminders-label {
            font-size: 11px;
            color: var(--ink3);
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .rd-reminder-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
            font-size: 13px;
          }

          .rd-reminder-row:last-child { border-bottom: 0; }

          .rd-reminder-dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: var(--border);
            flex-shrink: 0;
          }

          .rd-reminder-dot.sent { background: #1f7857; }

          .rd-action-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 4px;
          }

          .btn-danger {
            background: rgba(220,64,64,0.1);
            color: #dc4040;
            border: 1px solid rgba(220,64,64,0.3);
            border-radius: 12px;
            padding: 10px 18px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-danger:hover { background: rgba(220,64,64,0.18); }
          .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

          .rd-notice-list {
            display: grid;
            gap: 10px;
          }

          .rd-notice-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--surface2);
          }

          .rd-notice-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: var(--ink3);
            flex-shrink: 0;
          }

          .rd-notice-dot.confirmed { background: #1f7857; }

          .rd-notice-row > div {
            display: grid;
            gap: 2px;
          }

          .rd-notice-row strong { font-size: 14px; }
          .rd-notice-row span { font-size: 12px; color: var(--ink2); }

          .rd-legal-connect {
            display: grid;
            gap: 6px;
            padding: 16px;
            border: 1px solid rgba(139,92,246,0.2);
            border-radius: 14px;
            background: rgba(139,92,246,0.04);
            margin-top: 12px;
            width: 100%;
          }

          .rd-legal-connect strong { font-size: 15px; }
          .rd-legal-connect span { font-size: 13px; color: var(--ink2); line-height: 1.5; }

          .rd-audit-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
          }

          .rd-audit-actions > span { font-size: 13px; color: var(--ink2); }

          .rd-audit-export-btn {
            font-size: 13px;
            padding: 8px 14px;
          }

          .rd-audit-log {
            display: grid;
            gap: 0;
          }

          .rd-audit-entry {
            display: grid;
            grid-template-columns: 160px minmax(0, 1fr) 130px;
            gap: 12px;
            align-items: start;
            padding: 12px 0;
            border-bottom: 1px solid var(--border);
            font-size: 13px;
          }

          .rd-audit-entry:last-child { border-bottom: 0; }

          .rd-audit-time { color: var(--ink2); }
          .rd-audit-action { font-weight: 600; }
          .rd-audit-actor { color: var(--ink2); font-size: 12px; }

          /* Sidebar */
          .rd-sidebar {
            display: grid;
            gap: 14px;
          }

          .rd-sidebar-card {
            display: grid;
            gap: 4px;
            padding: 18px 20px;
            border: 1px solid var(--border);
            border-radius: 18px;
            background: var(--surface);
            box-shadow: var(--shadow-sm);
          }

          .rd-sidebar-label {
            font-size: 11px;
            color: var(--ink3);
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .rd-sidebar-card strong { font-size: 15px; }
          .rd-sidebar-card span { font-size: 13px; color: var(--ink2); }

          .rd-payment-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
            font-size: 13px;
            font-weight: 600;
          }

          .rd-payment-row:last-child { border-bottom: 0; }

          .rd-payment-status {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 999px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .rd-payment-status.paid { background: rgba(31,120,87,0.12); color: #1f7857; }
          .rd-payment-status.pending { background: rgba(236,191,108,0.2); color: #a16207; }
          .rd-payment-status.overdue, .rd-payment-status.failed { background: rgba(220,64,64,0.1); color: #dc4040; }

          .rd-resolved-badge {
            padding: 14px 18px;
            border-radius: 14px;
            background: rgba(31,120,87,0.1);
            color: #1f7857;
            font-size: 14px;
            font-weight: 700;
            text-align: center;
          }

          @media (max-width: 1100px) {
            .rd-detail-grid { grid-template-columns: 1fr; }
            .rd-sidebar { grid-row: 1; }
          }

          @media (max-width: 640px) {
            .rd-audit-entry { grid-template-columns: 1fr; gap: 4px; }
            .rd-info-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </LandlordPortalShell>
    </>
  );
}
