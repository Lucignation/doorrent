import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { convertRowsToCsv, type EstateDashboardData } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

type PassRow = EstateDashboardData["passes"][number];
type ResidenceRow = EstateDashboardData["residences"][number];

const initialForm = {
  id: "", residenceId: "", type: "VISITOR", holderName: "", purpose: "",
  peopleCount: "1", vehicleDetails: "", validFrom: "", validUntil: "", status: "ACTIVE",
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function EstatePassesPage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const token = landlordSession?.token;

  const [passes, setPasses] = useState<PassRow[]>([]);
  const [residences, setResidences] = useState<ResidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "USED" | "EXPIRED">("ALL");

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
      setPasses(data.passes ?? []);
      setResidences(data.residences ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load passes.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = { residenceId: form.residenceId || undefined, type: form.type, holderName: form.holderName, purpose: form.purpose || undefined, peopleCount: Number(form.peopleCount) || 1, vehicleDetails: form.vehicleDetails || undefined, validFrom: form.validFrom || undefined, validUntil: form.validUntil || undefined, status: form.status };
      if (form.id) {
        await apiRequest(`/estate/passes/${form.id}`, { method: "PATCH", token, body });
        showToast("Pass updated.", "success");
      } else {
        await apiRequest("/estate/passes", { method: "POST", token, body });
        showToast("Pass created.", "success");
      }
      setForm(initialForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save pass.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!token || !confirm(`Delete pass for "${name}"?`)) return;
    try {
      await apiRequest(`/estate/passes/${id}`, { method: "DELETE", token });
      showToast("Pass deleted.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete.", "error");
    }
  }

  function handleExport() {
    const rows = filteredPasses;
    if (!rows.length) { showToast("No passes to export.", "error"); return; }
    const csv = convertRowsToCsv(rows.map((p) => ({ holderName: p.holderName, type: p.type, houseNumber: p.houseNumber ?? "", purpose: p.purpose ?? "", peopleCount: p.peopleCount, vehicleDetails: p.vehicleDetails ?? "", accessCode: p.accessCode, status: p.status, validFrom: p.validFrom, validUntil: p.validUntil })));
    downloadCsv(csv, "passes.csv");
  }

  const filteredPasses = useMemo(() => filter === "ALL" ? passes : passes.filter((p) => p.status === filter), [passes, filter]);

  const columns = useMemo<TableColumn<PassRow>[]>(() => [
    { key: "holderName", label: "Holder", render: (r) => <div><strong>{r.holderName}</strong><div className="td-muted" style={{ fontSize: 12 }}>{r.type}{r.houseNumber ? ` · House ${r.houseNumber}` : ""}</div></div> },
    { key: "purpose", label: "Purpose", render: (r) => <span className="td-muted">{r.purpose ?? "—"}</span> },
    { key: "peopleCount", label: "People", render: (r) => <span>{r.peopleCount}</span> },
    { key: "accessCode", label: "Code", render: (r) => <code style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, background: "var(--bg)", padding: "2px 8px", borderRadius: 6 }}>{r.accessCode}</code> },
    { key: "validUntil", label: "Valid until", render: (r) => <span className="td-muted">{r.validUntil ? new Date(r.validUntil).toLocaleDateString("en-NG") : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <span style={{ fontSize: 12, fontWeight: 600, color: r.status === "ACTIVE" ? "var(--green)" : "var(--ink3)" }}>{r.status}</span> },
    { key: "actions", label: "", render: (r) => <div style={{ display: "flex", gap: 8 }}><button type="button" className="btn btn-ghost btn-xs" onClick={() => { setForm({ id: r.id, residenceId: "", type: r.type, holderName: r.holderName, purpose: r.purpose ?? "", peopleCount: String(r.peopleCount), vehicleDetails: r.vehicleDetails ?? "", validFrom: r.validFrom, validUntil: r.validUntil, status: r.status }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(r.id, r.holderName)}>Delete</button></div> },
  ], [token]);

  const activeCount = passes.filter((p) => p.status === "ACTIVE").length;

  return (
    <EstatePortalShell topbarTitle="Pass Centre" breadcrumb="Pass Centre">
      <PageMeta title="Pass Centre — Estate" />
      <PageHeader title="Pass Centre" description={`${passes.length} pass(es) · ${activeCount} active`} />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Passes</div><div className="stat-value">{passes.length}</div></div>
        <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value">{activeCount}</div></div>
        <div className="stat-card"><div className="stat-label">Used</div><div className="stat-value">{passes.filter((p) => p.status === "USED").length}</div></div>
        <div className="stat-card"><div className="stat-label">Expired</div><div className="stat-value">{passes.filter((p) => p.status === "EXPIRED").length}</div></div>
      </div>

      {/* CSV export */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>Export CSV</button>
          <span className="td-muted" style={{ fontSize: 12 }}>Exports the currently filtered view.</span>
        </div>
      </div>

      {/* Issue pass form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{form.id ? "Edit Pass" : "Issue Pass"}</h3>
          <form onSubmit={handleSave} className="estate-form-grid">
            <label>Holder name <input className="form-input" value={form.holderName} onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))} required /></label>
            <label>Type
              <select className="form-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="VISITOR">Visitor</option>
                <option value="DELIVERY">Delivery</option>
                <option value="WORKER">Worker</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="MOVE">Move in/out</option>
              </select>
            </label>
            <label>House
              <select className="form-input" value={form.residenceId} onChange={(e) => setForm((f) => ({ ...f, residenceId: e.target.value }))}>
                <option value="">No specific house</option>
                {residences.map((r) => <option key={r.id} value={r.id}>House {r.houseNumber}{r.block ? ` Block ${r.block}` : ""}</option>)}
              </select>
            </label>
            <label>Purpose <input className="form-input" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Delivery, Visit" /></label>
            <label>People count <input className="form-input" inputMode="numeric" value={form.peopleCount} onChange={(e) => setForm((f) => ({ ...f, peopleCount: e.target.value }))} /></label>
            <label>Vehicle details <input className="form-input" value={form.vehicleDetails} onChange={(e) => setForm((f) => ({ ...f, vehicleDetails: e.target.value }))} placeholder="Plate number, color, make" /></label>
            <label>Valid from <input className="form-input" type="datetime-local" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} /></label>
            <label>Valid until <input className="form-input" type="datetime-local" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} /></label>
            <label>Status
              <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="USED">Used</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : form.id ? "Update Pass" : "Issue Pass"}</button>
              {form.id ? <button type="button" className="btn btn-secondary" onClick={() => setForm(initialForm)}>Cancel</button> : null}
            </div>
          </form>
        </div>
      </div>

      {/* Filter + table */}
      <div className="card">
        <div className="card-header" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <strong>All Passes</strong>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {(["ALL", "ACTIVE", "USED", "EXPIRED"] as const).map((s) => (
              <button key={s} type="button" className={`btn btn-xs ${filter === s ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
        <DataTable columns={columns} rows={filteredPasses} loading={loading} emptyMessage="No passes found." />
      </div>
    </EstatePortalShell>
  );
}
