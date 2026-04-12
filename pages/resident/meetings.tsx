import { type FormEvent, useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone } from "../../types/app";

interface ResidentMeetingRecord {
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
  isRequester?: boolean;
  canCancel?: boolean;
  createdAt: string;
  createdAtLabel: string;
}

interface ResidentMeetingsResponse {
  estate: {
    name: string;
    email: string;
  };
  residence: {
    id: string;
    houseNumber: string;
    block?: string | null;
    label: string;
  };
  summary: {
    total: number;
    requested: number;
    confirmed: number;
    compound: number;
  };
  meetings: ResidentMeetingRecord[];
  formOptions: {
    audience: Array<{ value: string; label: string }>;
  };
  requestAccess?: {
    allowed: boolean;
    reason?: string | null;
  };
}

interface ResidentMeetingMutationResponse {
  meeting: ResidentMeetingRecord;
  delivery?: "sent" | "failed" | "skipped";
  adminDelivery?: "sent" | "failed" | "skipped";
  residentEmailDelivery?: "sent" | "failed" | "skipped";
  residentEmailError?: string | null;
}

interface MeetingInviteResponse {
  inviteUrl: string;
}

function statusTone(status: ResidentMeetingRecord["status"]): BadgeTone {
  if (status === "confirmed") {
    return "green";
  }

  if (status === "requested") {
    return "amber";
  }

  if (status === "completed") {
    return "blue";
  }

  return "red";
}

function createDefaultMeetingDateTime() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(10, 0, 0, 0);

  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);

  return {
    date: local.toISOString().slice(0, 10),
    time: local.toISOString().slice(11, 16),
  };
}

