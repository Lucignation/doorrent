import { type FormEvent, useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../../components/auth/ResidentPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../../context/TenantSessionContext";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { apiRequest } from "../../../lib/api";

interface GovernanceMember {
  id: string;
  position: string;
  fullName: string;
  phone: string;
  tenureStartDate: string;
  tenureEndDate: string;
  status: "ACTIVE" | "INACTIVE";
}

interface GovernanceElection {
  id: string;
  title: string;
  position: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  startTime: string;
  endTime: string;
  totalVotes: number;
  candidates: Array<{
    id: string;
    name: string;
    voteCount: number;
  }>;
}

interface GovernanceApproval {
  id: string;
  title: string;
  type: string;
  status: string;
  requiredApprovals: number;
  receivedApprovals: number;
  approvers: string[];
  entityType?: string | null;
  entityId?: string | null;
}

interface GovernanceOverviewResponse {
  officeAccess: {
    offices: Array<{ id: string; position: string }>;
    permissions: string[];
  };
  summary: {
    activeMembers: number;
    openElections: number;
    pendingApprovals: number;
  };
  members: GovernanceMember[];
  elections: GovernanceElection[];
  approvals: GovernanceApproval[];
}

const initialApprovalForm = {
  id: "",
  type: "EXPENSE",
  title: "",
  entityType: "",
  entityId: "",
  status: "PENDING",
  requiredApprovals: "1",
  receivedApprovals: "0",
  approvers: "",
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-NG");
}

export default function ResidentOfficeGovernancePage() {
  const { residentSession } = useResidentPortalSession();
  const { showToast } = usePrototypeUI();
  const token = residentSession?.token;
  const [data, setData] = useState<GovernanceOverviewResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvalForm, setApprovalForm] = useState(initialApprovalForm);

  function loadGovernanceOverview(currentToken: string) {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<GovernanceOverviewResponse>("/resident/office/governance", {
      token: currentToken,
    })
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
              : "Could not load the governance overview.",
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

    return loadGovernanceOverview(token);
  }, [token]);

  const activeMembers = useMemo(
    () => (data?.members ?? []).filter((member) => member.status === "ACTIVE"),
    [data],
  );

  async function handleSaveApproval(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSaving(true);

    try {
      const approverLabels = approvalForm.approvers
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const body = {
        type: approvalForm.type,
        title: approvalForm.title,
        entityType: approvalForm.entityType || undefined,
        entityId: approvalForm.entityId || undefined,
        status: approvalForm.status,
        requiredApprovals: Number(approvalForm.requiredApprovals) || 1,
        receivedApprovals: Number(approvalForm.receivedApprovals) || 0,
        steps: approverLabels.map((label, index) => ({
          orderIndex: index + 1,
          roleLabel: label,
          status: "PENDING",
        })),
      };

      if (approvalForm.id) {
        await apiRequest(`/resident/office/approvals/${approvalForm.id}`, {
          method: "PATCH",
          token,
          body,
        });
        showToast("Governance request updated.", "success");
      } else {
        await apiRequest("/resident/office/approvals", {
          method: "POST",
          token,
          body,
        });
        showToast("Governance request created.", "success");
      }

      setApprovalForm(initialApprovalForm);
      void loadGovernanceOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the governance request.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteApproval(approvalId: string, title: string) {
    if (!token || !window.confirm(`Delete governance request "${title}"?`)) {
      return;
    }

    try {
      await apiRequest(`/resident/office/approvals/${approvalId}`, {
        method: "DELETE",
        token,
      });
      showToast("Governance request deleted.", "success");
      void loadGovernanceOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the governance request.",
        "error",
      );
    }
  }

  function fillApprovalForm(approval: GovernanceApproval) {
    setApprovalForm({
      id: approval.id,
      type: approval.type,
      title: approval.title,
      entityType: approval.entityType ?? "",
      entityId: approval.entityId ?? "",
      status: approval.status,
      requiredApprovals: `${approval.requiredApprovals}`,
      receivedApprovals: `${approval.receivedApprovals}`,
      approvers: approval.approvers.join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <ResidentPortalShell topbarTitle="Governance Overview" breadcrumb="Office Governance">
      <PageMeta title="Resident Office Governance Overview" />
      <PageHeader
        title="Estate Governance Overview"
        description="Active ExCo holders can review the current office roster, election windows, and approval pressure without entering the estate admin workspace."
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
          <div className="stat-label">Active ExCo Members</div>
          <div className="stat-value">{data?.summary.activeMembers ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Elections</div>
          <div className="stat-value">{data?.summary.openElections ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value">{data?.summary.pendingApprovals ?? 0}</div>
        </div>
      </div>

      {data?.officeAccess.permissions.includes("governance_management") ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <strong>
              {approvalForm.id ? "Edit Governance Request" : "Create Governance Request"}
            </strong>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveApproval} className="estate-form-grid">
              <label>
                Title
                <input
                  className="form-input"
                  value={approvalForm.title}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Type
                <select
                  className="form-input"
                  value={approvalForm.type}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="CAUSE">Cause</option>
                  <option value="LEVY">Levy</option>
                  <option value="EXCO_HANDOVER">ExCo Handover</option>
                  <option value="POLICY">Policy</option>
                </select>
              </label>
              <label>
                Status
                <select
                  className="form-input"
                  value={approvalForm.status}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>
              <label>
                Required approvals
                <input
                  className="form-input"
                  inputMode="numeric"
                  value={approvalForm.requiredApprovals}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      requiredApprovals: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Received approvals
                <input
                  className="form-input"
                  inputMode="numeric"
                  value={approvalForm.receivedApprovals}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      receivedApprovals: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Entity type
                <input
                  className="form-input"
                  value={approvalForm.entityType}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      entityType: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="estate-form-wide">
                Entity ID
                <input
                  className="form-input"
                  value={approvalForm.entityId}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      entityId: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="estate-form-wide">
                Approver roles or names
                <input
                  className="form-input"
                  value={approvalForm.approvers}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      approvers: event.target.value,
                    }))
                  }
                  placeholder="President, Finance Secretary, Auditor"
                />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? "Saving…"
                    : approvalForm.id
                      ? "Update Request"
                      : "Create Request"}
                </button>
                {approvalForm.id ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setApprovalForm(initialApprovalForm)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <div className="card">
          <div className="card-header">
            <strong>Current ExCo Roster</strong>
          </div>
          {loading ? (
            <div className="card-body">
              <p style={{ margin: 0 }}>Loading ExCo roster…</p>
            </div>
          ) : activeMembers.length ? (
            <div>
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{member.fullName}</strong>
                      <div className="td-muted" style={{ fontSize: 12 }}>{member.position}</div>
                    </div>
                    <StatusBadge tone="green">{member.status}</StatusBadge>
                  </div>
                  <div className="td-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Phone: {member.phone || "—"} · Tenure ends {formatDateTime(member.tenureEndDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-body">
              <p style={{ margin: 0 }}>No active ExCo members found.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <strong>Election Watch</strong>
          </div>
          {loading ? (
            <div className="card-body">
              <p style={{ margin: 0 }}>Loading election activity…</p>
            </div>
          ) : data?.elections.length ? (
            <div>
              {data.elections.map((election) => (
                <div
                  key={election.id}
                  style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{election.title}</strong>
                      <div className="td-muted" style={{ fontSize: 12 }}>
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
                  <div className="td-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {formatDateTime(election.startTime)} to {formatDateTime(election.endTime)} ·{" "}
                    {election.totalVotes} vote(s)
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {election.candidates.map((candidate) => (
                      <StatusBadge key={candidate.id} tone="gray">
                        {candidate.name}: {candidate.voteCount}
                      </StatusBadge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-body">
              <p style={{ margin: 0 }}>No election records yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <strong>Approval Requests</strong>
        </div>
        {loading ? (
          <div className="card-body">
            <p style={{ margin: 0 }}>Loading approvals…</p>
          </div>
        ) : data?.approvals.length ? (
          <div>
            {data.approvals.map((approval) => (
              <div
                key={approval.id}
                style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{approval.title}</strong>
                    <div className="td-muted" style={{ fontSize: 12 }}>{approval.type}</div>
                  </div>
                  <StatusBadge
                    tone={
                      approval.status === "APPROVED"
                        ? "green"
                        : approval.status === "REJECTED"
                          ? "red"
                          : "amber"
                    }
                  >
                    {approval.status}
                  </StatusBadge>
                </div>
                <div className="td-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {approval.receivedApprovals} of {approval.requiredApprovals} approvals received
                </div>
                {approval.approvers.length ? (
                  <div className="td-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Approvers: {approval.approvers.join(", ")}
                  </div>
                ) : null}
                {data?.officeAccess.permissions.includes("governance_management") ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => fillApprovalForm(approval)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs estate-danger"
                      onClick={() => void handleDeleteApproval(approval.id, approval.title)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="card-body">
            <p style={{ margin: 0 }}>No approval requests found.</p>
          </div>
        )}
      </div>
    </ResidentPortalShell>
  );
}
