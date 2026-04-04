export const APP_NAME = "DoorRent";
export const APP_DESCRIPTION =
  "DoorRent is property management software for Nigerian landlords and property companies to collect rent, manage tenants, issue agreements, track receipts, and run portfolio operations in one place.";

const DEFAULT_APP_URL = "https://usedoorrent.com";

function normalizeSiteUrl(value: string | undefined, fallback: string) {
  try {
    return new URL((value || fallback).trim()).origin;
  } catch {
    return fallback;
  }
}

export const APP_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_URL);
export const FAVICON_PATH = "/favicon.ico?v=20260323";
export const LOGO_PATH = "/doorrent-logo.png";
export const SHARE_IMAGE_PATH = LOGO_PATH;
export const SHARE_IMAGE_ALT = `${APP_NAME} logo`;
export const SHARE_IMAGE_TYPE = "image/png";
export const SHARE_IMAGE_WIDTH = 512;
export const SHARE_IMAGE_HEIGHT = 512;
export const DEFAULT_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
export const PUBLIC_SITE_PATHS = [
  "/",
  "/marketplace",
  "/privacy",
  "/terms",
  "/security",
  "/refund-policy",
  "/account-deletion",
] as const;

export function buildAppUrl(path = "") {
  if (!path) {
    return APP_URL;
  }

  return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