export default function ResidentMeetingsPage() {
  const { residentSession } = useResidentPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [meetingData, setMeetingData] = useState<ResidentMeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    agenda: "",
    audience: "SOLO",
    provider: "GOOGLE_MEET",
    scheduledDate: createDefaultMeetingDateTime().date,
    scheduledTime: createDefaultMeetingDateTime().time,
    durationMinutes: "30",
  });

  useEffect(() => {
    const residentToken = residentSession?.token;

    if (!residentToken) {
      return;
    }

    let cancelled = false;

    async function loadMeetings() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<ResidentMeetingsResponse>(
          "/resident/meetings",
          {
            token: residentToken,
          },
        );

        if (!cancelled) {
          setMeetingData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your estate meetings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMeetings();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, residentSession?.token]);

  async function submitMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!residentSession?.token) {
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await apiRequest<ResidentMeetingMutationResponse>(
        "/resident/meetings",
        {
          method: "POST",
          token: residentSession.token,
          body: {
            title: form.title,
            agenda: form.agenda || undefined,
            audience: form.audience,
            provider: form.provider,
            scheduledFor: new Date(
              `${form.scheduledDate}T${form.scheduledTime}:00`,
            ).toISOString(),
            durationMinutes: Number(form.durationMinutes),
          },
        },
      );

      setMeetingData((current) =>
        current
          ? {
              ...current,
              summary: {
                total: current.summary.total + 1,
                requested: current.summary.requested + 1,
                confirmed: current.summary.confirmed,
                compound:
                  current.summary.compound +
                  (data.meeting.audience === "compound" ? 1 : 0),
              },
              meetings: [...current.meetings, data.meeting].sort(
                (left, right) =>
                  new Date(left.scheduledFor).getTime() -
                  new Date(right.scheduledFor).getTime(),
              ),
            }
          : current,
      );
      setForm({
        title: "",
        agenda: "",
        audience: "SOLO",
        provider: "GOOGLE_MEET",
        scheduledDate: createDefaultMeetingDateTime().date,
        scheduledTime: createDefaultMeetingDateTime().time,
        durationMinutes: "30",
      });
      refreshData();
      if (
        data.residentEmailDelivery === "sent" &&
        data.adminDelivery !== "failed"
      ) {
        showToast(
          "Meeting request sent. A confirmation email is on the way.",
          "success",
        );
      } else if (
        data.residentEmailDelivery === "sent" &&
        data.adminDelivery === "failed"
      ) {
        showToast(
          "Meeting request saved and your confirmation email was sent, but the estate admin email notification failed.",
          "info",
        );
      } else if (data.residentEmailDelivery === "failed") {
        showToast(
          data.adminDelivery === "failed"
            ? "Meeting request saved, but email delivery failed for both you and the estate admin."
            : data.residentEmailError ||
              "Meeting request saved, but we could not deliver the confirmation email.",
          "info",
        );
      } else if (data.adminDelivery === "failed") {
        showToast(
          "Meeting request saved, but the estate admin email notification failed.",
          "info",
        );
      } else {
        showToast(
          "Meeting request saved. No confirmation email was delivered.",
          "info",
        );
      }
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not create this meeting request.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelMeeting(meetingId: string) {
    if (!residentSession?.token) {
      return;
    }

    setCancellingId(meetingId);

    try {
      const { data } = await apiRequest<ResidentMeetingMutationResponse>(
        `/resident/meetings/${meetingId}/cancel`,
        {
          method: "POST",
          token: residentSession.token,
        },
      );

      setMeetingData((current) =>
        current
          ? {
              ...current,
              meetings: current.meetings.map((meeting) =>
                meeting.id === meetingId ? data.meeting : meeting,
              ),
              summary: {
                ...current.summary,
                requested: Math.max(
                  current.summary.requested -
                    (current.meetings.find((meeting) => meeting.id === meetingId)?.status ===
                    "requested"
                      ? 1
                      : 0),
                  0,
                ),
              },
            }
          : current,
      );
      refreshData();
      showToast("Meeting cancelled", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not cancel this meeting.",
        "error",
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function openGoogleInvite(meetingId: string) {
    if (!residentSession?.token) {
      return;
    }

    setInviteLoadingId(meetingId);

    try {
      const { data } = await apiRequest<MeetingInviteResponse>(
        `/resident/meetings/${meetingId}/google-invite`,
        {
          token: residentSession.token,
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

  const description = meetingData
    ? `${meetingData.summary.total} meeting request(s) with ${meetingData.estate.name} · ${meetingData.summary.confirmed} confirmed`
    : loading
      ? "Loading your meetings..."
      : error || "No meetings yet.";

  const upcomingMeetings =
    meetingData?.meetings.filter(
      (meeting) => meeting.status === "requested" || meeting.status === "confirmed",
    ) ?? [];
  const historyMeetings =
    meetingData?.meetings.filter(
      (meeting) => meeting.status === "cancelled" || meeting.status === "completed",
    ) ?? [];
  const audienceOptions = meetingData?.formOptions.audience ?? [
    { value: "SOLO", label: "Private meeting with estate admin" },
    { value: "COMPOUND", label: "Meeting for everyone in the house" },
  ];

  return (
    <ResidentPortalShell topbarTitle="Meetings" breadcrumb="Meetings">
      <PageMeta title="Meetings — Resident Portal" />
      <PageHeader title="Meetings" description={description} />

      {meetingData?.requestAccess && !meetingData.requestAccess.allowed ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(31, 103, 222, 0.08)",
                color: "var(--ink)",
                fontSize: 14,
              }}
            >
              {meetingData.requestAccess.reason ??
                "Meeting requests are not available for this resident profile."}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Request a meeting
          </h3>
          <form onSubmit={submitMeeting} className="estate-form-grid">
            <label>
              Title
              <input
                className="form-input"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Preferred provider
              <select
                className="form-input"
                value={form.provider}
                onChange={(event) =>
                  setForm((current) => ({
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
              Audience
              <select
                className="form-input"
                value={form.audience}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    audience: event.target.value,
                  }))
                }
              >
                {audienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Duration (minutes)
              <input
                className="form-input"
                inputMode="numeric"
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationMinutes: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Date
              <input
                className="form-input"
                type="date"
                value={form.scheduledDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduledDate: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Time
              <input
                className="form-input"
                type="time"
                value={form.scheduledTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduledTime: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="estate-form-wide">
              Agenda
              <textarea
                className="form-input"
                rows={4}
                value={form.agenda}
                onChange={(event) =>
                  setForm((current) => ({ ...current, agenda: event.target.value }))
                }
                placeholder="Share what you need to discuss with the estate admin."
              />
            </label>
            <div className="estate-form-actions estate-form-wide">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || meetingData?.requestAccess?.allowed === false}
              >
                {submitting ? "Sending request..." : "Request Meeting"}
              </button>
            </div>
          </form>
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
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      {upcomingMeetings.length > 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <strong>Upcoming meetings</strong>
          </div>
          <div
            className="card-body"
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {upcomingMeetings.map((meeting) => (
              <div
                key={meeting.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 18,
                  background: "var(--surface)",
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>
                      {meeting.title}
                    </div>
                    <div className="td-muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {meeting.audienceLabel} · {meeting.providerLabel} ·{" "}
                      {meeting.scheduledForLabel}
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(meeting.status)}>
                    {meeting.statusLabel}
                  </StatusBadge>
                </div>

                {meeting.agenda ? (
                  <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.6 }}>
                    {meeting.agenda}
                  </p>
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div className="td-muted" style={{ fontSize: 12 }}>
                      Residence
                    </div>
                    <strong>{meeting.residence.label}</strong>
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

                {meeting.landlordNotes ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: "var(--bg)",
                    }}
                  >
                    <div className="td-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      Estate admin notes
                    </div>
                    <div style={{ color: "var(--ink2)", lineHeight: 1.6 }}>
                      {meeting.landlordNotes}
                    </div>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {meeting.meetingLink ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        window.open(
                          meeting.meetingLink ?? "",
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Join Meeting
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void openGoogleInvite(meeting.id)}
                    disabled={inviteLoadingId === meeting.id}
                  >
                    {inviteLoadingId === meeting.id ? "Opening..." : "Add to Calendar"}
                  </button>
                  {meeting.canCancel ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void cancelMeeting(meeting.id)}
                      disabled={cancellingId === meeting.id}
                    >
                      {cancellingId === meeting.id ? "Cancelling..." : "Cancel"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {historyMeetings.length > 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <strong>History</strong>
          </div>
          <div
            className="card-body"
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {historyMeetings.map((meeting) => (
              <div
                key={meeting.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 18,
                  background: "var(--surface)",
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>
                      {meeting.title}
                    </div>
                    <div className="td-muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {meeting.audienceLabel} · {meeting.providerLabel} ·{" "}
                      {meeting.scheduledForLabel}
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(meeting.status)}>
                    {meeting.statusLabel}
                  </StatusBadge>
                </div>

                {meeting.agenda ? (
                  <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.6 }}>
                    {meeting.agenda}
                  </p>
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div className="td-muted" style={{ fontSize: 12 }}>
                      Residence
                    </div>
                    <strong>{meeting.residence.label}</strong>
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

                {meeting.landlordNotes ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: "var(--bg)",
                    }}
                  >
                    <div className="td-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      Estate admin notes
                    </div>
                    <div style={{ color: "var(--ink2)", lineHeight: 1.6 }}>
                      {meeting.landlordNotes}
                    </div>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {meeting.meetingLink ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        window.open(
                          meeting.meetingLink ?? "",
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Join Meeting
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void openGoogleInvite(meeting.id)}
                    disabled={inviteLoadingId === meeting.id}
                  >
                    {inviteLoadingId === meeting.id ? "Opening..." : "Add to Calendar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !error && (meetingData?.meetings.length ?? 0) === 0 ? (
        <div className="empty-state">
          <h3>No meetings yet.</h3>
          <p>Use the form above to request a meeting with your estate admin.</p>
        </div>
      ) : null}
    </ResidentPortalShell>
  );
}
