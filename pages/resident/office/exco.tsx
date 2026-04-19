import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ResidentPortalShell from "../../../components/auth/ResidentPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../../context/TenantSessionContext";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { apiRequest } from "../../../lib/api";

interface ExcoMember {
  id: string;
  residentId?: string | null;
  position: string;
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
  residentId?: string | null;
  name: string;
  voteCount: number;
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
  createdAt: string;
}

interface EstateResidentOption {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  residentType: string;
  houseNumber?: string | null;
  status: "ACTIVE";
}

interface OfficeExcoResponse {
  officeAccess: {
    offices: Array<{ id: string; position: string }>;
    permissions: string[];
  };
  summary: {
    activeMembers: number;
    openElections: number;
    pendingApprovals: number;
  };
  members: ExcoMember[];
  elections: Election[];
  activeResidents: EstateResidentOption[];
}

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

const initialMemberForm = {
  id: "",
  residentId: "",
  position: POSITIONS[0],
  tenureStartDate: todayStr(),
  tenureYears: "2",
  bio: "",
  status: "ACTIVE",
};

function buildInitialElectionForm() {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    id: "",
    title: "",
    description: "",
    position: POSITIONS[0],
    startTime: start.toISOString().slice(0, 16),
    endTime: end.toISOString().slice(0, 16),
    candidateResidentIds: [] as string[],
    status: "DRAFT",
  };
}

