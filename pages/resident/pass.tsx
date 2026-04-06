import { useEffect, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

interface EstatePass {
  id: string;
  passCode: string;
  visitorName: string;
  visitPurpose: string | null;
  status: "ACTIVE" | "USED" | "EXPIRED" | string;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
}

const initialForm = { visitorName: "", visitPurpose: "", validUntil: "" };

export default function ResidentPassPage() {
  const { residentSession } = useResidentPortalSession();
  const { showToast } = usePrototypeUI();
  const token = residentSession?.token;

  const [passes, setPasses] = useState<EstatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<{ passes: EstatePass[] }>("/resident/passes", { token });
      setPasses(data.passes ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token]);

  async function handleCreatePass(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await apiRequest("/resident/passes", {
        method: "POST",
        token,
        body: {
          visitorName: form.visitorName,
          visitPurpose: form.visitPurpose || undefined,
          validUntil: form.validUntil || undefined,
        },
      });
      showToast("Pass created.", "success");
      setForm(initialForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create pass.", "error");
    } finally {
      setSaving(false);
    }
  }

  const resident = residentSession?.resident;

  return (
    <ResidentPortalShell topbarTitle="My Pass" breadcrumb="My Pass">
      <PageMeta title="My Pass — Resident Portal" />
      <PageHeader title="My Pass" description="Create visitor passes for your house. Security will scan the pass code at the gate." />

      {/* House access codes */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><strong>Your House Entry / Exit Codes</strong></div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: 1, marginBottom: 6 }}>ENTRY CODE</div>
            <code style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, background: "var(--bg)", padding: "10px 16px", borderRadius: 8, display: "inline-block" }}>
              {resident?.accessCode ?? "—"}
            </code>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: 1, marginBottom: 6 }}>EXIT CODE</div>
            <code style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, background: "var(--bg)", padding: "10px 16px", borderRadius: 8, display: "inline-block" }}>
              {resident?.exitCode ?? "—"}
            </code>
          </div>
        </div>
      </div>

      {/* Create pass form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Create Visitor Pass</h3>
          <form onSubmit={handleCreatePass} className="estate-form-grid">
            <label>Visitor name <input className="form-input" value={form.visitorName} onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))} required /></label>
            <label>Purpose of visit <input className="form-input" value={form.visitPurpose} onChange={(e) => setForm((f) => ({ ...f, visitPurpose: e.target.value }))} placeholder="e.g. Delivery, Guest" /></label>
            <label>Valid until <input className="form-input" type="datetime-local" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} /></label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Pass"}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Passes list */}
      <div className="card">
        <div className="card-header"><strong>My Passes</strong></div>
        {loading ? (
          <div className="empty-state"><p>Loading passes…</p></div>
        ) : passes.length === 0 ? (
          <div className="empty-state"><p>No passes created yet.</p></div>
        ) : (
          passes.map((p) => (
            <div key={p.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.visitorName}</div>
                {p.visitPurpose ? <div className="td-muted" style={{ fontSize: 12 }}>{p.visitPurpose}</div> : null}
                <div className="td-muted" style={{ fontSize: 12 }}>
                  Created {new Date(p.createdAt).toLocaleString("en-NG")}
                  {p.validUntil ? ` · Valid until ${new Date(p.validUntil).toLocaleString("en-NG")}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: 3, background: "var(--bg)", padding: "6px 14px", borderRadius: 8 }}>{p.passCode}</code>
                <StatusBadge tone={p.status === "ACTIVE" ? "green" : p.status === "USED" ? "gray" : "amber"} label={p.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </ResidentPortalShell>
  );
}
