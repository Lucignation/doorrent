import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import EstatePortalShell from "../../../components/auth/EstatePortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import DataTable from "../../../components/ui/DataTable";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { useEstateAdminPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import { convertRowsToCsv, parseCsvText, formatEstateCurrency, type EstateDashboardData } from "../../../lib/estate-preview";
import type { TableColumn } from "../../../types/app";

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type ResidenceRow = EstateDashboardData["residences"][number];
type ResidentRow = EstateDashboardData["residents"][number];

const initialForm = {
  id: "",
  houseNumber: "",
  block: "",
  label: "",
  ownerName: "",
  ownerPhone: "",
  billingBasis: "UNIT_BASED",
  status: "ACTIVE",
  notes: "",
};

export default function EstateHousesPage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;
  const houseFileRef = useRef<HTMLInputElement>(null);
  const residentFileRef = useRef<HTMLInputElement>(null);

  const [residences, setResidences] = useState<ResidenceRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
      setResidences(data.residences ?? []);
      setResidents(data.residents ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load houses.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  function fillForm(r: ResidenceRow) {
    setForm({ id: r.id, houseNumber: r.houseNumber, block: r.block ?? "", label: r.label ?? "", ownerName: r.ownerName ?? "", ownerPhone: r.ownerPhone ?? "", billingBasis: r.billingBasis, status: r.status, notes: r.notes ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        houseNumber: form.houseNumber,
        block: form.block || undefined,
        label: form.label || undefined,
        ownerName: form.ownerName || undefined,
        ownerPhone: form.ownerPhone || undefined,
        billingBasis: form.billingBasis,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (form.id) {
        await apiRequest(`/estate/residences/${form.id}`, { method: "PATCH", token, body });
        showToast("House updated.", "success");
      } else {
        await apiRequest("/estate/residences", { method: "POST", token, body });
        showToast("House added.", "success");
      }
      setForm(initialForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save house.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleExportHouses() {
    if (!residences.length) { showToast("No houses to export.", "error"); return; }
    const csv = convertRowsToCsv(residences.map((r) => ({ houseNumber: r.houseNumber, block: r.block ?? "", label: r.label ?? "", ownerName: r.ownerName ?? "", ownerPhone: r.ownerPhone ?? "", billingBasis: r.billingBasis, status: r.status, notes: r.notes ?? "" })));
    downloadCsv(csv, "houses.csv");
  }

  function handleExportResidents() {
    if (!residents.length) { showToast("No residents to export.", "error"); return; }
    const csv = convertRowsToCsv(residents.map((r) => ({ fullName: r.fullName, email: r.email ?? "", phone: r.phone ?? "", houseNumber: r.houseNumber ?? "", residentType: r.residentType, status: r.status })));
    downloadCsv(csv, "residents.csv");
  }

  async function handleImportHouses(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsvText(text);
      const idx = (col: string) => headers.findIndex((h) => h.toLowerCase() === col.toLowerCase());
      let created = 0;
      for (const row of rows) {
        const houseNumber = row[idx("houseNumber")] ?? row[idx("house_number")] ?? "";
        if (!houseNumber) continue;
        await apiRequest("/estate/residences", { method: "POST", token, body: { houseNumber, block: row[idx("block")] || undefined, label: row[idx("label")] || undefined, ownerName: row[idx("ownerName")] || undefined, ownerPhone: row[idx("ownerPhone")] || undefined, billingBasis: row[idx("billingBasis")] || "UNIT_BASED", status: row[idx("status")] || "ACTIVE", notes: row[idx("notes")] || undefined } });
        created++;
      }
      showToast(`Imported ${created} house(s).`, "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setImporting(false);
      if (houseFileRef.current) houseFileRef.current.value = "";
    }
  }

  async function handleImportResidents(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsvText(text);
      const idx = (col: string) => headers.findIndex((h) => h.toLowerCase() === col.toLowerCase());
      let created = 0;
      for (const [rowIndex, row] of rows.entries()) {
        const fullName = row[idx("fullName")] ?? row[idx("full_name")] ?? "";
        const houseNumber = row[idx("houseNumber")] ?? row[idx("house_number")] ?? "";
        const email = row[idx("email")]?.trim() ?? "";
        if (!fullName) continue;
        if (!email) {
          throw new Error(`Resident CSV row ${rowIndex + 2} is missing an email address.`);
        }
        // Find residence by houseNumber
        const residence = residences.find((r) => r.houseNumber === houseNumber);
        if (!residence?.id) {
          throw new Error(`Resident CSV row ${rowIndex + 2} references house "${houseNumber}" which was not found.`);
        }
        await apiRequest("/estate/residents", { method: "POST", token, body: { fullName, email, phone: row[idx("phone")] || undefined, residenceId: residence.id, residentType: row[idx("residentType")] || "TENANT", status: row[idx("status")] || "ACTIVE" } });
        created++;
      }
      showToast(`Imported ${created} resident(s).`, "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setImporting(false);
      if (residentFileRef.current) residentFileRef.current.value = "";
    }
  }

  async function handleDelete(id: string, houseNumber: string) {
    if (!token || !confirm(`Delete house "${houseNumber}"?`)) return;
    try {
      await apiRequest(`/estate/residences/${id}`, { method: "DELETE", token });
      showToast("House deleted.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete house.", "error");
    }
  }

  const columns = useMemo<TableColumn<ResidenceRow>[]>(() => [
    {
      key: "houseNumber",
      label: "House",
      render: (r) => (
        <div>
          <Link href={`/estate/houses/${r.id}`} style={{ fontWeight: 700, color: "var(--ink1)", textDecoration: "none" }}>
            {r.houseNumber}
          </Link>
          {r.block ? <div className="td-muted" style={{ fontSize: 12 }}>Block {r.block}{r.label ? ` · ${r.label}` : ""}</div> : null}
        </div>
      ),
    },
    {
      key: "ownerName",
      label: "Owner",
      render: (r) => (
        <div>
          <span>{r.ownerName ?? "—"}</span>
          {r.ownerPhone ? <div className="td-muted" style={{ fontSize: 12 }}>{r.ownerPhone}</div> : null}
        </div>
      ),
    },
    {
      key: "occupantsCount",
      label: "Occupants",
      render: (r) => <span className="td-muted">{r.occupantsCount}</span>,
    },
    {
      key: "billingBasis",
      label: "Billing",
      render: (r) => <span className="td-muted">{r.billingBasis === "UNIT_BASED" ? "Per house" : "Per resident"}</span>,
    },
    {
      key: "accessCode",
      label: "Codes",
      render: (r) => (
        <div style={{ fontSize: 12 }}>
          <div className="td-muted">In: <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>{r.accessCode}</code></div>
          <div className="td-muted">Out: <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>{r.exitCode}</code></div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "green" : "gray"}>{r.status}</StatusBadge>,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/estate/houses/${r.id}`} className="btn btn-ghost btn-xs">View</Link>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillForm(r)}>Edit</button>
          <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(r.id, r.houseNumber)}>Delete</button>
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

  const activeHouses = residences.filter((r) => r.status === "ACTIVE").length;
  const totalOccupants = residences.reduce((s, r) => s + r.occupantsCount, 0);

  return (
    <EstatePortalShell topbarTitle="Houses & Residents" breadcrumb="Houses & Residents">
      <PageMeta title="Houses & Residents — Estate" />
      <PageHeader title="Houses & Residents" description={`${residences.length} house(s) · ${residents.length} resident(s)`} />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Houses</div><div className="stat-value">{residences.length}</div></div>
        <div className="stat-card"><div className="stat-label">Active Houses</div><div className="stat-value">{activeHouses}</div></div>
        <div className="stat-card"><div className="stat-label">Total Occupants</div><div className="stat-value">{totalOccupants}</div></div>
        <div className="stat-card"><div className="stat-label">Residents</div><div className="stat-value">{residents.length}</div></div>
      </div>

      {/* CSV actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportHouses}>Export Houses CSV</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => houseFileRef.current?.click()} disabled={importing}>{importing ? "Importing…" : "Import Houses CSV"}</button>
          <input ref={houseFileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportHouses} />
          <span style={{ borderLeft: "1px solid var(--border)", paddingLeft: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportResidents}>Export Residents CSV</button>
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => residentFileRef.current?.click()} disabled={importing}>{importing ? "Importing…" : "Import Residents CSV"}</button>
          <input ref={residentFileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportResidents} />
          <span className="td-muted" style={{ fontSize: 12 }}>Houses CSV: houseNumber, block, label, ownerName, ownerPhone, billingBasis, status · Residents CSV: fullName, email, phone, houseNumber, residentType, status. Email is required for resident portal sign-in.</span>
        </div>
      </div>

      {/* House form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{form.id ? "Edit House" : "Add House"}</h3>
          <form onSubmit={handleSave} className="estate-form-grid">
            <label>House number <input className="form-input" value={form.houseNumber} onChange={(e) => setForm((f) => ({ ...f, houseNumber: e.target.value }))} required /></label>
            <label>Block <input className="form-input" value={form.block} onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))} placeholder="e.g. A" /></label>
            <label>Label <input className="form-input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Detached" /></label>
            <label>Owner name <input className="form-input" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} /></label>
            <label>Owner phone <input className="form-input" type="tel" value={form.ownerPhone} onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value }))} /></label>
            <label>Billing basis
              <select className="form-input" value={form.billingBasis} onChange={(e) => setForm((f) => ({ ...f, billingBasis: e.target.value }))}>
                <option value="UNIT_BASED">Per house</option>
                <option value="RESIDENT_BASED">Per resident</option>
              </select>
            </label>
            <label>Status
              <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="VACANT">Vacant</option>
              </select>
            </label>
            <label className="estate-form-wide">Notes <textarea className="form-input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : form.id ? "Update House" : "Add House"}</button>
              {form.id ? <button type="button" className="btn btn-secondary" onClick={() => setForm(initialForm)}>Cancel</button> : null}
            </div>
          </form>
        </div>
      </div>

      {/* Houses table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><strong>All Houses</strong></div>
        <DataTable columns={columns} rows={residences} loading={loading} emptyMessage="No houses added yet." />
      </div>

      {/* Residents table */}
      <div className="card">
        <div className="card-header"><strong>All Residents</strong></div>
        <DataTable columns={residentColumns} rows={residents} loading={loading} emptyMessage="No residents found." />
      </div>
    </EstatePortalShell>
  );
}
