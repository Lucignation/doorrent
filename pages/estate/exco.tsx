import { type FormEvent, useEffect, useMemo, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { TableColumn } from "../../types/app";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExcoMember {
  id: string;
  position: string;       // e.g. "President", "Finance", "COS", "Secretary"
  fullName: string;
  phone: string;
  email?: string | null;
  tenureStartDate: string;
  tenureEndDate: string;
  tenureYears: number;
  status: "ACTIVE" | "INACTIVE";
  bio?: string | null;
}

interface ElectionCandidate {
  id: string;
  name: string;
  position: string;
  bio?: string | null;
  voteCount: number;
  // Transparent — voter names & positions visible to all
  voters: Array<{ residentId: string; fullName: string; houseNumber: string | null; votedAt: string }>;
}

interface Election {
  id: string;
  title: string;
  description?: string | null;
  position: string;       // which ExCo seat is being contested
  status: "DRAFT" | "OPEN" | "CLOSED";
  startTime: string;
  endTime: string;
  totalVotes: number;
  candidates: ElectionCandidate[];
  createdAt: string;
}

interface ExcoPageData {
  members: ExcoMember[];
  elections: Election[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const POSITIONS = [
  "President",
  "Vice President",
  "Finance Secretary",
  "General Secretary",
  "Chief of Security (COS)",
  "Social Secretary",
  "Legal Adviser",
  "Welfare Officer",
  "PRO / Media",
  "Other",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yearFromNow(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
}

function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-NG"); }
  catch { return s; }
}

function tenureLeft(endDate: string) {
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, expired: true };
  if (days === 0) return { label: "Expires today", expired: false };
  if (days < 30) return { label: `${days}d left`, expired: false };
  const months = Math.floor(days / 30);
  if (months < 12) return { label: `${months}mo left`, expired: false };
  return { label: `${Math.floor(months / 12)}yr left`, expired: false };
}

function isElectionOpen(e: Election) {
  const now = Date.now();
  return e.status === "OPEN" && new Date(e.startTime).getTime() <= now && new Date(e.endTime).getTime() >= now;
}

const initialMemberForm = {
  id: "", position: POSITIONS[0], fullName: "", phone: "", email: "",
  tenureStartDate: todayStr(), tenureYears: "2", bio: "", status: "ACTIVE",
};

function buildInitialElectionForm() {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    id: "", title: "", description: "", position: POSITIONS[0],
    startTime: start.toISOString().slice(0, 16),
    endTime: end.toISOString().slice(0, 16),
    candidatesText: "", // comma-separated names for quick entry
    status: "DRAFT",
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EstateExcoPage() {
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;

  const [members, setMembers] = useState<ExcoMember[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [electionForm, setElectionForm] = useState(buildInitialElectionForm());
  const [savingMember, setSavingMember] = useState(false);
  const [savingElection, setSavingElection] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "elections">("members");
  const [expandedElectionId, setExpandedElectionId] = useState<string | null>(null);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<ExcoPageData>("/estate/exco", { token });
      setMembers(data.members ?? []);
      setElections(data.elections ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load ExCo data.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  // ── Member CRUD ─────────────────────────────────────────────────────────────

  function fillMemberForm(m: ExcoMember) {
    setMemberForm({
      id: m.id, position: m.position, fullName: m.fullName, phone: m.phone,
      email: m.email ?? "", tenureStartDate: m.tenureStartDate.slice(0, 10),
      tenureYears: String(m.tenureYears), bio: m.bio ?? "", status: m.status,
    });
    setActiveTab("members");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveMember(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingMember(true);
    try {
      const tenureYears = Number(memberForm.tenureYears) || 2;
      const tenureEndDate = (() => {
        const d = new Date(memberForm.tenureStartDate);
        d.setFullYear(d.getFullYear() + tenureYears);
        return d.toISOString().slice(0, 10);
      })();
      const body = {
        position: memberForm.position, fullName: memberForm.fullName,
        phone: memberForm.phone, email: memberForm.email || undefined,
        tenureStartDate: memberForm.tenureStartDate, tenureEndDate, tenureYears,
        bio: memberForm.bio || undefined, status: memberForm.status,
      };
      if (memberForm.id) {
        await apiRequest(`/estate/exco/members/${memberForm.id}`, { method: "PATCH", token, body });
        showToast("ExCo member updated.", "success");
      } else {
        await apiRequest("/estate/exco/members", { method: "POST", token, body });
        showToast("ExCo member added.", "success");
      }
      setMemberForm(initialMemberForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save ExCo member.", "error");
    } finally {
      setSavingMember(false);
    }
  }

  async function handleDeleteMember(id: string, name: string) {
    if (!token || !confirm(`Remove ${name} from the ExCo?`)) return;
    try {
      await apiRequest(`/estate/exco/members/${id}`, { method: "DELETE", token });
      showToast("Member removed.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove member.", "error");
    }
  }

  // ── Election CRUD ────────────────────────────────────────────────────────────

  function fillElectionForm(el: Election) {
    setElectionForm({
      id: el.id, title: el.title, description: el.description ?? "",
      position: el.position,
      startTime: new Date(el.startTime).toISOString().slice(0, 16),
      endTime: new Date(el.endTime).toISOString().slice(0, 16),
      candidatesText: el.candidates.map((c) => c.name).join(", "),
      status: el.status,
    });
    setActiveTab("elections");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveElection(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingElection(true);
    try {
      const candidateNames = electionForm.candidatesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const body = {
        title: electionForm.title, description: electionForm.description || undefined,
        position: electionForm.position,
        startTime: new Date(electionForm.startTime).toISOString(),
        endTime: new Date(electionForm.endTime).toISOString(),
        candidates: candidateNames.map((name) => ({ name, position: electionForm.position })),
        status: electionForm.status,
      };
      if (electionForm.id) {
        await apiRequest(`/estate/exco/elections/${electionForm.id}`, { method: "PATCH", token, body });
        showToast("Election updated.", "success");
      } else {
        await apiRequest("/estate/exco/elections", { method: "POST", token, body });
        showToast("Election created.", "success");
      }
      setElectionForm(buildInitialElectionForm());
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save election.", "error");
    } finally {
      setSavingElection(false);
    }
  }

  async function handleDeleteElection(id: string, title: string) {
    if (!token || !confirm(`Delete election "${title}"?`)) return;
    try {
      await apiRequest(`/estate/exco/elections/${id}`, { method: "DELETE", token });
      showToast("Election deleted.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete election.", "error");
    }
  }

  async function handleCloseElection(id: string) {
    if (!token || !confirm("Close this election now? Residents will no longer be able to vote.")) return;
    try {
      await apiRequest(`/estate/exco/elections/${id}`, { method: "PATCH", token, body: { status: "CLOSED" } });
      showToast("Election closed.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to close election.", "error");
    }
  }

  async function handleOpenElection(id: string) {
    if (!token) return;
    try {
      await apiRequest(`/estate/exco/elections/${id}`, { method: "PATCH", token, body: { status: "OPEN" } });
      showToast("Election opened — residents can now vote.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to open election.", "error");
    }
  }

  // ── Table columns ─────────────────────────────────────────────────────────

  const memberColumns = useMemo<TableColumn<ExcoMember>[]>(() => [
    {
      key: "position", label: "Position",
      render: (r) => (
        <div>
          <strong style={{ fontSize: 14 }}>{r.position}</strong>
          <div className="td-muted" style={{ fontSize: 12, marginTop: 2 }}>{r.fullName}</div>
        </div>
      ),
    },
    { key: "phone", label: "Phone", render: (r) => <span style={{ fontFamily: "monospace", fontSize: 13 }}>{r.phone}</span> },
    {
      key: "tenure", label: "Tenure",
      render: (r) => {
        const left = tenureLeft(r.tenureEndDate);
        return (
          <div style={{ fontSize: 12 }}>
            <div>{fmtDate(r.tenureStartDate)} → {fmtDate(r.tenureEndDate)}</div>
            <div style={{ marginTop: 3, fontWeight: 600, color: left.expired ? "var(--red)" : "var(--green)" }}>
              {left.label}
            </div>
          </div>
        );
      },
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "green" : "gray"}>{r.status}</StatusBadge> },
    {
      key: "actions", label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillMemberForm(r)}>Edit</button>
          <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDeleteMember(r.id, r.fullName)}>Remove</button>
        </div>
      ),
    },
  ], [token]);

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const expiredCount = members.filter((m) => tenureLeft(m.tenureEndDate).expired).length;
  const openElections = elections.filter((e) => isElectionOpen(e)).length;

  return (
    <EstatePortalShell topbarTitle="ExCo & Elections" breadcrumb="ExCo & Elections">
      <PageMeta title="ExCo & Elections — Estate" />
      <PageHeader title="ExCo & Elections" description={`${activeCount} active members · ${elections.length} election(s)`} />

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Active Members</div><div className="stat-value">{activeCount}</div></div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: expiredCount > 0 ? "var(--red)" : undefined }}>Expired Tenures</div>
          <div className="stat-value" style={{ color: expiredCount > 0 ? "var(--red)" : undefined }}>{expiredCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ color: openElections > 0 ? "var(--green)" : undefined }}>Live Elections</div>
          <div className="stat-value" style={{ color: openElections > 0 ? "var(--green)" : undefined }}>{openElections}</div>
        </div>
        <div className="stat-card"><div className="stat-label">Total Elections</div><div className="stat-value">{elections.length}</div></div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["members", "elections"] as const).map((tab) => (
          <button key={tab} type="button" className={`btn btn-sm ${activeTab === tab ? "btn-primary" : "btn-ghost"}`} onClick={() => setActiveTab(tab)}>
            {tab === "members" ? "ExCo Members" : "Elections"}
          </button>
        ))}
      </div>

      {/* ── MEMBERS TAB ── */}
      {activeTab === "members" && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {memberForm.id ? "Edit ExCo Member" : "Add ExCo Member"}
              </h3>
              <p className="td-muted" style={{ fontSize: 13, marginBottom: 16 }}>
                The estate can specify a tenure duration. Members are automatically marked for renewal when their tenure expires.
              </p>
              <form onSubmit={handleSaveMember} className="estate-form-grid">
                <label>Position
                  <select className="form-input" value={memberForm.position} onChange={(e) => setMemberForm((f) => ({ ...f, position: e.target.value }))}>
                    {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label>Full name
                  <input className="form-input" value={memberForm.fullName} onChange={(e) => setMemberForm((f) => ({ ...f, fullName: e.target.value }))} required />
                </label>
                <label>Phone number
                  <input className="form-input" type="tel" value={memberForm.phone} onChange={(e) => setMemberForm((f) => ({ ...f, phone: e.target.value }))} required placeholder="+234…" />
                </label>
                <label>Email (optional)
                  <input className="form-input" type="email" value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} />
                </label>
                <label>
                  Tenure start date
                  <input className="form-input" type="date" value={memberForm.tenureStartDate} onChange={(e) => setMemberForm((f) => ({ ...f, tenureStartDate: e.target.value }))} required />
                </label>
                <label>
                  Tenure length (years)
                  <select className="form-input" value={memberForm.tenureYears} onChange={(e) => setMemberForm((f) => ({ ...f, tenureYears: e.target.value }))}>
                    {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>{y} year{y > 1 ? "s" : ""}</option>)}
                  </select>
                </label>
                <label>Status
                  <select className="form-input" value={memberForm.status} onChange={(e) => setMemberForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <label className="estate-form-wide">Bio / note (optional)
                  <textarea className="form-input" rows={2} value={memberForm.bio} onChange={(e) => setMemberForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Brief description of this member's role" />
                </label>
                <div className="estate-form-actions estate-form-wide">
                  <button type="submit" className="btn btn-primary" disabled={savingMember}>{savingMember ? "Saving…" : memberForm.id ? "Update Member" : "Add Member"}</button>
                  {memberForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setMemberForm(initialMemberForm)}>Cancel</button> : null}
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><strong>Current ExCo</strong></div>
            <DataTable columns={memberColumns} rows={members} loading={loading} emptyMessage="No ExCo members added yet." />
          </div>
        </>
      )}

      {/* ── ELECTIONS TAB ── */}
      {activeTab === "elections" && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {electionForm.id ? "Edit Election" : "Create Election"}
              </h3>
              <p className="td-muted" style={{ fontSize: 13, marginBottom: 16 }}>
                Votes are transparent — resident names and positions are visible to all.
                Set a start and end time; voting closes automatically when the period ends.
              </p>
              <form onSubmit={handleSaveElection} className="estate-form-grid">
                <label>Election title
                  <input className="form-input" value={electionForm.title} onChange={(e) => setElectionForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g. President Election 2026" />
                </label>
                <label>ExCo position being contested
                  <select className="form-input" value={electionForm.position} onChange={(e) => setElectionForm((f) => ({ ...f, position: e.target.value }))}>
                    {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label>Voting opens
                  <input className="form-input" type="datetime-local" value={electionForm.startTime} onChange={(e) => setElectionForm((f) => ({ ...f, startTime: e.target.value }))} required />
                </label>
                <label>Voting closes
                  <input className="form-input" type="datetime-local" value={electionForm.endTime} onChange={(e) => setElectionForm((f) => ({ ...f, endTime: e.target.value }))} required />
                </label>
                <label>Status
                  <select className="form-input" value={electionForm.status} onChange={(e) => setElectionForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="DRAFT">Draft (not visible to residents)</option>
                    <option value="OPEN">Open (residents can vote)</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </label>
                <label className="estate-form-wide">
                  Candidates (comma-separated names)
                  <input className="form-input" value={electionForm.candidatesText} onChange={(e) => setElectionForm((f) => ({ ...f, candidatesText: e.target.value }))} placeholder="Adebola James, Kemi Osei, Tunde Bello" required />
                </label>
                <label className="estate-form-wide">Description (optional)
                  <textarea className="form-input" rows={2} value={electionForm.description} onChange={(e) => setElectionForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief context for this election" />
                </label>
                <div className="estate-form-actions estate-form-wide">
                  <button type="submit" className="btn btn-primary" disabled={savingElection}>{savingElection ? "Saving…" : electionForm.id ? "Update Election" : "Create Election"}</button>
                  {electionForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setElectionForm(buildInitialElectionForm())}>Cancel</button> : null}
                </div>
              </form>
            </div>
          </div>

          {/* Elections list */}
          {elections.length === 0 && !loading ? (
            <div className="empty-state">
              <h3>No elections created yet.</h3>
              <p>Use the form above to create the estate's first election.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {elections.map((el) => {
                const open = isElectionOpen(el);
                const expanded = expandedElectionId === el.id;
                const totalVotes = el.candidates.reduce((s, c) => s + c.voteCount, 0);
                const winner = el.status === "CLOSED"
                  ? el.candidates.reduce((a, b) => (a.voteCount >= b.voteCount ? a : b), el.candidates[0])
                  : null;

                return (
                  <div
                    key={el.id}
                    className="card"
                    style={{ border: open ? "2px solid var(--green)" : undefined }}
                  >
                    <div className="card-body" style={{ display: "grid", gap: 14 }}>
                      {/* Header row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{el.title}</div>
                          <div className="td-muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {el.position} · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                            {" · "}Opens {fmtDateTime(el.startTime)}
                            {" · "}Closes {fmtDateTime(el.endTime)}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <StatusBadge tone={el.status === "OPEN" ? "green" : el.status === "CLOSED" ? "gray" : "amber"}>
                            {el.status}
                          </StatusBadge>
                          {el.status === "DRAFT" ? (
                            <button type="button" className="btn btn-primary btn-xs" onClick={() => void handleOpenElection(el.id)}>Open voting</button>
                          ) : el.status === "OPEN" ? (
                            <button type="button" className="btn btn-ghost btn-xs" onClick={() => void handleCloseElection(el.id)}>Close voting</button>
                          ) : null}
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillElectionForm(el)}>Edit</button>
                          <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDeleteElection(el.id, el.title)}>Delete</button>
                          <button type="button" className="btn btn-secondary btn-xs" onClick={() => setExpandedElectionId(expanded ? null : el.id)}>
                            {expanded ? "Hide results ▲" : "View results ▼"}
                          </button>
                        </div>
                      </div>

                      {el.description ? <p style={{ margin: 0, fontSize: 13, color: "var(--ink2)" }}>{el.description}</p> : null}

                      {/* Winner banner */}
                      {el.status === "CLOSED" && winner && winner.voteCount > 0 && (
                        <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(34,139,94,0.1)", border: "1px solid rgba(34,139,94,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>🏆</span>
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--green)" }}>Winner: {winner.name}</div>
                            <div style={{ fontSize: 12, color: "var(--ink3)" }}>{winner.voteCount} vote{winner.voteCount !== 1 ? "s" : ""} of {totalVotes} total</div>
                          </div>
                        </div>
                      )}

                      {/* Candidates & live vote counts */}
                      {expanded && (
                        <div style={{ display: "grid", gap: 12 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            Real-time vote counts {open && <span style={{ color: "var(--green)", fontWeight: 600, fontSize: 11 }}>· LIVE</span>}
                          </div>
                          {el.candidates.map((c) => {
                            const pct = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
                            const isWinner = winner?.id === c.id && el.status === "CLOSED";
                            return (
                              <div key={c.id} style={{ borderRadius: 14, border: "1px solid var(--border)", padding: "14px 16px", background: isWinner ? "rgba(34,139,94,0.04)" : "var(--surface)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                                    {isWinner && <span style={{ marginRight: 6 }}>🏆</span>}
                                    {c.name}
                                  </div>
                                  <div style={{ fontWeight: 800, fontSize: 18, color: isWinner ? "var(--green)" : "var(--ink)" }}>
                                    {c.voteCount} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink3)" }}>({pct}%)</span>
                                  </div>
                                </div>
                                {/* Progress bar */}
                                <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: isWinner ? "var(--green)" : "var(--primary, #1A5C42)", borderRadius: 999, transition: "width 0.4s" }} />
                                </div>
                                {/* Transparent voter list */}
                                {c.voters.length > 0 && (
                                  <div style={{ marginTop: 10 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                      Voters ({c.voters.length})
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                      {c.voters.map((v) => (
                                        <span key={v.residentId}
                                          style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ink2)" }}>
                                          {v.fullName}{v.houseNumber ? ` · House ${v.houseNumber}` : ""}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </EstatePortalShell>
  );
}
