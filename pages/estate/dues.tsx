import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
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

type ChargeRow = EstateDashboardData["charges"][number];
type ResidentRow = EstateDashboardData["residents"][number];

const initialChargeForm = { id: "", title: "", amount: "", frequency: "MONTHLY", billingBasis: "UNIT_BASED", status: "ACTIVE", notes: "" };

export default function EstateDuesPage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargeForm, setChargeForm] = useState(initialChargeForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
      setCharges(data.charges ?? []);
      setResidents(data.residents ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load dues data.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  function handleExport() {
    if (!charges.length) { showToast("No charges to export.", "error"); return; }
    const csv = convertRowsToCsv(charges.map((c) => ({ title: c.title, amount: c.amount, frequency: c.frequency, billingBasis: c.billingBasis, status: c.status, notes: c.notes ?? "" })));
    downloadCsv(csv, "charges.csv");
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
        await apiRequest("/estate/charges", { method: "POST", token, body: { title, amount, frequency: row[idx("frequency")] || "MONTHLY", billingBasis: row[idx("billingBasis")] || row[idx("billing_basis")] || "UNIT_BASED", status: row[idx("status")] || "ACTIVE", notes: row[idx("notes")] || undefined } });
        created++;
      }
      showToast(`Imported ${created} charge(s).`, "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function fillChargeForm(c: ChargeRow) {
    setChargeForm({ id: c.id, title: c.title, amount: String(c.amount), frequency: c.frequency, billingBasis: c.billingBasis, status: c.status, notes: c.notes ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveCharge(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = { title: chargeForm.title, amount: Number(chargeForm.amount), frequency: chargeForm.frequency, billingBasis: chargeForm.billingBasis, status: chargeForm.status, notes: chargeForm.notes || undefined };
      if (chargeForm.id) {
        await apiRequest(`/estate/charges/${chargeForm.id}`, { method: "PATCH", token, body });
        showToast("Charge updated.", "success");
      } else {
        await apiRequest("/estate/charges", { method: "POST", token, body });
        showToast("Charge created.", "success");
      }
      setChargeForm(initialChargeForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save charge.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCharge(id: string, title: string) {
    if (!token || !confirm(`Delete charge "${title}"?`)) return;
    try {
      await apiRequest(`/estate/charges/${id}`, { method: "DELETE", token });
      showToast("Charge deleted.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete charge.", "error");
    }
  }

  const chargeColumns = useMemo<TableColumn<ChargeRow>[]>(() => [
    { key: "title", label: "Charge", render: (r) => <strong>{r.title}</strong> },
    { key: "frequency", label: "Frequency", render: (r) => <StatusBadge tone="blue">{r.frequency}</StatusBadge> },
    { key: "billingBasis", label: "Basis", render: (r) => <span className="td-muted">{r.billingBasis === "UNIT_BASED" ? "Per house" : "Per resident"}</span> },
    { key: "amount", label: "Amount", render: (r) => <strong>{formatEstateCurrency(r.amount)}</strong> },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "green" : "gray"}>{r.status}</StatusBadge> },
    {
      key: "actions", label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillChargeForm(r)}>Edit</button>
          <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDeleteCharge(r.id, r.title)}>Delete</button>
        </div>
      ),
    },
  ], [token]);

  const residentColumns = useMemo<TableColumn<ResidentRow>[]>(() => [
    { key: "fullName", label: "Resident", render: (r) => <strong>{r.fullName}</strong> },
    { key: "houseNumber", label: "House", render: (r) => <span>{r.houseNumber ?? "—"}</span> },
    { key: "residentType", label: "Type", render: (r) => <StatusBadge tone="blue">{r.residentType}</StatusBadge> },
    { key: "phone", label: "Phone", render: (r) => <span className="td-muted">{r.phone ?? "—"}</span> },
    { key: "email", label: "Email", render: (r) => <span className="td-muted">{r.email ?? "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "green" : "gray"}>{r.status}</StatusBadge> },
  ], []);

  const totalDues = charges.reduce((sum, c) => sum + c.amount, 0);

  return (
    <EstatePortalShell topbarTitle="Estate Dues" breadcrumb="Estate Dues">
      <PageMeta title="Estate Dues" />
      <PageHeader
        title="Estate Dues"
        description={`${charges.length} charge type(s) · ${residents.length} residents`}
        actions={[{ label: "Manage Houses", href: "/estate/houses", variant: "secondary" }]}
      />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Charge Types</div>
          <div className="stat-value">{charges.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Due Per Cycle</div>
          <div className="stat-value">{formatEstateCurrency(totalDues)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Residents</div>
          <div className="stat-value">{residents.filter((r) => r.status === "ACTIVE").length}</div>
        </div>
      </div>

      {/* CSV actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>Export Charges CSV</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>{importing ? "Importing…" : "Import Charges CSV"}</button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />
          <span className="td-muted" style={{ fontSize: 12 }}>CSV columns: title, amount, frequency, billingBasis, status, notes</span>
        </div>
      </div>

      {/* Charge form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            {chargeForm.id ? "Edit Charge" : "Create Charge"}
          </h3>
          <form onSubmit={handleSaveCharge} className="estate-form-grid">
            <label>Title <input className="form-input" value={chargeForm.title} onChange={(e) => setChargeForm((c) => ({ ...c, title: e.target.value }))} required /></label>
            <label>Amount <input className="form-input" inputMode="numeric" value={chargeForm.amount} onChange={(e) => setChargeForm((c) => ({ ...c, amount: e.target.value }))} required /></label>
            <label>Frequency
              <select className="form-input" value={chargeForm.frequency} onChange={(e) => setChargeForm((c) => ({ ...c, frequency: e.target.value }))}>
                <option value="ONE_OFF">One-off</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </label>
            <label>Billing basis
              <select className="form-input" value={chargeForm.billingBasis} onChange={(e) => setChargeForm((c) => ({ ...c, billingBasis: e.target.value }))}>
                <option value="UNIT_BASED">Per house</option>
                <option value="RESIDENT_BASED">Per resident</option>
              </select>
            </label>
            <label>Status
              <select className="form-input" value={chargeForm.status} onChange={(e) => setChargeForm((c) => ({ ...c, status: e.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <label className="estate-form-wide">Notes <textarea className="form-input" rows={2} value={chargeForm.notes} onChange={(e) => setChargeForm((c) => ({ ...c, notes: e.target.value }))} /></label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : chargeForm.id ? "Update Charge" : "Create Charge"}</button>
              {chargeForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setChargeForm(initialChargeForm)}>Cancel</button> : null}
            </div>
          </form>
        </div>
      </div>

      {/* Charges table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><strong>Charge Types</strong></div>
        <DataTable columns={chargeColumns} rows={charges} loading={loading} emptyMessage="No charges configured yet." />
      </div>

      {/* Residents table */}
      <div className="card">
        <div className="card-header">
          <strong>Residents</strong>
          <Link href="/estate/houses" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>View Houses →</Link>
        </div>
        <DataTable columns={residentColumns} rows={residents} loading={loading} emptyMessage="No residents found." />
      </div>
    </EstatePortalShell>
  );
}
