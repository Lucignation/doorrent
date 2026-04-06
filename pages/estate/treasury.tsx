import { type FormEvent, useEffect, useMemo, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { formatEstateCurrency, type EstateDashboardData } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

type ExpenseRow = EstateDashboardData["expenses"][number];

const initialForm = { id: "", title: "", category: "", amount: "", requestedByName: "", status: "PENDING", incurredOn: "", notes: "" };

export default function EstateTreasuryPage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const token = landlordSession?.token;

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
      setExpenses(data.expenses ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load treasury.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  function fillForm(e: ExpenseRow) {
    setForm({ id: e.id, title: e.title, category: e.category, amount: String(e.amount), requestedByName: e.requestedByName ?? "", status: e.status, incurredOn: e.incurredOn ?? "", notes: e.notes ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = { title: form.title, category: form.category, amount: Number(form.amount), requestedByName: form.requestedByName || undefined, status: form.status, incurredOn: form.incurredOn || undefined, notes: form.notes || undefined };
      if (form.id) {
        await apiRequest(`/estate/expenses/${form.id}`, { method: "PATCH", token, body });
        showToast("Expense updated.", "success");
      } else {
        await apiRequest("/estate/expenses", { method: "POST", token, body });
        showToast("Expense recorded.", "success");
      }
      setForm(initialForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save expense.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!token || !confirm(`Delete expense "${title}"?`)) return;
    try {
      await apiRequest(`/estate/expenses/${id}`, { method: "DELETE", token });
      showToast("Expense deleted.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete.", "error");
    }
  }

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const approved = expenses.filter((e) => e.status === "APPROVED");
  const pending = expenses.filter((e) => e.status === "PENDING");

  const columns = useMemo<TableColumn<ExpenseRow>[]>(() => [
    { key: "title", label: "Expense", render: (r) => <div><strong>{r.title}</strong><div className="td-muted" style={{ fontSize: 12 }}>{r.category}</div></div> },
    { key: "requestedByName", label: "Requested by", render: (r) => <span className="td-muted">{r.requestedByName ?? "—"}</span> },
    { key: "incurredOn", label: "Date", render: (r) => <span className="td-muted">{r.incurredOn ? new Date(r.incurredOn).toLocaleDateString("en-NG") : "—"}</span> },
    { key: "amount", label: "Amount", render: (r) => <strong>{formatEstateCurrency(r.amount)}</strong> },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "APPROVED" ? "green" : r.status === "REJECTED" ? "red" : "amber"}>{r.status}</StatusBadge> },
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

  return (
    <EstatePortalShell topbarTitle="Treasury" breadcrumb="Treasury">
      <PageMeta title="Treasury — Estate" />
      <PageHeader title="Treasury" description={`${expenses.length} expenses · ${formatEstateCurrency(totalSpent)} total`} />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Recorded</div>
          <div className="stat-value">{formatEstateCurrency(totalSpent)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{approved.length}</div>
          <div className="stat-sub">{formatEstateCurrency(approved.reduce((s, e) => s + e.amount, 0))}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Approval</div>
          <div className="stat-value">{pending.length}</div>
          <div className="stat-sub">{formatEstateCurrency(pending.reduce((s, e) => s + e.amount, 0))}</div>
        </div>
      </div>

      {/* Expense form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{form.id ? "Edit Expense" : "Record Expense"}</h3>
          <form onSubmit={handleSave} className="estate-form-grid">
            <label>Title <input className="form-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></label>
            <label>Category <input className="form-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} /></label>
            <label>Amount <input className="form-input" inputMode="numeric" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required /></label>
            <label>Requested by <input className="form-input" value={form.requestedByName} onChange={(e) => setForm((f) => ({ ...f, requestedByName: e.target.value }))} /></label>
            <label>Status
              <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PAID">Paid</option>
              </select>
            </label>
            <label>Incurred on <input className="form-input" type="date" value={form.incurredOn} onChange={(e) => setForm((f) => ({ ...f, incurredOn: e.target.value }))} /></label>
            <label className="estate-form-wide">Notes <textarea className="form-input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : form.id ? "Update Expense" : "Record Expense"}</button>
              {form.id ? <button type="button" className="btn btn-secondary" onClick={() => setForm(initialForm)}>Cancel</button> : null}
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><strong>All Expenses</strong></div>
        <DataTable columns={columns} rows={expenses} loading={loading} emptyMessage="No expenses recorded yet." />
      </div>
    </EstatePortalShell>
  );
}
