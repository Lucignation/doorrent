import { type FormEvent, useEffect, useMemo, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { type EstateDashboardData } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

type ApprovalRow = EstateDashboardData["approvals"][number];

const initialForm = {
  id: "", type: "EXPENSE", title: "", entityType: "", entityId: "",
  status: "PENDING", requiredApprovals: "1", approvers: "",
};

export default function EstateGovernancePage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;

  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
      setApprovals(data.approvals ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load governance data.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  function fillForm(a: ApprovalRow) {
    setForm({ id: a.id, type: a.type, title: a.title, entityType: a.entityType ?? "", entityId: a.entityId ?? "", status: a.status, requiredApprovals: String(a.requiredApprovals), approvers: a.approvers.join(", ") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = { type: form.type, title: form.title, entityType: form.entityType || undefined, entityId: form.entityId || undefined, status: form.status, requiredApprovals: Number(form.requiredApprovals) || 1, approvers: form.approvers.split(",").map((s) => s.trim()).filter(Boolean) };
      if (form.id) {
        await apiRequest(`/estate/approvals/${form.id}`, { method: "PATCH", token, body });
        showToast("Approval updated.", "success");
      } else {
        await apiRequest("/estate/approvals", { method: "POST", token, body });
        showToast("Approval request created.", "success");
      }
      setForm(initialForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!token || !confirm(`Delete approval "${title}"?`)) return;
    try {
      await apiRequest(`/estate/approvals/${id}`, { method: "DELETE", token });
      showToast("Deleted.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete.", "error");
    }
  }

  const filtered = useMemo(() => filter === "ALL" ? approvals : approvals.filter((a) => a.status === filter), [approvals, filter]);

  const columns = useMemo<TableColumn<ApprovalRow>[]>(() => [
    {
      key: "title", label: "Title",
      render: (r) => (
        <div>
          <strong>{r.title}</strong>
          <div className="td-muted" style={{ fontSize: 12 }}>{r.type}</div>
        </div>
      ),
    },
    {
      key: "receivedApprovals", label: "Approvals",
      render: (r) => <span style={{ fontSize: 13 }}>{r.receivedApprovals} / {r.requiredApprovals}</span>,
    },
    {
      key: "approvers", label: "Approvers",
      render: (r) => <span className="td-muted" style={{ fontSize: 12 }}>{r.approvers.join(", ") || "—"}</span>,
    },
    {
      key: "status", label: "Status",
      render: (r) => (
        <span style={{ fontSize: 12, fontWeight: 600, color: r.status === "APPROVED" ? "var(--green)" : r.status === "REJECTED" ? "var(--red)" : "var(--amber)" }}>
          {r.status}
        </span>
      ),
    },
    {
      key: "actions", label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillForm(r)}>Edit</button>
          <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(r.id, r.title)}>Delete</button>
        </div>
      ),
    },
  ], [token]);

  const pending = approvals.filter((a) => a.status === "PENDING").length;
  const approved = approvals.filter((a) => a.status === "APPROVED").length;

  return (
    <EstatePortalShell topbarTitle="Governance" breadcrumb="Governance">
      <PageMeta title="Governance — Estate" />
      <PageHeader title="Governance" description={`${approvals.length} approval request(s) · ${pending} pending`} />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Requests</div><div className="stat-value">{approvals.length}</div></div>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value">{pending}</div></div>
        <div className="stat-card"><div className="stat-label">Approved</div><div className="stat-value">{approved}</div></div>
        <div className="stat-card"><div className="stat-label">Rejected</div><div className="stat-value">{approvals.filter((a) => a.status === "REJECTED").length}</div></div>
      </div>

      {/* Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{form.id ? "Edit Approval Request" : "Create Approval Request"}</h3>
          <form onSubmit={handleSave} className="estate-form-grid">
            <label>Title <input className="form-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></label>
            <label>Type
              <select className="form-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="EXPENSE">Expense</option>
                <option value="CAUSE">Cause</option>
                <option value="LEVY">Levy</option>
                <option value="EXCO_HANDOVER">ExCo Handover</option>
                <option value="POLICY">Policy</option>
              </select>
            </label>
            <label>Required approvals <input className="form-input" inputMode="numeric" value={form.requiredApprovals} onChange={(e) => setForm((f) => ({ ...f, requiredApprovals: e.target.value }))} /></label>
            <label>Status
              <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label className="estate-form-wide">Approvers (comma-separated roles/names) <input className="form-input" value={form.approvers} onChange={(e) => setForm((f) => ({ ...f, approvers: e.target.value }))} placeholder="Treasurer, Chairman, Vice Chairman" /></label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : form.id ? "Update" : "Create Request"}</button>
              {form.id ? <button type="button" className="btn btn-secondary" onClick={() => setForm(initialForm)}>Cancel</button> : null}
            </div>
          </form>
        </div>
      </div>

      {/* Filter + table */}
      <div className="card">
        <div className="card-header" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <strong>Approval Requests</strong>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button key={s} type="button" className={`btn btn-xs ${filter === s ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
        <DataTable columns={columns} rows={filtered} loading={loading} emptyMessage="No approval requests yet." />
      </div>
    </EstatePortalShell>
  );
}
