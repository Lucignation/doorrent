import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { convertRowsToCsv, parseCsvText, formatEstateCurrency, type EstateDashboardData } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type ExpenseRow = EstateDashboardData["expenses"][number];

const initialForm = { id: "", title: "", category: "", amount: "", requestedByName: "", status: "PENDING", incurredOn: "", notes: "" };

export default function EstateTreasuryPage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const token = landlordSession?.token;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

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

  function handleExport() {
    if (!expenses.length) { showToast("No expenses to export.", "error"); return; }
    const csv = convertRowsToCsv(expenses.map((e) => ({ title: e.title, category: e.category, amount: e.amount, requestedByName: e.requestedByName ?? "", status: e.status, incurredOn: e.incurredOn ?? "", notes: e.notes ?? "" })));
    downloadCsv(csv, "expenses.csv");
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsvText(text);
      const idx = (col: string) => headers.findIndex((h) => h.toLowerCase() === col.toLowerCase());
      let created = 0;
      for (const row of rows) {
        const title = row[idx("title")] ?? "";
        const amount = Number(row[idx("amount")] ?? 0);
        if (!title || !amount) continue;
        await apiRequest("/estate/expenses", { method: "POST", token, body: { title, category: row[idx("category")] || "General", amount, requestedByName: row[idx("requestedByName")] || undefined, status: row[idx("status")] || "PENDING", incurredOn: row[idx("incurredOn")] || undefined, notes: row[idx("notes")] || undefined } });
        created++;
      }
      showToast(`Imported ${created} expense(s).`, "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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

      {/* CSV actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>Export Expenses CSV</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>{importing ? "Importing…" : "Import Expenses CSV"}</button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />
          <span className="td-muted" style={{ fontSize: 12 }}>CSV columns: title, category, amount, requestedByName, status, incurredOn, notes</span>
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
