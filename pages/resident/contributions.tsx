import { type FormEvent, useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import { formatEstateCurrency, type EstateDashboardData } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

type CauseRow = EstateDashboardData["causes"][number];
type ContributionRow = EstateDashboardData["contributions"][number];

interface ResidentContribData {
  causes: CauseRow[];
  myContributions: ContributionRow[];
}

const initialForm = { causeId: "", amount: "", note: "" };

export default function ResidentContributionsPage() {
  const { residentSession } = useResidentPortalSession();
  const { showToast } = usePrototypeUI();
  const token = residentSession?.token;

  const [causes, setCauses] = useState<CauseRow[]>([]);
  const [myContributions, setMyContributions] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<ResidentContribData>("/resident/contributions", { token });
      setCauses(data.causes ?? []);
      setMyContributions(data.myContributions ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await apiRequest("/resident/contributions", {
        method: "POST",
        token,
        body: {
          causeId: form.causeId,
          amount: Number(form.amount),
          note: form.note || undefined,
        },
      });
      showToast("Contribution recorded. Thank you!", "success");
      setForm(initialForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to record contribution.", "error");
    } finally {
      setSaving(false);
    }
  }

  const causeColumns = useMemo<TableColumn<CauseRow>[]>(() => [
    {
      key: "title", label: "Cause",
      render: (r) => (
        <div>
          <strong>{r.title}</strong>
          {r.description ? <div className="td-muted" style={{ fontSize: 12 }}>{r.description}</div> : null}
        </div>
      ),
    },
    { key: "targetAmount", label: "Target", render: (r) => <strong>{formatEstateCurrency(r.targetAmount)}</strong> },
    {
      key: "contributedAmount", label: "Raised",
      render: (r) => {
        const pct = r.targetAmount > 0 ? Math.min(100, (r.contributedAmount / r.targetAmount) * 100) : 0;
        return (
          <div>
            <strong>{formatEstateCurrency(r.contributedAmount)}</strong>
            <div style={{ background: "var(--bg)", borderRadius: 3, height: 4, marginTop: 4, width: 80, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "var(--green)", borderRadius: 3 }} />
            </div>
          </div>
        );
      },
    },
    { key: "deadline", label: "Deadline", render: (r) => <span className="td-muted">{r.deadline ? new Date(r.deadline).toLocaleDateString("en-NG") : "—"}</span> },
  ], []);

  const myContribColumns = useMemo<TableColumn<ContributionRow>[]>(() => [
    { key: "causeId", label: "Cause", render: (r) => { const c = causes.find((x) => x.id === r.causeId); return <span>{c?.title ?? "—"}</span>; } },
    { key: "amount", label: "Amount", render: (r) => <strong>{formatEstateCurrency(r.amount)}</strong> },
    { key: "paidAt", label: "Paid on", render: (r) => <span className="td-muted">{r.paidAt ? new Date(r.paidAt).toLocaleDateString("en-NG") : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "PAID" ? "green" : "amber"}>{r.status}</StatusBadge> },
  ], [causes]);

  return (
    <ResidentPortalShell topbarTitle="Contributions" breadcrumb="Contributions">
      <PageMeta title="Contributions — Resident Portal" />
      <PageHeader title="Contributions" description={`${causes.length} active cause(s)`} />

      {/* Active causes */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><strong>Active Causes</strong></div>
        <DataTable columns={causeColumns} rows={causes} loading={loading} emptyMessage="No active causes at the moment." />
      </div>

      {/* Contribute form */}
      {causes.length > 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Make a Contribution</h3>
            <form onSubmit={handleSubmit} className="estate-form-grid">
              <label>Cause
                <select className="form-input" value={form.causeId} onChange={(e) => setForm((f) => ({ ...f, causeId: e.target.value }))} required>
                  <option value="">Select cause</option>
                  {causes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              <label>Amount <input className="form-input" inputMode="numeric" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required /></label>
              <label className="estate-form-wide">Note <textarea className="form-input" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Record Contribution"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* My contributions */}
      <div className="card">
        <div className="card-header"><strong>My Contributions</strong></div>
        <DataTable columns={myContribColumns} rows={myContributions} loading={loading} emptyMessage="You have not made any contributions yet." />
      </div>
    </ResidentPortalShell>
  );
}
