import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import PageMeta from "../layout/PageMeta";
import type { PublicWorkspaceContext } from "../../lib/workspace-context";
import {
  getDefaultLandingBuilderSectionLayout,
  getLandingBuilderTemplate,
  mergeLandingBuilderDraft,
  type LandingBuilderDraft,
  type LandingBuilderSectionKey,
  type LandingBuilderTemplateId,
  type LandingBuilderWorkspace,
} from "../../lib/landing-builder";
import {
  buildSafeTelephoneHref,
  sanitizeExternalRedirectUrl,
  sanitizeHexColor,
  sanitizeRemoteAssetUrl,
} from "../../lib/frontend-security";

export type WorkspacePublicEstateData = {
  id: string;
  name: string;
  location: string;
  description?: string | null;
  landingTemplateId?: string | null;
  landingHeroTitle?: string | null;
  landingHeroSubtitle?: string | null;
  landingPrimaryCta?: string | null;
  landingSecondaryCta?: string | null;
} | null;

interface WorkspacePublicLandingProps {
  workspace: NonNullable<PublicWorkspaceContext["workspace"]>;
  estate?: WorkspacePublicEstateData;
  portalUrl: string;
  publishedDraft?: Partial<LandingBuilderDraft> | null;
  draftOverride?: Partial<LandingBuilderDraft> | null;
  preferLocalDraft?: boolean;
  previewMode?: boolean;
}

function mapTemplateId(
  value: string | null | undefined,
): LandingBuilderTemplateId | undefined {
  if (!value) {
    return undefined;
  }

  const mapping: Record<string, LandingBuilderTemplateId> = {
    "template-estate": "estate-official",
    "template-operations": "estate-resident",
    "template-company": "property-profile",
    "estate-official": "estate-official",
    "estate-resident": "estate-resident",
    "estate-fees": "estate-fees",
    "estate-exco": "estate-exco",
    "property-profile": "property-profile",
    "property-leasing": "property-leasing",
    "property-portfolio": "property-portfolio",
    "property-corporate": "property-corporate",
  };

  return mapping[value] ?? undefined;
}

function resolveWorkspaceType(
  workspaceMode: NonNullable<PublicWorkspaceContext["workspace"]>["workspaceMode"],
): LandingBuilderWorkspace {
  return workspaceMode === "ESTATE_ADMIN" ? "estate" : "property";
}

function renderActionHref(value: string, fallback: string) {
  if (!value.trim()) {
    return fallback;
  }

  if (value.startsWith("/")) {
    return value;
  }

  return sanitizeExternalRedirectUrl(value) ?? fallback;
}

