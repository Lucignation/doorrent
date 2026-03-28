import { type ChangeEvent, useEffect, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type { BadgeTone } from "../../types/app";
import { buildMeetAddonPreviewUrl } from "../../lib/meet-addon";

interface LandlordMeetingRecord {
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
    email: string;
    unit: string;
    initials: string;
  };
}

interface LandlordMeetingsResponse {
  summary: {
    total: number;
    requested: number;
    confirmed: number;
    compound: number;
  };
  meetings: LandlordMeetingRecord[];
}

interface LandlordMeetingMutationResponse {
  meeting: LandlordMeetingRecord;
}

interface MeetingInviteResponse {
  inviteUrl: string;
}

function statusTone(status: LandlordMeetingRecord["status"]): BadgeTone {
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

function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

export default function LandlordMeetingsPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [meetingData, setMeetingData] = useState<LandlordMeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingMeetingId, setSavingMeetingId] = useState<string | null>(null);
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        status: string;
        scheduledFor: string;
        durationMinutes: string;
        meetingLink: string;
        landlordNotes: string;
      }
    >
  >({});

  useEffect(() => {
    const landlordToken = landlordSession?.token;

    if (!landlordToken) {
      return;
    }

    let cancelled = false;

    async function loadMeetings() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordMeetingsResponse>("/landlord/meetings", {
          token: landlordToken,
        });

        if (!cancelled) {
          setMeetingData(data);
          setDrafts(
            Object.fromEntries(
              data.meetings.map((meeting) => [
                meeting.id,
                {
                  status: meeting.status.toUpperCase(),
                  scheduledFor: toDateTimeInputValue(meeting.scheduledFor),
                  durationMinutes: `${meeting.durationMinutes}`,
                  meetingLink: meeting.meetingLink ?? "",
                  landlordNotes: meeting.landlordNotes ?? "",
                },
              ]),
            ),
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load tenant meetings.",
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
  }, [dataRefreshVersion, landlordSession?.token]);

  function updateDraft(
    meetingId: string,
    field: "status" | "scheduledFor" | "durationMinutes" | "meetingLink" | "landlordNotes",
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
    if (!landlordSession?.token || !drafts[meetingId]) {
      return;
    }

    setSavingMeetingId(meetingId);

    try {
      const draft = drafts[meetingId];
      const { data } = await apiRequest<LandlordMeetingMutationResponse>(
        `/landlord/meetings/${meetingId}`,
        {
          method: "PATCH",
          token: landlordSession.token,
          body: {
            status: draft.status,
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
                .map((meeting) =>
                  meeting.id === meetingId ? data.meeting : meeting,
                )
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
                compound: current.summary.compound,
              },
            }
          : current,
      );
      setDrafts((current) => ({
        ...current,
        [meetingId]: {
          status: data.meeting.status.toUpperCase(),
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

  async function openGoogleInvite(meetingId: string) {
    if (!landlordSession?.token) {
      return;
    }

    setInviteLoadingId(meetingId);

    try {
      const { data } = await apiRequest<MeetingInviteResponse>(
        `/landlord/meetings/${meetingId}/google-invite`,
        {
          token: landlordSession.token,
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
    ? `${meetingData.summary.total} meeting(s) · ${meetingData.summary.requested} awaiting confirmation · ${meetingData.summary.compound} compound-wide`
    : loading
      ? "Loading tenant meetings..."
      : error || "No meetings found.";

  return (
    <>
      <PageMeta title="DoorRent — Meetings" />
      <LandlordPortalShell topbarTitle="Meetings" breadcrumb="Dashboard → Meetings">
        <PageHeader
          title="Meetings"
          description={description}
        />

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
          <div className="stat-card accent-blue">
            <div className="stat-label">Total</div>
            <div className="stat-value">{meetingData?.summary.total ?? 0}</div>
            <div className="stat-sub">All meeting records</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Requested</div>
            <div className="stat-value">{meetingData?.summary.requested ?? 0}</div>
            <div className="stat-sub">Needs landlord action</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Confirmed</div>
            <div className="stat-value">{meetingData?.summary.confirmed ?? 0}</div>
            <div className="stat-sub">Google Meet link shared</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Compound</div>
            <div className="stat-value">{meetingData?.summary.compound ?? 0}</div>
            <div className="stat-sub">All tenants included</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(meetingData?.meetings ?? []).map((meeting) => {
            const draft = drafts[meeting.id];

            return (
              <div key={meeting.id} className="card">
                <div className="card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{meeting.title}</h3>
                        <StatusBadge tone={statusTone(meeting.status)}>
                          {meeting.status}
                        </StatusBadge>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                        {meeting.agenda || "No agenda was supplied by the tenant."}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                        background: "var(--surface2)",
                        minWidth: 220,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: "var(--accent-light)",
                          color: "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        {meeting.requestedBy.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {meeting.requestedBy.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                          Unit {meeting.requestedBy.unit} · {meeting.property.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        className="form-input"
                        value={draft?.status ?? meeting.status.toUpperCase()}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          updateDraft(meeting.id, "status", event.target.value)
                        }
                      >
                        {["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED"].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Scheduled For</label>
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={draft?.scheduledFor ?? toDateTimeInputValue(meeting.scheduledFor)}
                        onChange={(event) =>
                          updateDraft(meeting.id, "scheduledFor", event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Duration (minutes)</label>
                      <input
                        className="form-input"
                        type="number"
                        min={15}
                        max={180}
                        value={draft?.durationMinutes ?? `${meeting.durationMinutes}`}
                        onChange={(event) =>
                          updateDraft(meeting.id, "durationMinutes", event.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Google Meet Link</label>
                      <input
                        className="form-input"
                        value={draft?.meetingLink ?? meeting.meetingLink ?? ""}
                        onChange={(event) =>
                          updateDraft(meeting.id, "meetingLink", event.target.value)
                        }
                        placeholder="https://meet.google.com/abc-defg-hij"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Landlord Notes</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: 90 }}
                      value={draft?.landlordNotes ?? meeting.landlordNotes ?? ""}
                      onChange={(event) =>
                        updateDraft(meeting.id, "landlordNotes", event.target.value)
                      }
                      placeholder="Share notes, prep instructions, or follow-up actions."
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                      {meeting.audienceLabel} · {meeting.providerLabel} · {meeting.participantCount} participant(s)
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void openGoogleInvite(meeting.id)}
                        disabled={inviteLoadingId === meeting.id}
                      >
                        {inviteLoadingId === meeting.id ? "Opening..." : "Google Invite"}
                      </button>
                      <a
                        href={buildMeetAddonPreviewUrl("landlord", meeting.id)}
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
                          className="btn btn-secondary btn-sm"
                        >
                          Open Meet
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => void saveMeeting(meeting.id)}
                        disabled={savingMeetingId === meeting.id}
                      >
                        {savingMeetingId === meeting.id ? "Saving..." : "Save Update"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && !(meetingData?.meetings.length ?? 0) ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", color: "var(--ink2)" }}>
                No tenant meetings yet.
              </div>
            </div>
          ) : null}
        </div>
      </LandlordPortalShell>
    </>
  );
}
