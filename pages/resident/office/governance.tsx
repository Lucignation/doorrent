import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

interface GovernanceApprovalStep {
  id: string;
  orderIndex: number;
  roleLabel: string;
  approverName?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  notes?: string | null;
  decidedAt?: string | null;
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
  steps: GovernanceApprovalStep[];
}

interface ApprovalSupportTypeOption {
  value: string;
  label: string;
  description: string;
  entityTypes: Array<{
    value: string;
    label: string;
  }>;
}

interface ApprovalSupportEntityOption {
  approvalType: string;
  entityType: string;
  entityId: string;
  label: string;
  helper?: string | null;
}

interface ApprovalSupportApproverOption {
  id: string;
  position: string;
  fullName: string;
  phone?: string | null;
  label: string;
}

interface ApprovalSupportStatusOption {
  value: string;
  label: string;
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
  approvalSupport: {
    guidance: string;
    types: ApprovalSupportTypeOption[];
    statuses: ApprovalSupportStatusOption[];
    approverOptions: ApprovalSupportApproverOption[];
    entityOptions: ApprovalSupportEntityOption[];
  };
}

function buildInitialApprovalForm() {
  return {
    id: "",
    type: "EXPENSE",
    title: "",
    entityType: "ESTATE_EXPENSE",
    entityId: "",
    status: "PENDING",
    requiredApprovals: "1",
    receivedApprovals: "0",
    approverOptionIds: [] as string[],
  };
}

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
  const [approvalForm, setApprovalForm] = useState(buildInitialApprovalForm);
  const [approverDropdownOpen, setApproverDropdownOpen] = useState(false);
  const approverDropdownRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!approverDropdownOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!approverDropdownRef.current?.contains(event.target as Node)) {
        setApproverDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [approverDropdownOpen]);

  const activeMembers = useMemo(
    () => (data?.members ?? []).filter((member) => member.status === "ACTIVE"),
    [data],
  );

  const approvalTypeOptions = data?.approvalSupport.types ?? [];

  const approverOptions = useMemo(() => {
    const baseOptions = data?.approvalSupport.approverOptions ?? [];
    const optionMap = new Map<string, ApprovalSupportApproverOption>();

    for (const option of baseOptions) {
      optionMap.set(option.id, option);
    }

    for (const approval of data?.approvals ?? []) {
      for (const step of approval.steps ?? []) {
        const alreadyExists = Array.from(optionMap.values()).some(
          (option) =>
            option.position === step.roleLabel &&
            (step.approverName ? option.fullName === step.approverName : true),
        );

        if (alreadyExists) {
          continue;
        }

        const legacyId = `legacy:${step.roleLabel}:${step.approverName ?? ""}`;
        optionMap.set(legacyId, {
          id: legacyId,
          position: step.roleLabel,
          fullName: step.approverName ?? step.roleLabel,
          phone: null,
          label: step.approverName
            ? `${step.roleLabel} · ${step.approverName}`
            : step.roleLabel,
        });
      }
    }

    return Array.from(optionMap.values());
  }, [data]);

  const currentApprovalType = useMemo(
    () =>
      approvalTypeOptions.find((option) => option.value === approvalForm.type) ??
      approvalTypeOptions[0] ??
      null,
    [approvalForm.type, approvalTypeOptions],
  );

  const currentEntityTypeOptions = currentApprovalType?.entityTypes ?? [];

  const currentEntityOptions = useMemo(
    () =>
      (data?.approvalSupport.entityOptions ?? []).filter(
        (option) =>
          option.approvalType === approvalForm.type &&
          (!approvalForm.entityType || option.entityType === approvalForm.entityType),
      ),
    [approvalForm.entityType, approvalForm.type, data],
  );

  const selectedApproverOptions = useMemo(
    () =>
      approvalForm.approverOptionIds
        .map((optionId) => approverOptions.find((option) => option.id === optionId) ?? null)
        .filter((option): option is ApprovalSupportApproverOption => Boolean(option)),
    [approverOptions, approvalForm.approverOptionIds],
  );

  const approverDropdownLabel = useMemo(() => {
    if (selectedApproverOptions.length === 0) {
      return "Select approving offices";
    }

    if (selectedApproverOptions.length <= 2) {
      return selectedApproverOptions.map((option) => option.fullName).join(", ");
    }

    return `${selectedApproverOptions.length} approvers selected`;
  }, [selectedApproverOptions]);

  useEffect(() => {
    if (!approvalTypeOptions.length) {
      return;
    }

    const resolvedType =
      approvalTypeOptions.find((option) => option.value === approvalForm.type) ??
      approvalTypeOptions[0];
    const entityTypes = resolvedType.entityTypes ?? [];
    const entityTypeStillValid = entityTypes.some(
      (option) => option.value === approvalForm.entityType,
    );
    const nextEntityType = entityTypeStillValid
      ? approvalForm.entityType
      : entityTypes[0]?.value ?? "";

    if (
      resolvedType.value !== approvalForm.type ||
      nextEntityType !== approvalForm.entityType
    ) {
      setApprovalForm((current) => ({
        ...current,
        type: resolvedType.value,
        entityType: nextEntityType,
        entityId:
          entityTypeStillValid && resolvedType.value === current.type ? current.entityId : "",
      }));
    }
  }, [approvalForm.entityType, approvalForm.type, approvalTypeOptions]);

  useEffect(() => {
    if (!approvalForm.entityId) {
      return;
    }

    const entityStillValid = currentEntityOptions.some(
      (option) => option.entityId === approvalForm.entityId,
    );

    if (!entityStillValid) {
      setApprovalForm((current) => ({
        ...current,
        entityId: "",
      }));
    }
  }, [approvalForm.entityId, currentEntityOptions]);

  function handleApprovalTypeChange(nextType: string) {
    const nextTypeConfig =
      approvalTypeOptions.find((option) => option.value === nextType) ?? null;

    setApprovalForm((current) => ({
      ...current,
      type: nextType,
      entityType: nextTypeConfig?.entityTypes[0]?.value ?? "",
      entityId: "",
    }));
  }

  function toggleApproverOption(optionId: string) {
    setApprovalForm((current) => {
      const exists = current.approverOptionIds.includes(optionId);

      return {
        ...current,
        approverOptionIds: exists
          ? current.approverOptionIds.filter((currentId) => currentId !== optionId)
          : [...current.approverOptionIds, optionId],
      };
    });
  }

  async function handleSaveApproval(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (selectedApproverOptions.length === 0) {
      showToast("Select at least one approver for this request.", "error");
      return;
    }

    const requiredApprovals = Number(approvalForm.requiredApprovals) || 1;
    const receivedApprovals = Number(approvalForm.receivedApprovals) || 0;

    if (requiredApprovals > selectedApproverOptions.length) {
      showToast(
        "Required approvals cannot be more than the selected approval levels.",
        "error",
      );
      return;
    }

    if (receivedApprovals > requiredApprovals) {
      showToast("Received approvals cannot be more than required approvals.", "error");
      return;
    }

    setSaving(true);

    try {
      const body = {
        type: approvalForm.type,
        title: approvalForm.title,
        entityType: approvalForm.entityType || undefined,
        entityId: approvalForm.entityId || undefined,
        status: approvalForm.status,
        requiredApprovals,
        receivedApprovals,
        steps: selectedApproverOptions.map((option, index) => ({
          orderIndex: index + 1,
          roleLabel: option.position,
          approverName: option.fullName,
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

      setApprovalForm(buildInitialApprovalForm());
      setApproverDropdownOpen(false);
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
    const nextApproverIds = approval.steps
      .map((step) => {
        const exactMatch = approverOptions.find(
          (option) =>
            option.position === step.roleLabel &&
            (step.approverName ? option.fullName === step.approverName : true),
        );

        if (exactMatch) {
          return exactMatch.id;
        }

        return (
          approverOptions.find((option) => option.position === step.roleLabel)?.id ?? null
        );
      })
      .filter((value): value is string => Boolean(value));

    setApprovalForm({
      id: approval.id,
      type: approval.type,
      title: approval.title,
      entityType: approval.entityType ?? "",
      entityId: approval.entityId ?? "",
      status: approval.status,
      requiredApprovals: `${approval.requiredApprovals}`,
      receivedApprovals: `${approval.receivedApprovals}`,
      approverOptionIds: nextApproverIds,
    });
    setApproverDropdownOpen(false);
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
            <div
              className="estate-form-wide td-muted"
              style={{
                marginBottom: 18,
                borderRadius: 14,
                border: "1px solid var(--border)",
                padding: 14,
                background: "var(--surface)",
                fontSize: 13,
              }}
            >
              {data?.approvalSupport.guidance ??
                "Approval levels are the ordered approvers you select for this request."}
            </div>

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
                  onChange={(event) => handleApprovalTypeChange(event.target.value)}
                >
                  {approvalTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {currentApprovalType ? (
                  <div className="td-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {currentApprovalType.description}
                  </div>
                ) : null}
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
                  {(data?.approvalSupport.statuses ?? []).map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
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
                Related record type
                <select
                  className="form-input"
                  value={approvalForm.entityType}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      entityType: event.target.value,
                      entityId: "",
                    }))
                  }
                  disabled={currentEntityTypeOptions.length === 0}
                >
                  {currentEntityTypeOptions.length === 0 ? (
                    <option value="">No linked record required</option>
                  ) : null}
                  {currentEntityTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="td-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  This replaces the raw entity ID field. Users now pick the actual estate record
                  instead of typing an internal ID.
                </div>
              </label>
              <label className="estate-form-wide">
                Related record
                <select
                  className="form-input"
                  value={approvalForm.entityId}
                  onChange={(event) =>
                    setApprovalForm((current) => ({
                      ...current,
                      entityId: event.target.value,
                    }))
                  }
                  disabled={currentEntityTypeOptions.length === 0 || currentEntityOptions.length === 0}
                >
                  <option value="">
                    {currentEntityTypeOptions.length === 0
                      ? "No linked record needed for this approval type"
                      : currentEntityOptions.length === 0
                        ? "No matching records available yet"
                        : "Select a linked record"}
                  </option>
                  {currentEntityOptions.map((option) => (
                    <option key={`${option.entityType}:${option.entityId}`} value={option.entityId}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {approvalForm.entityId ? (
                  <div className="td-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {currentEntityOptions.find(
                      (option) => option.entityId === approvalForm.entityId,
                    )?.helper ?? ""}
                  </div>
                ) : null}
              </label>
              <div className="estate-form-wide" ref={approverDropdownRef}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Approver roles or names</div>
                <button
                  type="button"
                  className="form-input"
                  onClick={() => setApproverDropdownOpen((current) => !current)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    cursor: "pointer",
                    minHeight: 48,
                    background: "var(--surface-elevated, #fff)",
                  }}
                >
                  <span
                    style={{
                      color:
                        selectedApproverOptions.length > 0
                          ? "var(--text)"
                          : "var(--muted-text, #6b7280)",
                    }}
                  >
                    {approverDropdownLabel}
                  </span>
                  <span className="td-muted" style={{ fontSize: 12 }}>
                    {approverDropdownOpen ? "Close" : "Open"}
                  </span>
                </button>
                {approverDropdownOpen ? (
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "var(--surface-elevated, #fff)",
                      boxShadow: "0 18px 38px rgba(15, 23, 42, 0.08)",
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {approverOptions.length ? (
                      approverOptions.map((option) => {
                        const selected = approvalForm.approverOptionIds.includes(option.id);

                        return (
                          <label
                            key={option.id}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 12,
                              padding: "12px 14px",
                              borderBottom: "1px solid var(--border)",
                              cursor: "pointer",
                              background: selected ? "rgba(47, 110, 74, 0.06)" : "transparent",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleApproverOption(option.id)}
                              style={{ marginTop: 2 }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{option.fullName}</div>
                              <div className="td-muted" style={{ fontSize: 12 }}>
                                {option.position}
                                {option.phone ? ` · ${option.phone}` : ""}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="td-muted" style={{ padding: 14, fontSize: 13 }}>
                        No active ExCo approvers are available yet.
                      </div>
                    )}
                  </div>
                ) : null}
                <div className="td-muted" style={{ fontSize: 12, marginTop: 8 }}>
                  The order you select approvers becomes the approval levels for this request.
                </div>
                {selectedApproverOptions.length ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {selectedApproverOptions.map((option, index) => (
                      <StatusBadge key={option.id} tone="gray">
                        Level {index + 1}: {option.position}
                      </StatusBadge>
                    ))}
                  </div>
                ) : null}
              </div>
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
                    onClick={() => {
                      setApprovalForm(buildInitialApprovalForm());
                      setApproverDropdownOpen(false);
                    }}
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