function renderList(items: string[]) {
  if (!items.length) {
    return null;
  }

  return (
    <ul className="wpl-list">
      {items.slice(0, 6).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function splitLandingItem(item: string) {
  const separatorIndex = item.indexOf(" — ");

  if (separatorIndex === -1) {
    return {
      title: item,
      detail: "",
    };
  }

  return {
    title: item.slice(0, separatorIndex),
    detail: item.slice(separatorIndex + 3),
  };
}

function getSectionAnchorId(sectionKey: LandingBuilderSectionKey) {
  return `section-${sectionKey}`;
}

function getEstateSectionLabel(sectionKey: LandingBuilderSectionKey) {
  switch (sectionKey) {
    case "about":
      return "About us";
    case "features":
      return "Get started";
    case "listings":
      return "Our estates";
    case "team":
      return "Leadership";
    case "fees":
      return "Dues";
    case "notices":
      return "Notices";
    case "faq":
      return "FAQs";
    case "gallery":
      return "Gallery";
    case "contact":
      return "Contact us";
    case "cta":
      return "Get in touch";
    default:
      return "Overview";
  }
}

function getPropertySectionLabel(sectionKey: LandingBuilderSectionKey) {
  switch (sectionKey) {
    case "about":
      return "About";
    case "features":
      return "Services";
    case "listings":
      return "Listings";
    case "team":
      return "Team";
    case "fees":
      return "Pricing";
    case "notices":
      return "Updates";
    case "faq":
      return "FAQs";
    case "gallery":
      return "Gallery";
    case "contact":
      return "Contact";
    case "cta":
      return "Enquire";
    default:
      return "Overview";
  }
}

function WorkspacePublicGalleryImage({
  imageUrl,
  alt,
  fallbackBackground,
  className = "wpl-gallery-tile",
}: {
  imageUrl?: string | null;
  alt: string;
  fallbackBackground: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        className={`${className} wpl-gallery-placeholder`}
        style={{ backgroundImage: fallbackBackground }}
      />
    );
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        className="wpl-gallery-image"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function getSharedGalleryTileClassName(index: number, total: number) {
  const classes = ["wpl-gallery-tile"];

  if (total >= 4 && index === 0) {
    classes.push("wpl-gallery-tile-featured");
  } else if (total >= 6 && index % 5 === 3) {
    classes.push("wpl-gallery-tile-tall");
  }

  return classes.join(" ");
}

function getEstateGalleryTileClassName(
  index: number,
  total: number,
  layoutDirection: "rows" | "columns",
  columnCount: number,
) {
  const classes = ["wpl-estate-media-frame", "wpl-estate-gallery-grid-item"];

  if (total >= 4 && columnCount >= 2 && index === 0) {
    classes.push("is-featured");
  } else if (layoutDirection === "columns" && total >= 5 && columnCount >= 3 && index % 4 === 2) {
    classes.push("is-tall");
  } else if (layoutDirection === "rows" && total >= 6 && columnCount >= 3 && index % 5 === 3) {
    classes.push("is-wide");
  }

  return classes.join(" ");
}

function WorkspacePublicHeroMedia({
  imageUrl,
  alt,
  fallbackBackground,
  fallbackLabel,
}: {
  imageUrl?: string | null;
  alt: string;
  fallbackBackground: string;
  fallbackLabel: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div className="wpl-hero-media-frame wpl-hero-media-placeholder">
        <div className="wpl-hero-media-fallback" style={{ backgroundImage: fallbackBackground }}>
          <span>{fallbackLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wpl-hero-media-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        className="wpl-hero-media-image"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function WorkspacePublicSurfaceImage({
  imageUrl,
  alt,
  fallbackBackground,
  frameClassName,
  imageClassName,
  children,
}: {
  imageUrl?: string | null;
  alt: string;
  fallbackBackground: string;
  frameClassName: string;
  imageClassName: string;
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={frameClassName}>
      {imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt}
          className={imageClassName}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={`${imageClassName} wpl-surface-fallback`} style={{ backgroundImage: fallbackBackground }} />
      )}
      {children}
    </div>
  );
}

function getSectionBandNote(
  sectionKey: LandingBuilderSectionKey,
  workspaceType: LandingBuilderWorkspace,
) {
  switch (sectionKey) {
    case "about":
      return workspaceType === "estate"
        ? "Use this band for the estate story, standards, and governance tone."
        : "Use this band for the company story, positioning, and trust signals.";
    case "features":
      return "Highlight the approved services, amenities, or differentiators that should stand out.";
    case "listings":
      return "Feature the properties, units, or portfolio highlights visitors should notice first.";
    case "team":
      return workspaceType === "estate"
        ? "Make the exco or committee structure visible and credible."
        : "Show the people behind operations, leasing, and client support.";
    case "fees":
      return "Keep payment guidance, dues, and pricing information easy to scan.";
    case "notices":
      return "Surface current announcements, schedules, and resident-facing updates.";
    case "contact":
      return "These verified contact channels should remain consistent wherever the brand appears.";
    case "faq":
      return "Answer repeat questions with short, approved responses before enquiries arrive.";
    case "gallery":
      return "Curate the approved visual story that represents the estate or company publicly.";
    case "cta":
      return "This is the controlled action strip that directs visitors to the right next step.";
    default:
      return "";
  }
}

type LandingThemeStyle = CSSProperties & Record<string, string | number>;

function hexToRgb(value: string) {
  const normalized = value.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return null;
  }

  const parsed = Number.parseInt(expanded, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function withAlpha(value: string, alpha: number) {
  const rgb = hexToRgb(value);

  if (!rgb) {
    return `rgba(23, 25, 20, ${alpha})`;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function resolveLandingTemplateTheme(
  templateId: LandingBuilderTemplateId,
  primaryColor: string,
  accentColor: string,
): {
  className: string;
  style: LandingThemeStyle;
} {
  const themes: Record<
    LandingBuilderTemplateId,
    {
      backgroundBase: string;
      backgroundLayer: string;
      navBg: string;
      surface: string;
      bandSurface: string;
      titleFont: string;
      bodyFont: string;
      muted: string;
    }
  > = {
    "estate-official": {
      backgroundBase: "#F5F0E7",
      backgroundLayer: `radial-gradient(circle at 12% 0%, ${withAlpha(accentColor, 0.26)}, transparent 30%), radial-gradient(circle at 88% 12%, ${withAlpha(primaryColor, 0.14)}, transparent 34%)`,
      navBg: "rgba(255, 250, 242, 0.78)",
      surface: "rgba(255, 252, 247, 0.88)",
      bandSurface: `linear-gradient(135deg, rgba(255, 251, 245, 0.96), ${withAlpha(
        accentColor,
        0.12,
      )})`,
      titleFont: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#5B6157",
    },
    "estate-resident": {
      backgroundBase: "#F3F4EE",
      backgroundLayer: `radial-gradient(circle at 5% 8%, ${withAlpha(primaryColor, 0.16)}, transparent 28%), radial-gradient(circle at 92% 6%, ${withAlpha(accentColor, 0.22)}, transparent 34%)`,
      navBg: "rgba(248, 250, 245, 0.74)",
      surface: "rgba(255, 255, 255, 0.82)",
      bandSurface: `linear-gradient(135deg, rgba(255, 255, 255, 0.92), ${withAlpha(
        accentColor,
        0.16,
      )})`,
      titleFont: '"Avenir Next Condensed", "Trebuchet MS", sans-serif',
      bodyFont: '"Gill Sans", "Avenir Next", sans-serif',
      muted: "#5A6258",
    },
    "estate-fees": {
      backgroundBase: "#F6F2EA",
      backgroundLayer: `radial-gradient(circle at 18% 4%, ${withAlpha(accentColor, 0.18)}, transparent 28%), linear-gradient(180deg, rgba(255,255,255,0), ${withAlpha(primaryColor, 0.06)})`,
      navBg: "rgba(255, 252, 246, 0.82)",
      surface: "rgba(255, 255, 255, 0.9)",
      bandSurface: `linear-gradient(135deg, rgba(255, 252, 246, 0.98), ${withAlpha(
        primaryColor,
        0.1,
      )})`,
      titleFont: '"Rockwell", "Georgia", serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#5E625B",
    },
    "estate-exco": {
      backgroundBase: "#EEE8DF",
      backgroundLayer: `radial-gradient(circle at 8% 0%, ${withAlpha(primaryColor, 0.18)}, transparent 28%), radial-gradient(circle at 82% 14%, ${withAlpha(accentColor, 0.22)}, transparent 32%)`,
      navBg: "rgba(249, 244, 235, 0.76)",
      surface: "rgba(255, 252, 248, 0.84)",
      bandSurface: `linear-gradient(135deg, rgba(255, 253, 249, 0.92), ${withAlpha(
        primaryColor,
        0.14,
      )}, ${withAlpha(accentColor, 0.16)})`,
      titleFont: '"Canela", "Iowan Old Style", Georgia, serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#585E55",
    },
    "property-profile": {
      backgroundBase: "#F1EFEA",
      backgroundLayer: `radial-gradient(circle at 14% 0%, ${withAlpha(primaryColor, 0.16)}, transparent 28%), radial-gradient(circle at 92% 10%, ${withAlpha(accentColor, 0.28)}, transparent 34%)`,
      navBg: "rgba(252, 248, 242, 0.76)",
      surface: "rgba(255, 255, 255, 0.84)",
      bandSurface: `linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(
        accentColor,
        0.16,
      )})`,
      titleFont: '"Didot", "Bodoni MT", "Iowan Old Style", serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#5D615A",
    },
    "property-leasing": {
      backgroundBase: "#EEF2F3",
      backgroundLayer: `radial-gradient(circle at 10% 5%, ${withAlpha(accentColor, 0.22)}, transparent 30%), radial-gradient(circle at 90% 0%, ${withAlpha(primaryColor, 0.16)}, transparent 34%)`,
      navBg: "rgba(247, 251, 252, 0.78)",
      surface: "rgba(255, 255, 255, 0.9)",
      bandSurface: `linear-gradient(135deg, rgba(255, 255, 255, 0.94), ${withAlpha(
        primaryColor,
        0.1,
      )}, ${withAlpha(accentColor, 0.14)})`,
      titleFont: '"Avenir Next Condensed", "Trebuchet MS", sans-serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#586065",
    },
    "property-portfolio": {
      backgroundBase: "#F4F1EB",
      backgroundLayer: `radial-gradient(circle at 12% 2%, ${withAlpha(primaryColor, 0.14)}, transparent 28%), radial-gradient(circle at 90% 14%, ${withAlpha(accentColor, 0.22)}, transparent 36%)`,
      navBg: "rgba(255, 250, 245, 0.8)",
      surface: "rgba(255, 255, 255, 0.86)",
      bandSurface: `linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(
        primaryColor,
        0.12,
      )})`,
      titleFont: '"Georgia Pro", "Iowan Old Style", Georgia, serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#5B605A",
    },
    "property-corporate": {
      backgroundBase: "#EEF2F6",
      backgroundLayer: `radial-gradient(circle at 8% 4%, ${withAlpha(primaryColor, 0.18)}, transparent 28%), radial-gradient(circle at 94% 8%, ${withAlpha(accentColor, 0.18)}, transparent 30%)`,
      navBg: "rgba(247, 250, 252, 0.78)",
      surface: "rgba(255, 255, 255, 0.88)",
      bandSurface: `linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(
        primaryColor,
        0.12,
      )}, ${withAlpha(accentColor, 0.1)})`,
      titleFont: '"Avenir Next Demi Bold", "Gill Sans", sans-serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#56606B",
    },
    "estate-blank": {
      backgroundBase: "#F9F9F8",
      backgroundLayer: `radial-gradient(circle at 12% 0%, ${withAlpha(primaryColor, 0.1)}, transparent 30%)`,
      navBg: "rgba(255, 255, 255, 0.82)",
      surface: "rgba(255, 255, 255, 0.9)",
      bandSurface: `linear-gradient(135deg, rgba(255, 255, 255, 0.98), ${withAlpha(primaryColor, 0.08)})`,
      titleFont: '"Avenir Next", "Segoe UI", sans-serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#5E6560",
    },
    "property-blank": {
      backgroundBase: "#F9F9F8",
      backgroundLayer: `radial-gradient(circle at 12% 0%, ${withAlpha(primaryColor, 0.1)}, transparent 30%)`,
      navBg: "rgba(255, 255, 255, 0.82)",
      surface: "rgba(255, 255, 255, 0.9)",
      bandSurface: `linear-gradient(135deg, rgba(255, 255, 255, 0.98), ${withAlpha(primaryColor, 0.08)})`,
      titleFont: '"Avenir Next", "Segoe UI", sans-serif',
      bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
      muted: "#5E6560",
    },
  };

  const theme = themes[templateId];

  return {
    className: `theme-${templateId}`,
    style: {
      "--wpl-bg-base": theme.backgroundBase,
      "--wpl-bg-layer": theme.backgroundLayer,
      "--wpl-nav-bg": theme.navBg,
      "--wpl-nav-border": withAlpha(primaryColor, 0.12),
      "--wpl-surface": theme.surface,
      "--wpl-band-surface": theme.bandSurface,
      "--wpl-band-border": withAlpha(primaryColor, 0.14),
      "--wpl-band-glow": withAlpha(accentColor, 0.24),
      "--wpl-border": withAlpha(primaryColor, 0.11),
      "--wpl-shadow": `0 30px 70px ${withAlpha(primaryColor, 0.18)}`,
      "--wpl-card-shadow": `0 18px 46px ${withAlpha(primaryColor, 0.12)}`,
      "--wpl-hero-shadow": `0 40px 84px ${withAlpha(primaryColor, 0.24)}`,
      "--wpl-muted": theme.muted,
      "--wpl-primary": primaryColor,
      "--wpl-primary-soft": withAlpha(primaryColor, 0.14),
      "--wpl-primary-strong": withAlpha(primaryColor, 0.88),
      "--wpl-accent": accentColor,
      "--wpl-accent-soft": withAlpha(accentColor, 0.18),
      "--wpl-title-font": theme.titleFont,
      "--wpl-body-font": theme.bodyFont,
      "--wpl-button-shadow": `0 14px 34px ${withAlpha(primaryColor, 0.18)}`,
    },
  };
}

export default function WorkspacePublicLanding({
  workspace,
  estate = null,
  portalUrl,
  publishedDraft = null,
  draftOverride = null,
  preferLocalDraft = false,
  previewMode = false,
}: WorkspacePublicLandingProps) {
  const workspaceType = resolveWorkspaceType(workspace.workspaceMode);
  const profile = useMemo(
    () => ({
      companyName: estate?.name || workspace.companyName,
      workspaceMode: workspace.workspaceMode,
      workspaceSlug: workspace.workspaceSlug,
      brandDisplayName: workspace.branding.displayName,
      brandLogoUrl: workspace.branding.logoUrl,
      brandPrimaryColor: workspace.branding.primaryColor,
      brandAccentColor: workspace.branding.accentColor,
      publicSupportEmail: workspace.publicSupportEmail,
      publicSupportPhone: workspace.publicSupportPhone,
      publicLegalAddress: workspace.publicLegalAddress,
    }),
    [estate?.name, workspace],
  );
  const effectivePublishedDraft =
    draftOverride || preferLocalDraft ? null : publishedDraft;
  const estateFallbackDraft = useMemo(
    () =>
      !draftOverride && !effectivePublishedDraft
        ? {
            templateId: mapTemplateId(estate?.landingTemplateId),
            heroTitle: estate?.landingHeroTitle || undefined,
            heroSubtitle:
              estate?.landingHeroSubtitle ||
              estate?.description ||
              undefined,
            ctaPrimaryLabel: estate?.landingPrimaryCta || undefined,
            ctaSecondaryLabel: estate?.landingSecondaryCta || undefined,
          }
        : {},
    [
      draftOverride,
      effectivePublishedDraft,
      estate?.description,
      estate?.landingHeroSubtitle,
      estate?.landingHeroTitle,
      estate?.landingPrimaryCta,
      estate?.landingSecondaryCta,
      estate?.landingTemplateId,
    ],
  );

  const initialDraft = useMemo(
    () =>
      mergeLandingBuilderDraft(
        workspaceType,
        profile,
        draftOverride ?? effectivePublishedDraft ?? estateFallbackDraft,
      ),
    [
      draftOverride,
      effectivePublishedDraft,
      estateFallbackDraft,
      profile,
      workspaceType,
    ],
  );

  const [draft, setDraft] = useState<LandingBuilderDraft>(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    if (typeof window === "undefined" || !workspace.workspaceSlug) {
      return;
    }

    if (draftOverride || effectivePublishedDraft) {
      return;
    }

    const storageKey =
      workspaceType === "estate"
        ? `doorrent.landing.builder.estate.${workspace.workspaceSlug}`
        : `doorrent.landing.builder.landlord.${workspace.workspaceSlug}`;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<LandingBuilderDraft>;
      setDraft(mergeLandingBuilderDraft(workspaceType, profile, parsed));
    } catch {
      setDraft(initialDraft);
    }
  }, [
    draftOverride,
    effectivePublishedDraft,
    initialDraft,
    profile,
    workspace.workspaceSlug,
    workspaceType,
  ]);

  const displayName = draft.brandDisplayName || workspace.branding.displayName || workspace.companyName;
  const primaryColor =
    sanitizeHexColor(draft.brandPrimaryColor) ??
    sanitizeHexColor(workspace.branding.primaryColor) ??
    (workspaceType === "estate" ? "#1A5C42" : "#8A1538");
  const accentColor =
    sanitizeHexColor(draft.brandAccentColor) ??
    sanitizeHexColor(workspace.branding.accentColor) ??
    "#D2A85A";
  const heroBackground = `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`;
  const supportEmail = draft.publicSupportEmail || workspace.publicSupportEmail || "";
  const supportPhone = draft.publicSupportPhone || workspace.publicSupportPhone || "";
  const supportPhoneHref = buildSafeTelephoneHref(supportPhone);
  const supportAddress = draft.publicLegalAddress || workspace.publicLegalAddress || "";
  const logoUrl =
    sanitizeRemoteAssetUrl(draft.brandLogoUrl) ??
    sanitizeRemoteAssetUrl(workspace.branding.logoUrl);
  const galleryImages = draft.galleryImageUrls
    .map((url) => sanitizeRemoteAssetUrl(url))
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);
  const visibleSections = draft.sectionOrder.filter(
    (sectionKey) => !draft.hiddenSectionKeys.includes(sectionKey),
  );
  const gallerySectionVisible = visibleSections.includes("gallery");
  const activeMediaImages = gallerySectionVisible ? galleryImages : [];
  const contentSections = visibleSections.filter((sectionKey) => sectionKey !== "hero");
  const primaryHref = renderActionHref(draft.ctaPrimaryUrl, portalUrl);
  const secondaryHref = supportEmail
    ? `mailto:${supportEmail}`
    : renderActionHref(draft.ctaSecondaryUrl, portalUrl);
  const heroMediaUrl = activeMediaImages[0] ?? logoUrl ?? null;
  const heroHighlights = [
    draft.featuresItems[0],
    draft.noticeItems[0],
    draft.teamItems[0],
    supportAddress ? "Verified public contact desk" : null,
  ].filter((item): item is string => Boolean(item)).slice(0, 3);
  const heroStats = [
    {
      value: String(Math.max(visibleSections.filter((sectionKey) => sectionKey !== "hero").length, 1)).padStart(2, "0"),
      label: "Live sections",
    },
    {
      value: String(activeMediaImages.length || 0).padStart(2, "0"),
      label: "Gallery images",
    },
    {
      value: String(
        Math.max(
          draft.teamItems.length,
          draft.noticeItems.length,
          draft.featuresItems.length,
          1,
        ),
      ).padStart(2, "0"),
      label: workspaceType === "estate" ? "Public highlights" : "Portfolio highlights",
    },
  ];
  const isEstateWorkspace = workspaceType === "estate";
  const estateNavLinks = contentSections
    .filter((sectionKey) => sectionKey !== "cta")
    .slice(0, 5)
    .map((sectionKey) => ({
      key: sectionKey,
      href: `#${getSectionAnchorId(sectionKey)}`,
      label: getEstateSectionLabel(sectionKey),
    }));
  const estateFooterLinks = contentSections
    .filter((sectionKey) => !["contact", "cta"].includes(sectionKey))
    .slice(0, 4)
    .map((sectionKey) => ({
      key: sectionKey,
      href: `#${getSectionAnchorId(sectionKey)}`,
      label: getEstateSectionLabel(sectionKey),
    }));
  const propertyNavLinks = contentSections
    .filter((sectionKey) => !["contact", "cta"].includes(sectionKey))
    .slice(0, 4)
    .map((sectionKey) => ({
      key: sectionKey,
      href: `#${getSectionAnchorId(sectionKey)}`,
      label: getPropertySectionLabel(sectionKey),
    }));
  const propertyFooterLinks = contentSections
    .filter((sectionKey) => !["contact", "cta"].includes(sectionKey))
    .slice(0, 5)
    .map((sectionKey) => ({
      key: sectionKey,
      href: `#${getSectionAnchorId(sectionKey)}`,
      label: getPropertySectionLabel(sectionKey),
    }));
  const estateSectionMedia: Partial<Record<LandingBuilderSectionKey, string | null>> = {
    about: activeMediaImages[1] ?? activeMediaImages[0] ?? heroMediaUrl,
    features: activeMediaImages[2] ?? activeMediaImages[0] ?? heroMediaUrl,
    listings: activeMediaImages[0] ?? activeMediaImages[1] ?? heroMediaUrl,
    team: activeMediaImages[1] ?? activeMediaImages[0] ?? heroMediaUrl,
    fees: activeMediaImages[0] ?? activeMediaImages[2] ?? heroMediaUrl,
    notices: activeMediaImages[2] ?? activeMediaImages[1] ?? heroMediaUrl,
    faq: activeMediaImages[3] ?? activeMediaImages[0] ?? heroMediaUrl,
    gallery: activeMediaImages[0] ?? heroMediaUrl,
    contact: activeMediaImages[3] ?? activeMediaImages[1] ?? heroMediaUrl,
    cta: activeMediaImages[0] ?? heroMediaUrl,
  };
  const estateStatCards = (draft.feeItems.length
    ? draft.feeItems
    : [
        `Community features — ${String(Math.max(draft.featuresItems.length, 1)).padStart(2, "0")}`,
        `Public notices — ${String(Math.max(draft.noticeItems.length, 1)).padStart(2, "0")}`,
        `Leadership profiles — ${String(Math.max(draft.teamItems.length, 1)).padStart(2, "0")}`,
        `Gallery highlights — ${String(activeMediaImages.length).padStart(2, "0")}`,
      ]
  )
    .slice(0, 4)
    .map((item, index) => {
      const { title, detail } = splitLandingItem(item);
      const canPromoteDetail =
        Boolean(detail) && (/[₦$€£]/.test(detail) || /^\d/.test(detail.trim()));

      return {
        value: canPromoteDetail ? detail : String(index + 1).padStart(2, "0"),
        label: title,
        caption: detail && !canPromoteDetail ? detail : "Approved public highlight",
      };
    });
  const templateTheme = useMemo(
    () => resolveLandingTemplateTheme(draft.templateId, primaryColor, accentColor),
    [accentColor, draft.templateId, primaryColor],
  );
  const templateName =
    getLandingBuilderTemplate(draft.templateId)?.name ??
    (workspaceType === "estate" ? "Estate landing page" : "Property landing page");

  function resolveSectionLayout(sectionKey: LandingBuilderSectionKey) {
    return draft.sectionLayouts?.[sectionKey] ?? getDefaultLandingBuilderSectionLayout(sectionKey);
  }

  function renderSectionFrame({
    sectionKey,
    topline,
    title,
    body,
    className,
    children,
  }: {
    sectionKey: LandingBuilderSectionKey;
    topline: string;
    title: string;
    body?: string | null;
    className: string;
    children?: ReactNode;
  }) {
    const layout = resolveSectionLayout(sectionKey);
    const sectionClass = `wpl-section wpl-section-${sectionKey} ${className} wpl-layout-${layout}`;
    const sectionPosition = contentSections.findIndex(
      (contentSectionKey) => contentSectionKey === sectionKey,
    );
    const sectionNumber = String(
      sectionPosition >= 0 ? sectionPosition + 1 : 0,
    ).padStart(2, "0");
    const bandNote = getSectionBandNote(sectionKey, workspaceType);

    if (layout === "full") {
      return (
        <section key={sectionKey} className={sectionClass}>
          <div className="wpl-band-rail">
            <div className="wpl-section-topline">{topline}</div>
            <strong className="wpl-band-index">{sectionNumber}</strong>
            {bandNote ? <p className="wpl-band-note">{bandNote}</p> : null}
          </div>
          <div className="wpl-band-body">
            <h2>{title}</h2>
            {body ? <p>{body}</p> : null}
            {children}
          </div>
        </section>
      );
    }

    return (
      <section key={sectionKey} className={sectionClass}>
        <div className="wpl-section-topline">{topline}</div>
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
        {children}
      </section>
    );
  }

  function renderEstateSection(sectionKey: LandingBuilderSectionKey) {
    const layout = resolveSectionLayout(sectionKey);
    const sectionId = getSectionAnchorId(sectionKey);
    const sectionClass = `wpl-section wpl-section-${sectionKey} wpl-estate-section wpl-layout-${layout}`;
    const mediaUrl = estateSectionMedia[sectionKey] ?? heroMediaUrl;
    const isCompactLayout = layout === "half";

    switch (sectionKey) {
      case "about":
        if (isCompactLayout) {
          return (
            <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-compact`}>
              <div className="wpl-estate-compact-copy">
                <span className="wpl-estate-pill">Why choose us</span>
                <h2>{draft.aboutTitle}</h2>
                <p>{draft.aboutBody}</p>
              </div>
              <WorkspacePublicSurfaceImage
                imageUrl={mediaUrl}
                alt={`${displayName} overview`}
                fallbackBackground={heroBackground}
                frameClassName="wpl-estate-media-frame wpl-estate-media-compact"
                imageClassName="wpl-estate-media-image"
              />
            </section>
          );
        }

        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-centered`}>
            <div className="wpl-estate-intro">
              <span className="wpl-estate-pill">Why choose us</span>
              <h2>{draft.aboutTitle}</h2>
              <p>{draft.aboutBody}</p>
            </div>
            <WorkspacePublicSurfaceImage
              imageUrl={mediaUrl}
              alt={`${displayName} overview`}
              fallbackBackground={heroBackground}
              frameClassName="wpl-estate-media-frame wpl-estate-media-wide"
              imageClassName="wpl-estate-media-image"
            >
              <div className="wpl-estate-media-sheen" />
            </WorkspacePublicSurfaceImage>
          </section>
        );

      case "features":
        if (isCompactLayout) {
          return (
            <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-compact`}>
              <WorkspacePublicSurfaceImage
                imageUrl={mediaUrl}
                alt={`${displayName} features`}
                fallbackBackground={heroBackground}
                frameClassName="wpl-estate-media-frame wpl-estate-media-inline"
                imageClassName="wpl-estate-media-image"
              />
              <div className="wpl-estate-compact-copy">
                <span className="wpl-estate-pill">Get started</span>
                <h2>{draft.featuresTitle}</h2>
                <p>{draft.featuresBody}</p>
                <div className="wpl-estate-compact-list">
                  {draft.featuresItems.slice(0, 4).map((item, index) => {
                    const { title, detail } = splitLandingItem(item);

                    return (
                      <div key={`${item}-${index}`} className="wpl-estate-compact-list-item">
                        <span className="wpl-estate-compact-list-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <strong>{title}</strong>
                          {detail ? <p>{detail}</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-feature-section`}>
            <div className="wpl-estate-feature-copy">
              <span className="wpl-estate-pill">Get started</span>
              <h2>{draft.featuresTitle}</h2>
              <p>{draft.featuresBody}</p>
              <div className="wpl-estate-feature-grid">
                {draft.featuresItems.slice(0, 4).map((item, index) => {
                  const { title, detail } = splitLandingItem(item);

                  return (
                    <div key={`${item}-${index}`} className="wpl-estate-feature-card">
                      <span className="wpl-estate-feature-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <strong>{title}</strong>
                      {detail ? <p>{detail}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <WorkspacePublicSurfaceImage
              imageUrl={mediaUrl}
              alt={`${displayName} features`}
              fallbackBackground={heroBackground}
              frameClassName="wpl-estate-media-frame wpl-estate-media-tall"
              imageClassName="wpl-estate-media-image"
            >
              <div className="wpl-estate-media-caption-card">
                <span>{displayName}</span>
                <strong>{draft.heroEyebrow}</strong>
              </div>
            </WorkspacePublicSurfaceImage>
          </section>
        );

      case "listings":
        if (isCompactLayout) {
          return (
            <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-compact`}>
              <WorkspacePublicSurfaceImage
                imageUrl={mediaUrl}
                alt={`${displayName} listings`}
                fallbackBackground={heroBackground}
                frameClassName="wpl-estate-media-frame wpl-estate-media-inline"
                imageClassName="wpl-estate-media-image"
              />
              <div className="wpl-estate-compact-copy">
                <span className="wpl-estate-pill">Our estates</span>
                <h2>{draft.listingsTitle}</h2>
                <p>{draft.listingsBody}</p>
                <div className="wpl-estate-compact-links">
                  {draft.listingItems.slice(0, 2).map((item) => {
                    const { title, detail } = splitLandingItem(item);

                    return (
                      <div key={item} className="wpl-estate-link-item">
                        <strong>{title}</strong>
                        {detail ? <span>{detail}</span> : null}
                      </div>
                    );
                  })}
                </div>
                <Link href={primaryHref} className="wpl-estate-text-link">
                  {draft.ctaPrimaryLabel}
                </Link>
              </div>
            </section>
          );
        }

        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-split-section`}>
            <WorkspacePublicSurfaceImage
              imageUrl={mediaUrl}
              alt={`${displayName} listings`}
              fallbackBackground={heroBackground}
              frameClassName="wpl-estate-media-frame wpl-estate-media-tall"
              imageClassName="wpl-estate-media-image"
            />
            <div className="wpl-estate-split-copy">
              <span className="wpl-estate-pill">Our estates</span>
              <h2>{draft.listingsTitle}</h2>
              <p>{draft.listingsBody}</p>
              <div className="wpl-estate-link-stack">
                {draft.listingItems.slice(0, 4).map((item) => {
                  const { title, detail } = splitLandingItem(item);

                  return (
                    <div key={item} className="wpl-estate-link-item">
                      <strong>{title}</strong>
                      {detail ? <span>{detail}</span> : null}
                    </div>
                  );
                })}
              </div>
              <Link href={primaryHref} className="wpl-estate-text-link">
                {draft.ctaPrimaryLabel}
              </Link>
            </div>
          </section>
        );

      case "team": {
        const leadTeam = splitLandingItem(draft.teamItems[0] || "Leadership team");

        if (isCompactLayout) {
          return (
            <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-compact`}>
              <WorkspacePublicSurfaceImage
                imageUrl={mediaUrl}
                alt={`${displayName} leadership`}
                fallbackBackground={heroBackground}
                frameClassName="wpl-estate-media-frame wpl-estate-media-inline"
                imageClassName="wpl-estate-media-image"
              >
                <div className="wpl-estate-spotlight-caption">
                  <strong>{leadTeam.title}</strong>
                  {leadTeam.detail ? <span>{leadTeam.detail}</span> : null}
                </div>
              </WorkspacePublicSurfaceImage>
              <div className="wpl-estate-compact-copy">
                <span className="wpl-estate-pill">Leadership spotlight</span>
                <h2>{draft.teamTitle}</h2>
                <p>{draft.teamBody}</p>
                <div className="wpl-estate-compact-team-list">
                  {draft.teamItems.slice(1, 4).map((item) => {
                    const { title, detail } = splitLandingItem(item);

                    return (
                      <div key={item} className="wpl-estate-compact-team-item">
                        <strong>{title}</strong>
                        {detail ? <span>{detail}</span> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-centered`}>
            <div className="wpl-estate-intro">
              <span className="wpl-estate-pill">Leadership spotlight</span>
              <h2>{draft.teamTitle}</h2>
              <p>{draft.teamBody}</p>
            </div>
            <WorkspacePublicSurfaceImage
              imageUrl={mediaUrl}
              alt={`${displayName} leadership`}
              fallbackBackground={heroBackground}
              frameClassName="wpl-estate-media-frame wpl-estate-media-wide"
              imageClassName="wpl-estate-media-image"
            >
              <div className="wpl-estate-video-button" aria-hidden="true" />
              <div className="wpl-estate-spotlight-caption">
                <strong>{leadTeam.title}</strong>
                {leadTeam.detail ? <span>{leadTeam.detail}</span> : null}
              </div>
            </WorkspacePublicSurfaceImage>
            <div className="wpl-estate-team-row">
              {draft.teamItems.slice(0, 6).map((item) => {
                const { title, detail } = splitLandingItem(item);

                return (
                  <div key={item} className="wpl-estate-team-pill">
                    <strong>{title}</strong>
                    {detail ? <span>{detail}</span> : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      }

      case "fees":
        if (isCompactLayout) {
          return (
            <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-compact`}>
              <div className="wpl-estate-compact-copy">
                <span className="wpl-estate-pill">Estate dues</span>
                <h2>{draft.feesTitle}</h2>
                <p>{draft.feesBody}</p>
                <div className="wpl-estate-compact-stat-list">
                  {draft.feeItems.slice(0, 4).map((item, index) => {
                    const { title, detail } = splitLandingItem(item);

                    return (
                      <div key={`${item}-${index}`} className="wpl-estate-compact-stat-item">
                        <span className="wpl-estate-compact-list-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <strong>{title}</strong>
                          {detail ? <p>{detail}</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-stat-section`}>
            <WorkspacePublicSurfaceImage
              imageUrl={mediaUrl}
              alt={`${displayName} highlights`}
              fallbackBackground={heroBackground}
              frameClassName="wpl-estate-media-frame wpl-estate-stat-frame"
              imageClassName="wpl-estate-media-image"
            >
              <div className="wpl-estate-stat-overlay" />
              <div className="wpl-estate-stat-grid">
                {estateStatCards.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="wpl-estate-stat-card">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                    <small>{item.caption}</small>
                  </div>
                ))}
              </div>
            </WorkspacePublicSurfaceImage>
          </section>
        );

      case "notices":
        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-notice-section`}>
            <div className="wpl-estate-split-copy">
              <span className="wpl-estate-pill">Community updates</span>
              <h2>{draft.noticesTitle}</h2>
              <p>{draft.noticesBody}</p>
            </div>
            <div className="wpl-estate-notice-grid">
              {draft.noticeItems.slice(0, 4).map((item, index) => (
                <article key={item} className="wpl-estate-notice-card">
                  <span className="wpl-estate-notice-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>
        );

      case "faq":
        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-centered`}>
            <div className="wpl-estate-intro">
              <span className="wpl-estate-pill">Frequently asked</span>
              <h2>{draft.faqTitle}</h2>
            </div>
            <div className="wpl-estate-faq-grid">
              {draft.faqItems.slice(0, 6).map((item) => {
                const { title, detail } = splitLandingItem(item);

                return (
                  <article key={item} className="wpl-estate-faq-card">
                    <strong>{title}</strong>
                    {detail ? <p>{detail}</p> : null}
                  </article>
                );
              })}
            </div>
          </section>
        );

      case "gallery": {
        const estateGalleryImages = galleryImages.length ? galleryImages : [null, null, null];
        const galleryDir = draft.galleryLayoutDirection ?? "rows";
        const galleryCols = Math.max(1, Math.min(Number(draft.galleryColumns ?? "3"), 4));

        if (isCompactLayout) {
          return (
            <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-compact`}>
              <div className="wpl-estate-compact-copy">
                <span className="wpl-estate-pill">Visual preview</span>
                <h2>{draft.galleryTitle}</h2>
                <p>{draft.galleryBody}</p>
              </div>
              <WorkspacePublicSurfaceImage
                imageUrl={estateGalleryImages[0]}
                alt={`${displayName} gallery feature`}
                fallbackBackground={heroBackground}
                frameClassName="wpl-estate-media-frame wpl-estate-media-compact"
                imageClassName="wpl-estate-media-image"
              />
            </section>
          );
        }

        const gridStyle = {
          ["--wpl-estate-gallery-columns" as const]: String(galleryCols),
        } as React.CSSProperties;

        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-gallery-section wpl-estate-gallery-section--custom`}>
            <div className="wpl-estate-split-copy">
              <span className="wpl-estate-pill">Visual preview</span>
              <h2>{draft.galleryTitle}</h2>
              <p>{draft.galleryBody}</p>
            </div>
            <div className="wpl-estate-gallery-grid-wrap" style={gridStyle}>
              {estateGalleryImages.map((image, index) => (
                <WorkspacePublicSurfaceImage
                  key={`${image ?? "gallery"}-${index}`}
                  imageUrl={image}
                  alt={`${displayName} gallery ${index + 1}`}
                  fallbackBackground={heroBackground}
                  frameClassName={getEstateGalleryTileClassName(
                    index,
                    estateGalleryImages.length,
                    galleryDir,
                    galleryCols,
                  )}
                  imageClassName="wpl-estate-media-image"
                />
              ))}
            </div>
          </section>
        );
      }

      case "contact":
        if (isCompactLayout) {
          return (
            <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-compact`}>
              <div className="wpl-estate-compact-copy">
                <span className="wpl-estate-pill">Contact us</span>
                <h2>{draft.contactTitle}</h2>
                <p>
                  Use the approved estate contact channels below for enquiries, notices, support,
                  and resident-facing correspondence.
                </p>
              </div>
              <div className="wpl-estate-contact-grid wpl-estate-contact-grid-compact">
                {supportEmail ? (
                  <a href={`mailto:${supportEmail}`} className="wpl-estate-contact-card">
                    <strong>Email</strong>
                    <span>{supportEmail}</span>
                  </a>
                ) : null}
                {supportPhone && supportPhoneHref ? (
                  <a href={supportPhoneHref} className="wpl-estate-contact-card">
                    <strong>Phone</strong>
                    <span>{supportPhone}</span>
                  </a>
                ) : null}
                {supportAddress ? (
                  <span className="wpl-estate-contact-card">
                    <strong>Address</strong>
                    <span>{supportAddress}</span>
                  </span>
                ) : null}
              </div>
            </section>
          );
        }

        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-contact-section`}>
            <div className="wpl-estate-split-copy">
              <span className="wpl-estate-pill">Contact us</span>
              <h2>{draft.contactTitle}</h2>
              <p>
                Use the approved estate contact channels below for enquiries, notices, support,
                and resident-facing correspondence.
              </p>
            </div>
            <div className="wpl-estate-contact-grid">
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} className="wpl-estate-contact-card">
                  <strong>Email</strong>
                  <span>{supportEmail}</span>
                </a>
              ) : null}
              {supportPhone && supportPhoneHref ? (
                <a href={supportPhoneHref} className="wpl-estate-contact-card">
                  <strong>Phone</strong>
                  <span>{supportPhone}</span>
                </a>
              ) : null}
              {supportAddress ? (
                <span className="wpl-estate-contact-card">
                  <strong>Address</strong>
                  <span>{supportAddress}</span>
                </span>
              ) : null}
            </div>
          </section>
        );

      case "cta":
        if (isCompactLayout) {
          return (
            <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-section-compact wpl-estate-cta-card-compact`}>
              <div className="wpl-estate-compact-copy">
                <span className="wpl-estate-pill">Ready to continue?</span>
                <h2>Continue with the official estate channels</h2>
                <p>
                  Open the workspace portal or contact the estate team directly using the approved
                  public contact details.
                </p>
              </div>
              <div className="wpl-actions wpl-estate-actions wpl-estate-actions-compact">
                <Link href={primaryHref} className="wpl-button wpl-button-light">
                  {draft.ctaPrimaryLabel}
                </Link>
                <a href={secondaryHref} className="wpl-button wpl-button-outline">
                  {draft.ctaSecondaryLabel}
                </a>
              </div>
            </section>
          );
        }

        return (
          <section key={sectionKey} id={sectionId} className={`${sectionClass} wpl-estate-cta-section`}>
            <div className="wpl-estate-intro">
              <span className="wpl-estate-pill">Ready to continue?</span>
              <h2>Continue with the official estate channels</h2>
              <p>
                Open the workspace portal or contact the estate team directly using the approved
                public contact details.
              </p>
            </div>
            <div className="wpl-actions wpl-estate-actions">
              <Link href={primaryHref} className="wpl-button wpl-button-light">
                {draft.ctaPrimaryLabel}
              </Link>
              <a href={secondaryHref} className="wpl-button wpl-button-outline">
                {draft.ctaSecondaryLabel}
              </a>
            </div>
          </section>
        );

      default:
        return null;
    }
  }

  function renderSection(sectionKey: LandingBuilderSectionKey) {
    if (isEstateWorkspace) {
      return renderEstateSection(sectionKey);
    }

    switch (sectionKey) {
      case "about":
        return renderSectionFrame({
          sectionKey,
          topline: "About",
          title: draft.aboutTitle,
          body: draft.aboutBody,
          className: "wpl-copy-card",
        });

      case "features":
        return renderSectionFrame({
          sectionKey,
          topline: "Services",
          title: draft.featuresTitle,
          body: draft.featuresBody,
          className: "wpl-copy-card",
          children: renderList(draft.featuresItems),
        });

      case "listings":
        return renderSectionFrame({
          sectionKey,
          topline: "Portfolio",
          title: draft.listingsTitle,
          body: draft.listingsBody,
          className: "wpl-copy-card",
          children: draft.listingItems.length ? (
            <div className="wpl-listings-grid">
              {draft.listingItems.slice(0, 6).map((item, idx) => {
                const sep = item.indexOf(" — ");
                const headline = sep > -1 ? item.slice(0, sep) : item;
                const detail = sep > -1 ? item.slice(sep + 3) : "";
                const isPrice = /[₦$€£]/.test(headline) || /^\d[\d,]/.test(headline.trim());
                const thumb =
                  activeMediaImages[idx % Math.max(activeMediaImages.length, 1)] ?? null;
                return (
                  <div key={`${item}-${idx}`} className="wpl-listing-card">
                    <div className="wpl-listing-card-img" style={{ background: heroBackground }}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={headline} className="wpl-listing-img" loading="lazy" referrerPolicy="no-referrer" />
                      ) : null}
                      {isPrice ? <span className="wpl-listing-badge">{headline}</span> : null}
                    </div>
                    <div className="wpl-listing-card-body">
                      <p>{isPrice ? detail : headline}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null,
        });

      case "team":
        return renderSectionFrame({
          sectionKey,
          topline: "Team",
          title: draft.teamTitle,
          body: draft.teamBody,
          className: "wpl-copy-card",
          children: draft.teamItems.length ? (
            <div className="wpl-team-grid">
              {draft.teamItems.slice(0, 6).map((item) => {
                const sep = item.indexOf(" — ");
                const name = sep > -1 ? item.slice(0, sep) : item;
                const role = sep > -1 ? item.slice(sep + 3) : "";
                const initials = name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
                return (
                  <div key={item} className="wpl-team-card">
                    <div className="wpl-team-avatar" style={{ background: primaryColor }}>{initials}</div>
                    <strong>{name}</strong>
                    {role ? <span>{role}</span> : null}
                  </div>
                );
              })}
            </div>
          ) : null,
        });

      case "fees":
        return renderSectionFrame({
          sectionKey,
          topline: "Fees",
          title: draft.feesTitle,
          body: draft.feesBody,
          className: "wpl-copy-card",
          children: draft.feeItems.length ? (
            <div className="wpl-fees-grid">
              {draft.feeItems.slice(0, 6).map((item) => {
                const sep = item.indexOf(" — ");
                const label = sep > -1 ? item.slice(0, sep) : item;
                const amount = sep > -1 ? item.slice(sep + 3) : "";
                return (
                  <div key={item} className="wpl-fee-item">
                    {amount ? <strong>{amount}</strong> : null}
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          ) : null,
        });

      case "notices":
        return renderSectionFrame({
          sectionKey,
          topline: "Notices",
          title: draft.noticesTitle,
          body: draft.noticesBody,
          className: "wpl-notice-card",
          children: renderList(draft.noticeItems),
        });

      case "contact":
        return renderSectionFrame({
          sectionKey,
          topline: "Contact",
          title: draft.contactTitle,
          body:
            "Use the approved public contact channels below for leasing, portfolio, and support enquiries.",
          className: "wpl-copy-card",
          children: (
            <div className="wpl-contact-grid">
              {supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : null}
              {supportPhone && supportPhoneHref ? (
                <a href={supportPhoneHref}>{supportPhone}</a>
              ) : null}
              {supportAddress ? <span>{supportAddress}</span> : null}
            </div>
          ),
        });

      case "faq":
        return renderSectionFrame({
          sectionKey,
          topline: "FAQ",
          title: draft.faqTitle,
          body: null,
          className: "wpl-copy-card",
          children: draft.faqItems.length ? (
            <ul className="wpl-faq-list">
              {draft.faqItems.slice(0, 8).map((item) => {
                const sep = item.indexOf(" — ");
                const q = sep > -1 ? item.slice(0, sep) : item;
                const a = sep > -1 ? item.slice(sep + 3) : "";
                return (
                  <li key={item} className="wpl-faq-item">
                    <strong>{q}</strong>
                    {a ? <span>{a}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : null,
        });

      case "gallery":
        return renderSectionFrame({
          sectionKey,
          topline: "Gallery",
          title: draft.galleryTitle,
          body: draft.galleryBody,
          className: "wpl-copy-card",
          children: (
            <div className="wpl-gallery-grid">
              {(galleryImages.length ? galleryImages : [null, null, null]).map((image, index) => (
                <WorkspacePublicGalleryImage
                  key={`${image ?? "placeholder"}-${index}`}
                  imageUrl={image}
                  alt={`${displayName} gallery image ${index + 1}`}
                  fallbackBackground={heroBackground}
                  className={getSharedGalleryTileClassName(
                    index,
                    (galleryImages.length ? galleryImages : [null, null, null]).length,
                  )}
                />
              ))}
            </div>
          ),
        });

      case "cta":
        return renderSectionFrame({
          sectionKey,
          topline: "Next step",
          title: "Ready to continue?",
          body:
            "Open the workspace portal or contact the team directly using the approved public contact details.",
          className: "wpl-cta-card",
          children: (
            <div className="wpl-actions">
              <Link href={primaryHref} className="wpl-button wpl-button-primary">
                {draft.ctaPrimaryLabel}
              </Link>
              <a href={secondaryHref} className="wpl-button wpl-button-secondary">
                {draft.ctaSecondaryLabel}
              </a>
            </div>
          ),
        });

      default:
        return null;
    }
  }

  // ─── Puck primitive renderer (public page) ───────────────────────────────
  function renderPuckPrimitive(
    item: { type: string; props: Record<string, unknown> },
    index: number,
  ) {
    const key = (item.props.id as string | undefined) ?? `puck-${item.type}-${index}`;

    switch (item.type) {
      case "HeadingBlock": {
        const { text = "", level = "h2", align = "left" } = item.props as { text: string; level: string; align: string };
        const Tag = level as "h1" | "h2" | "h3" | "h4";
        return (
          <div key={key} className="wpl-puck-block wpl-puck-heading">
            <Tag style={{ textAlign: align as CSSProperties["textAlign"], margin: 0 }}>{text}</Tag>
          </div>
        );
      }
      case "TextBlock": {
        const { text = "", align = "left", size = "medium" } = item.props as { text: string; align: string; size: string };
        return (
          <div key={key} className={`wpl-puck-block wpl-puck-text wpl-puck-text-${size}`} style={{ textAlign: align as CSSProperties["textAlign"] }}>
            <p style={{ margin: 0 }}>{text}</p>
          </div>
        );
      }
      case "RichTextBlock": {
        const { text = "" } = item.props as { text: string };
        return (
          <div key={key} className="wpl-puck-block wpl-puck-richtext">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{text}</p>
          </div>
        );
      }
      case "ButtonBlock": {
        const { label = "Click here", url = "/", variant = "primary" } = item.props as { label: string; url: string; variant: string };
        return (
          <div key={key} className="wpl-puck-block wpl-puck-button-wrap">
            <a href={renderActionHref(url, portalUrl)} className={`wpl-button wpl-puck-btn-${variant}`}>
              {label}
            </a>
          </div>
        );
      }
      case "CardBlock": {
        const { title = "", body = "" } = item.props as { title: string; body: string };
        return (
          <div key={key} className="wpl-puck-block wpl-puck-card">
            <strong>{title}</strong>
            {body ? <p style={{ margin: "8px 0 0" }}>{body}</p> : null}
          </div>
        );
      }
      case "ImageBlock": {
        const { url = "", alt = "", caption = "" } = item.props as { url: string; alt: string; caption: string };
        const safeUrl = sanitizeRemoteAssetUrl(url);
        if (!safeUrl) return null;
        return (
          <div key={key} className="wpl-puck-block wpl-puck-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={safeUrl} alt={alt} loading="lazy" referrerPolicy="no-referrer" style={{ width: "100%", borderRadius: 12, display: "block", objectFit: "cover" }} />
            {caption ? <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--wpl-muted)", textAlign: "center" }}>{caption}</p> : null}
          </div>
        );
      }
      case "SpaceBlock": {
        const { size = "medium" } = item.props as { size: string };
        return <div key={key} className={`wpl-puck-space wpl-puck-space-${size}`} />;
      }
      default:
        return null;
    }
  }

  // Maps Puck section component names → section keys
  const PUCK_SECTION_TYPE_MAP: Record<string, LandingBuilderSectionKey> = {
    AboutSection: "about",
    FeaturesSection: "features",
    ListingsSection: "listings",
    TeamSection: "team",
    FeesSection: "fees",
    NoticesSection: "notices",
    ContactSection: "contact",
    FaqSection: "faq",
    GallerySection: "gallery",
    CtaSection: "cta",
  };

  function renderMainContent() {
    if (!draft.puckData) {
      return contentSections.map((sectionKey) => renderSection(sectionKey));
    }

    type PuckItem = { type: string; props: Record<string, unknown> };
    const content = ((draft.puckData as { content?: PuckItem[] }).content ?? []);

    return content.map((item, index) => {
      // Hero is rendered in <header>, skip here
      if (item.type === "HeroSection") return null;

      // Known section block
      const sectionKey = PUCK_SECTION_TYPE_MAP[item.type];
      if (sectionKey) {
        if ((item.props as { visibility?: string }).visibility === "hidden") return null;
        return renderSection(sectionKey);
      }

      // Primitive block
      return renderPuckPrimitive(item, index);
    });
  }

  return (
    <>
      {!previewMode ? (
        <PageMeta
          title={`${displayName} — ${workspaceType === "estate" ? "Estate" : "Property"}`}
          description={draft.heroSubtitle}
        />
      ) : null}

      <div className={`wpl-root ${templateTheme.className}`} style={templateTheme.style}>
        {isEstateWorkspace ? (
          <>
            <nav className="wpl-nav wpl-estate-nav">
              <div className="wpl-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`${displayName} logo`}
                    className="wpl-logo"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="wpl-brandmark" style={{ background: primaryColor }}>
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <strong>{displayName}</strong>
                  <span>Official community page</span>
                </div>
              </div>

              <div className="wpl-estate-nav-links">
                {estateNavLinks.map((link) => (
                  <a key={link.key} href={link.href}>
                    {link.label}
                  </a>
                ))}
              </div>
            </nav>

            <header className={`wpl-hero wpl-estate-hero${heroMediaUrl ? " has-media" : ""}`} style={{ backgroundImage: heroBackground }}>
              {heroMediaUrl ? (
                <WorkspacePublicSurfaceImage
                  imageUrl={heroMediaUrl}
                  alt={`${displayName} public preview`}
                  fallbackBackground={heroBackground}
                  frameClassName="wpl-estate-hero-backdrop"
                  imageClassName="wpl-estate-hero-backdrop-image"
                />
              ) : null}
              <div className="wpl-estate-hero-overlay" />
              <div className="wpl-estate-hero-copy">
                <span className="wpl-estate-pill wpl-estate-pill-inverse">{draft.heroEyebrow}</span>
                <h1>{draft.heroTitle}</h1>
                <p>{draft.heroSubtitle}</p>
                <div className="wpl-actions wpl-estate-actions">
                  <Link href={primaryHref} className="wpl-button wpl-button-light">
                    {draft.ctaPrimaryLabel}
                  </Link>
                  <a href={secondaryHref} className="wpl-button wpl-button-outline">
                    {draft.ctaSecondaryLabel}
                  </a>
                </div>
              </div>
            </header>

            <main className="wpl-main">
              {renderMainContent()}
            </main>

            <footer className="wpl-footer wpl-estate-footer">
              <div className="wpl-estate-footer-brand">
                <div className="wpl-brand">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={`${displayName} logo`}
                      className="wpl-logo"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="wpl-brandmark" style={{ background: primaryColor }}>
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>{displayName}</strong>
                    <span>{templateName}</span>
                  </div>
                </div>
                <p>{draft.aboutBody || draft.heroSubtitle}</p>
              </div>

              <div className="wpl-estate-footer-column">
                <strong>Quick Links</strong>
                <div className="wpl-estate-footer-links">
                  {estateFooterLinks.map((link) => (
                    <a key={link.key} href={link.href}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="wpl-estate-footer-column">
                <strong>Contact</strong>
                <div className="wpl-estate-footer-contact">
                  {supportAddress ? <span>{supportAddress}</span> : null}
                  {supportPhone ? <span>{supportPhone}</span> : null}
                  {supportEmail ? <span>{supportEmail}</span> : null}
                </div>
              </div>

              <div className="wpl-estate-footer-meta">
                <span>Copyright © {new Date().getFullYear()} {displayName}. All rights reserved.</span>
                <span>Powered by DoorRent</span>
              </div>
            </footer>
          </>
        ) : (
          <>
            <nav className="wpl-nav wpl-property-nav">
              <div className="wpl-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`${displayName} logo`}
                    className="wpl-logo"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="wpl-brandmark" style={{ background: primaryColor }}>
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <strong>{displayName}</strong>
                  <span>Official company page</span>
                </div>
              </div>

              {propertyNavLinks.length ? (
                <div className="wpl-property-nav-links">
                  {propertyNavLinks.map((link) => (
                    <a key={link.key} href={link.href}>
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}

              <div className="wpl-property-nav-actions">
                <Link href={primaryHref} className="wpl-button wpl-button-primary">
                  {draft.ctaPrimaryLabel}
                </Link>
              </div>
            </nav>

            <header
              className={`wpl-hero wpl-property-hero${heroMediaUrl ? " has-media" : ""}`}
              style={{ backgroundImage: heroBackground }}
            >
              <div className="wpl-hero-copy">
                <div className="wpl-eyebrow">{draft.heroEyebrow}</div>
                <h1>{draft.heroTitle}</h1>
                <p>{draft.heroSubtitle}</p>
                <div className="wpl-actions">
                  <Link href={primaryHref} className="wpl-button wpl-button-light">
                    {draft.ctaPrimaryLabel}
                  </Link>
                  <a href={secondaryHref} className="wpl-button wpl-button-outline">
                    {draft.ctaSecondaryLabel}
                  </a>
                </div>
                {heroHighlights.length ? (
                  <div className="wpl-highlight-row">
                    {heroHighlights.map((item) => (
                      <span key={item} className="wpl-highlight-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="wpl-hero-stage">
                <div className="wpl-hero-media-shell">
                  <WorkspacePublicHeroMedia
                    imageUrl={heroMediaUrl}
                    alt={`${displayName} public preview`}
                    fallbackBackground={heroBackground}
                    fallbackLabel={displayName.slice(0, 2).toUpperCase()}
                  />
                  <div className="wpl-hero-media-caption">
                    <span>{templateName}</span>
                    <strong>Branded public profile</strong>
                  </div>
                </div>
                <div className="wpl-hero-stack">
                  <div className="wpl-hero-card">
                    <div className="wpl-section-topline">Workspace profile</div>
                    <h3>{estate?.name || workspace.companyName}</h3>
                    {estate?.location ? <p>{estate.location}</p> : null}
                    {supportEmail ? <span>{supportEmail}</span> : null}
                    {supportPhone ? <span>{supportPhone}</span> : null}
                  </div>
                  <div className="wpl-hero-metrics">
                    {heroStats.map((stat) => (
                      <div key={stat.label} className="wpl-hero-metric">
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </header>

            <main className="wpl-main">
              {renderMainContent()}
            </main>

            <footer className="wpl-footer wpl-property-footer">
              <div className="wpl-property-footer-brand">
                <div className="wpl-brand">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={`${displayName} logo`}
                      className="wpl-logo"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="wpl-brandmark" style={{ background: primaryColor }}>
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>{displayName}</strong>
                    <span>{templateName}</span>
                  </div>
                </div>
                <p>{draft.aboutBody || draft.heroSubtitle}</p>
              </div>

              <div className="wpl-property-footer-column">
                <strong>Explore</strong>
                <div className="wpl-property-footer-links">
                  {propertyFooterLinks.map((link) => (
                    <a key={link.key} href={link.href}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="wpl-property-footer-column">
                <strong>Contact</strong>
                <div className="wpl-property-footer-contact">
                  {supportAddress ? <span>{supportAddress}</span> : null}
                  {supportPhone ? <span>{supportPhone}</span> : null}
                  {supportEmail ? <span>{supportEmail}</span> : null}
                </div>
              </div>

              <div className="wpl-property-footer-meta">
                <span>Copyright © {new Date().getFullYear()} {displayName}. All rights reserved.</span>
                <span>Powered by DoorRent</span>
              </div>
            </footer>
          </>
        )}
      </div>

      <style jsx>{`
        /* ─── BASE ─── */
        .wpl-root {
          min-height: 100vh;
          padding: 18px 0 14px;
          background: var(--wpl-bg-layer), var(--wpl-bg-base);
          color: #171914;
          font-family: var(--wpl-body-font);
          -webkit-font-smoothing: antialiased;
        }
        .wpl-nav,
        .wpl-main,
        .wpl-footer {
          width: min(1320px, calc(100% - 36px));
          margin: 0 auto;
        }
        .wpl-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 22px;
          border-radius: 28px;
          border: 1px solid var(--wpl-nav-border);
          background: var(--wpl-nav-bg);
          box-shadow: 0 18px 42px rgba(18, 22, 16, 0.08);
          backdrop-filter: blur(16px);
        }
        .wpl-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .wpl-brand strong,
        .wpl-brand span {
          display: block;
        }
        .wpl-brand strong {
          font-family: var(--wpl-title-font);
          font-size: 21px;
          line-height: 1.05;
        }
        .wpl-brand span {
          font-size: 12px;
          color: var(--wpl-muted);
        }
        .wpl-logo,
        .wpl-brandmark {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          object-fit: cover;
          flex-shrink: 0;
          box-shadow: 0 10px 26px rgba(18, 22, 16, 0.12);
        }
        .wpl-brandmark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
        }
        .wpl-hero {
          position: relative;
          width: min(1360px, calc(100% - 20px));
          margin: 18px auto 34px;
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
          gap: 26px;
          padding: clamp(34px, 5vw, 68px);
          border-radius: 44px;
          color: #fff;
          box-shadow: var(--wpl-hero-shadow);
          background-size: 100% 100%;
          overflow: hidden;
        }
        .wpl-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.26), transparent 28%),
            radial-gradient(circle at 0% 100%, rgba(255, 255, 255, 0.14), transparent 34%),
            linear-gradient(140deg, rgba(11, 15, 12, 0.2), rgba(11, 15, 12, 0.04));
          pointer-events: none;
        }
        .wpl-hero::after {
          content: "";
          position: absolute;
          inset: auto -6% -32% 52%;
          height: 260px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.18));
          opacity: 0.8;
          transform: rotate(-9deg);
          pointer-events: none;
        }
        .wpl-hero-copy,
        .wpl-hero-stage {
          position: relative;
          z-index: 1;
        }
        .wpl-eyebrow,
        .wpl-section-topline {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .wpl-eyebrow {
          margin-bottom: 12px;
          opacity: 0.72;
        }
        .wpl-hero h1 {
          margin: 0 0 14px;
          max-width: 12ch;
          font-family: var(--wpl-title-font);
          font-size: clamp(42px, 6vw, 74px);
          line-height: 0.92;
          letter-spacing: -0.03em;
        }
        .wpl-hero p {
          margin: 0 0 20px;
          max-width: 680px;
          font-size: clamp(16px, 2vw, 21px);
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.84);
        }
        .wpl-highlight-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }
        .wpl-highlight-pill {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: rgba(255, 255, 255, 0.92);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .wpl-hero-stage {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
          align-self: stretch;
        }
        .wpl-hero-media-shell {
          position: relative;
          padding: 14px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(16px);
          box-shadow: 0 22px 46px rgba(12, 14, 13, 0.14);
        }
        .wpl-hero-media-shell::before {
          content: "";
          position: absolute;
          inset: 18px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          pointer-events: none;
        }
        .wpl-hero-media-frame {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1.2 / 1;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.14);
        }
        .wpl-hero-media-image,
        .wpl-hero-media-fallback {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        .wpl-hero-media-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background-size: cover;
          background-position: center;
        }
        .wpl-hero-media-fallback span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 86px;
          height: 86px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.86);
          color: var(--wpl-primary);
          font-family: var(--wpl-title-font);
          font-size: 28px;
          font-weight: 800;
          box-shadow: 0 18px 32px rgba(15, 18, 17, 0.16);
        }
        .wpl-hero-media-caption {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 4px 0;
        }
        .wpl-hero-media-caption span,
        .wpl-hero-media-caption strong {
          display: block;
        }
        .wpl-hero-media-caption span {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72);
        }
        .wpl-hero-media-caption strong {
          text-align: right;
          font-size: 14px;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.92);
        }
        .wpl-hero-stack {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 14px;
        }
        .wpl-hero-card {
          padding: 22px;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 18px 36px rgba(15, 18, 17, 0.12);
        }
        .wpl-hero-card h3 {
          margin: 10px 0 10px;
          font-family: var(--wpl-title-font);
          font-size: 28px;
          line-height: 1;
        }
        .wpl-hero-card p,
        .wpl-hero-card span {
          margin: 0 0 4px;
          display: block;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }
        .wpl-hero-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .wpl-hero-metric {
          padding: 16px 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(12px);
        }
        .wpl-hero-metric strong,
        .wpl-hero-metric span {
          display: block;
        }
        .wpl-hero-metric strong {
          font-size: 24px;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .wpl-hero-metric span {
          margin-top: 8px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.76);
        }
        .wpl-main {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 26px;
          padding-bottom: 34px;
        }
        .wpl-section {
          grid-column: span 1;
          position: relative;
          padding: 30px;
          border-radius: 30px;
          border: 1px solid var(--wpl-border);
          background: var(--wpl-surface);
          box-shadow: var(--wpl-card-shadow);
          overflow: hidden;
        }
        .wpl-section::before {
          content: "";
          position: absolute;
          inset: auto -10% -24% auto;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle, var(--wpl-band-glow), transparent 74%);
          opacity: 0.42;
          pointer-events: none;
        }
        .wpl-section.wpl-layout-full {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: minmax(180px, 230px) minmax(0, 1fr);
          gap: 20px 40px;
          align-items: start;
          min-height: clamp(260px, 32vw, 360px);
          padding: clamp(34px, 4vw, 46px);
          background: var(--wpl-band-surface);
          border-color: var(--wpl-band-border);
          box-shadow: var(--wpl-shadow);
        }
        .wpl-section.wpl-layout-center {
          grid-column: 1 / -1;
          width: min(760px, 100%);
          justify-self: center;
        }
        .wpl-section.wpl-layout-half {
          grid-column: span 1;
        }
        .wpl-band-rail {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          min-height: 100%;
          padding-right: 12px;
        }
        .wpl-band-rail::after {
          content: "";
          position: absolute;
          top: 2px;
          right: 0;
          bottom: 2px;
          width: 1px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.14),
            var(--wpl-primary-soft),
            rgba(255, 255, 255, 0.05)
          );
        }
        .wpl-band-index {
          display: block;
          font-family: var(--wpl-title-font);
          font-size: clamp(48px, 7vw, 84px);
          line-height: 0.88;
          letter-spacing: -0.06em;
          color: var(--wpl-primary-strong);
        }
        .wpl-band-note {
          margin: 0;
          max-width: 17ch;
          font-size: 14px;
          line-height: 1.7;
          color: var(--wpl-muted);
        }
        .wpl-band-body {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0;
          max-width: 860px;
        }
        .wpl-copy-card h2,
        .wpl-cta-card h2,
        .wpl-notice-card h2 {
          margin: 8px 0 10px;
          font-family: var(--wpl-title-font);
          font-size: clamp(30px, 3vw, 42px);
          line-height: 0.98;
          letter-spacing: -0.03em;
        }
        .wpl-copy-card p,
        .wpl-cta-card p,
        .wpl-notice-card p {
          margin: 0;
          font-size: 17px;
          line-height: 1.74;
          color: var(--wpl-muted);
        }
        .wpl-notice-card {
          background: linear-gradient(180deg, rgba(255, 248, 233, 0.96), rgba(255, 255, 255, 0.92));
        }
        .wpl-cta-card {
          background: linear-gradient(135deg, ${withAlpha(primaryColor, 0.08)}, ${withAlpha(
            accentColor,
            0.18,
          )});
        }
        .wpl-list {
          margin: 14px 0 0;
          padding-left: 18px;
          display: grid;
          gap: 10px;
          color: #2f372f;
          line-height: 1.62;
        }
        .wpl-gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 20px;
          grid-auto-flow: dense;
          align-items: stretch;
        }
        .wpl-gallery-tile {
          aspect-ratio: 1 / 1;
          min-height: 0;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid var(--wpl-border);
          box-shadow: 0 12px 28px rgba(18, 22, 16, 0.08);
        }
        .wpl-gallery-tile-featured {
          grid-column: span 2;
          grid-row: span 2;
          aspect-ratio: auto;
          min-height: clamp(280px, 34vw, 420px);
        }
        .wpl-gallery-tile-tall {
          grid-row: span 2;
          aspect-ratio: auto;
          min-height: clamp(240px, 28vw, 340px);
        }
        .wpl-section-gallery.wpl-layout-full .wpl-gallery-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .wpl-gallery-placeholder {
          background-size: cover;
          background-position: center;
        }
        .wpl-gallery-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .wpl-contact-grid {
          display: grid;
          gap: 12px;
          margin-top: 20px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .wpl-contact-grid a,
        .wpl-contact-grid span {
          display: flex;
          align-items: center;
          min-height: 62px;
          padding: 0 18px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid var(--wpl-border);
          color: #2f372f;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
        }
        .wpl-section-contact.wpl-layout-full .wpl-contact-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .wpl-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 24px;
        }
        .wpl-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 20px;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
        }
        .wpl-button:hover {
          transform: translateY(-1px);
          opacity: 0.94;
        }
        .wpl-button-primary {
          background: ${primaryColor};
          color: #fff;
          box-shadow: var(--wpl-button-shadow);
        }
        .wpl-button-light {
          background: #fff;
          color: ${primaryColor};
          box-shadow: 0 14px 34px rgba(18, 22, 16, 0.14);
        }
        .wpl-button-outline,
        .wpl-button-secondary {
          border: 1.5px solid rgba(255, 255, 255, 0.34);
          color: #fff;
          background: rgba(255, 255, 255, 0.12);
        }
        .wpl-button-secondary {
          border-color: var(--wpl-border);
          background: rgba(255, 255, 255, 0.82);
          color: #171914;
          box-shadow: 0 10px 26px rgba(18, 22, 16, 0.08);
        }
        .wpl-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 28px;
          padding: 18px 22px;
          border-radius: 26px;
          border: 1px solid var(--wpl-nav-border);
          background: rgba(255, 255, 255, 0.56);
          color: #6c7367;
          font-size: 13px;
          backdrop-filter: blur(12px);
        }
        .wpl-surface-fallback {
          background-size: cover;
          background-position: center;
        }

        /* ─── PROPERTY EXPERIENCE ─── */
        .wpl-property-nav {
          gap: 20px;
        }
        .wpl-property-nav-links {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .wpl-property-nav-links a {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid var(--wpl-border);
          background: rgba(255, 255, 255, 0.64);
          color: #171914;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .wpl-property-nav-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .wpl-property-hero .wpl-hero-copy {
          max-width: 640px;
        }
        .wpl-property-hero .wpl-hero-stage {
          align-self: end;
        }
        .wpl-property-footer {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) repeat(2, minmax(220px, 0.8fr));
          gap: 30px 34px;
          padding: clamp(30px, 4vw, 42px);
          background: rgba(255, 255, 255, 0.62);
        }
        .wpl-property-footer .wpl-brand strong,
        .wpl-property-footer .wpl-brand span,
        .wpl-property-footer-column strong,
        .wpl-property-footer-links a,
        .wpl-property-footer-contact span,
        .wpl-property-footer-brand p,
        .wpl-property-footer-meta span {
          display: block;
        }
        .wpl-property-footer .wpl-brand span,
        .wpl-property-footer-brand p,
        .wpl-property-footer-links a,
        .wpl-property-footer-contact span,
        .wpl-property-footer-meta span {
          color: #5f655e;
        }
        .wpl-property-footer-brand p {
          margin: 16px 0 0;
          max-width: 36ch;
          font-size: 15px;
          line-height: 1.76;
        }
        .wpl-property-footer-column strong {
          margin-bottom: 16px;
          font-family: var(--wpl-title-font);
          font-size: 17px;
          color: #171914;
        }
        .wpl-property-footer-links,
        .wpl-property-footer-contact {
          display: grid;
          gap: 12px;
        }
        .wpl-property-footer-links a {
          text-decoration: none;
        }
        .wpl-property-footer-meta {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 22px;
          border-top: 1px solid var(--wpl-border);
        }

        /* ─── ESTATE EXPERIENCE ─── */
        .wpl-estate-nav {
          gap: 22px;
          background: linear-gradient(135deg, ${withAlpha(primaryColor, 0.92)}, ${withAlpha(
            primaryColor,
            0.78,
          )});
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 24px 56px ${withAlpha(primaryColor, 0.18)};
        }
        .wpl-estate-nav .wpl-brand strong {
          color: #fff;
        }
        .wpl-estate-nav .wpl-brand span {
          color: rgba(255, 255, 255, 0.72);
        }
        .wpl-estate-nav .wpl-logo,
        .wpl-estate-nav .wpl-brandmark {
          box-shadow: none;
          border: 1px solid rgba(255, 255, 255, 0.16);
        }
        .wpl-estate-nav-links {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .wpl-estate-nav-links a {
          display: inline-flex;
          align-items: center;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .wpl-estate-hero {
          grid-template-columns: 1fr;
          justify-items: center;
          min-height: clamp(520px, 72vh, 760px);
          padding: clamp(38px, 5vw, 72px);
          text-align: center;
          isolation: isolate;
        }
        .wpl-estate-hero::before,
        .wpl-estate-hero::after {
          display: none;
        }
        .wpl-estate-hero-backdrop,
        .wpl-estate-hero-overlay {
          position: absolute;
          inset: 0;
          border-radius: inherit;
        }
        .wpl-estate-hero-backdrop {
          overflow: hidden;
          opacity: 0.24;
        }
        .wpl-estate-hero-backdrop-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .wpl-estate-hero-overlay {
          background:
            linear-gradient(180deg, ${withAlpha(primaryColor, 0.34)}, ${withAlpha(
              primaryColor,
              0.58,
            )}),
            linear-gradient(135deg, rgba(18, 16, 34, 0.14), rgba(18, 16, 34, 0.2)),
            radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.08), transparent 36%);
          z-index: 0;
        }
        .wpl-estate-hero-copy {
          position: relative;
          z-index: 1;
          max-width: 860px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .wpl-estate-hero h1 {
          max-width: none;
          margin: 0;
          font-size: clamp(48px, 6vw, 84px);
        }
        .wpl-estate-hero p {
          margin: 0;
          max-width: 720px;
          font-size: clamp(17px, 2vw, 22px);
        }
        .wpl-estate-actions {
          justify-content: center;
        }
        .wpl-estate-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid ${withAlpha(primaryColor, 0.18)};
          background: rgba(255, 255, 255, 0.72);
          color: ${primaryColor};
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .wpl-estate-pill-inverse {
          border-color: rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.92);
        }
        .wpl-estate-section {
          overflow: hidden;
        }
        .wpl-estate-section::before {
          opacity: 0.26;
        }
        .wpl-estate-section.wpl-layout-full {
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.92fr);
          gap: 34px;
          align-items: center;
          min-height: 0;
          padding: clamp(34px, 4vw, 54px);
        }
        .wpl-estate-section.wpl-layout-center {
          width: min(1080px, 100%);
          grid-template-columns: 1fr;
          justify-self: center;
          padding: clamp(34px, 4vw, 54px);
        }
        .wpl-estate-section.wpl-layout-half {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .wpl-estate-section-compact {
          padding: 26px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 16px 40px rgba(18, 22, 16, 0.08);
        }
        .wpl-estate-section-compact .wpl-estate-pill {
          align-self: flex-start;
        }
        .wpl-estate-compact-copy {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .wpl-estate-section-compact .wpl-estate-compact-copy h2 {
          margin: 0;
          font-family: var(--wpl-title-font);
          font-size: clamp(28px, 3vw, 38px);
          line-height: 1.06;
          letter-spacing: -0.03em;
          color: #171914;
        }
        .wpl-estate-section-compact .wpl-estate-compact-copy p {
          margin: 0;
          font-size: 15px;
          line-height: 1.72;
          color: var(--wpl-muted);
        }
        .wpl-estate-section-centered {
          grid-template-columns: 1fr;
        }
        .wpl-estate-intro,
        .wpl-estate-feature-copy,
        .wpl-estate-split-copy {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .wpl-estate-section-centered .wpl-estate-intro {
          max-width: 760px;
          margin: 0 auto;
          align-items: center;
          text-align: center;
        }
        .wpl-estate-intro h2,
        .wpl-estate-feature-copy h2,
        .wpl-estate-split-copy h2 {
          margin: 0;
          font-family: var(--wpl-title-font);
          font-size: clamp(34px, 4vw, 58px);
          line-height: 1.02;
          letter-spacing: -0.04em;
          color: #171914;
        }
        .wpl-estate-intro p,
        .wpl-estate-feature-copy p,
        .wpl-estate-split-copy p {
          margin: 0;
          font-size: 18px;
          line-height: 1.74;
          color: var(--wpl-muted);
        }
        .wpl-estate-media-frame {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          border: 1px solid var(--wpl-border);
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 26px 60px rgba(18, 22, 16, 0.1);
        }
        .wpl-estate-media-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .wpl-estate-media-wide {
          min-height: clamp(320px, 46vw, 520px);
        }
        .wpl-estate-media-tall {
          min-height: clamp(300px, 38vw, 470px);
        }
        .wpl-estate-media-compact {
          min-height: 260px;
        }
        .wpl-estate-media-inline {
          min-height: 220px;
        }
        .wpl-estate-media-sheen {
          position: absolute;
          inset: auto -12% -22% auto;
          width: 240px;
          height: 240px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.26));
          transform: rotate(-18deg);
          pointer-events: none;
        }
        .wpl-estate-media-caption-card {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 22px;
          padding: 16px 18px;
          border-radius: 20px;
          background: rgba(19, 20, 34, 0.48);
          color: #fff;
          backdrop-filter: blur(12px);
        }
        .wpl-estate-media-caption-card span,
        .wpl-estate-media-caption-card strong,
        .wpl-estate-spotlight-caption strong,
        .wpl-estate-spotlight-caption span {
          display: block;
        }
        .wpl-estate-media-caption-card span,
        .wpl-estate-spotlight-caption span {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.78);
        }
        .wpl-estate-media-caption-card strong,
        .wpl-estate-spotlight-caption strong {
          margin-top: 6px;
          font-size: 18px;
          line-height: 1.2;
        }
        .wpl-estate-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 12px;
        }
        .wpl-estate-feature-card {
          padding: 24px 22px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(250, 247, 255, 0.96), rgba(255, 255, 255, 0.9));
          border: 1px solid ${withAlpha(primaryColor, 0.1)};
          box-shadow: 0 14px 34px rgba(18, 22, 16, 0.06);
        }
        .wpl-estate-feature-index,
        .wpl-estate-notice-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          height: 42px;
          border-radius: 14px;
          background: ${withAlpha(primaryColor, 0.1)};
          color: ${primaryColor};
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
        }
        .wpl-estate-feature-card strong,
        .wpl-estate-link-item strong,
        .wpl-estate-team-pill strong,
        .wpl-estate-contact-card strong,
        .wpl-estate-faq-card strong {
          display: block;
          font-family: var(--wpl-title-font);
          font-size: 22px;
          line-height: 1.12;
          color: #1b1f19;
        }
        .wpl-estate-feature-card p,
        .wpl-estate-link-item span,
        .wpl-estate-team-pill span,
        .wpl-estate-contact-card span,
        .wpl-estate-faq-card p,
        .wpl-estate-notice-card p {
          margin: 10px 0 0;
          font-size: 15px;
          line-height: 1.68;
          color: var(--wpl-muted);
        }
        .wpl-estate-split-section {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(accentColor, 0.12)});
        }
        .wpl-estate-link-stack {
          display: grid;
          gap: 14px;
          margin-top: 10px;
        }
        .wpl-estate-compact-links {
          display: grid;
          gap: 10px;
          margin-top: 4px;
        }
        .wpl-estate-link-item {
          padding: 0 0 16px;
          border-bottom: 1px solid ${withAlpha(primaryColor, 0.12)};
        }
        .wpl-estate-text-link {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          margin-top: 8px;
          color: ${primaryColor};
          text-decoration: none;
          font-size: 15px;
          font-weight: 700;
        }
        .wpl-estate-compact-list,
        .wpl-estate-compact-stat-list,
        .wpl-estate-compact-team-list {
          display: grid;
          gap: 12px;
          margin-top: 6px;
        }
        .wpl-estate-compact-list-item,
        .wpl-estate-compact-stat-item,
        .wpl-estate-compact-team-item {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 14px 0 0;
          border-top: 1px solid ${withAlpha(primaryColor, 0.12)};
        }
        .wpl-estate-compact-team-item {
          grid-template-columns: 1fr;
          gap: 6px;
          padding-top: 12px;
        }
        .wpl-estate-compact-list-item strong,
        .wpl-estate-compact-stat-item strong,
        .wpl-estate-compact-team-item strong {
          display: block;
          font-size: 16px;
          line-height: 1.32;
          color: #171914;
        }
        .wpl-estate-compact-list-item p,
        .wpl-estate-compact-stat-item p,
        .wpl-estate-compact-team-item span {
          margin: 4px 0 0;
          font-size: 14px;
          line-height: 1.62;
          color: var(--wpl-muted);
        }
        .wpl-estate-compact-list-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 34px;
          border-radius: 10px;
          background: ${withAlpha(primaryColor, 0.1)};
          color: ${primaryColor};
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .wpl-estate-video-button {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 92px;
          height: 92px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 20px 42px rgba(15, 17, 24, 0.16);
          transform: translate(-50%, -50%);
        }
        .wpl-estate-video-button::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-42%, -50%);
          border-top: 14px solid transparent;
          border-bottom: 14px solid transparent;
          border-left: 22px solid ${primaryColor};
        }
        .wpl-estate-spotlight-caption {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 22px;
          padding: 18px 20px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(21, 22, 34, 0.18), rgba(21, 22, 34, 0.6));
          color: #fff;
        }
        .wpl-estate-team-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
        }
        .wpl-estate-team-pill {
          padding: 20px 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid var(--wpl-border);
          text-align: center;
        }
        .wpl-estate-stat-section {
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
        }
        .wpl-estate-stat-section::before {
          display: none;
        }
        .wpl-estate-stat-frame {
          min-height: 280px;
          border-radius: 0;
          border: 0;
          box-shadow: none;
        }
        .wpl-estate-stat-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(0deg, rgba(49, 24, 96, 0.78), rgba(49, 24, 96, 0.68)),
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08), transparent 40%);
        }
        .wpl-estate-stat-grid {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 22px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        .wpl-estate-stat-card {
          padding: 18px 16px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #fff;
          text-align: center;
          backdrop-filter: blur(14px);
        }
        .wpl-estate-stat-card strong,
        .wpl-estate-stat-card span,
        .wpl-estate-stat-card small {
          display: block;
        }
        .wpl-estate-stat-card strong {
          font-family: var(--wpl-title-font);
          font-size: clamp(28px, 3vw, 48px);
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .wpl-estate-stat-card span {
          margin-top: 10px;
          font-size: 15px;
          font-weight: 700;
        }
        .wpl-estate-stat-card small {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.76);
        }
        .wpl-estate-notice-section {
          grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
        }
        .wpl-estate-notice-grid,
        .wpl-estate-faq-grid,
        .wpl-estate-contact-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .wpl-estate-notice-card,
        .wpl-estate-faq-card,
        .wpl-estate-contact-card {
          padding: 22px 20px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid var(--wpl-border);
          text-decoration: none;
        }
        .wpl-estate-gallery-section {
          grid-template-columns: minmax(0, 0.74fr) minmax(0, 1.26fr);
          align-items: stretch;
        }
        .wpl-estate-gallery-section--custom {
          align-items: start;
        }
        .wpl-estate-gallery-mosaic {
          display: grid;
          grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
          gap: 16px;
          min-height: clamp(340px, 40vw, 520px);
        }
        .wpl-estate-gallery-primary {
          min-height: clamp(340px, 40vw, 520px);
        }
        .wpl-estate-gallery-column {
          display: grid;
          gap: 16px;
          grid-template-rows: 1fr 1fr;
        }
        .wpl-estate-gallery-secondary {
          min-height: 160px;
        }
        .wpl-estate-gallery-grid-wrap {
          align-self: start;
          display: grid;
          grid-template-columns: repeat(var(--wpl-estate-gallery-columns, 3), minmax(0, 1fr));
          gap: 16px;
          grid-auto-flow: dense;
          align-items: stretch;
        }
        .wpl-estate-gallery-grid-item {
          aspect-ratio: 4 / 3;
          min-height: 220px;
        }
        .wpl-estate-gallery-grid-item.is-featured {
          grid-column: span 2;
          grid-row: span 2;
          aspect-ratio: auto;
          min-height: clamp(300px, 36vw, 460px);
        }
        .wpl-estate-gallery-grid-item.is-tall {
          grid-row: span 2;
          aspect-ratio: auto;
          min-height: clamp(260px, 28vw, 360px);
        }
        .wpl-estate-gallery-grid-item.is-wide {
          grid-column: span 2;
          aspect-ratio: auto;
          min-height: clamp(220px, 24vw, 300px);
        }
        .wpl-estate-contact-section {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(primaryColor, 0.08)}, ${withAlpha(accentColor, 0.12)});
        }
        .wpl-estate-contact-card {
          display: block;
        }
        .wpl-estate-contact-grid-compact {
          grid-template-columns: 1fr;
        }
        .wpl-estate-cta-section {
          grid-column: 1 / -1;
          grid-template-columns: 1fr;
          justify-items: center;
          text-align: center;
          background: linear-gradient(135deg, ${primaryColor}, ${accentColor});
          color: #fff;
          box-shadow: 0 32px 72px ${withAlpha(primaryColor, 0.22)};
        }
        .wpl-estate-cta-section .wpl-estate-intro {
          max-width: 760px;
          align-items: center;
        }
        .wpl-estate-cta-section .wpl-estate-intro h2,
        .wpl-estate-cta-section .wpl-estate-intro p {
          color: #fff;
        }
        .wpl-estate-cta-section .wpl-estate-pill {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.92);
        }
        .wpl-estate-cta-card-compact {
          background: linear-gradient(135deg, ${withAlpha(primaryColor, 0.1)}, ${withAlpha(accentColor, 0.14)});
        }
        .wpl-estate-actions-compact {
          justify-content: flex-start;
        }
        .wpl-estate-footer {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(0, 0.9fr));
          gap: 34px;
          padding: clamp(34px, 4vw, 46px);
          background: #101726;
          border: 0;
          color: rgba(255, 255, 255, 0.82);
          box-shadow: 0 24px 60px rgba(12, 16, 24, 0.2);
        }
        .wpl-estate-footer .wpl-brand strong,
        .wpl-estate-footer .wpl-brand span,
        .wpl-estate-footer-column strong,
        .wpl-estate-footer-links a,
        .wpl-estate-footer-contact span,
        .wpl-estate-footer-brand p,
        .wpl-estate-footer-meta span {
          display: block;
        }
        .wpl-estate-footer .wpl-brand span,
        .wpl-estate-footer-brand p,
        .wpl-estate-footer-links a,
        .wpl-estate-footer-contact span,
        .wpl-estate-footer-meta span {
          color: rgba(255, 255, 255, 0.72);
        }
        .wpl-estate-footer-brand p {
          margin: 16px 0 0;
          max-width: 34ch;
          font-size: 15px;
          line-height: 1.8;
        }
        .wpl-estate-footer-column strong {
          margin-bottom: 18px;
          font-family: var(--wpl-title-font);
          font-size: 18px;
          color: #fff;
        }
        .wpl-estate-footer-links,
        .wpl-estate-footer-contact {
          display: grid;
          gap: 12px;
        }
        .wpl-estate-footer-links a {
          text-decoration: none;
        }
        .wpl-estate-footer-meta {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 22px;
          margin-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }
        .theme-estate-official .wpl-band-index,
        .theme-property-profile .wpl-band-index {
          letter-spacing: -0.08em;
        }
        .theme-estate-exco .wpl-section-team.wpl-layout-full,
        .theme-property-corporate .wpl-section-team.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(
            primaryColor,
            0.16,
          )}, ${withAlpha(accentColor, 0.14)});
        }
        .theme-estate-fees .wpl-section-fees.wpl-layout-full,
        .theme-property-leasing .wpl-section-listings.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(
            accentColor,
            0.14,
          )}, ${withAlpha(primaryColor, 0.1)});
        }
        .theme-property-portfolio .wpl-section-gallery.wpl-layout-full,
        .theme-estate-resident .wpl-section-gallery.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(
            primaryColor,
            0.1,
          )}, ${withAlpha(accentColor, 0.18)});
        }
        .theme-estate-resident .wpl-hero,
        .theme-property-leasing .wpl-hero {
          border-radius: 48px;
        }
        .theme-property-profile .wpl-hero,
        .theme-property-corporate .wpl-hero {
          border-radius: 42px;
        }
        .theme-estate-official .wpl-hero,
        .theme-estate-exco .wpl-hero {
          border-radius: 42px 42px 30px 30px;
        }
        .theme-property-profile .wpl-hero h1 {
          max-width: 10ch;
        }
        .theme-property-portfolio .wpl-hero-media-shell {
          transform: rotate(-2deg);
        }
        .theme-property-corporate .wpl-section,
        .theme-estate-fees .wpl-section {
          border-radius: 24px;
        }
        /* ─── FEES GRID ─── */
        .wpl-fees-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .wpl-fee-item {
          padding: 18px 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 4px 14px rgba(18, 22, 16, 0.06);
        }
        .wpl-fee-item strong {
          display: block;
          font-family: var(--wpl-title-font);
          font-size: 26px;
          letter-spacing: -0.04em;
          color: var(--wpl-primary);
          margin-bottom: 4px;
          line-height: 1;
        }
        .wpl-fee-item span {
          font-size: 13px;
          color: var(--wpl-muted);
          line-height: 1.5;
        }

        /* ─── FAQ LIST ─── */
        .wpl-faq-list {
          margin: 14px 0 0;
          display: grid;
          gap: 10px;
          list-style: none;
          padding: 0;
        }
        .wpl-faq-item {
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 3px 10px rgba(18, 22, 16, 0.05);
        }
        .wpl-faq-item strong {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #171914;
          margin-bottom: 6px;
          line-height: 1.4;
        }
        .wpl-faq-item span {
          display: block;
          font-size: 13px;
          color: var(--wpl-muted);
          line-height: 1.62;
        }

        /* ─── TEAM GRID ─── */
        .wpl-team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .wpl-team-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 18px 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 4px 14px rgba(18, 22, 16, 0.06);
        }
        .wpl-team-avatar {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }
        .wpl-team-card strong {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #171914;
          line-height: 1.3;
        }
        .wpl-team-card span {
          display: block;
          font-size: 12px;
          color: var(--wpl-muted);
          line-height: 1.5;
        }

        /* ─── LISTINGS GRID ─── */
        .wpl-listings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
          margin-top: 18px;
        }
        .wpl-listing-card {
          border-radius: 20px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 8px 24px rgba(18, 22, 16, 0.08);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .wpl-listing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(18, 22, 16, 0.12);
        }
        .wpl-listing-card-img {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
        }
        .wpl-listing-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .wpl-listing-badge {
          position: absolute;
          bottom: 10px;
          left: 10px;
          padding: 5px 12px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.68);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.01em;
          backdrop-filter: blur(8px);
        }
        .wpl-listing-card-body {
          padding: 14px 16px;
        }
        .wpl-listing-card-body p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #2f372f;
        }

        /* ─── TEMPLATE LAYOUT OVERRIDES ─── */

        /* estate-official: 2-col grid, serif authority, gold rail */
        .theme-estate-official .wpl-section.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 251, 245, 0.98), ${withAlpha(accentColor, 0.13)});
        }

        /* estate-resident: 3-col grid, service pill cards */
        .theme-estate-resident .wpl-main {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .theme-estate-resident .wpl-section.wpl-layout-full,
        .theme-estate-resident .wpl-section.wpl-layout-center {
          grid-column: 1 / -1;
        }
        .theme-estate-resident .wpl-section {
          border-top: 3px solid var(--wpl-primary);
          border-radius: 28px 28px 20px 20px;
        }
        .theme-estate-resident .wpl-section.wpl-layout-full {
          border-top-color: var(--wpl-accent);
        }
        .theme-estate-resident .wpl-section-features .wpl-list,
        .theme-estate-resident .wpl-section-notices .wpl-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          padding-left: 0;
          list-style: none;
        }
        .theme-estate-resident .wpl-section-features .wpl-list li,
        .theme-estate-resident .wpl-section-notices .wpl-list li {
          padding: 13px 15px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid var(--wpl-border);
          font-size: 14px;
        }

        /* estate-fees: single wide column, fee-table focused */
        .theme-estate-fees .wpl-main {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .theme-estate-fees .wpl-section.wpl-layout-full {
          grid-column: auto;
          grid-template-columns: minmax(160px, 200px) minmax(0, 1fr);
        }
        .theme-estate-fees .wpl-section {
          border-radius: 22px;
          border-left: 4px solid var(--wpl-primary);
        }
        .theme-estate-fees .wpl-section-fees .wpl-fees-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        /* estate-exco: centered governance, committee cards */
        .theme-estate-exco .wpl-section.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 253, 249, 0.96), ${withAlpha(primaryColor, 0.10)}, ${withAlpha(accentColor, 0.14)});
        }
        .theme-estate-exco .wpl-section-team .wpl-team-grid {
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }
        .theme-estate-exco .wpl-section-team .wpl-team-card {
          align-items: center;
          text-align: center;
        }
        .theme-estate-exco .wpl-hero {
          border-radius: 42px 42px 30px 30px;
        }
        .theme-estate-exco .wpl-section {
          border-radius: 20px;
        }

        /* property-profile: dark authority hero, service rows */
        .theme-property-profile .wpl-hero {
          border-radius: 42px;
        }
        .theme-property-profile .wpl-section.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(accentColor, 0.12)});
        }
        .theme-property-profile .wpl-section-features .wpl-list {
          grid-template-columns: 1fr;
          padding-left: 0;
          list-style: none;
          gap: 8px;
        }
        .theme-property-profile .wpl-section-features .wpl-list li {
          padding: 14px 18px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.80);
          border-left: 3px solid var(--wpl-primary);
          border-right: 1px solid var(--wpl-border);
          border-top: 1px solid var(--wpl-border);
          border-bottom: 1px solid var(--wpl-border);
          font-size: 14px;
        }
        .theme-property-profile .wpl-hero h1 {
          max-width: 10ch;
        }

        /* property-leasing: urgency, 3-col listings */
        .theme-property-leasing .wpl-hero {
          border-radius: 48px;
        }
        .theme-property-leasing .wpl-section-listings .wpl-listings-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .theme-property-leasing .wpl-section.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(accentColor, 0.13)}, ${withAlpha(primaryColor, 0.09)});
        }

        /* property-portfolio: gallery-dominant */
        .theme-property-portfolio .wpl-hero {
          border-radius: 42px;
        }
        .theme-property-portfolio .wpl-section-gallery.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(primaryColor, 0.10)}, ${withAlpha(accentColor, 0.16)});
        }
        .theme-property-portfolio .wpl-hero-media-shell {
          transform: rotate(-2deg);
        }
        .theme-property-portfolio .wpl-gallery-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .theme-property-portfolio .wpl-section-gallery.wpl-layout-full .wpl-gallery-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .theme-property-portfolio .wpl-listings-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        /* property-corporate: enterprise clean, KPI section */
        .theme-property-corporate .wpl-hero {
          border-radius: 42px;
        }
        .theme-property-corporate .wpl-section {
          border-radius: 20px;
        }
        .theme-property-corporate .wpl-section.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(primaryColor, 0.10)}, ${withAlpha(accentColor, 0.10)});
        }
        .theme-property-corporate .wpl-section-team.wpl-layout-full {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), ${withAlpha(primaryColor, 0.16)}, ${withAlpha(accentColor, 0.12)});
        }
        .theme-property-corporate .wpl-fees-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        /* ─── STRONGER TEMPLATE DIFFERENTIATION ─── */

        .theme-estate-official .wpl-root {
          background:
            radial-gradient(circle at 0% 0%, ${withAlpha(accentColor, 0.22)}, transparent 26%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0)),
            var(--wpl-bg-layer),
            var(--wpl-bg-base);
        }
        .theme-estate-official .wpl-estate-nav {
          background: linear-gradient(135deg, rgba(18, 16, 13, 0.96), rgba(34, 27, 19, 0.88));
          border-color: ${withAlpha(accentColor, 0.32)};
        }
        .theme-estate-official .wpl-estate-nav-links a {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .theme-estate-official .wpl-estate-hero {
          justify-items: start;
          text-align: left;
          min-height: clamp(560px, 74vh, 780px);
          padding-inline: clamp(34px, 6vw, 94px);
        }
        .theme-estate-official .wpl-estate-hero-copy {
          align-items: flex-start;
          max-width: 720px;
        }
        .theme-estate-official .wpl-estate-actions {
          justify-content: flex-start;
        }
        .theme-estate-official .wpl-estate-footer {
          background: linear-gradient(180deg, #16110d, #0d1218);
        }

        .theme-estate-resident .wpl-root {
          background:
            radial-gradient(circle at 100% 0%, ${withAlpha(accentColor, 0.18)}, transparent 26%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0)),
            var(--wpl-bg-layer),
            var(--wpl-bg-base);
        }
        .theme-estate-resident .wpl-estate-nav {
          background: linear-gradient(135deg, ${withAlpha(primaryColor, 0.88)}, ${withAlpha(
            accentColor,
            0.48,
          )});
          border-radius: 38px;
        }
        .theme-estate-resident .wpl-estate-hero {
          justify-items: start;
          text-align: left;
          min-height: clamp(500px, 66vh, 680px);
        }
        .theme-estate-resident .wpl-estate-hero-copy {
          align-items: flex-start;
          max-width: 680px;
          padding: 26px 28px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(14px);
        }
        .theme-estate-resident .wpl-estate-actions {
          justify-content: flex-start;
        }
        .theme-estate-resident .wpl-estate-footer {
          background: linear-gradient(135deg, #f5f7f2, #e4ede0);
          color: #171914;
          box-shadow: 0 24px 60px rgba(45, 64, 43, 0.12);
        }
        .theme-estate-resident .wpl-estate-footer .wpl-brand strong,
        .theme-estate-resident .wpl-estate-footer .wpl-brand span,
        .theme-estate-resident .wpl-estate-footer-column strong,
        .theme-estate-resident .wpl-estate-footer-links a,
        .theme-estate-resident .wpl-estate-footer-contact span,
        .theme-estate-resident .wpl-estate-footer-brand p,
        .theme-estate-resident .wpl-estate-footer-meta span {
          color: inherit;
        }
        .theme-estate-resident .wpl-estate-footer .wpl-brand span,
        .theme-estate-resident .wpl-estate-footer-links a,
        .theme-estate-resident .wpl-estate-footer-contact span,
        .theme-estate-resident .wpl-estate-footer-brand p,
        .theme-estate-resident .wpl-estate-footer-meta span {
          color: #556055;
        }
        .theme-estate-resident .wpl-estate-footer-meta {
          border-top-color: ${withAlpha(primaryColor, 0.12)};
        }

        .theme-estate-fees .wpl-root {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0)),
            linear-gradient(${withAlpha(primaryColor, 0.06)} 1px, transparent 1px),
            linear-gradient(90deg, ${withAlpha(primaryColor, 0.06)} 1px, transparent 1px),
            var(--wpl-bg-base);
          background-size: auto, 140px 140px, 140px 140px, auto;
        }
        .theme-estate-fees .wpl-estate-nav {
          background: rgba(255, 255, 255, 0.92);
          border-color: var(--wpl-border);
          box-shadow: 0 20px 42px rgba(18, 22, 16, 0.08);
        }
        .theme-estate-fees .wpl-estate-nav .wpl-brand strong {
          color: #171914;
        }
        .theme-estate-fees .wpl-estate-nav .wpl-brand span {
          color: #5e656d;
        }
        .theme-estate-fees .wpl-estate-nav-links a {
          background: ${withAlpha(primaryColor, 0.08)};
          border-color: ${withAlpha(primaryColor, 0.12)};
          color: #171914;
          border-radius: 14px;
        }
        .theme-estate-fees .wpl-estate-hero {
          justify-items: start;
          text-align: left;
          min-height: clamp(480px, 62vh, 620px);
          border-radius: 28px;
        }
        .theme-estate-fees .wpl-estate-hero-overlay {
          background:
            linear-gradient(180deg, ${withAlpha(primaryColor, 0.18)}, ${withAlpha(primaryColor, 0.42)}),
            linear-gradient(${withAlpha("#ffffff", 0.06)} 1px, transparent 1px),
            linear-gradient(90deg, ${withAlpha("#ffffff", 0.06)} 1px, transparent 1px);
          background-size: auto, 110px 110px, 110px 110px;
        }
        .theme-estate-fees .wpl-estate-hero-copy {
          align-items: flex-start;
          max-width: 720px;
        }
        .theme-estate-fees .wpl-estate-actions {
          justify-content: flex-start;
        }
        .theme-estate-fees .wpl-estate-stat-card,
        .theme-estate-fees .wpl-fee-item {
          border-radius: 16px;
        }
        .theme-estate-fees .wpl-estate-footer {
          background: linear-gradient(180deg, #0f1720, #172335);
        }

        .theme-estate-exco .wpl-root {
          background:
            radial-gradient(circle at 50% 0%, ${withAlpha(accentColor, 0.16)}, transparent 24%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)),
            var(--wpl-bg-layer),
            var(--wpl-bg-base);
        }
        .theme-estate-exco .wpl-estate-nav {
          background: linear-gradient(135deg, ${withAlpha(primaryColor, 0.9)}, ${withAlpha(
            primaryColor,
            0.74,
          )});
          border-color: ${withAlpha(accentColor, 0.2)};
        }
        .theme-estate-exco .wpl-estate-hero {
          min-height: clamp(540px, 72vh, 740px);
          padding-inline: clamp(28px, 6vw, 86px);
        }
        .theme-estate-exco .wpl-estate-hero-copy {
          max-width: 760px;
          padding: 28px 32px;
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }
        .theme-estate-exco .wpl-estate-team-pill {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.8));
        }
        .theme-estate-exco .wpl-estate-footer {
          background: linear-gradient(180deg, #17202d, #0f141d);
        }

        .theme-property-profile .wpl-root {
          background:
            radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.18), transparent 20%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0)),
            var(--wpl-bg-layer),
            var(--wpl-bg-base);
        }
        .theme-property-profile .wpl-property-nav {
          background: linear-gradient(135deg, rgba(19, 18, 18, 0.96), rgba(34, 28, 24, 0.92));
          border-color: ${withAlpha(accentColor, 0.28)};
        }
        .theme-property-profile .wpl-property-nav .wpl-brand strong {
          color: #fff;
        }
        .theme-property-profile .wpl-property-nav .wpl-brand span {
          color: rgba(255, 255, 255, 0.66);
        }
        .theme-property-profile .wpl-property-nav-links a {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
        }
        .theme-property-profile .wpl-property-hero {
          min-height: clamp(560px, 72vh, 760px);
          border-radius: 44px 44px 28px 28px;
        }
        .theme-property-profile .wpl-property-footer {
          background: linear-gradient(180deg, #141211, #0d1319);
          border: 0;
        }
        .theme-property-profile .wpl-property-footer .wpl-brand strong,
        .theme-property-profile .wpl-property-footer .wpl-brand span,
        .theme-property-profile .wpl-property-footer-column strong,
        .theme-property-profile .wpl-property-footer-links a,
        .theme-property-profile .wpl-property-footer-contact span,
        .theme-property-profile .wpl-property-footer-brand p,
        .theme-property-profile .wpl-property-footer-meta span {
          color: inherit;
        }
        .theme-property-profile .wpl-property-footer .wpl-brand strong,
        .theme-property-profile .wpl-property-footer-column strong {
          color: #fff;
        }
        .theme-property-profile .wpl-property-footer .wpl-brand span,
        .theme-property-profile .wpl-property-footer-links a,
        .theme-property-profile .wpl-property-footer-contact span,
        .theme-property-profile .wpl-property-footer-brand p,
        .theme-property-profile .wpl-property-footer-meta span {
          color: rgba(255, 255, 255, 0.72);
        }
        .theme-property-profile .wpl-property-footer-meta {
          border-top-color: rgba(255, 255, 255, 0.1);
        }

        .theme-property-leasing .wpl-root {
          background:
            radial-gradient(circle at 100% 0%, ${withAlpha(accentColor, 0.18)}, transparent 24%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0)),
            var(--wpl-bg-layer),
            var(--wpl-bg-base);
        }
        .theme-property-leasing .wpl-property-nav {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.84), ${withAlpha(
            accentColor,
            0.18,
          )});
        }
        .theme-property-leasing .wpl-property-hero {
          border-radius: 56px 20px 56px 20px;
          min-height: clamp(560px, 72vh, 760px);
        }
        .theme-property-leasing .wpl-highlight-pill {
          background: rgba(255, 255, 255, 0.22);
          border-color: rgba(255, 255, 255, 0.22);
        }
        .theme-property-leasing .wpl-listing-card {
          border-radius: 28px 18px 28px 18px;
        }
        .theme-property-leasing .wpl-listing-card:nth-child(2n) {
          transform: translateY(12px);
        }
        .theme-property-leasing .wpl-listing-badge {
          background: rgba(255, 255, 255, 0.9);
          color: #171914;
        }
        .theme-property-leasing .wpl-property-footer {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), ${withAlpha(
            accentColor,
            0.16,
          )});
        }

        .theme-property-portfolio .wpl-root {
          background:
            radial-gradient(circle at 90% 8%, ${withAlpha(accentColor, 0.2)}, transparent 24%),
            radial-gradient(circle at 0% 30%, ${withAlpha(primaryColor, 0.12)}, transparent 20%),
            var(--wpl-bg-layer),
            var(--wpl-bg-base);
        }
        .theme-property-portfolio .wpl-property-nav {
          width: min(1220px, calc(100% - 54px));
          border-radius: 999px;
        }
        .theme-property-portfolio .wpl-property-hero {
          grid-template-columns: minmax(0, 0.92fr) minmax(380px, 1.08fr);
          min-height: clamp(600px, 76vh, 820px);
          border-radius: 50px;
        }
        .theme-property-portfolio .wpl-hero-media-shell {
          padding: 18px;
          border-radius: 40px;
          transform: rotate(-3deg);
        }
        .theme-property-portfolio .wpl-hero-stack {
          flex-direction: row;
          align-items: stretch;
        }
        .theme-property-portfolio .wpl-hero-card,
        .theme-property-portfolio .wpl-hero-metrics {
          flex: 1;
        }
        .theme-property-portfolio .wpl-gallery-tile {
          border-radius: 28px;
        }
        .theme-property-portfolio .wpl-property-footer {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(250, 248, 244, 0.92));
        }

        .theme-property-corporate .wpl-root {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0)),
            linear-gradient(${withAlpha(primaryColor, 0.06)} 1px, transparent 1px),
            linear-gradient(90deg, ${withAlpha(primaryColor, 0.06)} 1px, transparent 1px),
            var(--wpl-bg-base);
          background-size: auto, 150px 150px, 150px 150px, auto;
        }
        .theme-property-corporate .wpl-property-nav {
          border-radius: 18px;
          box-shadow: 0 14px 34px rgba(18, 22, 16, 0.06);
        }
        .theme-property-corporate .wpl-property-nav-links a,
        .theme-property-corporate .wpl-button,
        .theme-property-corporate .wpl-hero-card,
        .theme-property-corporate .wpl-hero-metric {
          border-radius: 14px;
        }
        .theme-property-corporate .wpl-property-hero {
          border-radius: 24px;
        }
        .theme-property-corporate .wpl-property-footer {
          border-radius: 18px;
          box-shadow: 0 18px 42px rgba(18, 22, 16, 0.08);
        }

        @media (max-width: 1120px) {
          .wpl-property-footer {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .wpl-estate-nav {
            flex-direction: column;
            align-items: flex-start;
          }
          .wpl-estate-nav-links {
            justify-content: flex-start;
          }
          .wpl-estate-section.wpl-layout-full,
          .wpl-estate-notice-section,
          .wpl-estate-gallery-section {
            grid-template-columns: 1fr;
          }
          .wpl-estate-team-row,
          .wpl-estate-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .wpl-estate-footer {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 920px) {
          .wpl-property-nav {
            flex-direction: column;
            align-items: flex-start;
          }
          .wpl-property-nav-links {
            justify-content: flex-start;
          }
          .wpl-property-footer-meta {
            flex-direction: column;
            align-items: flex-start;
          }
          .theme-property-portfolio .wpl-hero-stack {
            flex-direction: column;
          }
          .wpl-hero {
            grid-template-columns: 1fr;
          }
          .wpl-hero-media-caption {
            flex-direction: column;
            align-items: flex-start;
          }
          .wpl-section.wpl-layout-full {
            grid-template-columns: 1fr;
            min-height: 0;
          }
          .wpl-band-rail {
            padding-right: 0;
            padding-bottom: 14px;
          }
          .wpl-band-rail::after {
            top: auto;
            left: 0;
            right: 0;
            bottom: 0;
            width: auto;
            height: 1px;
          }
          .wpl-band-note {
            max-width: none;
          }
          .wpl-section-gallery.wpl-layout-full .wpl-gallery-grid,
          .wpl-section-contact.wpl-layout-full .wpl-contact-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .theme-estate-resident .wpl-main {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .theme-estate-fees .wpl-section.wpl-layout-full {
            grid-template-columns: 1fr;
          }
          .theme-estate-fees .wpl-section-fees .wpl-fees-grid,
          .theme-property-corporate .wpl-fees-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .theme-property-leasing .wpl-section-listings .wpl-listings-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .wpl-estate-feature-grid,
          .wpl-estate-notice-grid,
          .wpl-estate-faq-grid,
          .wpl-estate-contact-grid,
          .wpl-estate-gallery-mosaic {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .wpl-estate-gallery-primary {
            min-height: 260px;
          }
          .wpl-estate-gallery-column {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: auto;
          }
          .wpl-estate-gallery-secondary {
            min-height: 160px;
          }
          .wpl-estate-gallery-grid-wrap {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .wpl-estate-gallery-grid-item.is-featured,
          .wpl-estate-gallery-grid-item.is-tall,
          .wpl-estate-gallery-grid-item.is-wide {
            grid-column: auto;
            grid-row: auto;
            aspect-ratio: 4 / 3;
            min-height: 220px;
          }
          .wpl-estate-footer-meta {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        @media (max-width: 720px) {
          .wpl-property-nav-links {
            width: 100%;
          }
          .wpl-property-nav-links a {
            min-height: 38px;
            padding: 0 14px;
          }
          .wpl-property-footer {
            grid-template-columns: 1fr;
            padding: 28px 24px;
          }
          .wpl-nav,
          .wpl-footer {
            flex-direction: column;
            align-items: flex-start;
          }
          .wpl-hero {
            padding: 26px;
            border-radius: 28px;
          }
          .wpl-hero h1 {
            max-width: none;
            font-size: clamp(34px, 11vw, 52px);
          }
          .wpl-hero-media-shell {
            padding: 12px;
          }
          .wpl-hero-metrics {
            grid-template-columns: 1fr;
          }
          .wpl-main {
            grid-template-columns: 1fr;
          }
          .wpl-section.wpl-layout-full,
          .wpl-section.wpl-layout-center,
          .wpl-section.wpl-layout-half {
            grid-column: auto;
            width: auto;
            justify-self: stretch;
          }
          .wpl-section {
            padding: 22px;
            border-radius: 24px;
          }
          .wpl-gallery-grid {
            grid-template-columns: 1fr 1fr;
          }
          .wpl-section-gallery.wpl-layout-full .wpl-gallery-grid,
          .wpl-section-contact.wpl-layout-full .wpl-contact-grid {
            grid-template-columns: 1fr;
          }
          .wpl-gallery-tile-featured,
          .wpl-gallery-tile-tall {
            grid-column: auto;
            grid-row: auto;
            aspect-ratio: 1 / 1;
            min-height: 220px;
          }
          .wpl-contact-grid {
            grid-template-columns: 1fr;
          }
          .theme-estate-resident .wpl-main,
          .theme-estate-fees .wpl-main {
            grid-template-columns: 1fr;
          }
          .theme-estate-resident .wpl-section-features .wpl-list,
          .theme-estate-resident .wpl-section-notices .wpl-list,
          .theme-property-leasing .wpl-section-listings .wpl-listings-grid,
          .theme-property-portfolio .wpl-listings-grid,
          .theme-property-corporate .wpl-fees-grid,
          .theme-estate-fees .wpl-section-fees .wpl-fees-grid,
          .wpl-fees-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .wpl-listings-grid,
          .wpl-team-grid {
            grid-template-columns: 1fr;
          }
          .wpl-estate-hero {
            min-height: 420px;
          }
          .wpl-estate-nav-links {
            width: 100%;
            gap: 8px;
          }
          .wpl-estate-nav-links a {
            min-height: 38px;
            padding: 0 14px;
            font-size: 13px;
          }
          .wpl-estate-section,
          .wpl-estate-section.wpl-layout-full,
          .wpl-estate-section.wpl-layout-center,
          .wpl-estate-section.wpl-layout-half {
            grid-template-columns: 1fr;
            width: auto;
            justify-self: stretch;
          }
          .wpl-estate-feature-grid,
          .wpl-estate-team-row,
          .wpl-estate-stat-grid,
          .wpl-estate-notice-grid,
          .wpl-estate-faq-grid,
          .wpl-estate-contact-grid,
          .wpl-estate-gallery-column,
          .wpl-estate-gallery-grid-wrap {
            grid-template-columns: 1fr;
          }
          .wpl-estate-gallery-grid-item.is-featured,
          .wpl-estate-gallery-grid-item.is-tall,
          .wpl-estate-gallery-grid-item.is-wide {
            grid-column: auto;
            grid-row: auto;
            aspect-ratio: 4 / 3;
            min-height: 220px;
          }
          .wpl-estate-stat-grid {
            left: 18px;
            right: 18px;
            bottom: 18px;
          }
          .wpl-estate-footer {
            grid-template-columns: 1fr;
            padding: 28px 24px;
          }
        }

        /* ─── PUCK PRIMITIVE BLOCKS ─── */
        .wpl-puck-block {
          grid-column: 1 / -1;
          padding: 20px 26px;
          border-radius: 20px;
          border: 1px solid var(--wpl-border);
          background: var(--wpl-surface);
        }
        .wpl-puck-heading h1,
        .wpl-puck-heading h2,
        .wpl-puck-heading h3,
        .wpl-puck-heading h4 {
          font-family: var(--wpl-title-font);
          letter-spacing: -0.02em;
          line-height: 1.1;
          color: #171914;
        }
        .wpl-puck-text p {
          line-height: 1.74;
          color: var(--wpl-muted);
        }
        .wpl-puck-text-small p { font-size: 14px; }
        .wpl-puck-text-medium p { font-size: 17px; }
        .wpl-puck-text-large p { font-size: 21px; }
        .wpl-puck-richtext p {
          font-size: 17px;
          line-height: 1.74;
          color: var(--wpl-muted);
        }
        .wpl-puck-button-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .wpl-puck-btn-primary {
          background: var(--wpl-primary);
          color: #fff;
          box-shadow: var(--wpl-button-shadow);
        }
        .wpl-puck-btn-secondary {
          background: var(--wpl-surface);
          color: var(--wpl-primary);
          border: 1px solid var(--wpl-border);
        }
        .wpl-puck-btn-outline {
          background: transparent;
          color: var(--wpl-primary);
          border: 1.5px solid var(--wpl-primary);
        }
        .wpl-puck-card strong {
          display: block;
          font-size: 18px;
          font-family: var(--wpl-title-font);
          color: #171914;
        }
        .wpl-puck-card p {
          font-size: 15px;
          line-height: 1.7;
          color: var(--wpl-muted);
        }
        .wpl-puck-image img {
          max-height: 480px;
        }
        .wpl-puck-space-small  { height: 16px; }
        .wpl-puck-space-medium { height: 32px; }
        .wpl-puck-space-large  { height: 64px; }
        .wpl-puck-space-xlarge { height: 96px; }
      `}</style>
    </>
  );
}
