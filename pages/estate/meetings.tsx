import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { EstateDashboardData } from "../../lib/estate-preview";
import type { BadgeTone } from "../../types/app";

interface EstateMeetingRecord {
  id: string;
  title: string;
  agenda: string;
  audience: "solo" | "compound";
  audienceLabel: string;
  provider: "google_meet" | "zoom" | "teams" | "custom_link";
  providerLabel: string;
  scheduledFor: string;
  scheduledForLabel: string;
  durationMinutes: number;
  status: "requested" | "confirmed" | "cancelled" | "completed";
  statusLabel: string;
  meetingLink?: string | null;
  landlordNotes: string;
  participantCount: number;
  residence: {
    id: string;
    houseNumber: string;
    block?: string | null;
    label: string;
  };
  requestedBy: {
    id: string;
    name: string;
    email?: string;
    unit: string;
    initials: string;
  };
  createdAt: string;
  createdAtLabel: string;
}

interface EstateMeetingsResponse {
  summary: {
    total: number;
    requested: number;
    confirmed: number;
    compound: number;
  };
  meetings: EstateMeetingRecord[];
}

interface EstateMeetingMutationResponse {
  meeting: EstateMeetingRecord;
}

interface MeetingInviteResponse {
  inviteUrl: string;
}

type EstateResidentOption = EstateDashboardData["residents"][number];

function statusTone(status: EstateMeetingRecord["status"]): BadgeTone {
  if (status === "confirmed") return "green";
  if (status === "requested") return "amber";
  if (status === "completed") return "blue";
  return "red";
}

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

function isTerminal(status: EstateMeetingRecord["status"]) {
  return status === "cancelled" || status === "completed";
}

