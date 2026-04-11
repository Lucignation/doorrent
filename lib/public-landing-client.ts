import type {
  LandingBuilderDraft,
  LandingBuilderWorkspace,
} from "./landing-builder";
import { apiRequest } from "./api";

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

export interface SavedLandingDraftRecord {
  workspaceSlug: string | null;
  workspaceType: "estate" | "property";
  draft: Partial<LandingBuilderDraft> | LandingBuilderDraft | null;
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
  workspaceType: LandingBuilderWorkspace;
  draft: LandingBuilderDraft;
}) {
  const { editorType: _editorType, ...publishableDraft } = input.draft;
  const response = await fetch(buildPublishedLandingDraftPath(input.workspaceSlug), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      workspaceType: input.workspaceType,
      draft: publishableDraft,
    }),
  });

  return parseRequiredPublishedLandingDraftResponse<PublishedLandingDraftRecord>(
    response,
    "Failed to publish the landing page.",
  );
}

function buildWorkspaceLandingDraftPath(workspaceType: LandingBuilderWorkspace) {
  return workspaceType === "estate"
    ? "/estate/settings/landing-page"
    : "/landlord/settings/landing-page";
}

export async function fetchSavedLandingDraft(input: {
  token: string;
  workspaceType: LandingBuilderWorkspace;
}) {
  const { data } = await apiRequest<SavedLandingDraftRecord>(
    buildWorkspaceLandingDraftPath(input.workspaceType),
    {
      token: input.token,
    },
  );

  return data;
}

export async function saveLandingDraft(input: {
  token: string;
  workspaceSlug?: string | null;
  workspaceType: LandingBuilderWorkspace;
  draft: LandingBuilderDraft;
}) {
  const { data } = await apiRequest<SavedLandingDraftRecord>(
    buildWorkspaceLandingDraftPath(input.workspaceType),
    {
      method: "PATCH",
      token: input.token,
      body: {
        workspaceSlug: input.workspaceSlug ?? undefined,
        draft: input.draft,
      },
    },
  );

  return data;
}
