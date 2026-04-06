import { isAllowedFrontendHost, normalizeBrowserHost } from "./frontend-security";
import type { WorkspaceBranding } from "./branding";

function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

const defaultApiOrigin =
  process.env.NODE_ENV === "production"
    ? "https://api.usedoorrent.com"
    : "http://localhost:4000";

const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiOrigin;

export const WORKSPACE_API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl);
const WORKSPACE_BROWSER_API_BASE_PATH =
  process.env.NODE_ENV === "production" ? "/api/v1" : WORKSPACE_API_BASE_URL;

function getWorkspaceApiBaseUrl() {
  return typeof window === "undefined"
    ? WORKSPACE_API_BASE_URL
    : WORKSPACE_BROWSER_API_BASE_PATH;
}

export type PublicWorkspaceContext = {
  workspace: null | {
    id: string;
    companyName: string;
    workspaceMode: "SOLO_LANDLORD" | "PROPERTY_MANAGER_COMPANY" | "ESTATE_ADMIN";
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
      `${getWorkspaceApiBaseUrl()}/auth/workspace?host=${encodeURIComponent(normalizedHost)}`,
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
