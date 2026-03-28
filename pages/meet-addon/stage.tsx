import { useRouter } from "next/router";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageMeta from "../../components/layout/PageMeta";
import { useLandlordPortalSession, useTenantPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import {
  buildMeetAddonPanelUrl,
  GOOGLE_MEET_CLOUD_PROJECT_NUMBER,
  GOOGLE_MEET_ADDON_SDK_SRC,
  isMeetAddonRole,
  type MeetAddonMeetingRecord,
  type MeetAddonRole,
} from "../../lib/meet-addon";

type LandlordMeetingsResponse = {
  meetings: MeetAddonMeetingRecord[];
};

type TenantMeetingsResponse = {
  meetings: MeetAddonMeetingRecord[];
};

function resolveRole(
  queryRole: unknown,
  hasLandlordSession: boolean,
  hasTenantSession: boolean,
): MeetAddonRole | null {
  if (typeof queryRole === "string" && isMeetAddonRole(queryRole)) {
    return queryRole;
  }

  if (hasLandlordSession) {
    return "landlord";
  }

  if (hasTenantSession) {
    return "tenant";
  }

  return null;
}

function getMeetingPagePath(role: MeetAddonRole, meetingId: string) {
  return role === "landlord" ? `/landlord/meetings#${meetingId}` : "/tenant/meetings";
}

export default function MeetAddonStagePage() {
  const router = useRouter();
  const { landlordSession } = useLandlordPortalSession();
  const { tenantSession } = useTenantPortalSession();
  const [sdkReady, setSdkReady] = useState(false);
  const [mainStageClient, setMainStageClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetAddonMeetingRecord[]>([]);
  const [activityMeetingId, setActivityMeetingId] = useState<string>("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<"side-panel" | "end" | null>(null);

  const role = useMemo(
    () =>
      resolveRole(
        Array.isArray(router.query.role) ? router.query.role[0] : router.query.role,
        Boolean(landlordSession?.token),
        Boolean(tenantSession?.token),
      ),
    [router.query.role, landlordSession?.token, tenantSession?.token],
  );

  const token = role === "landlord" ? landlordSession?.token : tenantSession?.token;
  const queryMeetingId = useMemo(() => {
    const value = Array.isArray(router.query.meetingId)
      ? router.query.meetingId[0]
      : router.query.meetingId;
    return typeof value === "string" ? value : "";
  }, [router.query.meetingId]);

  useEffect(() => {
    if (!sdkReady || !GOOGLE_MEET_CLOUD_PROJECT_NUMBER) {
      return;
    }

    let cancelled = false;

    async function connectSdk() {
      const createAddonSession = window.meet?.addon?.createAddonSession;

      if (!createAddonSession) {
        return;
      }

      try {
        const session = await createAddonSession({
          cloudProjectNumber: GOOGLE_MEET_CLOUD_PROJECT_NUMBER,
        });
        const client = await session.createMainStageClient?.();
        const activityState = client?.getActivityStartingState
          ? await client.getActivityStartingState().catch(() => null)
          : null;

        if (!cancelled) {
          setMainStageClient(client ?? null);

          if (activityState?.additionalData) {
            try {
              const parsed = JSON.parse(activityState.additionalData) as {
                meetingId?: string;
              };

              if (parsed.meetingId) {
                setActivityMeetingId(parsed.meetingId);
              }
            } catch {}
          }
        }
      } catch {}
    }

    void connectSdk();

    return () => {
      cancelled = true;
    };
  }, [sdkReady]);

  useEffect(() => {
    if (!role || !token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMeetings() {
      setLoading(true);
      setError("");

      try {
        if (role === "landlord") {
          const response = await apiRequest<LandlordMeetingsResponse>("/landlord/meetings", {
            token,
          });
          if (!cancelled) {
            setMeetings(response.data.meetings);
          }
        } else {
          const response = await apiRequest<TenantMeetingsResponse>("/tenant/meetings", {
            token,
          });
          if (!cancelled) {
            setMeetings(response.data.meetings);
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load the selected meeting.",
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
  }, [role, token]);

  const selectedMeetingId = activityMeetingId || queryMeetingId;
  const meeting =
    meetings.find((item) => item.id === selectedMeetingId) ?? meetings[0] ?? null;

  async function reopenSidePanel() {
    if (!mainStageClient?.loadSidePanel || typeof window === "undefined" || !role || !meeting) {
      return;
    }

    setBusyAction("side-panel");

    try {
      await mainStageClient.loadSidePanel();
    } finally {
      setBusyAction(null);
    }
  }

  async function endActivity() {
    if (!mainStageClient?.endActivity) {
      return;
    }

    setBusyAction("end");

    try {
      await mainStageClient.endActivity();
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <PageMeta title="DoorRent — Meet Add-on Stage" />
      <Script
        src={GOOGLE_MEET_ADDON_SDK_SRC}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <main
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(145deg, rgba(15,26,21,0.98), rgba(9,14,12,0.98))",
          color: "#f5f2ea",
          padding: 24,
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 18 }}>
          <section
            style={{
              borderRadius: 28,
              padding: 24,
              background: "radial-gradient(circle at top left, rgba(209,184,122,0.15), transparent 28%), rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#d1b87a" }}>
              DoorRent main stage
            </div>
            <h1 style={{ margin: "10px 0 0", fontSize: 36, lineHeight: 1.05 }}>
              Meeting context without leaving the call
            </h1>
            <p style={{ margin: "12px 0 0", maxWidth: 760, color: "rgba(245,242,234,0.78)", lineHeight: 1.8 }}>
              This shared stage keeps the meeting tied to the property, tenant request, agenda, and
              next actions while the Google Meet call continues in the background.
            </p>
          </section>

          {!role || !token ? (
            <section
              style={{
                borderRadius: 24,
                padding: 22,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Sign in to DoorRent on this browser before using the add-on stage.
            </section>
          ) : loading ? (
            <section
              style={{
                borderRadius: 24,
                padding: 22,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Loading meeting context…
            </section>
          ) : error ? (
            <section
              style={{
                borderRadius: 24,
                padding: 22,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f8b4b4",
              }}
            >
              {error}
            </section>
          ) : meeting ? (
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.9fr)",
                gap: 18,
              }}
            >
              <div
                style={{
                  borderRadius: 24,
                  padding: 22,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "grid",
                  gap: 18,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(209,184,122,0.12)",
                        border: "1px solid rgba(209,184,122,0.35)",
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#f4d48b",
                      }}
                    >
                      {meeting.status}
                    </span>
                    <span style={{ color: "rgba(245,242,234,0.72)", fontSize: 13 }}>
                      {meeting.providerLabel}
                    </span>
                  </div>
                  <h2 style={{ margin: "14px 0 0", fontSize: 30 }}>{meeting.title}</h2>
                  <p style={{ margin: "12px 0 0", color: "rgba(245,242,234,0.78)", lineHeight: 1.8 }}>
                    {meeting.agenda || "No agenda was added for this meeting yet."}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                  <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ fontSize: 12, color: "rgba(245,242,234,0.64)" }}>Scheduled for</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>{meeting.scheduledForLabel}</div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ fontSize: 12, color: "rgba(245,242,234,0.64)" }}>Duration</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>{meeting.durationMinutes} minutes</div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ fontSize: 12, color: "rgba(245,242,234,0.64)" }}>Property</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>{meeting.property.name}</div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ fontSize: 12, color: "rgba(245,242,234,0.64)" }}>Requested by</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>
                      {meeting.requestedBy.name} · Unit {meeting.requestedBy.unit}
                    </div>
                  </div>
                </div>

                {meeting.landlordNotes ? (
                  <div
                    style={{
                      borderRadius: 18,
                      padding: 16,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d1b87a" }}>
                      Workspace notes
                    </div>
                    <div style={{ marginTop: 10, color: "rgba(245,242,234,0.84)", lineHeight: 1.8 }}>
                      {meeting.landlordNotes}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  borderRadius: 24,
                  padding: 22,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "grid",
                  gap: 12,
                  alignContent: "start",
                }}
              >
                <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#d1b87a" }}>
                  Actions
                </div>
                {meeting.meetingLink ? (
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                  >
                    Open Google Meet Link
                  </a>
                ) : (
                  <button type="button" className="btn btn-secondary" disabled>
                    Awaiting Google Meet Link
                  </button>
                )}
                <Link href={getMeetingPagePath(role, meeting.id)} className="btn btn-secondary" target="_blank">
                  Open DoorRent Meeting Page
                </Link>
                {mainStageClient?.loadSidePanel ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void reopenSidePanel()}
                    disabled={busyAction !== null}
                  >
                    {busyAction === "side-panel" ? "Opening…" : "Reopen Side Panel"}
                  </button>
                ) : null}
                {mainStageClient?.endActivity ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void endActivity()}
                    disabled={busyAction !== null}
                  >
                    {busyAction === "end" ? "Ending…" : "End Shared Activity"}
                  </button>
                ) : null}
                {typeof window !== "undefined" && role ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(245,242,234,0.64)", lineHeight: 1.7 }}>
                    Side panel URL:{" "}
                    <a
                      href={buildMeetAddonPanelUrl(window.location.origin, role, meeting.id)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#f4d48b" }}
                    >
                      reopen companion
                    </a>
                  </div>
                ) : null}
              </div>
            </section>
          ) : (
            <section
              style={{
                borderRadius: 24,
                padding: 22,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              No meeting is available for this shared activity yet.
            </section>
          )}
        </div>
      </main>
    </>
  );
}
