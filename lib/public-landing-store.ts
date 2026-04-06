import { API_BASE_URL } from "./api";
import type {
  LandingBuilderDraft,
  LandingBuilderWorkspace,
} from "./landing-builder";

export interface PublishedLandingDraftRecord {
  workspaceSlug: string;
  workspaceType: LandingBuilderWorkspace;
  draft: LandingBuilderDraft;
  updatedAt: string;
}

function normalizeSlug(workspaceSlug: string) {
  return workspaceSlug.trim().toLowerCase();
}

export async function getPublishedLandingDraft(workspaceSlug?: string | null) {
  if (!workspaceSlug?.trim()) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/workspace/landing-page?slug=${encodeURIComponent(
        normalizeSlug(workspaceSlug),
      )}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as
      | { data?: PublishedLandingDraftRecord | null }
      | null;

    return payload?.data ?? null;
  } catch {
    return null;
  }
}
