const DEFAULT_APP_ORIGIN = "https://usedoorrent.com";
const DEFAULT_ROOT_DOMAIN = "usedoorrent.com";
const PREVIEW_HOST_SUFFIX = ".vercel.app";

function normalizeOrigin(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch {
    return null;
  }
}

export function normalizeBrowserHost(host?: string | null) {
  if (!host) {
    return "";
  }

  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export const PUBLIC_APP_ORIGIN =
  normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ?? DEFAULT_APP_ORIGIN;
export const PUBLIC_APP_HOST = normalizeBrowserHost(new URL(PUBLIC_APP_ORIGIN).host);
export const ROOT_PUBLIC_DOMAIN =
  normalizeBrowserHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN) ||
  (PUBLIC_APP_HOST.endsWith(PREVIEW_HOST_SUFFIX)
    ? DEFAULT_ROOT_DOMAIN
    : PUBLIC_APP_HOST || DEFAULT_ROOT_DOMAIN);

export function isLocalDevelopmentHost(host?: string | null) {
  const normalized = normalizeBrowserHost(host);
  return normalized === "localhost" || normalized === "127.0.0.1";
}

export function isWorkspaceSubdomainHost(host?: string | null) {
  const normalized = normalizeBrowserHost(host);

  if (!normalized || normalized === ROOT_PUBLIC_DOMAIN) {
    return false;
  }

  return normalized.endsWith(`.${ROOT_PUBLIC_DOMAIN}`);
}

export function isAllowedFrontendHost(host?: string | null) {
  const normalized = normalizeBrowserHost(host);

  if (!normalized) {
    return false;
  }

  if (
    normalized === ROOT_PUBLIC_DOMAIN ||
    normalized === PUBLIC_APP_HOST ||
    normalized === `www.${ROOT_PUBLIC_DOMAIN}` ||
    isWorkspaceSubdomainHost(normalized) ||
    isLocalDevelopmentHost(normalized) ||
    normalized.endsWith(PREVIEW_HOST_SUFFIX)
  ) {
    return true;
  }

  return false;
}

export function getSafeWorkspaceHostFromWindow() {
  if (typeof window === "undefined") {
    return null;
  }

  const normalized = normalizeBrowserHost(window.location.host);
  return isAllowedFrontendHost(normalized) ? normalized : null;
}

function hostMatches(hostname: string, expectedBaseHost: string) {
  return hostname === expectedBaseHost || hostname.endsWith(`.${expectedBaseHost}`);
}

export function sanitizeRemoteAssetUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol === "https:") {
      return url.toString();
    }

    if (
      url.protocol === "http:" &&
      (isLocalDevelopmentHost(url.host) || url.hostname.endsWith(PREVIEW_HOST_SUFFIX))
    ) {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

export function sanitizeHexColor(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const expanded = normalized.replace(
    /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,
    "#$1$1$2$2$3$3",
  );

  return /^#[0-9a-fA-F]{6}$/.test(expanded) ? expanded.toUpperCase() : null;
}

export function sanitizeExternalRedirectUrl(
  value: string,
  kind: "generic" | "payment" = "generic",
) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    if (kind === "payment") {
      const allowedPaymentHosts = ["paystack.com", "paystack.shop"];

      if (!allowedPaymentHosts.some((host) => hostMatches(url.hostname, host))) {
        return null;
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function buildSafeTelephoneHref(value?: string | null) {
  if (!value) {
    return null;
  }

  const raw = value.trim().startsWith("tel:") ? value.trim().slice(4) : value.trim();
  const normalized = raw.replace(/[^\d+#*]/g, "");

  return normalized ? `tel:${normalized}` : null;
}
