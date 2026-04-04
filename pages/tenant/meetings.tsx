import { type FormEvent, useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type { BadgeTone } from "../../types/app";
import { buildMeetAddonPreviewUrl } from "../../lib/meet-addon";

interface TenantMeetingRecord {
  id: string;
  title: string;
  agenda: string;
  audience: "solo" | "compound";
  audienceLabel: string;
  providerLabel: string;
  scheduledFor: string;
  scheduledForLabel: string;
  durationMinutes: number;
  status: "requested" | "confirmed" | "cancelled" | "completed";
  meetingLink?: string | null;
  landlordNotes: string;
  participantCount: number;
  property: {
    id: string;
    name: string;
  };
  requestedBy: {
    id: string;
    name: string;
    unit: string;
  };
  isRequester?: boolean;
  canCancel?: boolean;
}

interface TenantMeetingsResponse {
  landlord: {
    name: string;
    companyName: string;
    email: string;
  };
  property: {
    id: string;
    name: string;
  };
  summary: {
    total: number;
    requested: number;
    confirmed: number;
    compound: number;
  };
  meetings: TenantMeetingRecord[];
  formOptions: {
    audience: Array<{ value: string; label: string }>;
  };
  requestAccess?: {
    allowed: boolean;
    reason?: string | null;
  };
}

interface MeetingCreateResponse {
  meeting: TenantMeetingRecord;
}

interface MeetingCancelResponse {
  meeting: TenantMeetingRecord;
}

interface MeetingInviteResponse {
  inviteUrl: string;
}

function statusTone(status: TenantMeetingRecord["status"]): BadgeTone {
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

export default function TenantMeetingsPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [meetingData, setMeetingData] = useState<TenantMeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    agenda: "",
    audience: "SOLO",
    scheduledDate: createDefaultMeetingDateTime().date,
    scheduledTime: createDefaultMeetingDateTime().time,
    durationMinutes: "30",
  });

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadMeetings() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantMeetingsResponse>("/tenant/meetings", {
          token: tenantToken,
        });

        if (!cancelled) {
          setMeetingData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your meetings.",
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
  }, [dataRefreshVersion, tenantSession?.token]);

  async function submitMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantSession?.token) {
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await apiRequest<MeetingCreateResponse>("/tenant/meetings", {
        method: "POST",
        token: tenantSession.token,
        body: {
          title: form.title,
          agenda: form.agenda || undefined,
          audience: form.audience,
          scheduledFor: new Date(
            `${form.scheduledDate}T${form.scheduledTime}:00`,
          ).toISOString(),
          durationMinutes: Number(form.durationMinutes),
          provider: "GOOGLE_MEET",
        },
      });

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
        scheduledDate: createDefaultMeetingDateTime().date,
        scheduledTime: createDefaultMeetingDateTime().time,
        durationMinutes: "30",
      });
      refreshData();
      showToast("Meeting request sent to your landlord", "success");
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
    if (!tenantSession?.token) {
      return;
    }

    setCancellingId(meetingId);

    try {
      const { data } = await apiRequest<MeetingCancelResponse>(
        `/tenant/meetings/${meetingId}/cancel`,
        {
          method: "POST",
          token: tenantSession.token,
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
    if (!tenantSession?.token) {
      return;
    }

    setInviteLoadingId(meetingId);

    try {
      const { data } = await apiRequest<MeetingInviteResponse>(
        `/tenant/meetings/${meetingId}/google-invite`,
        {
          token: tenantSession.token,
        },
      );

      window.open(data.inviteUrl, "_blank", "noopener,noreferrer");
      showToast("Google Calendar invite opened", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not create the Google invite.",
        "error",
      );
    } finally {
      setInviteLoadingId(null);
    }
  }

  const description = meetingData
    ? `${meetingData.summary.total} meeting request(s) with ${meetingData.landlord.name} · ${meetingData.summary.confirmed} confirmed on Google Meet`
    : loading
      ? "Loading your meetings..."
      : error || "No meetings yet.";

  return (
    <>
      <PageMeta title="DoorRent — Meetings" />
      <TenantPortalShell topbarTitle="Meetings" breadcrumb="Dashboard → Meetings">
        <PageHeader
          title="Meetings"
          description={description}
        />

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Book a Meeting</div>
                <div className="card-subtitle">
                  Request a private Google Meet or invite the whole compound.
                </div>
              </div>
            </div>
            {meetingData?.requestAccess?.allowed === false ? (
              <div className="card-body">
                <div
                  style={{
                    padding: 16,
                    borderRadius: "var(--radius)",
                    background: "var(--red-light, #fff0ef)",
                    border: "1px solid rgba(179, 49, 33, 0.15)",
                    color: "var(--ink2)",
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                    Meeting requests unavailable
                  </div>
                  <div>
                    {meetingData.requestAccess.reason ||
                      "This tenancy can no longer request new meetings."}
                  </div>
                </div>
              </div>
            ) : (
              <form className="card-body" onSubmit={submitMeeting}>
                <div className="form-group">
                  <label className="form-label">Topic *</label>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Discuss compound maintenance"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Agenda</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: 110 }}
                    value={form.agenda}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, agenda: event.target.value }))
                    }
                    placeholder="Share the issue you want to discuss with your landlord."
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Audience *</label>
                    <select
                      className="form-input"
                      value={form.audience}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, audience: event.target.value }))
                      }
                    >
                      {(meetingData?.formOptions.audience ?? [
                        { value: "SOLO", label: "Private meeting with landlord" },
                        { value: "COMPOUND", label: "All tenants in the compound" },
                      ]).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (minutes)</label>
                    <select
                      className="form-input"
                      value={form.durationMinutes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          durationMinutes: event.target.value,
                        }))
                      }
                    >
                      {["30", "45", "60"].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Preferred Date *</label>
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
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preferred Time *</label>
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
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={submitting}
                >
                  {submitting ? "Sending request..." : "Request Google Meet"}
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Meeting Summary</div>
                <div className="card-subtitle">
                  Google Meet links appear here once your landlord confirms them.
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
                <div className="stat-card accent-amber">
                  <div className="stat-label">Requested</div>
                  <div className="stat-value">{meetingData?.summary.requested ?? 0}</div>
                  <div className="stat-sub">Awaiting landlord review</div>
                </div>
                <div className="stat-card accent-green">
                  <div className="stat-label">Confirmed</div>
                  <div className="stat-value">{meetingData?.summary.confirmed ?? 0}</div>
                  <div className="stat-sub">Ready for Google Meet</div>
                </div>
                <div className="stat-card accent-blue">
                  <div className="stat-label">Compound Calls</div>
                  <div className="stat-value">{meetingData?.summary.compound ?? 0}</div>
                  <div className="stat-sub">Shared with the estate</div>
                </div>
                <div className="stat-card accent-gold">
                  <div className="stat-label">Landlord</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>
                    {meetingData?.landlord.name ?? "—"}
                  </div>
                  <div className="stat-sub">{meetingData?.landlord.companyName ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(meetingData?.meetings ?? []).map((meeting) => (
            <div key={meeting.id} className="card">
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600 }}>{meeting.title}</h3>
                      <StatusBadge tone={statusTone(meeting.status)}>
                        {meeting.status}
                      </StatusBadge>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                      {meeting.agenda || "No agenda was added to this meeting request."}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 14 }}>
                      <div>
                        <div className="td-muted">When</div>
                        <div style={{ fontWeight: 600 }}>{meeting.scheduledForLabel}</div>
                      </div>
                      <div>
                        <div className="td-muted">Audience</div>
                        <div style={{ fontWeight: 600 }}>{meeting.audienceLabel}</div>
                      </div>
                      <div>
                        <div className="td-muted">Provider</div>
                        <div style={{ fontWeight: 600 }}>{meeting.providerLabel}</div>
                      </div>
                      <div>
                        <div className="td-muted">Participants</div>
                        <div style={{ fontWeight: 600 }}>{meeting.participantCount}</div>
                      </div>
                    </div>
                    {meeting.landlordNotes ? (
                      <div
                        style={{
                          marginTop: 14,
                          padding: 12,
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          fontSize: 12,
                          color: "var(--ink2)",
                        }}
                      >
                        <strong style={{ color: "var(--ink)" }}>Landlord note:</strong>{" "}
                        {meeting.landlordNotes}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void openGoogleInvite(meeting.id)}
                      disabled={inviteLoadingId === meeting.id}
                    >
                      {inviteLoadingId === meeting.id ? "Opening..." : "Google Invite"}
                    </button>
                    <a
                      href={buildMeetAddonPreviewUrl("tenant", meeting.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      Meet Add-on
                    </a>
                    {meeting.meetingLink ? (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                      >
                        Open Google Meet
                      </a>
                    ) : (
                      <button type="button" className="btn btn-secondary btn-sm" disabled>
                        Awaiting Meet Link
                      </button>
                    )}
                    {meeting.canCancel ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void cancelMeeting(meeting.id)}
                        disabled={cancellingId === meeting.id}
                      >
                        {cancellingId === meeting.id ? "Cancelling..." : "Cancel Booking"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && !(meetingData?.meetings.length ?? 0) ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", color: "var(--ink2)" }}>
                No meeting bookings yet.
              </div>
            </div>
          ) : null}
        </div>
      </TenantPortalShell>
    </>
  );
}
