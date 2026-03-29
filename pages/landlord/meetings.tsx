import { type ChangeEvent, useEffect, useRef, useState } from "react";
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
  property: { id: string; name: string };
  requestedBy: { id: string; name: string; email: string; unit: string; initials: string };
}

interface LandlordMeetingsResponse {
  summary: { total: number; requested: number; confirmed: number; compound: number };
  meetings: LandlordMeetingRecord[];
}

interface LandlordMeetingMutationResponse {
  meeting: LandlordMeetingRecord;
}

interface MeetingInviteResponse {
  inviteUrl: string;
}

interface TenantOption {
  id: string;
  name: string;
  unit: string;
  property: string;
}

function statusTone(status: LandlordMeetingRecord["status"]): BadgeTone {
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

function isTerminal(status: LandlordMeetingRecord["status"]) {
  return status === "cancelled" || status === "completed";
}

export default function LandlordMeetingsPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [meetingData, setMeetingData] = useState<LandlordMeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingMeetingId, setSavingMeetingId] = useState<string | null>(null);
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { status: string; scheduledFor: string; durationMinutes: string; meetingLink: string; landlordNotes: string }>
  >({});

  // Google connection status
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const token = landlordSession?.token;
    if (!token) return;
    apiRequest<{ connected: boolean; email: string | null }>("/landlord/google/status", { token })
      .then(({ data }) => setGoogleConnected(data.connected))
      .catch(() => setGoogleConnected(false));
  }, [landlordSession?.token]);

  async function connectGoogle() {
    if (!landlordSession?.token) return;
    try {
      const { data } = await apiRequest<{ url: string }>("/landlord/google/connect", { token: landlordSession.token });
      window.location.href = data.url;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not start Google connection.", "error");
    }
  }

  // Schedule meeting modal
  const [showSchedule, setShowSchedule] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    tenantId: "",
    audience: "SOLO",
    title: "",
    agenda: "",
    scheduledFor: "",
    durationMinutes: "30",
    meetingLink: "",
    landlordNotes: "",
  });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const landlordToken = landlordSession?.token;
    if (!landlordToken) return;
    let cancelled = false;

    async function loadMeetings() {
      setLoading(true);
      setError("");
      try {
        const { data } = await apiRequest<LandlordMeetingsResponse>("/landlord/meetings", { token: landlordToken });
        if (!cancelled) {
          setMeetingData(data);
          setDrafts(
            Object.fromEntries(
              data.meetings.map((m) => [
                m.id,
                {
                  status: m.status.toUpperCase(),
                  scheduledFor: toDateTimeInputValue(m.scheduledFor),
                  durationMinutes: `${m.durationMinutes}`,
                  meetingLink: m.meetingLink ?? "",
                  landlordNotes: m.landlordNotes ?? "",
                },
              ]),
            ),
          );
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "We could not load tenant meetings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMeetings();
    return () => { cancelled = true; };
  }, [dataRefreshVersion, landlordSession?.token]);

  // Load tenants when modal opens
  useEffect(() => {
    if (!showSchedule || !landlordSession?.token) return;
    let cancelled = false;

    async function loadTenants() {
      try {
        const { data } = await apiRequest<{ tenants: Array<{ id: string; tenant: string; unit: string; property: string }> }>(
          "/landlord/tenants",
          { token: landlordSession!.token },
        );
        if (!cancelled) {
          setTenants(
            (data.tenants ?? []).map((t) => ({
              id: t.id,
              name: t.tenant,
              unit: t.unit,
              property: t.property,
            })),
          );
        }
      } catch {
        // silently ignore tenant load errors
      }
    }

    void loadTenants();
    return () => { cancelled = true; };
  }, [showSchedule, landlordSession?.token]);

  // Close modal on outside click
  useEffect(() => {
    if (!showSchedule) return;
    function onOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowSchedule(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showSchedule]);

  function updateDraft(
    meetingId: string,
    field: "status" | "scheduledFor" | "durationMinutes" | "meetingLink" | "landlordNotes",
    value: string,
  ) {
    setDrafts((current) => ({ ...current, [meetingId]: { ...current[meetingId], [field]: value } }));
  }

  async function saveMeeting(meetingId: string) {
    if (!landlordSession?.token || !drafts[meetingId]) return;
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
                .map((m) => (m.id === meetingId ? data.meeting : m))
                .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()),
              summary: {
                total: current.meetings.length,
                requested: current.meetings.filter((m) => (m.id === meetingId ? data.meeting.status === "requested" : m.status === "requested")).length,
                confirmed: current.meetings.filter((m) => (m.id === meetingId ? data.meeting.status === "confirmed" : m.status === "confirmed")).length,
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
    } catch (err) {
      showToast(err instanceof Error ? err.message : "We could not update this meeting.", "error");
    } finally {
      setSavingMeetingId(null);
    }
  }

  async function generateMeetingLink(meetingId: string) {
    if (!landlordSession?.token) return;
    setGeneratingLinkId(meetingId);
    try {
      const { data } = await apiRequest<LandlordMeetingMutationResponse>(
        `/landlord/meetings/${meetingId}/generate-link`,
        { method: "POST", token: landlordSession.token },
      );
      setMeetingData((current) =>
        current
          ? { ...current, meetings: current.meetings.map((m) => (m.id === meetingId ? data.meeting : m)) }
          : current,
      );
      setDrafts((current) => ({
        ...current,
        [meetingId]: { ...current[meetingId], meetingLink: data.meeting.meetingLink ?? "" },
      }));
      showToast("Meeting link generated", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not generate link.", "error");
    } finally {
      setGeneratingLinkId(null);
    }
  }

  async function openGoogleInvite(meetingId: string) {
    if (!landlordSession?.token) return;
    setInviteLoadingId(meetingId);
    try {
      const { data } = await apiRequest<MeetingInviteResponse>(
        `/landlord/meetings/${meetingId}/google-invite`,
        { token: landlordSession.token },
      );
      window.open(data.inviteUrl, "_blank", "noopener,noreferrer");
      showToast("Google Calendar invite opened", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "We could not create the Google invite.", "error");
    } finally {
      setInviteLoadingId(null);
    }
  }

  async function scheduleNewMeeting() {
    if (!landlordSession?.token) return;
    if (!scheduleForm.tenantId) { showToast("Please select a tenant.", "error"); return; }
    if (!scheduleForm.title.trim()) { showToast("Please enter a meeting title.", "error"); return; }
    if (!scheduleForm.scheduledFor) { showToast("Please select a date and time.", "error"); return; }

    setScheduling(true);
    try {
      const { data } = await apiRequest<LandlordMeetingMutationResponse>("/landlord/meetings", {
        method: "POST",
        token: landlordSession.token,
        body: {
          tenantId: scheduleForm.tenantId,
          title: scheduleForm.title,
          agenda: scheduleForm.agenda || undefined,
          audience: scheduleForm.audience,
          scheduledFor: new Date(scheduleForm.scheduledFor).toISOString(),
          durationMinutes: Number(scheduleForm.durationMinutes),
          meetingLink: scheduleForm.meetingLink || undefined,
          landlordNotes: scheduleForm.landlordNotes || undefined,
        },
      });

      setMeetingData((current) => {
        if (!current) return current;
        const updated = [data.meeting, ...current.meetings].sort(
          (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
        );
        return {
          meetings: updated,
          summary: {
            total: updated.length,
            requested: updated.filter((m) => m.status === "requested").length,
            confirmed: updated.filter((m) => m.status === "confirmed").length,
            compound: updated.filter((m) => m.audience === "compound").length,
          },
        };
      });
      setDrafts((current) => ({
        ...current,
        [data.meeting.id]: {
          status: data.meeting.status.toUpperCase(),
          scheduledFor: toDateTimeInputValue(data.meeting.scheduledFor),
          durationMinutes: `${data.meeting.durationMinutes}`,
          meetingLink: data.meeting.meetingLink ?? "",
          landlordNotes: data.meeting.landlordNotes ?? "",
        },
      }));

      setShowSchedule(false);
      setScheduleForm({ tenantId: "", audience: "SOLO", title: "", agenda: "", scheduledFor: "", durationMinutes: "30", meetingLink: "", landlordNotes: "" });
      refreshData();
      showToast("Meeting scheduled", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not schedule meeting.", "error");
    } finally {
      setScheduling(false);
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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <PageHeader title="Meetings" description={description} />
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 2, whiteSpace: "nowrap" }}
            onClick={() => setShowSchedule(true)}
          >
            + Schedule Meeting
          </button>
        </div>

        <div className="meeting-stats-grid">
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

        {googleConnected === false ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", marginBottom: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Connect Google Calendar to generate Meet links</div>
              <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>One-time setup · Links created directly in your Google Calendar</div>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void connectGoogle()}>
              Connect Google
            </button>
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(meetingData?.meetings ?? []).map((meeting) => {
            const draft = drafts[meeting.id];
            const terminal = isTerminal(meeting.status);

            if (terminal) {
              return (
                <div key={meeting.id} className="card meeting-card-terminal">
                  <div className="card-body" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink1)" }}>{meeting.title}</span>
                            <StatusBadge tone={statusTone(meeting.status)}>{meeting.status}</StatusBadge>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
                            {meeting.scheduledForLabel} · {meeting.durationMinutes} min · {meeting.requestedBy.name} · Unit {meeting.requestedBy.unit}
                          </div>
                          {meeting.agenda ? (
                            <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 2 }}>{meeting.agenda}</div>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                        {meeting.meetingLink ? (
                          <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                            Open Meet
                          </a>
                        ) : null}
                        <a href={buildMeetAddonPreviewUrl("landlord", meeting.id)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                          View Details
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={meeting.id} className="card">
                <div className="card-body">
                  <div className="meeting-card-header">
                    <div className="meeting-card-copy">
                      <div className="meeting-title-row">
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{meeting.title}</h3>
                        <StatusBadge tone={statusTone(meeting.status)}>{meeting.status}</StatusBadge>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                        {meeting.agenda || "No agenda was supplied by the tenant."}
                      </div>
                    </div>
                    <div className="meeting-requester-card">
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                        {meeting.requestedBy.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{meeting.requestedBy.name}</div>
                        <div style={{ fontSize: 12, color: "var(--ink3)" }}>Unit {meeting.requestedBy.unit} · {meeting.property.name}</div>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        className="form-input"
                        value={draft?.status ?? meeting.status.toUpperCase()}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => updateDraft(meeting.id, "status", e.target.value)}
                      >
                        {["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Scheduled For</label>
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={draft?.scheduledFor ?? toDateTimeInputValue(meeting.scheduledFor)}
                        onChange={(e) => updateDraft(meeting.id, "scheduledFor", e.target.value)}
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
                        onChange={(e) => updateDraft(meeting.id, "durationMinutes", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Meeting Link</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          className="form-input"
                          style={{ flex: 1 }}
                          value={draft?.meetingLink ?? meeting.meetingLink ?? ""}
                          onChange={(e) => updateDraft(meeting.id, "meetingLink", e.target.value)}
                          placeholder="Paste a link or click Generate"
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                          onClick={() => void generateMeetingLink(meeting.id)}
                          disabled={generatingLinkId === meeting.id}
                        >
                          {generatingLinkId === meeting.id ? "Generating…" : "⚡ Generate"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Landlord Notes</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: 90 }}
                      value={draft?.landlordNotes ?? meeting.landlordNotes ?? ""}
                      onChange={(e) => updateDraft(meeting.id, "landlordNotes", e.target.value)}
                      placeholder="Share notes, prep instructions, or follow-up actions."
                    />
                  </div>

                  <div className="meeting-action-row">
                    <div className="meeting-meta-line">
                      {meeting.audienceLabel} · {meeting.providerLabel} · {meeting.participantCount} participant(s)
                    </div>
                    <div className="meeting-action-buttons">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void openGoogleInvite(meeting.id)} disabled={inviteLoadingId === meeting.id}>
                        {inviteLoadingId === meeting.id ? "Opening..." : "Google Invite"}
                      </button>
                      <a href={buildMeetAddonPreviewUrl("landlord", meeting.id)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        Meet Add-on
                      </a>
                      {meeting.meetingLink ? (
                        <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                          Open Meet
                        </a>
                      ) : null}
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => void saveMeeting(meeting.id)} disabled={savingMeetingId === meeting.id}>
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
                No tenant meetings yet. Use "Schedule Meeting" to get started.
              </div>
            </div>
          ) : null}
        </div>

        {/* Schedule Meeting Modal */}
        {showSchedule ? (
          <div className="schedule-overlay">
            <div className="schedule-modal" ref={modalRef}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Schedule Meeting</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>Initiate a meeting with a tenant or all tenants</div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSchedule(false)} style={{ padding: "6px 10px" }}>✕</button>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Tenant</label>
                  <select
                    className="form-input"
                    value={scheduleForm.tenantId}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, tenantId: e.target.value }))}
                  >
                    <option value="">Select a tenant…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} — {t.unit}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Audience</label>
                  <select
                    className="form-input"
                    value={scheduleForm.audience}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, audience: e.target.value }))}
                  >
                    <option value="SOLO">Private (tenant only)</option>
                    <option value="COMPOUND">Compound-wide (all tenants)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Meeting Title</label>
                <input
                  className="form-input"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Rent review, Property inspection…"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Agenda <span style={{ color: "var(--ink3)", fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 70 }}
                  value={scheduleForm.agenda}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, agenda: e.target.value }))}
                  placeholder="What will be discussed?"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date & Time</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={scheduleForm.scheduledFor}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={15}
                    max={180}
                    value={scheduleForm.durationMinutes}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Meeting Link <span style={{ color: "var(--ink3)", fontWeight: 400 }}>(optional)</span></label>
                <input
                  className="form-input"
                  value={scheduleForm.meetingLink}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, meetingLink: e.target.value }))}
                  placeholder="Paste a link, or use ⚡ Generate after saving"
                />
                {googleConnected === false ? (
                  <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 4 }}>
                    Connect Google Calendar in Settings to auto-generate a Meet link.
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 4 }}>
                    Leave blank and use the ⚡ Generate button after saving to create a Google Meet link.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Landlord Notes <span style={{ color: "var(--ink3)", fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 70 }}
                  value={scheduleForm.landlordNotes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, landlordNotes: e.target.value }))}
                  placeholder="Preparation notes, agenda context…"
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSchedule(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => void scheduleNewMeeting()} disabled={scheduling}>
                  {scheduling ? "Scheduling…" : "Schedule Meeting"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <style jsx>{`
          .meeting-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }

          .meeting-card-terminal {
            opacity: 0.72;
          }

          .meeting-card-terminal:hover {
            opacity: 1;
          }

          .meeting-card-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
            align-items: flex-start;
          }

          .meeting-card-copy {
            flex: 1;
            min-width: 0;
          }

          .meeting-title-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
            flex-wrap: wrap;
          }

          .meeting-requester-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: var(--radius);
            border: 1px solid var(--border);
            background: var(--surface2);
            min-width: 220px;
            max-width: 100%;
          }

          .meeting-action-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
          }

          .meeting-meta-line {
            font-size: 12px;
            color: var(--ink3);
            line-height: 1.6;
            flex: 1;
            min-width: 180px;
          }

          .meeting-action-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          /* Modal */
          .schedule-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .schedule-modal {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          }

          @media (max-width: 960px) {
            .meeting-stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .meeting-card-header {
              flex-direction: column;
            }

            .meeting-requester-card {
              min-width: 0;
              width: 100%;
            }
          }

          @media (max-width: 640px) {
            .meeting-stats-grid {
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }

            .meeting-action-row {
              flex-direction: column;
              align-items: stretch;
            }

            .meeting-meta-line {
              min-width: 0;
            }

            .meeting-action-buttons {
              width: 100%;
              display: grid;
              grid-template-columns: 1fr;
            }

            .meeting-action-buttons :global(.btn) {
              width: 100%;
              justify-content: center;
            }

            .schedule-modal {
              padding: 18px 16px;
            }
          }

          @media (max-width: 480px) {
            .meeting-stats-grid {
              grid-template-columns: 1fr;
            }

            .meeting-card-header {
              gap: 12px;
            }

            .meeting-requester-card {
              padding: 10px;
            }
          }
        `}</style>
      </LandlordPortalShell>
    </>
  );
}
