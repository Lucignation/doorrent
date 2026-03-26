import type { CSSProperties } from "react";

export interface WorkspaceBranding {
  displayName: string;
  logoUrl?: string | null;
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
  if (!branding?.primaryColor && !branding?.accentColor) {
    return undefined;
  }

  const style: BrandCssProperties = {};

  if (branding.primaryColor) {
    style["--accent"] = branding.primaryColor;
    style["--accent-light"] = rgba(branding.primaryColor, 0.12);
  }

  if (branding.accentColor) {
    style["--accent2"] = branding.accentColor;
    style["--accent2-light"] = rgba(branding.accentColor, 0.12);
  }

  return style;
}

export function resolveBrandDisplayName(
  branding: WorkspaceBranding | null | undefined,
  fallback: string,
) {
  return branding?.displayName?.trim() || fallback;
}