function formatResidentOptionLabel(resident: EstateResidentOption) {
  return `${resident.fullName}${resident.houseNumber ? ` · House ${resident.houseNumber}` : ""}${resident.residentType ? ` · ${resident.residentType}` : ""}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-NG");
  } catch {
    return value;
  }
}

export default function ResidentOfficeExcoPage() {
  const { residentSession } = useResidentPortalSession();
  const { showToast } = usePrototypeUI();
  const token = residentSession?.token;
  const [data, setData] = useState<OfficeExcoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [electionForm, setElectionForm] = useState(buildInitialElectionForm());
  const [savingMember, setSavingMember] = useState(false);
  const [savingElection, setSavingElection] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "elections">("members");
  const [candidateDropdownOpen, setCandidateDropdownOpen] = useState(false);
  const candidateDropdownRef = useRef<HTMLDivElement | null>(null);

  function loadData(currentToken: string) {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<OfficeExcoResponse>("/resident/office/exco", { token: currentToken })
      .then(({ data: response }) => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load the ExCo office data.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    return loadData(token);
  }, [token]);

  useEffect(() => {
    if (!candidateDropdownOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!candidateDropdownRef.current?.contains(event.target as Node)) {
        setCandidateDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [candidateDropdownOpen]);

  const activeResidents = data?.activeResidents ?? [];
  const members = data?.members ?? [];
  const elections = data?.elections ?? [];

  const selectedMemberResident = useMemo(
    () =>
      activeResidents.find((resident) => resident.id === memberForm.residentId) ?? null,
    [activeResidents, memberForm.residentId],
  );

  const selectedElectionResidents = useMemo(
    () =>
      activeResidents.filter((resident) =>
        electionForm.candidateResidentIds.includes(resident.id),
      ),
    [activeResidents, electionForm.candidateResidentIds],
  );

  const candidateDropdownLabel = useMemo(() => {
    if (selectedElectionResidents.length === 0) {
      return "Select active residents";
    }

    if (selectedElectionResidents.length <= 2) {
      return selectedElectionResidents.map((resident) => resident.fullName).join(", ");
    }

    return `${selectedElectionResidents.length} active residents selected`;
  }, [selectedElectionResidents]);

  function toggleElectionCandidate(residentId: string) {
    setElectionForm((current) => {
      const exists = current.candidateResidentIds.includes(residentId);
      return {
        ...current,
        candidateResidentIds: exists
          ? current.candidateResidentIds.filter((id) => id !== residentId)
          : [...current.candidateResidentIds, residentId],
      };
    });
  }

  function fillMemberForm(member: ExcoMember) {
    setMemberForm({
      id: member.id,
      residentId: member.residentId ?? "",
      position: member.position,
      tenureStartDate: member.tenureStartDate.slice(0, 10),
      tenureYears: String(member.tenureYears),
      bio: member.bio ?? "",
      status: member.status,
    });
    setActiveTab("members");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveMember(event: FormEvent) {
    event.preventDefault();

    if (!token || !memberForm.residentId) {
      showToast("Select an active resident for this ExCo position.", "error");
      return;
    }

    setSavingMember(true);

    try {
      const tenureYears = Number(memberForm.tenureYears) || 2;
      const tenureEndDate = (() => {
        const date = new Date(memberForm.tenureStartDate);
        date.setFullYear(date.getFullYear() + tenureYears);
        return date.toISOString().slice(0, 10);
      })();

      const body = {
        residentId: memberForm.residentId,
        position: memberForm.position,
        tenureStartDate: memberForm.tenureStartDate,
        tenureEndDate,
        tenureYears,
        bio: memberForm.bio || undefined,
        status: memberForm.status,
      };

      if (memberForm.id) {
        await apiRequest(`/resident/office/exco/members/${memberForm.id}`, {
          method: "PATCH",
          token,
          body,
        });
        showToast("ExCo member updated.", "success");
      } else {
        await apiRequest("/resident/office/exco/members", {
          method: "POST",
          token,
          body,
        });
        showToast("ExCo member added.", "success");
      }

      setMemberForm(initialMemberForm);
      void loadData(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the ExCo member.",
        "error",
      );
    } finally {
      setSavingMember(false);
    }
  }

  async function handleDeleteMember(memberId: string, fullName: string) {
    if (!token || !window.confirm(`Remove ${fullName} from the ExCo roster?`)) {
      return;
    }

    try {
      await apiRequest(`/resident/office/exco/members/${memberId}`, {
        method: "DELETE",
        token,
      });
      showToast("ExCo member removed.", "success");
      void loadData(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not remove the ExCo member.",
        "error",
      );
    }
  }

  function fillElectionForm(election: Election) {
    setElectionForm({
      id: election.id,
      title: election.title,
      description: election.description ?? "",
      position: election.position,
      startTime: election.startTime.slice(0, 16),
      endTime: election.endTime.slice(0, 16),
      candidateResidentIds: election.candidates
        .map((candidate) => candidate.residentId)
        .filter((value): value is string => Boolean(value)),
      status: election.status,
    });
    setActiveTab("elections");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveElection(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (electionForm.candidateResidentIds.length < 2) {
      showToast("Select at least two active residents as candidates.", "error");
      return;
    }

    setSavingElection(true);

    try {
      const body = {
        title: electionForm.title,
        description: electionForm.description || undefined,
        position: electionForm.position,
        startTime: new Date(electionForm.startTime).toISOString(),
        endTime: new Date(electionForm.endTime).toISOString(),
        status: electionForm.status,
        candidates: electionForm.candidateResidentIds.map((residentId) => ({
          residentId,
        })),
      };

      if (electionForm.id) {
        await apiRequest(`/resident/office/exco/elections/${electionForm.id}`, {
          method: "PATCH",
          token,
          body,
        });
        showToast("Election updated.", "success");
      } else {
        await apiRequest("/resident/office/exco/elections", {
          method: "POST",
          token,
          body,
        });
        showToast("Election created.", "success");
      }

      setElectionForm(buildInitialElectionForm());
      setCandidateDropdownOpen(false);
      void loadData(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the election.",
        "error",
      );
    } finally {
      setSavingElection(false);
    }
  }

  async function handleDeleteElection(electionId: string, title: string) {
    if (!token || !window.confirm(`Delete election "${title}"?`)) {
      return;
    }

    try {
      await apiRequest(`/resident/office/exco/elections/${electionId}`, {
        method: "DELETE",
        token,
      });
      showToast("Election deleted.", "success");
      void loadData(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the election.",
        "error",
      );
    }
  }

  return (
    <ResidentPortalShell topbarTitle="ExCo & Elections" breadcrumb="Office ExCo">
      <PageMeta title="Resident Office ExCo & Elections" />
      <PageHeader
        title="ExCo & Elections"
        description="Leadership office holders can manage the ExCo roster and election lifecycle from the office workspace."
      />

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}
      >
        <div className="stat-card">
          <div className="stat-label">ExCo Members</div>
          <div className="stat-value">{members.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Elections</div>
          <div className="stat-value">
            {elections.filter((election) => election.status === "OPEN").length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Residents</div>
          <div className="stat-value">{activeResidents.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {(["members", "elections"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`btn ${activeTab === tab ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "members" ? "ExCo Members" : "Elections"}
          </button>
        ))}
      </div>

      {activeTab === "members" ? (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <strong>{memberForm.id ? "Edit ExCo Member" : "Add ExCo Member"}</strong>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveMember} className="estate-form-grid">
                <label>
                  Active resident
                  <select
                    className="form-input"
                    value={memberForm.residentId}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        residentId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select active resident</option>
                    {activeResidents.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {formatResidentOptionLabel(resident)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Position
                  <select
                    className="form-input"
                    value={memberForm.position}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        position: event.target.value,
                      }))
                    }
                  >
                    {POSITIONS.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tenure start
                  <input
                    className="form-input"
                    type="date"
                    value={memberForm.tenureStartDate}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        tenureStartDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Tenure years
                  <input
                    className="form-input"
                    inputMode="numeric"
                    value={memberForm.tenureYears}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        tenureYears: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Status
                  <select
                    className="form-input"
                    value={memberForm.status}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        status: event.target.value as "ACTIVE" | "INACTIVE",
                      }))
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <div
                  className="estate-form-wide"
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    padding: 14,
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    Selected resident details
                  </div>
                  {selectedMemberResident ? (
                    <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
                      <div>
                        <strong>{selectedMemberResident.fullName}</strong>
                        {selectedMemberResident.houseNumber
                          ? ` · House ${selectedMemberResident.houseNumber}`
                          : ""}
                      </div>
                      <div className="td-muted">{selectedMemberResident.residentType}</div>
                      <div>Phone: {selectedMemberResident.phone || "No phone yet"}</div>
                      <div>Email: {selectedMemberResident.email || "No email yet"}</div>
                    </div>
                  ) : (
                    <div className="td-muted" style={{ fontSize: 13 }}>
                      Pick one active resident from the dropdown to assign this office.
                    </div>
                  )}
                </div>
                <label className="estate-form-wide">
                  Bio / note
                  <textarea
                    className="form-input"
                    rows={2}
                    value={memberForm.bio}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="estate-form-actions estate-form-wide">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingMember || activeResidents.length === 0}
                  >
                    {savingMember
                      ? "Saving…"
                      : memberForm.id
                        ? "Update Member"
                        : "Add Member"}
                  </button>
                  {memberForm.id ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setMemberForm(initialMemberForm)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <strong>Current ExCo</strong>
            </div>
            {loading ? (
              <div className="card-body">
                <p style={{ margin: 0 }}>Loading ExCo members…</p>
              </div>
            ) : members.length ? (
              <div className="card-body" style={{ display: "grid", gap: 14 }}>
                {members.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{member.fullName}</div>
                        <div className="td-muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {member.position}
                        </div>
                      </div>
                      <StatusBadge tone={member.status === "ACTIVE" ? "green" : "gray"}>
                        {member.status}
                      </StatusBadge>
                    </div>
                    <div className="td-muted" style={{ fontSize: 12 }}>
                      {member.phone || "No phone"} · {formatDateTime(member.tenureStartDate)} to{" "}
                      {formatDateTime(member.tenureEndDate)}
                    </div>
                    {member.bio ? (
                      <div className="td-muted" style={{ fontSize: 12 }}>
                        {member.bio}
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => fillMemberForm(member)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs estate-danger"
                        onClick={() => void handleDeleteMember(member.id, member.fullName)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-body">
                <p style={{ margin: 0 }}>No ExCo members added yet.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <strong>{electionForm.id ? "Edit Election" : "Create Election"}</strong>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveElection} className="estate-form-grid">
                <label>
                  Election title
                  <input
                    className="form-input"
                    value={electionForm.title}
                    onChange={(event) =>
                      setElectionForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  ExCo position being contested
                  <select
                    className="form-input"
                    value={electionForm.position}
                    onChange={(event) =>
                      setElectionForm((current) => ({
                        ...current,
                        position: event.target.value,
                      }))
                    }
                  >
                    {POSITIONS.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Voting opens
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={electionForm.startTime}
                    onChange={(event) =>
                      setElectionForm((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Voting closes
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={electionForm.endTime}
                    onChange={(event) =>
                      setElectionForm((current) => ({
                        ...current,
                        endTime: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Status
                  <select
                    className="form-input"
                    value={electionForm.status}
                    onChange={(event) =>
                      setElectionForm((current) => ({
                        ...current,
                        status: event.target.value as "DRAFT" | "OPEN" | "CLOSED",
                      }))
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </label>
                <div className="estate-form-wide">
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    Candidates (multi-select active residents)
                  </div>
                  <div ref={candidateDropdownRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="form-input"
                      aria-haspopup="listbox"
                      aria-expanded={candidateDropdownOpen}
                      onClick={() => setCandidateDropdownOpen((open) => !open)}
                      style={{
                        width: "100%",
                        minHeight: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        textAlign: "left",
                        background: "var(--surface)",
                      }}
                    >
                      <span
                        style={{
                          color: selectedElectionResidents.length ? "var(--ink)" : "var(--ink3)",
                        }}
                      >
                        {candidateDropdownLabel}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--ink3)" }}>
                        {candidateDropdownOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {candidateDropdownOpen ? (
                      <div
                        role="listbox"
                        aria-multiselectable="true"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          left: 0,
                          right: 0,
                          zIndex: 30,
                          maxHeight: 280,
                          overflowY: "auto",
                          borderRadius: 16,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                          padding: 8,
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "6px 8px 10px",
                            marginBottom: 2,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--ink3)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            Active residents
                          </span>
                          {electionForm.candidateResidentIds.length > 0 ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() =>
                                setElectionForm((current) => ({
                                  ...current,
                                  candidateResidentIds: [],
                                }))
                              }
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>

                        {activeResidents.map((resident) => {
                          const checked = electionForm.candidateResidentIds.includes(resident.id);

                          return (
                            <label
                              key={resident.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: 12,
                                cursor: "pointer",
                                background: checked ? "rgba(34,139,94,0.08)" : "transparent",
                                border: checked
                                  ? "1px solid rgba(34,139,94,0.24)"
                                  : "1px solid transparent",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleElectionCandidate(resident.id)}
                                style={{ marginTop: 2 }}
                              />
                              <span style={{ display: "grid", gap: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                                  {resident.fullName}
                                </span>
                                <span className="td-muted" style={{ fontSize: 12 }}>
                                  {resident.houseNumber ? `House ${resident.houseNumber} · ` : ""}
                                  {resident.residentType}
                                  {resident.phone ? ` · ${resident.phone}` : ""}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  className="estate-form-wide"
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    padding: 14,
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    Selected candidates ({selectedElectionResidents.length})
                  </div>
                  {selectedElectionResidents.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedElectionResidents.map((resident) => (
                        <span
                          key={resident.id}
                          style={{
                            fontSize: 12,
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {formatResidentOptionLabel(resident)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="td-muted" style={{ fontSize: 13 }}>
                      Choose at least two active residents as candidates.
                    </div>
                  )}
                </div>

                <label className="estate-form-wide">
                  Description
                  <textarea
                    className="form-input"
                    rows={2}
                    value={electionForm.description}
                    onChange={(event) =>
                      setElectionForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="estate-form-actions estate-form-wide">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingElection || activeResidents.length < 2}
                  >
                    {savingElection
                      ? "Saving…"
                      : electionForm.id
                        ? "Update Election"
                        : "Create Election"}
                  </button>
                  {electionForm.id ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setElectionForm(buildInitialElectionForm());
                        setCandidateDropdownOpen(false);
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <strong>Current Elections</strong>
            </div>
            {loading ? (
              <div className="card-body">
                <p style={{ margin: 0 }}>Loading elections…</p>
              </div>
            ) : elections.length ? (
              <div className="card-body" style={{ display: "grid", gap: 14 }}>
                {elections.map((election) => (
                  <div
                    key={election.id}
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{election.title}</div>
                        <div className="td-muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {election.position}
                        </div>
                      </div>
                      <StatusBadge
                        tone={
                          election.status === "OPEN"
                            ? "green"
                            : election.status === "CLOSED"
                              ? "gray"
                              : "amber"
                        }
                      >
                        {election.status}
                      </StatusBadge>
                    </div>
                    <div className="td-muted" style={{ fontSize: 12 }}>
                      {formatDateTime(election.startTime)} to {formatDateTime(election.endTime)} ·{" "}
                      {election.totalVotes} vote(s)
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {election.candidates.map((candidate) => (
                        <StatusBadge key={candidate.id} tone="gray">
                          {candidate.name}: {candidate.voteCount}
                        </StatusBadge>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => fillElectionForm(election)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs estate-danger"
                        onClick={() => void handleDeleteElection(election.id, election.title)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-body">
                <p style={{ margin: 0 }}>No elections created yet.</p>
              </div>
            )}
          </div>
        </>
      )}
    </ResidentPortalShell>
  );
}
