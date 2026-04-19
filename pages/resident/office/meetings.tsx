import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ResidentPortalShell from "../../../components/auth/ResidentPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../../context/TenantSessionContext";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { apiRequest } from "../../../lib/api";

interface OfficeMeeting {
  id: string;
  title: string;
  agenda: string;
  audienceLabel: string;
  provider: "google_meet" | "zoom" | "teams" | "custom_link";
  providerLabel: string;
  scheduledFor: string;
  scheduledForLabel: string;
  durationMinutes: number;
  status: "requested" | "confirmed" | "cancelled" | "completed" | "live";
  statusLabel: string;
  meetingLink?: string | null;
  landlordNotes?: string | null;
  participantCount: number;
}

interface MeetingProviderConnection {
  provider: "GOOGLE_MEET" | "ZOOM" | "TEAMS";
  label: string;
  description: string;
  authMode: "oauth" | "credentials";
  connected: boolean;
  available: boolean;
  canGenerate: boolean;
  providerAccountEmail?: string | null;
  providerAccountName?: string | null;
  connectedAt?: string | null;
  connectHint: string;
}

interface OfficeMeetingsResponse {
  officeAccess: {
    offices: Array<{ id: string; position: string }>;
    permissions: string[];
  };
  providerConnections: MeetingProviderConnection[];
  residents: Array<{
    id: string;
    fullName: string;
    houseNumber?: string | null;
    residentType: string;
    canAccessResidentPortal: boolean;
  }>;
  summary: {
    total: number;
    requested: number;
    confirmed: number;
    compound: number;
  };
  meetings: OfficeMeeting[];
}

type MeetingProviderKey = "GOOGLE_MEET" | "ZOOM" | "TEAMS";

const initialScheduleForm = {
  residentId: "",
  title: "",
  agenda: "",
  audience: "SOLO",
  provider: "GOOGLE_MEET",
  scheduledFor: "",
  durationMinutes: "30",
  meetingLink: "",
  landlordNotes: "",
};

function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function createDefaultScheduleDateTime() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(10, 0, 0, 0);
  return toDateTimeInputValue(value.toISOString());
}

function statusTone(status: OfficeMeeting["status"]) {
  if (status === "live" || status === "confirmed") {
    return "green" as const;
  }

  if (status === "requested") {
    return "amber" as const;
  }

  if (status === "cancelled") {
    return "red" as const;
  }

  return "gray" as const;
}

function providerTone(provider: MeetingProviderConnection) {
  if (!provider.available) {
    return "gray" as const;
  }

  return provider.connected ? ("green" as const) : ("amber" as const);
}

function getProviderGenerateLabel(provider: MeetingProviderKey) {
  if (provider === "GOOGLE_MEET") {
    return "Schedule + Create Google Meet";
  }

  if (provider === "ZOOM") {
    return "Schedule + Create Zoom Meeting";
  }

  return "Schedule + Create Teams Meeting";
}

function getGenerateMeetingLinkLabel(provider: string) {
  if (provider === "GOOGLE_MEET") {
    return "Generate Google Meet Link";
  }

  if (provider === "ZOOM") {
    return "Create Zoom Meeting Link";
  }

  if (provider === "TEAMS") {
    return "Create Teams Meeting Link";
  }

  return "Manual link required";
}

