import { isAllowedFrontendHost, normalizeBrowserHost } from "./frontend-security";
import type { WorkspaceBranding } from "./branding";

function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.usedoorrent.com";

export const WORKSPACE_API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl);

export type PublicWorkspaceContext = {
  workspace: null | {
    id: string;
    companyName: string;
    workspaceMode: "SOLO_LANDLORD" | "PROPERTY_MANAGER_COMPANY";
    workspaceSlug: string | null;
    publicSupportEmail?: string | null;
    publicSupportPhone?: string | null;
    publicLegalAddress?: string | null;
    branding: WorkspaceBranding;
  };
};

export async function fetchWorkspaceContextByHost(host?: string | null) {
  const normalizedHost = normalizeBrowserHost(host);

  if (!normalizedHost || !isAllowedFrontendHost(normalizedHost)) {
    return null;
  }

  try {
    const response = await fetch(
      `${WORKSPACE_API_BASE_URL}/auth/workspace?host=${encodeURIComponent(normalizedHost)}`,
      {
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "strict-origin-when-cross-origin",
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      data?: PublicWorkspaceContext;
    };

    return payload.data ?? null;
  } catch {
    return null;
  }
}
