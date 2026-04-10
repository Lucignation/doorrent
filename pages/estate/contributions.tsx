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

type CauseRow = EstateDashboardData["causes"][number];
type ContributionRow = EstateDashboardData["contributions"][number];

const initialCauseForm = { id: "", title: "", description: "", targetAmount: "", contributionMode: "FLEXIBLE", fixedContributionAmount: "", deadline: "", status: "DRAFT" };
const initialContribForm = { id: "", causeId: "", contributorName: "", amount: "", status: "PENDING", note: "", paidAt: "" };

export default function EstateContributionsPage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;
  const contribFileRef = useRef<HTMLInputElement>(null);

  const [causes, setCauses] = useState<CauseRow[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [causeForm, setCauseForm] = useState(initialCauseForm);
  const [contribForm, setContribForm] = useState(initialContribForm);
  const [savingCause, setSavingCause] = useState(false);
  const [savingContrib, setSavingContrib] = useState(false);
  const [importing, setImporting] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
      setCauses(data.causes ?? []);
      setContributions(data.contributions ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load contributions.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  async function handleSaveCause(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSavingCause(true);
    try {
      const body = { title: causeForm.title, description: causeForm.description || undefined, targetAmount: Number(causeForm.targetAmount), contributionMode: causeForm.contributionMode, fixedContributionAmount: causeForm.fixedContributionAmount ? Number(causeForm.fixedContributionAmount) : undefined, deadline: causeForm.deadline || undefined, status: causeForm.status };
      if (causeForm.id) {
        await apiRequest(`/estate/causes/${causeForm.id}`, { method: "PATCH", token, body });
        showToast("Cause updated.", "success");
      } else {
        await apiRequest("/estate/causes", { method: "POST", token, body });
        showToast("Cause created.", "success");
      }
      setCauseForm(initialCauseForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save cause.", "error");
    } finally {
      setSavingCause(false);
    }
  }

  async function handleSaveContrib(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSavingContrib(true);
    try {
      const body = { causeId: contribForm.causeId, contributorName: contribForm.contributorName, amount: Number(contribForm.amount), status: contribForm.status, note: contribForm.note || undefined, paidAt: contribForm.paidAt || undefined };
      if (contribForm.id) {
        await apiRequest(`/estate/contributions/${contribForm.id}`, { method: "PATCH", token, body });
        showToast("Contribution updated.", "success");
      } else {
        await apiRequest("/estate/contributions", { method: "POST", token, body });
        showToast("Contribution recorded.", "success");
      }
      setContribForm(initialContribForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save contribution.", "error");
    } finally {
      setSavingContrib(false);
    }
  }

  function handleExportContributions() {
    if (!contributions.length) { showToast("No contributions to export.", "error"); return; }
    const csv = convertRowsToCsv(contributions.map((c) => {
      const cause = causes.find((ca) => ca.id === c.causeId);
      return { causeTitle: cause?.title ?? c.causeId, contributorName: c.contributorName, amount: c.amount, status: c.status, paidAt: c.paidAt ?? "", note: c.note ?? "" };
    }));
    downloadCsv(csv, "contributions.csv");
  }

  async function handleImportContributions(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsvText(text);
      const idx = (col: string) => headers.findIndex((h) => h.toLowerCase() === col.toLowerCase());
      let created = 0;
      for (const row of rows) {
        const contributorName = row[idx("contributorName")] ?? row[idx("contributor_name")] ?? "";
        const amount = Number(row[idx("amount")] ?? 0);
        if (!contributorName || !amount) continue;
        // Match cause by title if provided
        const causeTitle = row[idx("causeTitle")] ?? row[idx("cause_title")] ?? "";
        const matchedCause = causes.find((c) => c.title.toLowerCase() === causeTitle.toLowerCase());
        const causeId = row[idx("causeId")] ?? row[idx("cause_id")] ?? matchedCause?.id ?? "";
        if (!causeId) continue;
        await apiRequest("/estate/contributions", { method: "POST", token, body: { causeId, contributorName, amount, status: row[idx("status")] || "PENDING", paidAt: row[idx("paidAt")] || undefined, note: row[idx("note")] || undefined } });
        created++;
      }
      showToast(`Imported ${created} contribution(s).`, "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setImporting(false);
      if (contribFileRef.current) contribFileRef.current.value = "";
    }
  }

  async function handleDeleteCause(id: string, title: string) {
    if (!token || !confirm(`Delete cause "${title}"?`)) return;
    try {
      await apiRequest(`/estate/causes/${id}`, { method: "DELETE", token });
      showToast("Cause deleted.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete.", "error");
    }
  }

  const causeColumns = useMemo<TableColumn<CauseRow>[]>(() => [
    { key: "title", label: "Cause", render: (r) => <div><strong>{r.title}</strong>{r.description ? <div className="td-muted" style={{ fontSize: 12 }}>{r.description}</div> : null}</div> },
    { key: "targetAmount", label: "Target", render: (r) => <strong>{formatEstateCurrency(r.targetAmount)}</strong> },
    { key: "contributedAmount", label: "Raised", render: (r) => (
      <div>
        <strong>{formatEstateCurrency(r.contributedAmount)}</strong>
        <div className="td-muted" style={{ fontSize: 11 }}>{r.contributors} contributor(s)</div>
      </div>
    )},
    { key: "deadline", label: "Deadline", render: (r) => <span className="td-muted">{r.deadline ? new Date(r.deadline).toLocaleDateString("en-NG") : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "green" : r.status === "COMPLETED" ? "blue" : "gray"}>{r.status}</StatusBadge> },
    {
      key: "actions", label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setCauseForm({ id: r.id, title: r.title, description: r.description ?? "", targetAmount: String(r.targetAmount), contributionMode: r.contributionMode, fixedContributionAmount: r.fixedContributionAmount ? String(r.fixedContributionAmount) : "", deadline: r.deadline ?? "", status: r.status }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
          <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDeleteCause(r.id, r.title)}>Delete</button>
        </div>
      ),
    },
  ], [token]);

  const contribColumns = useMemo<TableColumn<ContributionRow>[]>(() => [
    { key: "contributorName", label: "Contributor", render: (r) => <strong>{r.contributorName}</strong> },
    { key: "causeId", label: "Cause", render: (r) => { const cause = causes.find((c) => c.id === r.causeId); return <span className="td-muted">{cause?.title ?? r.causeId}</span>; } },
    { key: "amount", label: "Amount", render: (r) => <strong>{formatEstateCurrency(r.amount)}</strong> },
    { key: "paidAt", label: "Paid at", render: (r) => <span className="td-muted">{r.paidAt ? new Date(r.paidAt).toLocaleDateString("en-NG") : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "PAID" ? "green" : "amber"}>{r.status}</StatusBadge> },
  ], [causes]);

  const totalRaised = contributions.reduce((s, c) => s + c.amount, 0);

  return (
    <EstatePortalShell topbarTitle="Contributions" breadcrumb="Contributions">
      <PageMeta title="Contributions — Estate" />
      <PageHeader title="Contributions" description={`${causes.length} cause(s) · ${contributions.length} contribution(s)`} />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Active Causes</div><div className="stat-value">{causes.filter((c) => c.status === "ACTIVE").length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Raised</div><div className="stat-value">{formatEstateCurrency(totalRaised)}</div></div>
        <div className="stat-card"><div className="stat-label">Contributors</div><div className="stat-value">{contributions.length}</div></div>
      </div>

      {/* CSV actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportContributions}>Export Contributions CSV</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => contribFileRef.current?.click()} disabled={importing}>{importing ? "Importing…" : "Import Contributions CSV"}</button>
          <input ref={contribFileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportContributions} />
          <span className="td-muted" style={{ fontSize: 12 }}>CSV columns: causeTitle (or causeId), contributorName, amount, status, paidAt, note</span>
        </div>
      </div>

      {/* Cause form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{causeForm.id ? "Edit Cause" : "Create Cause"}</h3>
          <form onSubmit={handleSaveCause} className="estate-form-grid">
            <label>Title <input className="form-input" value={causeForm.title} onChange={(e) => setCauseForm((f) => ({ ...f, title: e.target.value }))} required /></label>
            <label>Target amount <input className="form-input" inputMode="numeric" value={causeForm.targetAmount} onChange={(e) => setCauseForm((f) => ({ ...f, targetAmount: e.target.value }))} required /></label>
            <label>Mode
              <select className="form-input" value={causeForm.contributionMode} onChange={(e) => setCauseForm((f) => ({ ...f, contributionMode: e.target.value }))}>
                <option value="FLEXIBLE">Flexible amount</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </label>
            <label>Fixed amount <input className="form-input" inputMode="numeric" value={causeForm.fixedContributionAmount} onChange={(e) => setCauseForm((f) => ({ ...f, fixedContributionAmount: e.target.value }))} /></label>
            <label>Deadline <input className="form-input" type="date" value={causeForm.deadline} onChange={(e) => setCauseForm((f) => ({ ...f, deadline: e.target.value }))} /></label>
            <label>Status
              <select className="form-input" value={causeForm.status} onChange={(e) => setCauseForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
            <label className="estate-form-wide">Description <textarea className="form-input" rows={2} value={causeForm.description} onChange={(e) => setCauseForm((f) => ({ ...f, description: e.target.value }))} /></label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={savingCause}>{savingCause ? "Saving…" : causeForm.id ? "Update Cause" : "Create Cause"}</button>
              {causeForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setCauseForm(initialCauseForm)}>Cancel</button> : null}
            </div>
          </form>
        </div>
      </div>

      {/* Causes table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><strong>Causes</strong></div>
        <DataTable columns={causeColumns} rows={causes} loading={loading} emptyMessage="No causes created yet." />
      </div>

      {/* Record contribution form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Record a Contribution</h3>
          <form onSubmit={handleSaveContrib} className="estate-form-grid">
            <label>Cause
              <select className="form-input" value={contribForm.causeId} onChange={(e) => setContribForm((f) => ({ ...f, causeId: e.target.value }))} required>
                <option value="">Select cause</option>
                {causes.filter((c) => c.status === "ACTIVE").map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <label>Contributor name <input className="form-input" value={contribForm.contributorName} onChange={(e) => setContribForm((f) => ({ ...f, contributorName: e.target.value }))} required /></label>
            <label>Amount <input className="form-input" inputMode="numeric" value={contribForm.amount} onChange={(e) => setContribForm((f) => ({ ...f, amount: e.target.value }))} required /></label>
            <label>Status
              <select className="form-input" value={contribForm.status} onChange={(e) => setContribForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
              </select>
            </label>
            <label>Paid on <input className="form-input" type="date" value={contribForm.paidAt} onChange={(e) => setContribForm((f) => ({ ...f, paidAt: e.target.value }))} /></label>
            <label className="estate-form-wide">Note <textarea className="form-input" rows={2} value={contribForm.note} onChange={(e) => setContribForm((f) => ({ ...f, note: e.target.value }))} /></label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={savingContrib}>{savingContrib ? "Saving…" : "Record Contribution"}</button>
              {contribForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setContribForm(initialContribForm)}>Cancel</button> : null}
            </div>
          </form>
        </div>
      </div>

      {/* Contributions table */}
      <div className="card">
        <div className="card-header"><strong>All Contributions</strong></div>
        <DataTable columns={contribColumns} rows={contributions} loading={loading} emptyMessage="No contributions recorded yet." />
      </div>
    </EstatePortalShell>
  );
}
