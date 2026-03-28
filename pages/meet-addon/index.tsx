import { useRouter } from "next/router";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageMeta from "../../components/layout/PageMeta";
import { useLandlordPortalSession, useTenantPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import {
  buildMeetAddonPanelUrl,
  buildMeetAddonStageUrl,
  getMeetAddonManifestUrl,
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

type MeetAddonClientState = {
  connected: boolean;
  previewMode: boolean;
  frameOpenReason?: string | null;
  message: string;
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

export default function MeetAddonSidePanelPage() {
  const router = useRouter();
  const { landlordSession } = useLandlordPortalSession();
  const { tenantSession } = useTenantPortalSession();
  const [meetings, setMeetings] = useState<MeetAddonMeetingRecord[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [addonClient, setAddonClient] = useState<any>(null);
  const [addonState, setAddonState] = useState<MeetAddonClientState>({
    connected: false,
    previewMode: true,
    message: "Waiting for Google Meet add-on SDK…",
  });
  const [launching, setLaunching] = useState(false);

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
  const meetingIdFromQuery = useMemo(() => {
    const value = Array.isArray(router.query.meetingId)
      ? router.query.meetingId[0]
      : router.query.meetingId;
    return typeof value === "string" ? value : "";
  }, [router.query.meetingId]);

  const selectedMeeting =
    meetings.find((meeting) => meeting.id === selectedMeetingId) ?? meetings[0] ?? null;

  useEffect(() => {
    if (!sdkReady) {
      return;
    }

    if (!GOOGLE_MEET_CLOUD_PROJECT_NUMBER) {
      setAddonState({
        connected: false,
        previewMode: true,
        message:
          "Preview mode. Set NEXT_PUBLIC_GOOGLE_MEET_CLOUD_PROJECT_NUMBER to connect this page inside Google Meet.",
      });
      return;
    }

    let cancelled = false;

    async function connectSdk() {
      const createAddonSession = window.meet?.addon?.createAddonSession;

      if (!createAddonSession) {
        if (!cancelled) {
          setAddonState({
            connected: false,
            previewMode: true,
            message:
              "Preview mode. Open this page inside Google Meet after deploying the add-on to connect the side panel.",
          });
        }
        return;
      }

      try {
        const session = await createAddonSession({
          cloudProjectNumber: GOOGLE_MEET_CLOUD_PROJECT_NUMBER,
        });
        const client = await session.createSidePanelClient?.();
        const frameOpenReason = client?.getFrameOpenReason
          ? await client.getFrameOpenReason().catch(() => null)
          : null;

        if (!cancelled) {
          setAddonClient(client ?? null);
          setAddonState({
            connected: true,
            previewMode: false,
            frameOpenReason,
            message: "Connected to Google Meet. Pick a DoorRent meeting to start a shared activity.",
          });
        }
      } catch (sdkError) {
        if (!cancelled) {
          setAddonState({
            connected: false,
            previewMode: true,
            message:
              sdkError instanceof Error
                ? sdkError.message
                : "Could not connect to Google Meet. You can still preview this page in a browser tab.",
          });
        }
      }
    }

    void connectSdk();

    return () => {
      cancelled = true;
    };
  }, [sdkReady]);

  useEffect(() => {
    if (!role || !token) {
      setMeetings([]);
      setSelectedMeetingId("");
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
              : "We could not load your meeting data.",
          );
          setMeetings([]);
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

  useEffect(() => {
    if (!meetings.length) {
      setSelectedMeetingId("");
      return;
    }

    if (meetingIdFromQuery && meetings.some((meeting) => meeting.id === meetingIdFromQuery)) {
      setSelectedMeetingId(meetingIdFromQuery);
      return;
    }

    setSelectedMeetingId((current) =>
      current && meetings.some((meeting) => meeting.id === current) ? current : meetings[0].id,
    );
  }, [meetingIdFromQuery, meetings]);

  async function handleLaunchActivity() {
    if (!selectedMeeting || !role || typeof window === "undefined") {
      return;
    }

    const origin = window.location.origin;
    const stageUrl = buildMeetAddonStageUrl(origin, role, selectedMeeting.id);
    const sidePanelUrl = buildMeetAddonPanelUrl(origin, role, selectedMeeting.id);

    setLaunching(true);

    try {
      if (addonClient?.startActivity) {
        await addonClient.startActivity({
          mainStageUrl: stageUrl,
          sidePanelUrl,
          additionalData: JSON.stringify({
            meetingId: selectedMeeting.id,
            role,
          }),
        });
      } else {
        window.open(stageUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setLaunching(false);
    }
  }

  const manifestUrl =
    typeof window !== "undefined" ? getMeetAddonManifestUrl(window.location.origin) : "/api/meet-addon/manifest";

  return (
    <>
      <PageMeta title="DoorRent — Meet Add-on" />
      <Script
        src={GOOGLE_MEET_ADDON_SDK_SRC}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(53, 104, 80, 0.18), transparent 32%), #0d1712",
          color: "#f5f2ea",
          padding: 20,
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            display: "grid",
            gap: 16,
          }}
        >
          <section
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(135deg, rgba(22,34,28,0.96), rgba(12,18,15,0.96))",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#d1b87a" }}>
                  Google Meet Add-on
                </div>
                <h1 style={{ margin: "8px 0 0", fontSize: 30, lineHeight: 1.1 }}>
                  DoorRent Meeting Companion
                </h1>
                <p style={{ margin: "10px 0 0", color: "rgba(245,242,234,0.78)", maxWidth: 720, lineHeight: 1.7 }}>
                  Use this side panel inside Google Meet to pull up DoorRent meeting context, launch a
                  shared stage, and keep the call tied to the right property, tenant, and follow-up.
                </p>
              </div>
              <div
                style={{
                  minWidth: 240,
                  padding: 14,
                  borderRadius: 18,
                  background: addonState.connected ? "rgba(33, 132, 86, 0.16)" : "rgba(255,255,255,0.04)",
                  border: addonState.connected
                    ? "1px solid rgba(33, 132, 86, 0.42)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {addonState.connected ? "Connected to Google Meet" : "Preview / Setup Mode"}
                </div>
                <div style={{ fontSize: 13, color: "rgba(245,242,234,0.78)", lineHeight: 1.6 }}>
                  {addonState.message}
                </div>
                {addonState.frameOpenReason ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#d1b87a" }}>
                    Frame open reason: {addonState.frameOpenReason}
                  </div>
                ) : null}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(245,242,234,0.72)", lineHeight: 1.7 }}>
              Manifest URL:{" "}
              <a href={manifestUrl} target="_blank" rel="noreferrer" style={{ color: "#f4d48b" }}>
                {manifestUrl}
              </a>
            </div>
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
              <h2 style={{ marginTop: 0 }}>Sign in first</h2>
              <p style={{ color: "rgba(245,242,234,0.78)", lineHeight: 1.7 }}>
                This companion uses your existing DoorRent session. Sign in on the same browser first,
                then reopen the add-on from Google Meet.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/portal" className="btn btn-primary">
                  Workspace Login
                </Link>
                <Link href="/tenant/login" className="btn btn-secondary">
                  Tenant Login
                </Link>
              </div>
            </section>
          ) : (
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)",
                gap: 16,
              }}
            >
              <div
                style={{
                  borderRadius: 24,
                  padding: 18,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#d1b87a" }}>
                  {role === "landlord" ? "Workspace meetings" : "Tenant meetings"}
                </div>
                {loading ? (
                  <div style={{ color: "rgba(245,242,234,0.72)" }}>Loading meetings…</div>
                ) : error ? (
                  <div style={{ color: "#f8b4b4" }}>{error}</div>
                ) : meetings.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {meetings.map((meeting) => {
                      const selected = meeting.id === selectedMeetingId;

                      return (
                        <button
                          key={meeting.id}
                          type="button"
                          onClick={() => setSelectedMeetingId(meeting.id)}
                          style={{
                            textAlign: "left",
                            padding: 14,
                            borderRadius: 16,
                            border: selected
                              ? "1px solid rgba(209,184,122,0.65)"
                              : "1px solid rgba(255,255,255,0.08)",
                            background: selected ? "rgba(209,184,122,0.1)" : "rgba(255,255,255,0.03)",
                            color: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{meeting.title}</div>
                          <div style={{ fontSize: 12, color: "rgba(245,242,234,0.72)", marginTop: 4 }}>
                            {meeting.property.name} · {meeting.scheduledForLabel}
                          </div>
                          <div style={{ fontSize: 12, color: "#d1b87a", marginTop: 6 }}>
                            {meeting.status.toUpperCase()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: "rgba(245,242,234,0.72)" }}>
                    No meetings are available for this session yet.
                  </div>
                )}
              </div>

              <div
                style={{
                  borderRadius: 24,
                  padding: 20,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "grid",
                  gap: 16,
                }}
              >
                {selectedMeeting ? (
                  <>
                    <div>
                      <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#d1b87a" }}>
                        Selected meeting
                      </div>
                      <h2 style={{ margin: "8px 0 0", fontSize: 26 }}>{selectedMeeting.title}</h2>
                      <p style={{ margin: "10px 0 0", color: "rgba(245,242,234,0.78)", lineHeight: 1.7 }}>
                        {selectedMeeting.agenda || "No agenda has been added yet for this meeting."}
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                      <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontSize: 12, color: "rgba(245,242,234,0.64)" }}>When</div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedMeeting.scheduledForLabel}</div>
                      </div>
                      <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontSize: 12, color: "rgba(245,242,234,0.64)" }}>Participants</div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedMeeting.participantCount}</div>
                      </div>
                      <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontSize: 12, color: "rgba(245,242,234,0.64)" }}>Property</div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedMeeting.property.name}</div>
                      </div>
                      <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontSize: 12, color: "rgba(245,242,234,0.64)" }}>Status</div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{selectedMeeting.status}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => void handleLaunchActivity()}
                        disabled={launching}
                        className="btn btn-primary"
                      >
                        {launching ? "Opening…" : "Open in Main Stage"}
                      </button>
                      <a
                        href={`/meet-addon/stage?role=${role}&meetingId=${selectedMeeting.id}`}
                        className="btn btn-secondary"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Browser Preview
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ color: "rgba(245,242,234,0.72)" }}>
                    Select a meeting to prepare the shared DoorRent companion.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