export default function ResidentOfficeMeetingsPage() {
  const router = useRouter();
  const { residentSession } = useResidentPortalSession();
  const { showToast } = usePrototypeUI();
  const token = residentSession?.token;
  const [data, setData] = useState<OfficeMeetingsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingMode, setSubmittingMode] = useState<null | "manual" | "provider">(
    null,
  );
  const [savingMeetingId, setSavingMeetingId] = useState<string | null>(null);
  const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);
  const [providerActionKey, setProviderActionKey] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    ...initialScheduleForm,
    scheduledFor: createDefaultScheduleDateTime(),
  });
  const [zoomForm, setZoomForm] = useState({
    accountId: "",
    clientId: "",
    clientSecret: "",
    hostEmail: "",
  });
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        status: string;
        provider: string;
        scheduledFor: string;
        durationMinutes: string;
        meetingLink: string;
        landlordNotes: string;
      }
    >
  >({});

  const providerMap = useMemo(
    () =>
      new Map(
        (data?.providerConnections ?? []).map((provider) => [
          provider.provider,
          provider,
        ]),
      ),
    [data?.providerConnections],
  );

  const selectedProvider =
    scheduleForm.provider === "CUSTOM_LINK"
      ? null
      : (scheduleForm.provider as MeetingProviderKey);
  const selectedProviderConnection = selectedProvider
    ? providerMap.get(selectedProvider) ?? null
    : null;
  const canManageProviders =
    data?.officeAccess.permissions.includes("meetings_management") ?? false;

  function loadMeetingsOverview(currentToken: string) {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<OfficeMeetingsResponse>("/resident/office/meetings", {
      token: currentToken,
    })
      .then(({ data: response }) => {
        if (!cancelled) {
          setData(response);
          setDrafts(
            Object.fromEntries(
              response.meetings.map((meeting) => [
                meeting.id,
                {
                  status: meeting.status.toUpperCase(),
                  provider: meeting.provider.toUpperCase(),
                  scheduledFor: toDateTimeInputValue(meeting.scheduledFor),
                  durationMinutes: `${meeting.durationMinutes}`,
                  meetingLink: meeting.meetingLink ?? "",
                  landlordNotes: meeting.landlordNotes ?? "",
                },
              ]),
            ),
          );
          setScheduleForm((current) => ({
            ...current,
            residentId: current.residentId || response.residents[0]?.id || "",
          }));
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load the meetings overview.",
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

    return loadMeetingsOverview(token);
  }, [token]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const { google_connected, google_error, teams_connected, teams_error, ...rest } =
      router.query;

    const feedback =
      google_connected === "1"
        ? { text: "Google Meet connected successfully.", tone: "success" as const }
        : teams_connected === "1"
          ? {
              text: "Microsoft Teams connected successfully.",
              tone: "success" as const,
            }
          : typeof google_error === "string"
            ? { text: decodeURIComponent(google_error), tone: "error" as const }
            : typeof teams_error === "string"
              ? { text: decodeURIComponent(teams_error), tone: "error" as const }
              : null;

    if (!feedback) {
      return;
    }

    showToast(feedback.text, feedback.tone);
    void router.replace(
      {
        pathname: router.pathname,
        query: rest,
      },
      undefined,
      { shallow: true },
    );
  }, [router, showToast]);

  const upcomingMeetings = useMemo(
    () =>
      (data?.meetings ?? []).filter(
        (meeting) =>
          meeting.status === "requested" ||
          meeting.status === "confirmed" ||
          meeting.status === "live",
      ),
    [data],
  );

  function getReturnToUrl() {
    if (typeof window === "undefined") {
      return null;
    }

    return `${window.location.origin}${router.pathname}`;
  }

  function updateDraft(
    meetingId: string,
    field:
      | "status"
      | "provider"
      | "scheduledFor"
      | "durationMinutes"
      | "meetingLink"
      | "landlordNotes",
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [meetingId]: {
        ...current[meetingId],
        [field]: value,
      },
    }));
  }

  async function handleCreateMeeting(mode: "manual" | "provider") {
    if (!token) {
      return;
    }

    setSubmittingMode(mode);

    try {
      const createResponse = await apiRequest<{ meeting: OfficeMeeting }>(
        "/resident/office/meetings",
        {
          method: "POST",
          token,
          body: {
            residentId: scheduleForm.residentId,
            title: scheduleForm.title,
            agenda: scheduleForm.agenda || undefined,
            audience: scheduleForm.audience,
            provider: scheduleForm.provider,
            scheduledFor: new Date(scheduleForm.scheduledFor).toISOString(),
            durationMinutes: Number(scheduleForm.durationMinutes),
            meetingLink: scheduleForm.meetingLink || undefined,
            landlordNotes: scheduleForm.landlordNotes || undefined,
          },
        },
      );

      let generateLinkError: string | null = null;

      if (
        mode === "provider" &&
        scheduleForm.provider !== "CUSTOM_LINK" &&
        !scheduleForm.meetingLink.trim()
      ) {
        try {
          await apiRequest(
            `/resident/office/meetings/${createResponse.data.meeting.id}/generate-link`,
            {
              method: "POST",
              token,
            },
          );
        } catch (requestError) {
          generateLinkError =
            requestError instanceof Error
              ? requestError.message
              : "The meeting was scheduled, but the join link could not be created yet.";
        }
      }

      showToast(
        generateLinkError
          ? `Estate meeting scheduled. ${generateLinkError}`
          : "Estate meeting scheduled.",
        generateLinkError ? "info" : "success",
      );
      setScheduleForm({
        ...initialScheduleForm,
        residentId: scheduleForm.residentId,
        scheduledFor: createDefaultScheduleDateTime(),
      });
      void loadMeetingsOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not schedule the meeting.",
        "error",
      );
    } finally {
      setSubmittingMode(null);
    }
  }

  async function startOAuthProviderConnect(provider: "GOOGLE_MEET" | "TEAMS") {
    if (!token) {
      return;
    }

    const busyKey = `${provider}:connect`;
    setProviderActionKey(busyKey);

    try {
      const suffix = provider === "GOOGLE_MEET" ? "google" : "teams";
      const returnTo = getReturnToUrl();
      const response = await apiRequest<{ url: string }>(
        `/resident/office/meetings/providers/${suffix}/connect${
          returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
        }`,
        { token },
      );

      window.location.assign(response.data.url);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : `Could not start ${provider === "GOOGLE_MEET" ? "Google" : "Teams"} connection.`,
        "error",
      );
      setProviderActionKey(null);
    }
  }

  async function connectZoomProvider() {
    if (!token) {
      return;
    }

    setProviderActionKey("ZOOM:connect");

    try {
      await apiRequest("/resident/office/meetings/providers/zoom", {
        method: "POST",
        token,
        body: zoomForm,
      });
      showToast("Zoom connected successfully.", "success");
      setZoomForm({
        accountId: "",
        clientId: "",
        clientSecret: "",
        hostEmail: "",
      });
      void loadMeetingsOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not connect Zoom.",
        "error",
      );
    } finally {
      setProviderActionKey(null);
    }
  }

  async function disconnectProvider(provider: MeetingProviderKey) {
    if (!token) {
      return;
    }

    setProviderActionKey(`${provider}:disconnect`);

    try {
      await apiRequest(`/resident/office/meetings/providers/${provider}`, {
        method: "DELETE",
        token,
      });
      showToast(
        `${provider === "GOOGLE_MEET" ? "Google Meet" : provider === "ZOOM" ? "Zoom" : "Microsoft Teams"} disconnected.`,
        "success",
      );
      void loadMeetingsOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not disconnect the provider.",
        "error",
      );
    } finally {
      setProviderActionKey(null);
    }
  }

  async function saveMeeting(meetingId: string) {
    if (!token || !drafts[meetingId]) {
      return;
    }

    setSavingMeetingId(meetingId);

    try {
      const draft = drafts[meetingId];
      await apiRequest(`/resident/office/meetings/${meetingId}`, {
        method: "PATCH",
        token,
        body: {
          status: draft.status,
          provider: draft.provider,
          scheduledFor: new Date(draft.scheduledFor).toISOString(),
          durationMinutes: Number(draft.durationMinutes),
          meetingLink: draft.meetingLink || undefined,
          landlordNotes: draft.landlordNotes || undefined,
        },
      });

      showToast("Meeting updated.", "success");
      void loadMeetingsOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the meeting.",
        "error",
      );
    } finally {
      setSavingMeetingId(null);
    }
  }

  async function generateMeetingLink(meetingId: string) {
    if (!token) {
      return;
    }

    setGeneratingLinkId(meetingId);

    try {
      await apiRequest(`/resident/office/meetings/${meetingId}/generate-link`, {
        method: "POST",
        token,
      });
      showToast("Meeting link generated.", "success");
      void loadMeetingsOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate the meeting link.",
        "error",
      );
    } finally {
      setGeneratingLinkId(null);
    }
  }

  return (
    <ResidentPortalShell topbarTitle="Meetings Overview" breadcrumb="Office Meetings">
      <PageMeta title="Resident Office Meetings Overview" />
      <PageHeader
        title="Estate Meetings Overview"
        description="Active office holders can monitor scheduled estate meetings and shared join links."
      />

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <div
            className="stats-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginBottom: 24,
            }}
          >
            <div className="stat-card">
              <div className="stat-label">Total Meetings</div>
              <div className="stat-value">{data.summary.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Upcoming</div>
              <div className="stat-value">{upcomingMeetings.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Compound Sessions</div>
              <div className="stat-value">{data.summary.compound}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Confirmed</div>
              <div className="stat-value">{data.summary.confirmed}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <strong>Meeting Provider Connections</strong>
            </div>
            <div
              className="card-body"
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {data.providerConnections.map((provider) => (
                <div
                  key={provider.provider}
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: "16px 18px",
                    borderRadius: 18,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{provider.label}</div>
                      <div className="td-muted" style={{ fontSize: 13, marginTop: 4 }}>
                        {provider.description}
                      </div>
                    </div>
                    <StatusBadge tone={providerTone(provider)}>
                      {provider.connected
                        ? "Connected"
                        : provider.available
                          ? "Not connected"
                          : "Unavailable"}
                    </StatusBadge>
                  </div>

                  <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.7 }}>
                    {provider.connectHint}
                  </div>

                  {provider.providerAccountEmail || provider.providerAccountName ? (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "var(--bg)",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      <div>
                        <strong>Account:</strong>{" "}
                        {provider.providerAccountName || provider.providerAccountEmail}
                      </div>
                      {provider.providerAccountEmail &&
                      provider.providerAccountEmail !== provider.providerAccountName ? (
                        <div className="td-muted">{provider.providerAccountEmail}</div>
                      ) : null}
                      {provider.connectedAt ? (
                        <div className="td-muted" style={{ marginTop: 4 }}>
                          Connected {new Date(provider.connectedAt).toLocaleString("en-NG")}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {provider.provider === "ZOOM" &&
                  canManageProviders &&
                  !provider.connected ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        paddingTop: 12,
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <input
                        className="form-input"
                        placeholder="Zoom account ID"
                        value={zoomForm.accountId}
                        onChange={(event) =>
                          setZoomForm((current) => ({
                            ...current,
                            accountId: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="form-input"
                        placeholder="Zoom client ID"
                        value={zoomForm.clientId}
                        onChange={(event) =>
                          setZoomForm((current) => ({
                            ...current,
                            clientId: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="form-input"
                        type="password"
                        placeholder="Zoom client secret"
                        value={zoomForm.clientSecret}
                        onChange={(event) =>
                          setZoomForm((current) => ({
                            ...current,
                            clientSecret: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="form-input"
                        type="email"
                        placeholder="Zoom host email"
                        value={zoomForm.hostEmail}
                        onChange={(event) =>
                          setZoomForm((current) => ({
                            ...current,
                            hostEmail: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : null}

                  {canManageProviders ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!provider.connected ? (
                        provider.provider === "ZOOM" ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => void connectZoomProvider()}
                            disabled={
                              providerActionKey === "ZOOM:connect" || !provider.available
                            }
                          >
                            {providerActionKey === "ZOOM:connect"
                              ? "Connecting…"
                              : "Connect Zoom"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              void startOAuthProviderConnect(
                                provider.provider === "GOOGLE_MEET"
                                  ? "GOOGLE_MEET"
                                  : "TEAMS",
                              )
                            }
                            disabled={
                              providerActionKey === `${provider.provider}:connect` ||
                              !provider.available
                            }
                          >
                            {providerActionKey === `${provider.provider}:connect`
                              ? "Redirecting…"
                              : `Connect ${provider.label}`}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void disconnectProvider(provider.provider)}
                          disabled={providerActionKey === `${provider.provider}:disconnect`}
                        >
                          {providerActionKey === `${provider.provider}:disconnect`
                            ? "Disconnecting…"
                            : `Disconnect ${provider.label}`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="td-muted" style={{ fontSize: 12 }}>
                      Only meeting-management office holders can connect or disconnect providers.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {data.officeAccess.permissions.includes("meetings_management") ? (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <strong>Schedule Estate Meeting</strong>
              </div>
              <div className="card-body">
                <form
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    void handleCreateMeeting("manual");
                  }}
                  className="estate-form-grid"
                >
                  <label>
                    Resident / House
                    <select
                      className="form-input"
                      value={scheduleForm.residentId}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          residentId: event.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Select resident</option>
                      {data.residents.map((resident) => (
                        <option key={resident.id} value={resident.id}>
                          {resident.fullName}
                          {resident.houseNumber ? ` · House ${resident.houseNumber}` : ""}
                          {resident.residentType ? ` · ${resident.residentType}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Title
                    <input
                      className="form-input"
                      value={scheduleForm.title}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Audience
                    <select
                      className="form-input"
                      value={scheduleForm.audience}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          audience: event.target.value,
                        }))
                      }
                    >
                      <option value="SOLO">Single resident</option>
                      <option value="COMPOUND">Whole house / compound</option>
                    </select>
                  </label>
                  <label>
                    Provider
                    <select
                      className="form-input"
                      value={scheduleForm.provider}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          provider: event.target.value,
                        }))
                      }
                    >
                      <option value="GOOGLE_MEET">Google Meet</option>
                      <option value="ZOOM">Zoom</option>
                      <option value="TEAMS">Teams</option>
                      <option value="CUSTOM_LINK">Custom link</option>
                    </select>
                  </label>
                  <label>
                    Scheduled for
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={scheduleForm.scheduledFor}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          scheduledFor: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Duration (minutes)
                    <input
                      className="form-input"
                      inputMode="numeric"
                      value={scheduleForm.durationMinutes}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          durationMinutes: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="estate-form-wide">
                    Agenda
                    <textarea
                      className="form-input"
                      rows={2}
                      value={scheduleForm.agenda}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          agenda: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="estate-form-wide">
                    Meeting link
                    <input
                      className="form-input"
                      value={scheduleForm.meetingLink}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          meetingLink: event.target.value,
                        }))
                      }
                      placeholder="Paste one manually or let a connected provider create it"
                    />
                  </label>
                  <div className="estate-form-wide td-muted" style={{ fontSize: 13 }}>
                    {scheduleForm.provider === "CUSTOM_LINK"
                      ? "Custom link meetings require you to paste the join link yourself."
                      : selectedProviderConnection?.canGenerate
                        ? `${selectedProviderConnection.label} is connected. This office can auto-create the meeting link for you.`
                        : selectedProviderConnection?.available
                          ? `Connect ${selectedProviderConnection.label} above if you want this office to auto-create the meeting link.`
                          : `${selectedProviderConnection?.label ?? "This provider"} is not configured on the server yet.`}
                  </div>
                  <label className="estate-form-wide">
                    Notes
                    <textarea
                      className="form-input"
                      rows={2}
                      value={scheduleForm.landlordNotes}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          landlordNotes: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="estate-form-actions estate-form-wide">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingMode !== null}
                    >
                      {submittingMode === "manual"
                        ? "Scheduling…"
                        : "Schedule Meeting"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleCreateMeeting("provider")}
                      disabled={
                        submittingMode !== null ||
                        scheduleForm.provider === "CUSTOM_LINK" ||
                        !selectedProviderConnection?.canGenerate
                      }
                    >
                      {submittingMode === "provider"
                        ? "Creating meeting link…"
                        : selectedProvider
                          ? getProviderGenerateLabel(selectedProvider)
                          : "Schedule + Create Meeting"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-header">
              <strong>Meeting Schedule</strong>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 14 }}>
              {data.meetings.map((meeting) => {
                const activeProvider =
                  drafts[meeting.id]?.provider ?? meeting.provider.toUpperCase();
                const activeProviderConnection =
                  activeProvider === "CUSTOM_LINK"
                    ? null
                    : providerMap.get(activeProvider as MeetingProviderKey) ?? null;

                return (
                  <div
                    key={meeting.id}
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{meeting.title}</div>
                      <div className="td-muted" style={{ fontSize: 13, marginTop: 4 }}>
                        {meeting.providerLabel} · {meeting.audienceLabel} · {meeting.scheduledForLabel}
                      </div>
                    </div>
                    <StatusBadge tone={statusTone(meeting.status)}>
                      {meeting.statusLabel}
                    </StatusBadge>
                  </div>

                  {meeting.agenda ? (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                      {meeting.agenda}
                    </p>
                  ) : null}

                  {meeting.landlordNotes ? (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "var(--bg)",
                        color: "var(--ink2)",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      <strong>Note:</strong> {meeting.landlordNotes}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span className="td-muted" style={{ fontSize: 12 }}>
                      {meeting.participantCount} participant
                      {meeting.participantCount === 1 ? "" : "s"} · {meeting.durationMinutes} min
                    </span>
                    {meeting.meetingLink ? (
                      <a
                        className="btn btn-secondary btn-sm"
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Join Link
                      </a>
                    ) : null}
                  </div>

                  {data.officeAccess.permissions.includes("meetings_management") ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        paddingTop: 10,
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        }}
                      >
                        <label>
                          <span className="td-muted" style={{ fontSize: 12 }}>Status</span>
                          <select
                            className="form-input"
                            value={drafts[meeting.id]?.status ?? meeting.status.toUpperCase()}
                            onChange={(event) =>
                              updateDraft(meeting.id, "status", event.target.value)
                            }
                          >
                            <option value="REQUESTED">Requested</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </label>
                        <label>
                          <span className="td-muted" style={{ fontSize: 12 }}>Provider</span>
                          <select
                            className="form-input"
                            value={drafts[meeting.id]?.provider ?? meeting.provider.toUpperCase()}
                            onChange={(event) =>
                              updateDraft(meeting.id, "provider", event.target.value)
                            }
                          >
                            <option value="GOOGLE_MEET">Google Meet</option>
                            <option value="ZOOM">Zoom</option>
                            <option value="TEAMS">Teams</option>
                            <option value="CUSTOM_LINK">Custom link</option>
                          </select>
                        </label>
                        <label>
                          <span className="td-muted" style={{ fontSize: 12 }}>
                            Scheduled for
                          </span>
                          <input
                            className="form-input"
                            type="datetime-local"
                            value={drafts[meeting.id]?.scheduledFor ?? toDateTimeInputValue(meeting.scheduledFor)}
                            onChange={(event) =>
                              updateDraft(meeting.id, "scheduledFor", event.target.value)
                            }
                          />
                        </label>
                        <label>
                          <span className="td-muted" style={{ fontSize: 12 }}>
                            Duration (minutes)
                          </span>
                          <input
                            className="form-input"
                            inputMode="numeric"
                            value={drafts[meeting.id]?.durationMinutes ?? `${meeting.durationMinutes}`}
                            onChange={(event) =>
                              updateDraft(meeting.id, "durationMinutes", event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <label>
                        <span className="td-muted" style={{ fontSize: 12 }}>Meeting link</span>
                        <input
                          className="form-input"
                          value={drafts[meeting.id]?.meetingLink ?? meeting.meetingLink ?? ""}
                          onChange={(event) =>
                            updateDraft(meeting.id, "meetingLink", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        <span className="td-muted" style={{ fontSize: 12 }}>Notes</span>
                        <textarea
                          className="form-input"
                          rows={2}
                          value={drafts[meeting.id]?.landlordNotes ?? meeting.landlordNotes ?? ""}
                          onChange={(event) =>
                            updateDraft(meeting.id, "landlordNotes", event.target.value)
                          }
                        />
                      </label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void saveMeeting(meeting.id)}
                          disabled={savingMeetingId === meeting.id}
                        >
                          {savingMeetingId === meeting.id ? "Saving…" : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void generateMeetingLink(meeting.id)}
                          disabled={
                            generatingLinkId === meeting.id ||
                            activeProvider === "CUSTOM_LINK" ||
                            !activeProviderConnection?.canGenerate
                          }
                        >
                          {generatingLinkId === meeting.id
                            ? "Generating…"
                            : getGenerateMeetingLinkLabel(activeProvider)}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {loading ? (
        <div className="empty-state">
          <p>Loading estate meetings overview…</p>
        </div>
      ) : null}
    </ResidentPortalShell>
  );
}
