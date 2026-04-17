import { useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../../components/auth/ResidentPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../../context/TenantSessionContext";
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

interface OfficeMeetingsResponse {
  officeAccess: {
    offices: Array<{ id: string; position: string }>;
    permissions: string[];
  };
  summary: {
    total: number;
    requested: number;
    confirmed: number;
    compound: number;
  };
  meetings: OfficeMeeting[];
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

export default function ResidentOfficeMeetingsPage() {
  const { residentSession } = useResidentPortalSession();
  const token = residentSession?.token;
  const [data, setData] = useState<OfficeMeetingsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<OfficeMeetingsResponse>("/resident/office/meetings", { token })
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
  }, [token]);

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

          <div className="card">
            <div className="card-header">
              <strong>Meeting Schedule</strong>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 14 }}>
              {data.meetings.map((meeting) => (
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
                </div>
              ))}
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
