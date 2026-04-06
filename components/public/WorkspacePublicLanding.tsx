import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import PageMeta from "../layout/PageMeta";
import type { PublicWorkspaceContext } from "../../lib/workspace-context";
import {
  getDefaultLandingBuilderSectionLayout,
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
  const templateTheme = useMemo(
    () => resolveLandingTemplateTheme(draft.templateId, primaryColor, accentColor),
    [accentColor, draft.templateId, primaryColor],
  );


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

    return (
      <section key={sectionKey} className={sectionClass}>
        <div className="wpl-section-inner">
          <div className="wpl-section-topline">{topline}</div>
          <h2>{title}</h2>
          {body ? <p className="wpl-section-body">{body}</p> : null}
          {children}
        </div>
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
          className: "wpl-about-section",
        });
      case "features":
        return renderSectionFrame({
          sectionKey,
          topline: "Services & Amenities",
          title: draft.featuresTitle,
          body: draft.featuresBody,
          className: "wpl-features-section",
          children: draft.featuresItems.length ? (
            <div className="wpl-feature-grid">
              {draft.featuresItems.slice(0, 8).map((item) => (
                <div key={item} className="wpl-feature-card">
                  <span className="wpl-feature-dot" style={{ background: primaryColor }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null,
        });
      case "listings":
        return renderSectionFrame({
          sectionKey,
          topline: workspaceType === "estate" ? "Properties" : "Portfolio",
          title: draft.listingsTitle,
          body: draft.listingsBody,
          className: "wpl-listings-section",
          children: draft.listingItems.length ? (
            <div className="wpl-listing-grid">
              {draft.listingItems.slice(0, 6).map((item, idx) => {
                const sepIdx = item.indexOf(" — ");
                const headline = sepIdx > -1 ? item.slice(0, sepIdx) : item;
                const detail = sepIdx > -1 ? item.slice(sepIdx + 3) : "";
                const isPrice = /[₦$€£]/.test(headline) || /^\d/.test(headline.trim());
                const thumb = galleryImages[idx % Math.max(galleryImages.length, 1)] ?? null;
                return (
                  <div key={`${item}-${idx}`} className="wpl-listing-card">
                    <div
                      className="wpl-listing-card-img"
                      style={{
                        background: `linear-gradient(135deg, ${withAlpha(primaryColor, 0.2)}, ${withAlpha(accentColor, 0.4)})`,
                      }}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={headline}
                          className="wpl-listing-img"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : null}
                      {isPrice ? (
                        <span className="wpl-listing-price-badge">{headline}</span>
                      ) : null}
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
          topline: workspaceType === "estate" ? "Estate Committee" : "Our Team",
          title: draft.teamTitle,
          body: draft.teamBody,
          className: "wpl-team-section",
          children: draft.teamItems.length ? (
            <div className="wpl-team-grid">
              {draft.teamItems.slice(0, 6).map((item) => {
                const sepIdx = item.indexOf(" — ");
                const name = sepIdx > -1 ? item.slice(0, sepIdx) : item;
                const role = sepIdx > -1 ? item.slice(sepIdx + 3) : "";
                const initials = name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0] ?? "")
                  .join("")
                  .toUpperCase();
                return (
                  <div key={item} className="wpl-team-card">
                    <div className="wpl-team-avatar" style={{ background: primaryColor }}>
                      {initials}
                    </div>
                    <strong className="wpl-team-name">{name}</strong>
                    {role ? <span className="wpl-team-role">{role}</span> : null}
                  </div>
                );
              })}
            </div>
          ) : null,
        });
      case "fees":
        return renderSectionFrame({
          sectionKey,
          topline: "Fees & Dues",
          title: draft.feesTitle,
          body: draft.feesBody,
          className: "wpl-fees-section",
          children: draft.feeItems.length ? (
            <div className="wpl-fee-list">
              {draft.feeItems.slice(0, 8).map((item) => {
                const sepIdx = item.indexOf(" — ");
                const label = sepIdx > -1 ? item.slice(0, sepIdx) : item;
                const amount = sepIdx > -1 ? item.slice(sepIdx + 3) : "";
                return (
                  <div key={item} className="wpl-fee-row">
                    <span className="wpl-fee-label">{label}</span>
                    {amount ? <strong className="wpl-fee-amount">{amount}</strong> : null}
                  </div>
                );
              })}
            </div>
          ) : null,
        });
      case "notices":
        return renderSectionFrame({
          sectionKey,
          topline: "Notices & Updates",
          title: draft.noticesTitle,
          body: draft.noticesBody,
          className: "wpl-notices-section",
          children: draft.noticeItems.length ? (
            <div className="wpl-notice-list">
              {draft.noticeItems.slice(0, 6).map((item) => {
                const sepIdx = item.indexOf(" — ");
                const headline = sepIdx > -1 ? item.slice(0, sepIdx) : item;
                const detail = sepIdx > -1 ? item.slice(sepIdx + 3) : "";
                return (
                  <div key={item} className="wpl-notice-item">
                    <div className="wpl-notice-dot" style={{ background: accentColor }} />
                    <div className="wpl-notice-text">
                      <strong>{headline}</strong>
                      {detail ? <span>{detail}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null,
        });
      case "contact":
        return renderSectionFrame({
          sectionKey,
          topline: "Get In Touch",
          title: draft.contactTitle,
          body:
            workspaceType === "estate"
              ? "Reach the estate management team through any of these official channels."
              : "Contact us for leasing enquiries, portfolio access, or general support.",
          className: "wpl-contact-section",
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
          topline: "Frequently Asked Questions",
          title: draft.faqTitle,
          body: null,
          className: "wpl-faq-section",
          children: draft.faqItems.length ? (
            <div className="wpl-faq-list">
              {draft.faqItems.slice(0, 8).map((item) => {
                const sepIdx = item.indexOf(" — ");
                const question = sepIdx > -1 ? item.slice(0, sepIdx) : item;
                const answer = sepIdx > -1 ? item.slice(sepIdx + 3) : "";
                return (
                  <div key={item} className="wpl-faq-item">
                    <strong className="wpl-faq-q">{question}</strong>
                    {answer ? <p className="wpl-faq-a">{answer}</p> : null}
                  </div>
                );
              })}
            </div>
          ) : null,
        });
      case "gallery":
        return renderSectionFrame({
          sectionKey,
          topline: "Gallery",
          title: draft.galleryTitle,
          body: draft.galleryBody,
          className: "wpl-gallery-section",
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
          topline: "Next Step",
          title: draft.ctaPrimaryLabel,
          body: supportEmail
            ? `Reach us at ${supportEmail} or open the portal to get started.`
            : "Open the portal to get started.",
          className: "wpl-cta-section",
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
            <WorkspacePublicHeroMedia
              imageUrl={heroMediaUrl}
              alt={displayName}
              fallbackBackground={heroBackground}
              fallbackLabel={displayName.slice(0, 2).toUpperCase()}
            />
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
        .wpl-root {
          min-height: 100vh;
          background: var(--wpl-bg-layer), var(--wpl-bg-base);
          color: #171914;
          font-family: var(--wpl-body-font);
        }
        .wpl-nav,
        .wpl-footer {
          width: min(1280px, calc(100% - 40px));
          margin: 0 auto;
        }
        .wpl-section-inner {
          width: min(1160px, calc(100% - 48px));
          margin: 0 auto;
        }
        .wpl-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 20px;
          margin-top: 16px;
          border-radius: 28px;
          border: 1px solid var(--wpl-nav-border);
          background: var(--wpl-nav-bg);
          box-shadow: 0 8px 28px rgba(18, 22, 16, 0.08);
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
          font-size: 20px;
          line-height: 1.05;
        }
        .wpl-brand span {
          font-size: 12px;
          color: var(--wpl-muted);
        }
        .wpl-logo,
        .wpl-brandmark {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          object-fit: cover;
          flex-shrink: 0;
          box-shadow: 0 6px 18px rgba(18, 22, 16, 0.12);
        }
        .wpl-brandmark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 15px;
        }

        /* ─── Hero ─── */
        .wpl-hero {
          position: relative;
          width: 100%;
          margin: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 480px);
          align-items: center;
          gap: 0;
          padding: clamp(80px, 10vw, 140px) 0;
          color: #fff;
          overflow: hidden;
          background-size: cover;
          background-position: center;
        }
        .wpl-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 75% 0%, rgba(255,255,255,0.18) 0%, transparent 50%),
            linear-gradient(160deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.04) 100%);
          pointer-events: none;
        }
        .wpl-hero-copy {
          position: relative;
          z-index: 1;
          padding: 0 clamp(24px, 5vw, 80px);
          max-width: 640px;
        }
        .wpl-eyebrow {
          margin-bottom: 16px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.76;
        }
        .wpl-hero h1 {
          margin: 0 0 20px;
          font-family: var(--wpl-title-font);
          font-size: clamp(40px, 6vw, 76px);
          line-height: 0.94;
          letter-spacing: -0.03em;
        }
        .wpl-hero p {
          margin: 0 0 32px;
          font-size: clamp(17px, 2vw, 21px);
          line-height: 1.7;
          color: rgba(255,255,255,0.86);
          max-width: 520px;
        }
        .wpl-hero-stage {
          position: relative;
          z-index: 1;
          align-self: stretch;
          min-height: 420px;
        }
        .wpl-hero-media-frame {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .wpl-hero-media-frame.wpl-hero-media-placeholder {
          background: rgba(255,255,255,0.08);
        }
        .wpl-hero-media-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        .wpl-hero-media-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-size: cover;
          background-position: center;
          opacity: 0.3;
        }
        .wpl-hero-media-fallback span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 20px;
          background: rgba(255,255,255,0.9);
          color: var(--wpl-primary);
          font-family: var(--wpl-title-font);
          font-size: 26px;
          font-weight: 800;
        }
        .wpl-highlight-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }
        .wpl-highlight-pill {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.92);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        /* ─── Sections ─── */
        .wpl-main {
          padding: 0;
        }
        .wpl-section {
          padding: clamp(56px, 7vw, 96px) 0;
          border-bottom: 1px solid var(--wpl-border);
        }
        .wpl-section:nth-child(even) {
          background: rgba(255,255,255,0.44);
        }
        .wpl-section-topline {
          margin-bottom: 12px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--wpl-primary);
        }
        .wpl-section h2 {
          margin: 0 0 16px;
          font-family: var(--wpl-title-font);
          font-size: clamp(30px, 4vw, 54px);
          line-height: 0.96;
          letter-spacing: -0.03em;
          color: #171914;
        }
        .wpl-section-body {
          margin: 0 0 36px;
          max-width: 640px;
          font-size: 18px;
          line-height: 1.72;
          color: var(--wpl-muted);
        }

        /* ─── Features grid ─── */
        .wpl-feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
          margin-top: 36px;
        }
        .wpl-feature-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 22px 20px;
          border-radius: 18px;
          background: var(--wpl-surface);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 4px 16px rgba(18,22,16,0.06);
          font-size: 15px;
          font-weight: 500;
          line-height: 1.5;
          color: #2a3028;
        }
        .wpl-feature-dot {
          flex-shrink: 0;
          width: 8px;
          height: 8px;
          margin-top: 6px;
          border-radius: 50%;
        }

        /* ─── Listings grid ─── */
        .wpl-listing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          margin-top: 36px;
        }
        .wpl-listing-card {
          border-radius: 20px;
          overflow: hidden;
          background: var(--wpl-surface);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 8px 30px rgba(18,22,16,0.08);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .wpl-listing-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 48px rgba(18,22,16,0.14);
        }
        .wpl-listing-card-img {
          position: relative;
          aspect-ratio: 16 / 10;
          overflow: hidden;
        }
        .wpl-listing-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .wpl-listing-price-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(0,0,0,0.72);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.01em;
          backdrop-filter: blur(8px);
        }
        .wpl-listing-card-body {
          padding: 18px 20px;
        }
        .wpl-listing-card-body p {
          margin: 0;
          font-size: 15px;
          line-height: 1.55;
          color: #3a433a;
        }

        /* ─── Team grid ─── */
        .wpl-team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          margin-top: 36px;
        }
        .wpl-team-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 24px 22px;
          border-radius: 20px;
          background: var(--wpl-surface);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 4px 18px rgba(18,22,16,0.06);
        }
        .wpl-team-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          color: #fff;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: -0.02em;
        }
        .wpl-team-name {
          display: block;
          font-size: 17px;
          font-weight: 700;
          line-height: 1.3;
          color: #171914;
        }
        .wpl-team-role {
          display: block;
          font-size: 13px;
          line-height: 1.5;
          color: var(--wpl-muted);
        }

        /* ─── Fees list ─── */
        .wpl-fee-list {
          margin-top: 32px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--wpl-border);
          box-shadow: 0 4px 18px rgba(18,22,16,0.06);
        }
        .wpl-fee-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 24px;
          background: var(--wpl-surface);
          border-bottom: 1px solid var(--wpl-border);
        }
        .wpl-fee-row:last-child {
          border-bottom: none;
        }
        .wpl-fee-label {
          font-size: 15px;
          color: #2a3028;
        }
        .wpl-fee-amount {
          flex-shrink: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--wpl-primary);
        }

        /* ─── Notices list ─── */
        .wpl-notice-list {
          display: grid;
          gap: 14px;
          margin-top: 32px;
        }
        .wpl-notice-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 22px;
          border-radius: 18px;
          background: rgba(255,248,225,0.72);
          border: 1px solid rgba(210,168,90,0.22);
          box-shadow: 0 3px 12px rgba(18,22,16,0.05);
        }
        .wpl-notice-dot {
          flex-shrink: 0;
          width: 10px;
          height: 10px;
          margin-top: 5px;
          border-radius: 50%;
        }
        .wpl-notice-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .wpl-notice-text strong {
          font-size: 15px;
          font-weight: 700;
          color: #2a3028;
        }
        .wpl-notice-text span {
          font-size: 14px;
          line-height: 1.6;
          color: var(--wpl-muted);
        }

        /* ─── FAQ list ─── */
        .wpl-faq-list {
          display: grid;
          gap: 0;
          margin-top: 32px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--wpl-border);
        }
        .wpl-faq-item {
          padding: 24px 28px;
          border-bottom: 1px solid var(--wpl-border);
          background: var(--wpl-surface);
        }
        .wpl-faq-item:last-child {
          border-bottom: none;
        }
        .wpl-faq-q {
          display: block;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.4;
          color: #171914;
          margin-bottom: 8px;
        }
        .wpl-faq-a {
          margin: 0;
          font-size: 15px;
          line-height: 1.7;
          color: var(--wpl-muted);
        }

        /* ─── Gallery ─── */
        .wpl-gallery-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr));
          grid-template-rows: 260px 260px;
          gap: 16px;
          margin-top: 36px;
        }
        .wpl-gallery-tile {
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--wpl-border);
          box-shadow: 0 8px 24px rgba(18,22,16,0.08);
        }
        .wpl-gallery-tile:first-child {
          grid-row: span 2;
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

        /* ─── Contact ─── */
        .wpl-contact-grid {
          display: grid;
          gap: 14px;
          margin-top: 32px;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        .wpl-contact-grid a,
        .wpl-contact-grid span {
          display: flex;
          align-items: center;
          min-height: 64px;
          padding: 0 22px;
          border-radius: 18px;
          background: var(--wpl-surface);
          border: 1px solid var(--wpl-border);
          box-shadow: 0 4px 16px rgba(18,22,16,0.06);
          color: #2a3028;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          transition: box-shadow 0.15s ease;
        }
        .wpl-contact-grid a:hover {
          box-shadow: 0 8px 28px rgba(18,22,16,0.12);
        }

        /* ─── CTA section ─── */
        .wpl-cta-section {
          background: linear-gradient(135deg, ${withAlpha(primaryColor, 0.1)}, ${withAlpha(accentColor, 0.16)});
        }
        .wpl-cta-section h2 {
          font-size: clamp(28px, 4vw, 50px);
        }

        /* ─── Buttons ─── */
        .wpl-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 28px;
        }
        .wpl-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          padding: 0 26px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
        }
        .wpl-button:hover {
          transform: translateY(-2px);
          opacity: 0.92;
        }
        .wpl-button-primary {
          background: ${primaryColor};
          color: #fff;
          box-shadow: var(--wpl-button-shadow);
        }
        .wpl-button-light {
          background: #fff;
          color: ${primaryColor};
          box-shadow: 0 10px 28px rgba(18,22,16,0.14);
        }
        .wpl-button-outline {
          border: 1.5px solid rgba(255,255,255,0.38);
          color: #fff;
          background: rgba(255,255,255,0.14);
        }
        .wpl-button-secondary {
          border: 1.5px solid var(--wpl-border);
          background: rgba(255,255,255,0.88);
          color: #171914;
          box-shadow: 0 6px 20px rgba(18,22,16,0.08);
        }

        /* ─── Footer ─── */
        .wpl-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 24px 28px;
          border-top: 1px solid var(--wpl-border);
          background: rgba(255,255,255,0.6);
          color: #6c7367;
          font-size: 13px;
          backdrop-filter: blur(12px);
        }

        /* ─── Responsive ─── */
        @media (max-width: 960px) {
          .wpl-hero {
            grid-template-columns: 1fr;
          }
          .wpl-hero-stage {
            display: none;
          }
          .wpl-gallery-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
          }
          .wpl-gallery-tile:first-child {
            grid-row: auto;
          }
        }
        @media (max-width: 720px) {
          .wpl-nav,
          .wpl-footer {
            flex-direction: column;
            align-items: flex-start;
          }
          .wpl-hero {
            padding: clamp(60px, 12vw, 100px) 0;
          }
          .wpl-hero h1 {
            font-size: clamp(36px, 11vw, 54px);
          }
          .wpl-feature-grid {
            grid-template-columns: 1fr;
          }
          .wpl-listing-grid {
            grid-template-columns: 1fr;
          }
          .wpl-team-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .wpl-gallery-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
          }
          .wpl-contact-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
