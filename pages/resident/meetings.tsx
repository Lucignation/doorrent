import { useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone } from "../../types/app";

interface EstateMeetingRecord {
  id: string;
  title: string;
  agenda: string;
  audience: "solo" | "compound" | "estate_wide";
  audienceLabel: string;
  provider: "google_meet" | "zoom" | "teams" | "custom_link";
  providerLabel: string;
  scheduledFor: string;
  scheduledForLabel: string;
  durationMinutes: number;
  status: "upcoming" | "confirmed" | "live" | "cancelled" | "completed";
  statusLabel: string;
  meetingLink?: string | null;
  zoomJoinUrl?: string | null;
  notes?: string | null;
  participantCount: number;
  createdAt: string;
}

interface EstateMeetingsResponse {
  estate: { name: string; email: string };
  summary: {
    total: number;
    upcoming: number;
    completed: number;
  };
  meetings: EstateMeetingRecord[];
}

interface MeetingInviteResponse {
  inviteUrl: string;
}

function statusTone(status: EstateMeetingRecord["status"]): BadgeTone {
  if (status === "live") return "green";
  if (status === "confirmed" || status === "upcoming") return "blue";
  if (status === "completed") return "gray";
  return "red";
}

function providerIcon(provider: EstateMeetingRecord["provider"]) {
  if (provider === "zoom") return "🎥";
  if (provider === "google_meet") return "🟢";
  if (provider === "teams") return "🟣";
  return "🔗";
}

function isLiveOrSoon(scheduledFor: string) {
  const ms = new Date(scheduledFor).getTime() - Date.now();
  return ms >= -60 * 60 * 1000 && ms <= 30 * 60 * 1000; // within 30 min before or 1 hr after
}

export default function ResidentMeetingsPage() {
  const { residentSession } = useResidentPortalSession();
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const [meetingData, setMeetingData] = useState<EstateMeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const token = residentSession?.token;
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await apiRequest<EstateMeetingsResponse>("/resident/meetings", { token });
        if (!cancelled) setMeetingData(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load estate meetings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [dataRefreshVersion, residentSession?.token]);

  async function openGoogleInvite(meetingId: string) {
    if (!residentSession?.token) return;
    setInviteLoadingId(meetingId);
    try {
      const { data } = await apiRequest<MeetingInviteResponse>(
        `/resident/meetings/${meetingId}/google-invite`,
        { token: residentSession.token },
      );
      window.open(data.inviteUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create calendar invite.", "error");
    } finally {
      setInviteLoadingId(null);
    }
  }

  function joinMeeting(meeting: EstateMeetingRecord) {
    const link = meeting.zoomJoinUrl ?? meeting.meetingLink;
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  const upcoming = useMemo(
    () => meetingData?.meetings.filter((m) => m.status === "upcoming" || m.status === "confirmed" || m.status === "live") ?? [],
    [meetingData],
  );
  const history = useMemo(
    () => meetingData?.meetings.filter((m) => m.status === "completed" || m.status === "cancelled") ?? [],
    [meetingData],
  );

  const description = meetingData
    ? `${meetingData.summary.total} estate meeting(s) · ${meetingData.summary.upcoming} upcoming`
    : loading ? "Loading estate meetings…" : error || "No meetings found.";

  return (
    <ResidentPortalShell topbarTitle="Estate Meetings" breadcrumb="Estate Meetings">
      <PageMeta title="Estate Meetings — Resident Portal" />
      <PageHeader title="Estate Meetings" description={description} />

      {/* Notice */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>📅</span>
          <div style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.7 }}>
            <strong>How estate meetings work:</strong> The estate admin schedules meetings —
            including monthly town halls, emergency assemblies, and committee sessions. When a Zoom
            or Google Meet link is available you can join directly from this page. Add any meeting to
            your calendar with the <em>Add to Calendar</em> button.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Meetings</div>
          <div className="stat-value">{meetingData?.summary.total ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming</div>
          <div className="stat-value">{meetingData?.summary.upcoming ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{meetingData?.summary.completed ?? 0}</div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      {/* Upcoming meetings */}
      {upcoming.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><strong>Upcoming Meetings</strong></div>
          <div className="card-body" style={{ display: "grid", gap: 16 }}>
            {upcoming.map((meeting) => {
              const live = isLiveOrSoon(meeting.scheduledFor) || meeting.status === "live";
              const joinLink = meeting.zoomJoinUrl ?? meeting.meetingLink;
              return (
                <div
                  key={meeting.id}
                  style={{
                    border: live ? "2px solid var(--green)" : "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 18,
                    background: live ? "rgba(34,139,94,0.04)" : "var(--surface)",
                    display: "grid",
                    gap: 14,
                  }}
                >
                  {live && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--green)",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--green)", letterSpacing: "0.06em" }}>
                        LIVE NOW — JOIN IMMEDIATELY
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{meeting.title}</div>
                      <div className="td-muted" style={{ marginTop: 6, fontSize: 13 }}>
                        {providerIcon(meeting.provider)} {meeting.providerLabel}
                        {" · "}
                        {meeting.audienceLabel}
                        {" · "}
                        {meeting.scheduledForLabel}
                        {" · "}
                        {meeting.durationMinutes} min
                      </div>
                    </div>
                    <StatusBadge tone={statusTone(meeting.status)}>{meeting.statusLabel}</StatusBadge>
                  </div>

                  {meeting.agenda ? (
                    <p style={{ margin: 0, color: "var(--ink2)", lineHeight: 1.6, fontSize: 14 }}>{meeting.agenda}</p>
                  ) : null}

                  {meeting.notes ? (
                    <div style={{ padding: "10px 14px", borderRadius: 12, background: "var(--bg)", fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700 }}>Estate admin note: </span>{meeting.notes}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {joinLink ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => joinMeeting(meeting)}
                        style={live ? { background: "var(--green)", boxShadow: "0 4px 16px rgba(34,139,94,0.3)" } : undefined}
                      >
                        {meeting.provider === "zoom" ? "🎥 Join Zoom" : meeting.provider === "google_meet" ? "🟢 Join Meet" : meeting.provider === "teams" ? "🟣 Join Teams" : "Join Meeting"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 13, color: "var(--ink3)", fontStyle: "italic" }}>
                        Meeting link not yet available
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void openGoogleInvite(meeting.id)}
                      disabled={inviteLoadingId === meeting.id}
                    >
                      {inviteLoadingId === meeting.id ? "Opening…" : "Add to Calendar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past meetings */}
      {history.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><strong>Past Meetings</strong></div>
          <div className="card-body" style={{ display: "grid", gap: 12 }}>
            {history.map((meeting) => (
              <div
                key={meeting.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  background: "var(--surface)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{meeting.title}</div>
                    <div className="td-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {providerIcon(meeting.provider)} {meeting.providerLabel} · {meeting.scheduledForLabel}
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(meeting.status)}>{meeting.statusLabel}</StatusBadge>
                </div>
                {meeting.agenda ? (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink3)", lineHeight: 1.5 }}>{meeting.agenda}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && (meetingData?.meetings.length ?? 0) === 0 && (
        <div className="empty-state">
          <h3>No estate meetings scheduled yet.</h3>
          <p>The estate admin will post upcoming meetings here. Check back soon.</p>
        </div>
      )}

      {loading && (
        <div className="empty-state">
          <p>Loading estate meetings…</p>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </ResidentPortalShell>
  );
}
