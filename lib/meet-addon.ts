export type MeetAddonRole = "landlord" | "tenant";

export type MeetAddonMeetingRecord = {
  id: string;
  title: string;
  agenda: string;
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
    email?: string;
    unit: string;
    initials?: string;
  };
};

export const GOOGLE_MEET_ADDON_SDK_SRC =
  "https://www.gstatic.com/meetjs/addons/1.1.0/meet.addons.js";

export const GOOGLE_MEET_CLOUD_PROJECT_NUMBER =
  process.env.NEXT_PUBLIC_GOOGLE_MEET_CLOUD_PROJECT_NUMBER?.trim() ?? "";

declare global {
  interface Window {
    meet?: {
      addon?: {
        createAddonSession?: (options: {
          cloudProjectNumber: string;
        }) => Promise<any>;
      };
    };
  }
}

export function isMeetAddonRole(value: unknown): value is MeetAddonRole {
  return value === "landlord" || value === "tenant";
}

export function buildMeetAddonPanelUrl(
  origin: string,
  role: MeetAddonRole,
  meetingId?: string | null,
) {
  const url = new URL("/meet-addon", origin);
  url.searchParams.set("role", role);

  if (meetingId) {
    url.searchParams.set("meetingId", meetingId);
  }

  return url.toString();
}

export function buildMeetAddonStageUrl(
  origin: string,
  role: MeetAddonRole,
  meetingId?: string | null,
) {
  const url = new URL("/meet-addon/stage", origin);
  url.searchParams.set("role", role);

  if (meetingId) {
    url.searchParams.set("meetingId", meetingId);
  }

  return url.toString();
}

export function buildMeetAddonPreviewUrl(role: MeetAddonRole, meetingId?: string | null) {
  const params = new URLSearchParams({ role });

  if (meetingId) {
    params.set("meetingId", meetingId);
  }

  return `/meet-addon?${params.toString()}`;
}

export function getMeetAddonManifestUrl(origin: string) {
  return new URL("/api/meet-addon/manifest", origin).toString();
}
