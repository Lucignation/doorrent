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

// Extended ledger row returned from /estate/dues-ledger
interface ResidentDuesLedgerRow {
  residentId: string;
  fullName: string;
  houseNumber: string | null;
  residentType: string;
  phone: string | null;
  email: string | null;
  duesStartDate: string | null;
  lastPaidAt: string | null;
  nextDueDate: string | null;
  outstandingBalance: number;
  totalPaid: number;
  status: string;
}

const initialChargeForm = {
  id: "", title: "", amount: "", frequency: "YEARLY", billingBasis: "UNIT_BASED", status: "ACTIVE", notes: "",
};

const initialLedgerForm = {
  residentId: "", duesStartDate: "", lastPaidAt: "", note: "",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("en-NG"); } catch { return value; }
}

function nextDueLabel(row: ResidentDuesLedgerRow) {
  if (!row.duesStartDate) return "Not set";
  if (row.nextDueDate) return formatDate(row.nextDueDate);
  return "—";
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export default function EstateDuesPage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;
  const chargeFileRef = useRef<HTMLInputElement>(null);
  const ledgerFileRef = useRef<HTMLInputElement>(null);

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [ledger, setLedger] = useState<ResidentDuesLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [chargeForm, setChargeForm] = useState(initialChargeForm);
  const [ledgerForm, setLedgerForm] = useState(initialLedgerForm);
  const [saving, setSaving] = useState(false);
  const [savingLedger, setSavingLedger] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"charges" | "ledger">("charges");

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

  async function loadLedger() {
    if (!token) return;
    setLedgerLoading(true);
    try {
      const { data } = await apiRequest<{ ledger: ResidentDuesLedgerRow[] }>("/estate/dues-ledger", { token });
      setLedger(data.ledger ?? []);
    } catch {
      // ledger endpoint may not exist yet — silently ignore
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  }

  useEffect(() => { void loadData(); void loadLedger(); }, [token, dataRefreshVersion]);

  // ── Charge export/import ──────────────────────────────────────────────────
  function handleExportCharges() {
    if (!charges.length) { showToast("No charges to export.", "error"); return; }
    const csv = convertRowsToCsv(charges.map((c) => ({
      title: c.title, amount: c.amount, frequency: c.frequency,
      billingBasis: c.billingBasis, status: c.status, notes: c.notes ?? "",
    })));
    downloadCsv(csv, "charges.csv");
  }

  async function handleImportCharges(event: React.ChangeEvent<HTMLInputElement>) {
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
        await apiRequest("/estate/charges", {
          method: "POST", token,
          body: {
            title, amount,
            frequency: row[idx("frequency")] || "YEARLY",
            billingBasis: row[idx("billingBasis")] || row[idx("billing_basis")] || "UNIT_BASED",
            status: row[idx("status")] || "ACTIVE",
            notes: row[idx("notes")] || undefined,
          },
        });
        created++;
      }
      showToast(`Imported ${created} charge(s).`, "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setImporting(false);
      if (chargeFileRef.current) chargeFileRef.current.value = "";
    }
  }

  // ── Ledger import — supports bulk onboarding with dues start date ──────────
  function handleExportLedger() {
    if (!ledger.length) { showToast("No ledger rows to export.", "error"); return; }
    const csv = convertRowsToCsv(ledger.map((r) => ({
      fullName: r.fullName, houseNumber: r.houseNumber ?? "",
      residentType: r.residentType, phone: r.phone ?? "",
      duesStartDate: r.duesStartDate ?? "", lastPaidAt: r.lastPaidAt ?? "",
      outstandingBalance: r.outstandingBalance, totalPaid: r.totalPaid,
    })));
    downloadCsv(csv, "dues-ledger.csv");
  }

  async function handleImportLedger(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsvText(text);
      const idx = (col: string) => headers.findIndex((h) => h.toLowerCase() === col.toLowerCase());
      let updated = 0;
      for (const row of rows) {
        const residentId = row[idx("residentId")] ?? "";
        const duesStartDate = row[idx("duesStartDate")] || row[idx("dues_start_date")] || "";
        const lastPaidAt = row[idx("lastPaidAt")] || row[idx("last_paid_at")] || "";
        if (!residentId) continue;
        await apiRequest(`/estate/dues-ledger/${residentId}`, {
          method: "PATCH", token,
          body: {
            duesStartDate: duesStartDate || undefined,
            lastPaidAt: lastPaidAt || undefined,
          },
        });
        updated++;
      }
      showToast(`Updated ${updated} resident dues ledger row(s).`, "success");
      void loadLedger();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ledger import failed.", "error");
    } finally {
      setImporting(false);
      if (ledgerFileRef.current) ledgerFileRef.current.value = "";
    }
  }

  // ── Charge CRUD ───────────────────────────────────────────────────────────
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

  // ── Ledger individual update ───────────────────────────────────────────────
  function fillLedgerForm(r: ResidentDuesLedgerRow) {
    setLedgerForm({
      residentId: r.residentId,
      duesStartDate: r.duesStartDate ? r.duesStartDate.slice(0, 10) : "",
      lastPaidAt: r.lastPaidAt ? r.lastPaidAt.slice(0, 10) : "",
      note: "",
    });
    setActiveTab("ledger");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveLedger(event: FormEvent) {
    event.preventDefault();
    if (!token || !ledgerForm.residentId) return;
    setSavingLedger(true);
    try {
      await apiRequest(`/estate/dues-ledger/${ledgerForm.residentId}`, {
        method: "PATCH", token,
        body: {
          duesStartDate: ledgerForm.duesStartDate || undefined,
          lastPaidAt: ledgerForm.lastPaidAt || undefined,
          note: ledgerForm.note || undefined,
        },
      });
      showToast("Dues record updated.", "success");
      setLedgerForm(initialLedgerForm);
      void loadLedger();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update dues record.", "error");
    } finally {
      setSavingLedger(false);
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const chargeColumns = useMemo<TableColumn<ChargeRow>[]>(() => [
    { key: "title", label: "Charge", render: (r) => <strong>{r.title}</strong> },
    {
      key: "frequency", label: "Frequency",
      render: (r) => (
        <StatusBadge tone={r.frequency === "ONE_OFF" ? "amber" : "blue"}>
          {r.frequency === "ONE_OFF" ? "One-off" : r.frequency === "YEARLY" ? "Annual" : r.frequency === "QUARTERLY" ? "Quarterly" : "Monthly"}
        </StatusBadge>
      ),
    },
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

  const ledgerColumns = useMemo<TableColumn<ResidentDuesLedgerRow>[]>(() => [
    {
      key: "fullName", label: "Resident",
      render: (r) => (
        <div>
          <strong>{r.fullName}</strong>
          <div className="td-muted" style={{ fontSize: 12 }}>{r.residentType} · House {r.houseNumber ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "duesStartDate", label: "Dues Started",
      render: (r) => (
        <span style={{ fontSize: 13, color: r.duesStartDate ? "var(--ink)" : "var(--ink3)" }}>
          {r.duesStartDate ? formatDate(r.duesStartDate) : <em style={{ color: "var(--amber)" }}>Not set</em>}
        </span>
      ),
    },
    {
      key: "lastPaidAt", label: "Last Paid",
      render: (r) => <span className="td-muted" style={{ fontSize: 13 }}>{formatDate(r.lastPaidAt)}</span>,
    },
    {
      key: "nextDueDate", label: "Next Due",
      render: (r) => {
        const days = daysUntil(r.nextDueDate);
        const overdue = days !== null && days < 0;
        const soon = days !== null && days >= 0 && days <= 14;
        return (
          <span style={{ fontSize: 13, fontWeight: 600, color: overdue ? "var(--red)" : soon ? "var(--amber)" : "var(--ink2)" }}>
            {nextDueLabel(r)}
            {overdue ? <span style={{ marginLeft: 6, fontSize: 11 }}>OVERDUE</span> : null}
            {soon && !overdue ? <span style={{ marginLeft: 6, fontSize: 11 }}>({days}d)</span> : null}
          </span>
        );
      },
    },
    {
      key: "outstandingBalance", label: "Outstanding",
      render: (r) => (
        <strong style={{ color: r.outstandingBalance > 0 ? "var(--red)" : "var(--green)" }}>
          {formatEstateCurrency(r.outstandingBalance)}
        </strong>
      ),
    },
    { key: "totalPaid", label: "Total Paid", render: (r) => <span className="td-muted">{formatEstateCurrency(r.totalPaid)}</span> },
    {
      key: "actions", label: "",
      render: (r) => (
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillLedgerForm(r)}>Set dates</button>
      ),
    },
  ], []);

  const residentColumns = useMemo<TableColumn<ResidentRow>[]>(() => [
    { key: "fullName", label: "Resident", render: (r) => <strong>{r.fullName}</strong> },
    { key: "houseNumber", label: "House", render: (r) => <span>{r.houseNumber ?? "—"}</span> },
    { key: "residentType", label: "Type", render: (r) => <StatusBadge tone="blue">{r.residentType}</StatusBadge> },
    { key: "phone", label: "Phone", render: (r) => <span className="td-muted">{r.phone ?? "—"}</span> },
    { key: "email", label: "Email", render: (r) => <span className="td-muted">{r.email ?? "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "green" : "gray"}>{r.status}</StatusBadge> },
  ], []);

  const totalDues = charges.filter((c) => c.status === "ACTIVE").reduce((sum, c) => sum + c.amount, 0);
  const overdueCount = ledger.filter((r) => (daysUntil(r.nextDueDate) ?? 1) < 0 || r.outstandingBalance > 0).length;
  const noStartDate = ledger.filter((r) => !r.duesStartDate).length;

  const selectedResident = residents.find((r) => r.id === ledgerForm.residentId);

  return (
    <EstatePortalShell topbarTitle="Estate Dues" breadcrumb="Estate Dues">
      <PageMeta title="Estate Dues" />
      <PageHeader
        title="Estate Dues"
        description={`${charges.length} charge type(s) · ${residents.length} residents`}
        actions={[{ label: "Manage Houses", href: "/estate/houses", variant: "secondary" }]}
      />

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Charge Types</div>
          <div className="stat-value">{charges.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Annual Dues Per Unit</div>
          <div className="stat-value">{formatEstateCurrency(totalDues)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Residents</div>
          <div className="stat-value">{residents.filter((r) => r.status === "ACTIVE").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: overdueCount > 0 ? "var(--red)" : undefined }}>Overdue / Owing</div>
          <div className="stat-value" style={{ color: overdueCount > 0 ? "var(--red)" : undefined }}>{overdueCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: noStartDate > 0 ? "var(--amber)" : undefined }}>Missing Start Date</div>
          <div className="stat-value" style={{ color: noStartDate > 0 ? "var(--amber)" : undefined }}>{noStartDate}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["charges", "ledger"] as const).map((tab) => (
          <button key={tab} type="button" className={`btn btn-sm ${activeTab === tab ? "btn-primary" : "btn-ghost"}`} onClick={() => setActiveTab(tab)}>
            {tab === "charges" ? "Charge Types" : "Resident Dues Ledger"}
          </button>
        ))}
      </div>

      {/* ── CHARGES TAB ── */}
      {activeTab === "charges" && (
        <>
          {/* CSV actions */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCharges}>Export Charges CSV</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => chargeFileRef.current?.click()} disabled={importing}>
                {importing ? "Importing…" : "Import Charges CSV"}
              </button>
              <input ref={chargeFileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCharges} />
              <span className="td-muted" style={{ fontSize: 12 }}>
                CSV columns: title, amount, frequency (YEARLY/QUARTERLY/MONTHLY/ONE_OFF), billingBasis, status, notes
              </span>
            </div>
          </div>

          {/* Charge form */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                {chargeForm.id ? "Edit Charge" : "Create Charge"}
              </h3>
              <form onSubmit={handleSaveCharge} className="estate-form-grid">
                <label>Title
                  <input className="form-input" value={chargeForm.title} onChange={(e) => setChargeForm((c) => ({ ...c, title: e.target.value }))} required />
                </label>
                <label>Amount
                  <input className="form-input" inputMode="numeric" value={chargeForm.amount} onChange={(e) => setChargeForm((c) => ({ ...c, amount: e.target.value }))} required />
                </label>
                <label>Frequency
                  <select className="form-input" value={chargeForm.frequency} onChange={(e) => setChargeForm((c) => ({ ...c, frequency: e.target.value }))}>
                    <option value="ONE_OFF">One-off (occasional)</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Annual</option>
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
                <label className="estate-form-wide">Notes
                  <textarea className="form-input" rows={2} value={chargeForm.notes} onChange={(e) => setChargeForm((c) => ({ ...c, notes: e.target.value }))} />
                </label>
                <div className="estate-form-actions estate-form-wide">
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : chargeForm.id ? "Update Charge" : "Create Charge"}</button>
                  {chargeForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setChargeForm(initialChargeForm)}>Cancel</button> : null}
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><strong>Charge Types</strong></div>
            <DataTable columns={chargeColumns} rows={charges} loading={loading} emptyMessage="No charges configured yet." />
          </div>
        </>
      )}

      {/* ── LEDGER TAB ── */}
      {activeTab === "ledger" && (
        <>
          {/* Info banner */}
          <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--amber)" }}>
            <div className="card-body" style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.7 }}>
              <strong>How dues tracking works:</strong> Each resident's annual dues cycle starts from their personal <em>dues start date</em>.
              When a resident pays, record the date as <em>last paid</em> — the system calculates their next due date exactly 1 year later.
              One-off (occasional) charges are tracked separately and do not roll over.
              During onboarding, use the CSV import to bulk-set dues start dates and last-paid dates for existing residents.
            </div>
          </div>

          {/* Bulk import / export */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportLedger}>Export Ledger CSV</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => ledgerFileRef.current?.click()} disabled={importing}>
                {importing ? "Importing…" : "Import Ledger CSV"}
              </button>
              <input ref={ledgerFileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportLedger} />
              <span className="td-muted" style={{ fontSize: 12 }}>CSV columns: residentId, duesStartDate (YYYY-MM-DD), lastPaidAt (YYYY-MM-DD)</span>
            </div>
          </div>

          {/* Ledger edit form */}
          {ledgerForm.residentId && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-body">
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  Update Dues Record
                </h3>
                {selectedResident && (
                  <p className="td-muted" style={{ fontSize: 13, marginBottom: 16 }}>
                    {selectedResident.fullName} · House {selectedResident.houseNumber ?? "—"}
                  </p>
                )}
                <form onSubmit={handleSaveLedger} className="estate-form-grid">
                  <label>
                    Dues start date
                    <div className="td-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      The date this resident's annual dues cycle began (or the date they moved in / started paying).
                    </div>
                    <input className="form-input" type="date" value={ledgerForm.duesStartDate}
                      onChange={(e) => setLedgerForm((f) => ({ ...f, duesStartDate: e.target.value }))} />
                  </label>
                  <label>
                    Last payment date
                    <div className="td-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      The date of the most recent dues payment — used to calculate when the next annual due falls.
                    </div>
                    <input className="form-input" type="date" value={ledgerForm.lastPaidAt}
                      onChange={(e) => setLedgerForm((f) => ({ ...f, lastPaidAt: e.target.value }))} />
                  </label>
                  <label className="estate-form-wide">
                    Note (optional)
                    <input className="form-input" value={ledgerForm.note}
                      onChange={(e) => setLedgerForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="e.g. Transferred from previous system record" />
                  </label>
                  <div className="estate-form-actions estate-form-wide">
                    <button type="submit" className="btn btn-primary" disabled={savingLedger}>
                      {savingLedger ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setLedgerForm(initialLedgerForm)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Ledger table */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <strong>Resident Dues Ledger</strong>
              <span className="td-muted" style={{ marginLeft: 8, fontSize: 12 }}>{ledger.length} residents</span>
            </div>
            <DataTable columns={ledgerColumns} rows={ledger} loading={ledgerLoading} emptyMessage="No ledger data. Residents will appear here once the dues ledger endpoint is available." />
          </div>

          {/* Residents reference */}
          <div className="card">
            <div className="card-header">
              <strong>All Residents</strong>
              <Link href="/estate/houses" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>View Houses →</Link>
            </div>
            <DataTable columns={residentColumns} rows={residents} loading={loading} emptyMessage="No residents found." />
          </div>
        </>
      )}
    </EstatePortalShell>
  );
}
