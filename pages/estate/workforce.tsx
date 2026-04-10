import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { convertRowsToCsv, parseCsvText, type EstateDashboardData } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

type WorkerRow = EstateDashboardData["workers"][number];

const initialForm = {
  id: "", fullName: "", role: "", phone: "", monthlySalary: "", bankName: "",
  bankAccountNumber: "", shiftLabel: "", onDuty: true, status: "ACTIVE", notes: "",
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function EstateWorkforcePage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
      setWorkers(data.workers ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load workforce.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  function fillForm(w: WorkerRow) {
    setForm({ id: w.id, fullName: w.fullName, role: w.role, phone: w.phone ?? "", monthlySalary: String(w.monthlySalary), bankName: w.bankName ?? "", bankAccountNumber: w.bankAccountNumber ?? "", shiftLabel: w.shiftLabel ?? "", onDuty: w.onDuty, status: w.status, notes: w.notes ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = { fullName: form.fullName, role: form.role, phone: form.phone || undefined, monthlySalary: Number(form.monthlySalary) || 0, bankName: form.bankName || undefined, bankAccountNumber: form.bankAccountNumber || undefined, shiftLabel: form.shiftLabel || undefined, onDuty: form.onDuty, status: form.status, notes: form.notes || undefined };
      if (form.id) {
        await apiRequest(`/estate/workers/${form.id}`, { method: "PATCH", token, body });
        showToast("Worker updated.", "success");
      } else {
        await apiRequest("/estate/workers", { method: "POST", token, body });
        showToast("Worker added.", "success");
      }
      setForm(initialForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save worker.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!token || !confirm(`Remove worker "${name}"?`)) return;
    try {
      await apiRequest(`/estate/workers/${id}`, { method: "DELETE", token });
      showToast("Worker removed.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete.", "error");
    }
  }

  function handleExport() {
    if (!workers.length) { showToast("No workers to export.", "error"); return; }
    const csv = convertRowsToCsv(workers.map((w) => ({ fullName: w.fullName, role: w.role, phone: w.phone ?? "", monthlySalary: w.monthlySalary, bankName: w.bankName ?? "", bankAccountNumber: w.bankAccountNumber ?? "", shiftLabel: w.shiftLabel ?? "", onDuty: w.onDuty ? "yes" : "no", status: w.status, notes: w.notes ?? "" })));
    downloadCsv(csv, "workers.csv");
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
        const fullName = row[idx("fullName")] ?? row[idx("full_name")] ?? "";
        const role = row[idx("role")] ?? "";
        if (!fullName || !role) continue;
        await apiRequest("/estate/workers", { method: "POST", token, body: { fullName, role, phone: row[idx("phone")] || undefined, monthlySalary: Number(row[idx("monthlySalary")] ?? row[idx("monthly_salary")] ?? 0), bankName: row[idx("bankName")] || undefined, bankAccountNumber: row[idx("bankAccountNumber")] || undefined, shiftLabel: row[idx("shiftLabel")] || undefined, status: row[idx("status")] || "ACTIVE" } });
        created++;
      }
      showToast(`Imported ${created} worker(s).`, "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const columns = useMemo<TableColumn<WorkerRow>[]>(() => [
    { key: "fullName", label: "Name", render: (r) => <div><strong>{r.fullName}</strong><div className="td-muted" style={{ fontSize: 12 }}>{r.role}</div></div> },
    { key: "phone", label: "Phone", render: (r) => <span className="td-muted">{r.phone ?? "—"}</span> },
    { key: "shiftLabel", label: "Shift", render: (r) => <span className="td-muted">{r.shiftLabel ?? "—"}</span> },
    { key: "monthlySalary", label: "Salary/mo", render: (r) => <span>{r.monthlySalary > 0 ? `₦${r.monthlySalary.toLocaleString()}` : "—"}</span> },
    { key: "onDuty", label: "On duty", render: (r) => <span style={{ fontSize: 13, fontWeight: 600, color: r.onDuty ? "var(--green)" : "var(--ink3)" }}>{r.onDuty ? "Yes" : "No"}</span> },
    { key: "status", label: "Status", render: (r) => <span style={{ fontSize: 12 }}>{r.status}</span> },
    { key: "actions", label: "", render: (r) => <div style={{ display: "flex", gap: 8 }}><button type="button" className="btn btn-ghost btn-xs" onClick={() => fillForm(r)}>Edit</button><button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(r.id, r.fullName)}>Delete</button></div> },
  ], [token]);

  const onDuty = workers.filter((w) => w.onDuty).length;

  return (
    <EstatePortalShell topbarTitle="Workforce" breadcrumb="Workforce">
      <PageMeta title="Workforce — Estate" />
      <PageHeader title="Workforce" description={`${workers.length} worker(s) · ${onDuty} on duty`} actions={[{ label: "Export CSV", variant: "secondary" }, { label: "Import CSV", variant: "secondary" }]} />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Workers</div><div className="stat-value">{workers.length}</div></div>
        <div className="stat-card"><div className="stat-label">On Duty Now</div><div className="stat-value">{onDuty}</div></div>
        <div className="stat-card"><div className="stat-label">Monthly Payroll</div><div className="stat-value" style={{ fontSize: 16 }}>₦{workers.reduce((s, w) => s + w.monthlySalary, 0).toLocaleString()}</div></div>
      </div>

      {/* CSV actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>Export Workers CSV</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>{importing ? "Importing…" : "Import Workers CSV"}</button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />
          <span className="td-muted" style={{ fontSize: 12 }}>CSV columns: fullName, role, phone, monthlySalary, bankName, bankAccountNumber, shiftLabel, status</span>
        </div>
      </div>

      {/* Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{form.id ? "Edit Worker" : "Add Worker"}</h3>
          <form onSubmit={handleSave} className="estate-form-grid">
            <label>Full name <input className="form-input" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required /></label>
            <label>Role <input className="form-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} required placeholder="e.g. Security, Cleaner" /></label>
            <label>Phone <input className="form-input" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></label>
            <label>Monthly salary <input className="form-input" inputMode="numeric" value={form.monthlySalary} onChange={(e) => setForm((f) => ({ ...f, monthlySalary: e.target.value }))} /></label>
            <label>Bank name <input className="form-input" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} /></label>
            <label>Account number <input className="form-input" value={form.bankAccountNumber} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))} /></label>
            <label>Shift label <input className="form-input" value={form.shiftLabel} onChange={(e) => setForm((f) => ({ ...f, shiftLabel: e.target.value }))} placeholder="e.g. Day, Night" /></label>
            <label>Status
              <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.onDuty} onChange={(e) => setForm((f) => ({ ...f, onDuty: e.target.checked }))} /> On duty now
            </label>
            <label className="estate-form-wide">Notes <textarea className="form-input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : form.id ? "Update Worker" : "Add Worker"}</button>
              {form.id ? <button type="button" className="btn btn-secondary" onClick={() => setForm(initialForm)}>Cancel</button> : null}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><strong>All Workers</strong></div>
        <DataTable columns={columns} rows={workers} loading={loading} emptyMessage="No workers added yet." />
      </div>
    </EstatePortalShell>
  );
}
