import type { CSSProperties } from "react";
import { sanitizeHexColor, sanitizeRemoteAssetUrl } from "./frontend-security";

export interface WorkspaceBranding {
  displayName: string;
  logoUrl?: string | null;
  loginBackgroundUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}

type BrandCssProperties = CSSProperties & {
  "--accent"?: string;
  "--accent-light"?: string;
  "--accent2"?: string;
  "--accent2-light"?: string;
};

function hexToRgb(color: string) {
  const normalized = color.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  if (!/^[0-9A-Fa-f]{6}$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function rgba(color: string, alpha: number) {
  const rgb = hexToRgb(color);

  if (!rgb) {
    return undefined;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function buildBrandShellStyle(
  branding?: WorkspaceBranding | null,
): BrandCssProperties | undefined {
  const primaryColor = sanitizeHexColor(branding?.primaryColor);
  const accentColor = sanitizeHexColor(branding?.accentColor);

  if (!primaryColor && !accentColor) {
    return undefined;
  }

  const style: BrandCssProperties = {};

  if (primaryColor) {
    style["--accent"] = primaryColor;
    style["--accent-light"] = rgba(primaryColor, 0.12);
  }

  if (accentColor) {
    style["--accent2"] = accentColor;
    style["--accent2-light"] = rgba(accentColor, 0.12);
  }

  return style;
}

export function resolveBrandLogoUrl(
  branding: WorkspaceBranding | null | undefined,
  fallback: string,
) {
  return sanitizeRemoteAssetUrl(branding?.logoUrl) ?? fallback;
}

export function resolveBrandLoginBackgroundUrl(
  branding: WorkspaceBranding | null | undefined,
) {
  return sanitizeRemoteAssetUrl(branding?.loginBackgroundUrl);
}

export function resolveBrandDisplayName(
  branding: WorkspaceBranding | null | undefined,
  fallback: string,
) {
  const normalized = branding?.displayName?.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 80) : fallback;
}