export default function EstateMeetingsPage() {
  const { estateAdminSession } = useEstateAdminPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [meetingData, setMeetingData] = useState<EstateMeetingsResponse | null>(null);
  const [residents, setResidents] = useState<EstateResidentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingMeetingId, setSavingMeetingId] = useState<string | null>(null);
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);
  const [submittingMode, setSubmittingMode] = useState<null | "manual" | "google">(
    null,
  );
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
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
  const [scheduleForm, setScheduleForm] = useState({
    residentId: "",
    title: "",
    agenda: "",
    audience: "SOLO",
    provider: "GOOGLE_MEET",
    scheduledFor: createDefaultScheduleDateTime(),
    durationMinutes: "30",
    meetingLink: "",
    landlordNotes: "",
  });

  useEffect(() => {
    const token = estateAdminSession?.token;
    if (!token) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [meetingsResponse, dashboardResponse, googleResponse] =
          await Promise.all([
            apiRequest<EstateMeetingsResponse>("/estate/meetings", { token }),
            apiRequest<EstateDashboardData>("/estate/dashboard", { token }),
            apiRequest<{ connected: boolean; email: string | null }>(
              "/landlord/google/status",
              { token },
            ).catch(() => ({
              data: {
                connected: false,
                email: null,
              },
              message: "",
            })),
          ]);

        if (cancelled) {
          return;
        }

        setMeetingData(meetingsResponse.data);
        setResidents(dashboardResponse.data.residents ?? []);
        setGoogleConnected(Boolean(googleResponse.data.connected));
        setDrafts(
          Object.fromEntries(
            meetingsResponse.data.meetings.map((meeting) => [
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
          residentId:
            current.residentId || dashboardResponse.data.residents[0]?.id || "",
        }));
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load estate meetings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, estateAdminSession?.token]);

  async function connectGoogle() {
    if (!estateAdminSession?.token) return;

    setConnectingGoogle(true);

    try {
      const returnTo =
        typeof window === "undefined" ? "" : encodeURIComponent(window.location.href);
      const { data } = await apiRequest<{ url: string }>(
        `/landlord/google/connect${returnTo ? `?returnTo=${returnTo}` : ""}`,
        {
          token: estateAdminSession.token,
        },
      );

      window.location.href = data.url;
    } catch (requestError) {
      setConnectingGoogle(false);
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not start Google connection.",
        "error",
      );
    }
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

  async function saveMeeting(meetingId: string) {
    if (!estateAdminSession?.token || !drafts[meetingId]) return;

    setSavingMeetingId(meetingId);

    try {
      const draft = drafts[meetingId];
      const { data } = await apiRequest<EstateMeetingMutationResponse>(
        `/estate/meetings/${meetingId}`,
        {
          method: "PATCH",
          token: estateAdminSession.token,
          body: {
            status: draft.status,
            provider: draft.provider,
            scheduledFor: new Date(draft.scheduledFor).toISOString(),
            durationMinutes: Number(draft.durationMinutes),
            meetingLink: draft.meetingLink || undefined,
            landlordNotes: draft.landlordNotes || undefined,
          },
        },
      );

      setMeetingData((current) =>
        current
          ? {
              ...current,
              meetings: current.meetings
                .map((meeting) => (meeting.id === meetingId ? data.meeting : meeting))
                .sort(
                  (left, right) =>
                    new Date(left.scheduledFor).getTime() -
                    new Date(right.scheduledFor).getTime(),
                ),
              summary: {
                total: current.meetings.length,
                requested: current.meetings.filter((meeting) =>
                  meeting.id === meetingId
                    ? data.meeting.status === "requested"
                    : meeting.status === "requested",
                ).length,
                confirmed: current.meetings.filter((meeting) =>
                  meeting.id === meetingId
                    ? data.meeting.status === "confirmed"
                    : meeting.status === "confirmed",
                ).length,
                compound: current.meetings.filter((meeting) =>
                  meeting.id === meetingId
                    ? data.meeting.audience === "compound"
                    : meeting.audience === "compound",
                ).length,
              },
            }
          : current,
      );
      setDrafts((current) => ({
        ...current,
        [meetingId]: {
          status: data.meeting.status.toUpperCase(),
          provider: data.meeting.provider.toUpperCase(),
          scheduledFor: toDateTimeInputValue(data.meeting.scheduledFor),
          durationMinutes: `${data.meeting.durationMinutes}`,
          meetingLink: data.meeting.meetingLink ?? "",
          landlordNotes: data.meeting.landlordNotes ?? "",
        },
      }));
      refreshData();
      showToast("Meeting updated", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not update this meeting.",
        "error",
      );
    } finally {
      setSavingMeetingId(null);
    }
  }

  async function generateMeetingLink(meetingId: string) {
    if (!estateAdminSession?.token) return;

    setGeneratingLinkId(meetingId);

    try {
      const { data } = await apiRequest<EstateMeetingMutationResponse>(
        `/estate/meetings/${meetingId}/generate-link`,
        {
          method: "POST",
          token: estateAdminSession.token,
        },
      );

      setMeetingData((current) =>
        current
          ? {
              ...current,
              meetings: current.meetings.map((meeting) =>
                meeting.id === meetingId ? data.meeting : meeting,
              ),
            }
          : current,
      );
      setDrafts((current) => ({
        ...current,
        [meetingId]: {
          ...current[meetingId],
          meetingLink: data.meeting.meetingLink ?? "",
          status: data.meeting.status.toUpperCase(),
        },
      }));
      showToast("Google Meet link generated", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate a Google Meet link.",
        "error",
      );
    } finally {
      setGeneratingLinkId(null);
    }
  }

  async function openGoogleInvite(meetingId: string) {
    if (!estateAdminSession?.token) return;

    setInviteLoadingId(meetingId);

    try {
      const { data } = await apiRequest<MeetingInviteResponse>(
        `/estate/meetings/${meetingId}/google-invite`,
        {
          token: estateAdminSession.token,
        },
      );

      window.open(data.inviteUrl, "_blank", "noopener,noreferrer");
      showToast("Calendar invite opened", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not create the calendar invite.",
        "error",
      );
    } finally {
      setInviteLoadingId(null);
    }
  }

  async function scheduleMeeting(mode: "manual" | "google") {
    if (!estateAdminSession?.token) return;

    if (!scheduleForm.residentId) {
      showToast("Select a resident first.", "error");
      return;
    }

    if (!scheduleForm.title.trim()) {
      showToast("Enter a meeting title.", "error");
      return;
    }

    if (!scheduleForm.scheduledFor) {
      showToast("Choose a meeting date and time.", "error");
      return;
    }

    setSubmittingMode(mode);

    try {
      const { data } = await apiRequest<EstateMeetingMutationResponse>(
        "/estate/meetings",
        {
          method: "POST",
          token: estateAdminSession.token,
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

      let createdMeeting = data.meeting;
      let generateLinkError: string | null = null;
      const shouldGenerateGoogleMeet =
        mode === "google" &&
        scheduleForm.provider === "GOOGLE_MEET" &&
        googleConnected === true &&
        !scheduleForm.meetingLink.trim();

      if (shouldGenerateGoogleMeet) {
        try {
          const generated = await apiRequest<EstateMeetingMutationResponse>(
            `/estate/meetings/${data.meeting.id}/generate-link`,
            {
              method: "POST",
              token: estateAdminSession.token,
            },
          );
          createdMeeting = generated.data.meeting;
        } catch (requestError) {
          generateLinkError =
            requestError instanceof Error
              ? requestError.message
              : "Google Meet link could not be generated.";
        }
      }

      setMeetingData((current) =>
        current
          ? {
              ...current,
              meetings: [createdMeeting, ...current.meetings].sort(
                (left, right) =>
                  new Date(left.scheduledFor).getTime() -
                  new Date(right.scheduledFor).getTime(),
              ),
              summary: {
                total: current.summary.total + 1,
                requested:
                  current.summary.requested +
                  (createdMeeting.status === "requested" ? 1 : 0),
                confirmed:
                  current.summary.confirmed +
                  (createdMeeting.status === "confirmed" ? 1 : 0),
                compound:
                  current.summary.compound +
                  (createdMeeting.audience === "compound" ? 1 : 0),
              },
            }
          : current,
      );
      setDrafts((current) => ({
        ...current,
        [createdMeeting.id]: {
          status: createdMeeting.status.toUpperCase(),
          provider: createdMeeting.provider.toUpperCase(),
          scheduledFor: toDateTimeInputValue(createdMeeting.scheduledFor),
          durationMinutes: `${createdMeeting.durationMinutes}`,
          meetingLink: createdMeeting.meetingLink ?? "",
          landlordNotes: createdMeeting.landlordNotes ?? "",
        },
      }));
      setScheduleForm((current) => ({
        ...current,
        title: "",
        agenda: "",
        audience: "SOLO",
        provider: "GOOGLE_MEET",
        scheduledFor: createDefaultScheduleDateTime(),
        durationMinutes: "30",
        meetingLink: "",
        landlordNotes: "",
      }));
      refreshData();
      showToast(
        generateLinkError
          ? `Meeting scheduled. ${generateLinkError}`
          : "Meeting scheduled successfully.",
        generateLinkError ? "info" : "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not schedule this meeting.",
        "error",
      );
    } finally {
      setSubmittingMode(null);
    }
  }

  const residentOptions = useMemo(
    () =>
      residents
        .slice()
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .map((resident) => ({
          id: resident.id,
          label: `${resident.fullName}${
            resident.houseNumber ? ` · House ${resident.houseNumber}` : ""
          }`,
          subtitle: resident.email || resident.phone || "No contact details yet",
        })),
    [residents],
  );

  return (
    <EstatePortalShell topbarTitle="Meetings" breadcrumb="Meetings">
      <PageMeta title="Estate Meetings" />
      <PageHeader
        title="Estate Meetings"
        description={
          meetingData
            ? `${meetingData.summary.total} meeting(s) · ${meetingData.summary.confirmed} confirmed`
            : loading
              ? "Loading estate meetings..."
              : error || "Schedule and manage resident meetings."
        }
      />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                Meeting providers
              </h3>
              <p className="td-muted" style={{ margin: 0, maxWidth: 620 }}>
                Residents can now join meetings through Google Meet, Zoom,
                Microsoft Teams, or any custom meeting link you share. Google
                Meet link generation uses your connected Google Calendar.
              </p>
            </div>
            <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
              <StatusBadge tone={googleConnected ? "green" : "gray"}>
                {googleConnected ? "Google connected" : "Google not connected"}
              </StatusBadge>
              {!googleConnected ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void connectGoogle()}
                  disabled={connectingGoogle}
                >
                  {connectingGoogle ? "Connecting..." : "Connect Google"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Schedule a resident meeting
          </h3>
          <div className="estate-form-grid">
            <label>
              Resident
              <select
                className="form-input"
                value={scheduleForm.residentId}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    residentId: event.target.value,
                  }))
                }
              >
                <option value="">Select a resident</option>
                {residentOptions.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.label}
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
                <option value="SOLO">Private resident meeting</option>
                <option value="COMPOUND">Whole-house meeting</option>
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
                <option value="TEAMS">Microsoft Teams</option>
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
              />
            </label>
            <label className="estate-form-wide">
              Agenda
              <textarea
                className="form-input"
                rows={3}
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
                placeholder="Paste a Zoom, Teams, or custom meeting URL"
              />
            </label>
            <label className="estate-form-wide">
              Notes to resident
              <textarea
                className="form-input"
                rows={3}
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
                type="button"
                className="btn btn-primary"
                onClick={() => void scheduleMeeting("manual")}
                disabled={submittingMode !== null}
              >
                {submittingMode === "manual" ? "Scheduling..." : "Schedule Meeting"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void scheduleMeeting("google")}
                disabled={
                  submittingMode !== null || scheduleForm.provider !== "GOOGLE_MEET"
                }
              >
                {submittingMode === "google"
                  ? "Generating..."
                  : "Schedule with Google Meet"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="stats-grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginBottom: 24,
        }}
      >
        <div className="stat-card">
          <div className="stat-label">Total Meetings</div>
          <div className="stat-value">{meetingData?.summary.total ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Requested</div>
          <div className="stat-value">{meetingData?.summary.requested ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Confirmed</div>
          <div className="stat-value">{meetingData?.summary.confirmed ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Compound</div>
          <div className="stat-value">{meetingData?.summary.compound ?? 0}</div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <strong>Meeting Queue</strong>
        </div>
        {loading ? (
          <div className="empty-state">
            <p>Loading meetings...</p>
          </div>
        ) : meetingData?.meetings.length ? (
          <div
            className="card-body"
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {meetingData.meetings.map((meeting) => {
              const draft = drafts[meeting.id];

              return (
                <div
                  key={meeting.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 18,
                    background: "var(--surface)",
                    display: "grid",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        {meeting.title}
                      </div>
                      <div className="td-muted" style={{ marginTop: 6, fontSize: 13 }}>
                        {meeting.requestedBy.name} · {meeting.residence.label} ·{" "}
                        {meeting.scheduledForLabel}
                      </div>
                    </div>
                    <StatusBadge tone={statusTone(meeting.status)}>
                      {meeting.statusLabel}
                    </StatusBadge>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div className="td-muted" style={{ fontSize: 12 }}>
                        Provider
                      </div>
                      <strong>{meeting.providerLabel}</strong>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 12 }}>
                        Audience
                      </div>
                      <strong>{meeting.audienceLabel}</strong>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 12 }}>
                        Participants
                      </div>
                      <strong>{meeting.participantCount}</strong>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 12 }}>
                        Duration
                      </div>
                      <strong>{meeting.durationMinutes} minutes</strong>
                    </div>
                  </div>

                  {meeting.agenda ? (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "var(--bg)",
                      }}
                    >
                      <div className="td-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                        Agenda
                      </div>
                      <div style={{ color: "var(--ink2)", lineHeight: 1.6 }}>
                        {meeting.agenda}
                      </div>
                    </div>
                  ) : null}

                  <div className="estate-form-grid">
                    <label>
                      Status
                      <select
                        className="form-input"
                        value={draft?.status ?? meeting.status.toUpperCase()}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          updateDraft(meeting.id, "status", event.target.value)
                        }
                        disabled={isTerminal(meeting.status)}
                      >
                        <option value="REQUESTED">Requested</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </label>
                    <label>
                      Provider
                      <select
                        className="form-input"
                        value={draft?.provider ?? meeting.provider.toUpperCase()}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          updateDraft(meeting.id, "provider", event.target.value)
                        }
                        disabled={isTerminal(meeting.status)}
                      >
                        <option value="GOOGLE_MEET">Google Meet</option>
                        <option value="ZOOM">Zoom</option>
                        <option value="TEAMS">Microsoft Teams</option>
                        <option value="CUSTOM_LINK">Custom link</option>
                      </select>
                    </label>
                    <label>
                      Scheduled for
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={draft?.scheduledFor ?? toDateTimeInputValue(meeting.scheduledFor)}
                        onChange={(event) =>
                          updateDraft(meeting.id, "scheduledFor", event.target.value)
                        }
                        disabled={isTerminal(meeting.status)}
                      />
                    </label>
                    <label>
                      Duration (minutes)
                      <input
                        className="form-input"
                        inputMode="numeric"
                        value={draft?.durationMinutes ?? `${meeting.durationMinutes}`}
                        onChange={(event) =>
                          updateDraft(meeting.id, "durationMinutes", event.target.value)
                        }
                        disabled={isTerminal(meeting.status)}
                      />
                    </label>
                    <label className="estate-form-wide">
                      Meeting link
                      <input
                        className="form-input"
                        value={draft?.meetingLink ?? meeting.meetingLink ?? ""}
                        onChange={(event) =>
                          updateDraft(meeting.id, "meetingLink", event.target.value)
                        }
                        disabled={isTerminal(meeting.status)}
                        placeholder="Paste a Zoom, Teams, or custom meeting URL"
                      />
                    </label>
                    <label className="estate-form-wide">
                      Notes to resident
                      <textarea
                        className="form-input"
                        rows={3}
                        value={draft?.landlordNotes ?? meeting.landlordNotes ?? ""}
                        onChange={(event) =>
                          updateDraft(meeting.id, "landlordNotes", event.target.value)
                        }
                        disabled={isTerminal(meeting.status)}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void saveMeeting(meeting.id)}
                      disabled={savingMeetingId === meeting.id || isTerminal(meeting.status)}
                    >
                      {savingMeetingId === meeting.id ? "Saving..." : "Save Changes"}
                    </button>
                    {(draft?.provider ?? meeting.provider.toUpperCase()) === "GOOGLE_MEET" ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void generateMeetingLink(meeting.id)}
                        disabled={
                          generatingLinkId === meeting.id ||
                          googleConnected !== true ||
                          isTerminal(meeting.status)
                        }
                      >
                        {generatingLinkId === meeting.id
                          ? "Generating..."
                          : "Generate Google Meet"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void openGoogleInvite(meeting.id)}
                      disabled={inviteLoadingId === meeting.id}
                    >
                      {inviteLoadingId === meeting.id
                        ? "Opening..."
                        : "Add to Calendar"}
                    </button>
                    {meeting.meetingLink ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          window.open(
                            meeting.meetingLink ?? "",
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        Open Link
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>No resident meetings scheduled yet.</p>
          </div>
        )}
      </div>
    </EstatePortalShell>
  );
}
