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

function WorkspacePublicGalleryImage({
  imageUrl,
  alt,
  fallbackBackground,
}: {
  imageUrl?: string | null;
  alt: string;
  fallbackBackground: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        className="wpl-gallery-tile wpl-gallery-placeholder"
        style={{ backgroundImage: fallbackBackground }}
      />
    );
  }

  return (
    <div className="wpl-gallery-tile">
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
  const contentSections = visibleSections.filter((sectionKey) => sectionKey !== "hero");
  const primaryHref = renderActionHref(draft.ctaPrimaryUrl, portalUrl);
  const secondaryHref = supportEmail
    ? `mailto:${supportEmail}`
    : renderActionHref(draft.ctaSecondaryUrl, portalUrl);
  const heroMediaUrl = galleryImages[0] ?? logoUrl ?? null;
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
      value: String(galleryImages.length || 0).padStart(2, "0"),
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

  function renderSection(sectionKey: LandingBuilderSectionKey) {
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
          topline: workspaceType === "estate" ? "Properties" : "Portfolio",
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
                const thumb = galleryImages[idx % Math.max(galleryImages.length, 1)] ?? null;
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
          topline: workspaceType === "estate" ? "Exco" : "Team",
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
            workspaceType === "estate"
              ? "Use the approved estate contact channels below for enquiries, notices, and support."
              : "Use the approved public contact channels below for leasing, portfolio, and support enquiries.",
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

  return (
    <>
      {!previewMode ? (
        <PageMeta
          title={`${displayName} — ${workspaceType === "estate" ? "Estate" : "Property"}`}
          description={draft.heroSubtitle}
        />
      ) : null}

      <div className={`wpl-root ${templateTheme.className}`} style={templateTheme.style}>
        <nav className="wpl-nav">
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
              <span>
                {workspaceType === "estate" ? "Official community page" : "Official company page"}
              </span>
            </div>
          </div>
          <Link href={primaryHref} className="wpl-button wpl-button-primary">
            {draft.ctaPrimaryLabel}
          </Link>
        </nav>

        <header
          className={`wpl-hero${heroMediaUrl ? " has-media" : ""}`}
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
                <strong>
                  {workspaceType === "estate"
                    ? "Branded estate home"
                    : "Branded public profile"}
                </strong>
              </div>
            </div>
            <div className="wpl-hero-stack">
              <div className="wpl-hero-card">
                <div className="wpl-section-topline">
                  {workspaceType === "estate" ? "Community profile" : "Workspace profile"}
                </div>
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
          {contentSections.map((sectionKey) => renderSection(sectionKey))}
        </main>

        <footer className="wpl-footer">
          <span>{displayName}</span>
          <span>Powered by DoorRent</span>
        </footer>
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
          gap: 14px;
          margin-top: 20px;
        }
        .wpl-gallery-tile {
          aspect-ratio: 1 / 1;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid var(--wpl-border);
          box-shadow: 0 12px 28px rgba(18, 22, 16, 0.08);
        }
        .wpl-section-gallery.wpl-layout-full .wpl-gallery-grid {
          grid-template-columns: minmax(0, 1.35fr) repeat(2, minmax(0, 0.8fr));
        }
        .wpl-section-gallery.wpl-layout-full .wpl-gallery-tile:first-child {
          grid-row: span 2;
          aspect-ratio: auto;
          min-height: 320px;
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
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
          grid-template-columns: 1fr;
          max-width: 860px;
          margin-left: auto;
          margin-right: auto;
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
          grid-template-columns: minmax(0, 1.6fr) repeat(2, minmax(0, 0.7fr));
          gap: 16px;
        }
        .theme-property-portfolio .wpl-section-gallery.wpl-layout-full .wpl-gallery-grid {
          grid-template-columns: minmax(0, 1.6fr) repeat(2, minmax(0, 0.7fr));
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

        @media (max-width: 920px) {
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
        }
        @media (max-width: 720px) {
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
          .wpl-section-gallery.wpl-layout-full .wpl-gallery-tile:first-child {
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
        }
      `}</style>
    </>
  );
}
