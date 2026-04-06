import type {
  LandingBuilderDraft,
  LandingBuilderProfile,
  LandingBuilderWorkspace,
} from "./landing-builder";

interface LandingBuilderApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface PublishedLandingDraftRecord {
  workspaceSlug: string;
  workspaceType: LandingBuilderWorkspace;
  draft: LandingBuilderDraft;
  updatedAt: string;
}

function buildPublishedLandingDraftPath(workspaceSlug: string) {
  return `/api/landing-builder/${encodeURIComponent(workspaceSlug)}`;
}

async function parsePublishedLandingDraftResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  const payload = (await response.json().catch(() => null)) as
    | LandingBuilderApiEnvelope<T>
    | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? fallbackMessage);
  }

  return payload?.data ?? null;
}

async function parseRequiredPublishedLandingDraftResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  const data = await parsePublishedLandingDraftResponse<T>(response, fallbackMessage);

  if (!data) {
    throw new Error(fallbackMessage);
  }

  return data;
}

export async function fetchPublishedLandingDraft(workspaceSlug: string) {
  const response = await fetch(buildPublishedLandingDraftPath(workspaceSlug), {
    method: "GET",
    cache: "no-store",
  });

  return parsePublishedLandingDraftResponse<PublishedLandingDraftRecord | null>(
    response,
    "Failed to load the published landing page.",
  );
}

export async function publishLandingDraft(input: {
  workspaceSlug: string;
  workspaceType: LandingBuilderWorkspace;
  profile: LandingBuilderProfile;
  draft: LandingBuilderDraft;
}) {
  const response = await fetch(buildPublishedLandingDraftPath(input.workspaceSlug), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspaceType: input.workspaceType,
      profile: input.profile,
      draft: input.draft,
    }),
  });

  return parseRequiredPublishedLandingDraftResponse<PublishedLandingDraftRecord>(
    response,
    "Failed to publish the landing page.",
  );
}
