import type {
  LandingBuilderDraft,
} from "./landing-builder";

interface LandingBuilderApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface PublishedLandingDraftRecord {
  workspaceSlug: string;
  workspaceType: "estate" | "property";
  draft: Partial<LandingBuilderDraft> | LandingBuilderDraft;
  updatedAt: string | null;
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
  token: string;
  workspaceSlug: string;
  draft: LandingBuilderDraft;
}) {
  const response = await fetch(buildPublishedLandingDraftPath(input.workspaceSlug), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      draft: input.draft,
    }),
  });

  return parseRequiredPublishedLandingDraftResponse<PublishedLandingDraftRecord>(
    response,
    "Failed to publish the landing page.",
  );
}
