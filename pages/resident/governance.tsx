import { useCallback, useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExcoMember {
  id: string;
  position: string;
  fullName: string;
  phone: string;
  email?: string | null;
  tenureStartDate: string;
  tenureEndDate: string;
  status: "ACTIVE" | "INACTIVE";
  bio?: string | null;
}

interface ElectionCandidate {
  id: string;
  name: string;
  position: string;
  bio?: string | null;
  voteCount: number;
  // Transparent: all voter names & houses visible in real time
  voters: Array<{
    residentId: string;
    fullName: string;
    houseNumber: string | null;
    position?: string | null;
    votedAt: string;
  }>;
}

interface Election {
  id: string;
  title: string;
  description?: string | null;
  position: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  startTime: string;
  endTime: string;
  totalVotes: number;
  candidates: ElectionCandidate[];
  hasVoted: boolean;          // true if the current resident has already voted
  myVotedCandidateId?: string | null;
}

interface ResidentGovernanceData {
  exco: ExcoMember[];
  elections: Election[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s ?? "—"; }
}

function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-NG"); }
  catch { return s ?? "—"; }
}

function timeLeft(endTime: string) {
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

function isOpen(el: Election) {
  const now = Date.now();
  return el.status === "OPEN"
    && new Date(el.startTime).getTime() <= now
    && new Date(el.endTime).getTime() >= now;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ResidentGovernancePage() {
  const { residentSession } = useResidentPortalSession();
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const token = residentSession?.token;

  const [data, setData] = useState<ResidentGovernanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [votingId, setVotingId] = useState<string | null>(null); // electionId currently being voted on
  const [expandedElectionId, setExpandedElectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"exco" | "elections">("exco");

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const { data: resp } = await apiRequest<ResidentGovernanceData>("/resident/governance", { token });
      setData(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load governance data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadData(); }, [token, dataRefreshVersion]);

  async function castVote(electionId: string, candidateId: string, candidateName: string) {
    if (!token) return;
    if (!confirm(`Confirm your vote for ${candidateName}? This cannot be undone.`)) return;
    setVotingId(electionId);
    try {
      await apiRequest(`/resident/governance/elections/${electionId}/vote`, {
        method: "POST", token, body: { candidateId },
      });
      showToast(`Your vote for ${candidateName} has been recorded.`, "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cast vote.", "error");
    } finally {
      setVotingId(null);
    }
  }

  const activeMembers = useMemo(() => data?.exco.filter((m) => m.status === "ACTIVE") ?? [], [data]);
  const inactiveMembers = useMemo(() => data?.exco.filter((m) => m.status !== "ACTIVE") ?? [], [data]);
  const openElections = useMemo(() => data?.elections.filter((e) => isOpen(e)) ?? [], [data]);
  const closedElections = useMemo(() => data?.elections.filter((e) => e.status === "CLOSED") ?? [], [data]);

  useEffect(() => {
    if (!token || openElections.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadData();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadData, openElections.length, token]);

  return (
    <ResidentPortalShell topbarTitle="Governance" breadcrumb="Governance">
      <PageMeta title="Governance — Resident Portal" />
      <PageHeader
        title="Estate Governance"
        description="ExCo directory and estate elections"
      />

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {(["exco", "elections"] as const).map((tab) => (
          <button key={tab} type="button" className={`btn btn-sm ${activeTab === tab ? "btn-primary" : "btn-ghost"}`} onClick={() => setActiveTab(tab)}>
            {tab === "exco" ? `ExCo Directory (${activeMembers.length})` : `Elections (${data?.elections.length ?? 0})`}
          </button>
        ))}
      </div>

      {/* ── EXCO DIRECTORY TAB ── */}
      {activeTab === "exco" && (
        <>
          {/* Active ExCo */}
          {activeMembers.length > 0 ? (
            <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Current Executive Committee
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {activeMembers.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid var(--border)",
                      padding: "18px 20px",
                      background: "var(--surface)",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    {/* Avatar + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, rgba(26,92,66,0.15), rgba(26,92,66,0.06))",
                          border: "2px solid rgba(26,92,66,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 18,
                          color: "var(--primary, #1A5C42)",
                          flexShrink: 0,
                        }}
                      >
                        {m.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{m.fullName}</div>
                        <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: "var(--primary, #1A5C42)", letterSpacing: "0.02em" }}>
                          {m.position}
                        </div>
                      </div>
                    </div>

                    {/* Phone — prominently displayed */}
                    <a
                      href={`tel:${m.phone}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: "rgba(26,92,66,0.06)",
                        border: "1px solid rgba(26,92,66,0.12)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>📞</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", marginBottom: 1 }}>PHONE</div>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: "var(--primary, #1A5C42)" }}>{m.phone}</div>
                      </div>
                    </a>

                    {m.email ? (
                      <div style={{ fontSize: 13, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>✉️</span> {m.email}
                      </div>
                    ) : null}

                    {m.bio ? (
                      <p style={{ margin: 0, fontSize: 12, color: "var(--ink3)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        {m.bio}
                      </p>
                    ) : null}

                    {/* Tenure */}
                    <div style={{ fontSize: 11, color: "var(--ink3)", display: "flex", gap: 6, alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      <span>🗓</span>
                      <span>Tenure: {fmtDate(m.tenureStartDate)} — {fmtDate(m.tenureEndDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !loading ? (
            <div className="empty-state" style={{ marginBottom: 24 }}>
              <h3>No ExCo members listed yet.</h3>
              <p>The estate admin will publish the executive committee here.</p>
            </div>
          ) : null}

          {/* Inactive / former members */}
          {inactiveMembers.length > 0 && (
            <div className="card">
              <div className="card-header"><strong>Former / Inactive Members</strong></div>
              <div className="card-body" style={{ display: "grid", gap: 10 }}>
                {inactiveMembers.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.fullName}</div>
                      <div style={{ fontSize: 12, color: "var(--ink3)" }}>{m.position} · {fmtDate(m.tenureStartDate)} — {fmtDate(m.tenureEndDate)}</div>
                    </div>
                    <StatusBadge tone="gray">INACTIVE</StatusBadge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ELECTIONS TAB ── */}
      {activeTab === "elections" && (
        <>
          {/* Active / open elections */}
          {openElections.map((el) => {
            const left = timeLeft(el.endTime);
            const expanded = expandedElectionId === el.id;
            const totalVotes = el.candidates.reduce((s, c) => s + c.voteCount, 0);
            const isVoting = votingId === el.id;

            return (
              <div key={el.id} className="card" style={{ marginBottom: 20, border: "2px solid var(--green)" }}>
                <div className="card-body" style={{ display: "grid", gap: 16 }}>
                  {/* Live badge + title */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 1.4s ease-in-out infinite" }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--green)", letterSpacing: "0.06em" }}>VOTING NOW OPEN</span>
                    {left && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--ink3)" }}>{left}</span>}
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{el.title}</div>
                    <div className="td-muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {el.position} · Opened {fmtDateTime(el.startTime)} · Closes {fmtDateTime(el.endTime)}
                    </div>
                  </div>

                  {el.description ? <p style={{ margin: 0, fontSize: 14, color: "var(--ink2)" }}>{el.description}</p> : null}

                  {/* Already voted banner */}
                  {el.hasVoted ? (
                    <div style={{ padding: "12px 16px", borderRadius: 14, background: "rgba(34,139,94,0.08)", border: "1px solid rgba(34,139,94,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>✅</span>
                      <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>
                        You have voted in this election.
                        {el.myVotedCandidateId
                          ? ` Your vote: ${el.candidates.find((c) => c.id === el.myVotedCandidateId)?.name ?? "—"}`
                          : ""}
                      </div>
                    </div>
                  ) : null}

                  {/* Candidates */}
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Candidates — real-time results</div>
                    {el.candidates.map((c) => {
                      const pct = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
                      const myVote = el.myVotedCandidateId === c.id;
                      return (
                        <div
                          key={c.id}
                          style={{
                            borderRadius: 14,
                            border: myVote ? "2px solid var(--green)" : "1px solid var(--border)",
                            padding: "14px 16px",
                            background: myVote ? "rgba(34,139,94,0.04)" : "var(--surface)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>
                                {myVote ? "✅ " : ""}{c.name}
                              </div>
                              {c.bio ? <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 3 }}>{c.bio}</div> : null}
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 22 }}>
                              {c.voteCount}
                              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink3)", marginLeft: 4 }}>({pct}%)</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginBottom: 12 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: myVote ? "var(--green)" : "var(--primary, #1A5C42)", borderRadius: 999, transition: "width 0.4s" }} />
                          </div>

                          {/* Vote button */}
                          {!el.hasVoted && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={isVoting}
                              onClick={() => void castVote(el.id, c.id, c.name)}
                            >
                              {isVoting ? "Casting vote…" : `Vote for ${c.name}`}
                            </button>
                          )}

                          {/* Transparent voter list */}
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{ marginLeft: el.hasVoted ? 0 : 8 }}
                            onClick={() => setExpandedElectionId(expanded && expandedElectionId === `${el.id}-${c.id}` ? null : `${el.id}-${c.id}`)}
                          >
                            {expandedElectionId === `${el.id}-${c.id}` ? "Hide voters ▲" : `See voters (${c.voters.length}) ▼`}
                          </button>

                          {expandedElectionId === `${el.id}-${c.id}` && c.voters.length > 0 && (
                            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, background: "var(--bg)" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                Voters for {c.name}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {c.voters.map((v) => (
                                  <span
                                    key={v.residentId}
                                    style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink2)" }}
                                  >
                                    {v.fullName}
                                    {v.position ? ` · ${v.position}` : ""}
                                    {v.houseNumber ? ` · House ${v.houseNumber}` : ""}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--ink3)", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast so far · Voting is transparent — all resident names and votes are publicly visible
                  </div>
                </div>
              </div>
            );
          })}

          {/* Closed / past elections */}
          {closedElections.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><strong>Past Elections</strong></div>
              <div className="card-body" style={{ display: "grid", gap: 14 }}>
                {closedElections.map((el) => {
                  const totalVotes = el.candidates.reduce((s, c) => s + c.voteCount, 0);
                  const winner = el.candidates.reduce((a, b) => (a.voteCount >= b.voteCount ? a : b), el.candidates[0]);
                  const expanded = expandedElectionId === el.id;
                  return (
                    <div key={el.id} style={{ borderRadius: 16, border: "1px solid var(--border)", padding: "14px 16px", background: "var(--surface)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{el.title}</div>
                          <div className="td-muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {el.position} · {totalVotes} vote{totalVotes !== 1 ? "s" : ""} · Closed {fmtDateTime(el.endTime)}
                          </div>
                          {winner && winner.voteCount > 0 && (
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--green)" }}>
                              <span>🏆</span> Winner: {winner.name} ({winner.voteCount} vote{winner.voteCount !== 1 ? "s" : ""})
                            </div>
                          )}
                        </div>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setExpandedElectionId(expanded ? null : el.id)}>
                          {expanded ? "Hide ▲" : "Full results ▼"}
                        </button>
                      </div>

                      {expanded && (
                        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                          {el.candidates
                            .slice()
                            .sort((a, b) => b.voteCount - a.voteCount)
                            .map((c, rank) => {
                              const pct = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
                              return (
                                <div key={c.id} style={{ padding: "10px 14px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--border)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                      {rank === 0 && winner?.voteCount ? "🏆 " : `${rank + 1}. `}{c.name}
                                    </div>
                                    <div style={{ fontWeight: 700 }}>{c.voteCount} ({pct}%)</div>
                                  </div>
                                  <div style={{ height: 5, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: rank === 0 ? "var(--green)" : "var(--ink3)", borderRadius: 999 }} />
                                  </div>
                                  {c.voters.length > 0 && (
                                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                                      {c.voters.map((v) => (
                                        <span key={v.residentId} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink3)" }}>
                                          {v.fullName}{v.houseNumber ? ` · H${v.houseNumber}` : ""}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && (data?.elections.length ?? 0) === 0 && (
            <div className="empty-state">
              <h3>No elections yet.</h3>
              <p>When the estate admin creates an election, it will appear here. Open elections allow you to cast your vote.</p>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="empty-state">
          <p>Loading governance data…</p>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </ResidentPortalShell>
  );
}
