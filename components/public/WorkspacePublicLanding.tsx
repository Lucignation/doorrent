import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../layout/PageMeta";
import type { PublicWorkspaceContext } from "../../lib/workspace-context";
import {
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

export default function WorkspacePublicLanding({
  workspace,
  estate = null,
  portalUrl,
  publishedDraft = null,
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

  const initialDraft = useMemo(
    () =>
      mergeLandingBuilderDraft(workspaceType, profile, {
        ...(publishedDraft ?? {}),
        templateId: mapTemplateId(estate?.landingTemplateId),
        heroTitle: estate?.landingHeroTitle || undefined,
        heroSubtitle:
          estate?.landingHeroSubtitle ||
          estate?.description ||
          undefined,
        ctaPrimaryLabel: estate?.landingPrimaryCta || undefined,
        ctaSecondaryLabel: estate?.landingSecondaryCta || undefined,
      }),
    [
      estate?.description,
      estate?.landingHeroSubtitle,
      estate?.landingHeroTitle,
      estate?.landingPrimaryCta,
      estate?.landingSecondaryCta,
      estate?.landingTemplateId,
      profile,
      publishedDraft,
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

    if (publishedDraft) {
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
  }, [initialDraft, profile, publishedDraft, workspace.workspaceSlug, workspaceType]);

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
  const visibleSections = draft.sectionOrder.filter(
    (sectionKey) => !draft.hiddenSectionKeys.includes(sectionKey),
  );
  const primaryHref = renderActionHref(draft.ctaPrimaryUrl, portalUrl);
  const secondaryHref = supportEmail
    ? `mailto:${supportEmail}`
    : renderActionHref(draft.ctaSecondaryUrl, portalUrl);

  function renderSection(sectionKey: LandingBuilderSectionKey) {
    switch (sectionKey) {
      case "about":
        return (
          <section key={sectionKey} className="wpl-section wpl-copy-card">
            <div className="wpl-section-topline">About</div>
            <h2>{draft.aboutTitle}</h2>
            <p>{draft.aboutBody}</p>
          </section>
        );
      case "features":
        return (
          <section key={sectionKey} className="wpl-section wpl-copy-card">
            <div className="wpl-section-topline">Services</div>
            <h2>{draft.featuresTitle}</h2>
            <p>{draft.featuresBody}</p>
            {renderList(draft.featuresItems)}
          </section>
        );
      case "listings":
        return (
          <section key={sectionKey} className="wpl-section wpl-copy-card">
            <div className="wpl-section-topline">Highlights</div>
            <h2>{draft.listingsTitle}</h2>
            <p>{draft.listingsBody}</p>
            {renderList(draft.listingItems)}
          </section>
        );
      case "team":
        return (
          <section key={sectionKey} className="wpl-section wpl-copy-card">
            <div className="wpl-section-topline">
              {workspaceType === "estate" ? "Exco" : "Team"}
            </div>
            <h2>{draft.teamTitle}</h2>
            <p>{draft.teamBody}</p>
            {renderList(draft.teamItems)}
          </section>
        );
      case "fees":
        return (
          <section key={sectionKey} className="wpl-section wpl-copy-card">
            <div className="wpl-section-topline">Fees</div>
            <h2>{draft.feesTitle}</h2>
            <p>{draft.feesBody}</p>
            {renderList(draft.feeItems)}
          </section>
        );
      case "notices":
        return (
          <section key={sectionKey} className="wpl-section wpl-notice-card">
            <div className="wpl-section-topline">Notices</div>
            <h2>{draft.noticesTitle}</h2>
            <p>{draft.noticesBody}</p>
            {renderList(draft.noticeItems)}
          </section>
        );
      case "contact":
        return (
          <section key={sectionKey} className="wpl-section wpl-copy-card">
            <div className="wpl-section-topline">Contact</div>
            <h2>{draft.contactTitle}</h2>
            <div className="wpl-contact-grid">
              {supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : null}
              {supportPhone && supportPhoneHref ? (
                <a href={supportPhoneHref}>{supportPhone}</a>
              ) : null}
              {supportAddress ? <span>{supportAddress}</span> : null}
            </div>
          </section>
        );
      case "faq":
        return (
          <section key={sectionKey} className="wpl-section wpl-copy-card">
            <div className="wpl-section-topline">FAQ</div>
            <h2>{draft.faqTitle}</h2>
            {renderList(draft.faqItems)}
          </section>
        );
      case "gallery": {
        const galleryImages = draft.galleryImageUrls
          .map((url) => sanitizeRemoteAssetUrl(url))
          .filter((url): url is string => Boolean(url))
          .slice(0, 3);

        return (
          <section key={sectionKey} className="wpl-section wpl-copy-card">
            <div className="wpl-section-topline">Gallery</div>
            <h2>{draft.galleryTitle}</h2>
            <p>{draft.galleryBody}</p>
            <div className="wpl-gallery-grid">
              {(galleryImages.length ? galleryImages : [heroBackground, heroBackground, heroBackground]).map(
                (image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="wpl-gallery-tile"
                    style={
                      image.startsWith("linear-gradient")
                        ? { backgroundImage: image }
                        : { backgroundImage: `url(${image})` }
                    }
                  />
                ),
              )}
            </div>
          </section>
        );
      }
      case "cta":
        return (
          <section key={sectionKey} className="wpl-section wpl-cta-card">
            <h2>Ready to continue?</h2>
            <p>
              Open the workspace portal or contact the team directly using the approved public
              contact details.
            </p>
            <div className="wpl-actions">
              <Link href={primaryHref} className="wpl-button wpl-button-primary">
                {draft.ctaPrimaryLabel}
              </Link>
              <a href={secondaryHref} className="wpl-button wpl-button-secondary">
                {draft.ctaSecondaryLabel}
              </a>
            </div>
          </section>
        );
      default:
        return null;
    }
  }

  return (
    <>
      <PageMeta
        title={`${displayName} — ${workspaceType === "estate" ? "Estate" : "Property"}`}
        description={draft.heroSubtitle}
      />

      <div className="wpl-root">
        <nav className="wpl-nav">
          <div className="wpl-brand">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${displayName} logo`} className="wpl-logo" />
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

        <header className="wpl-hero" style={{ backgroundImage: heroBackground }}>
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
          </div>

          <div className="wpl-hero-card">
            <div className="wpl-section-topline">
              {workspaceType === "estate" ? "Community profile" : "Workspace profile"}
            </div>
            <h3>{estate?.name || workspace.companyName}</h3>
            {estate?.location ? <p>{estate.location}</p> : null}
            {supportEmail ? <span>{supportEmail}</span> : null}
          </div>
        </header>

        <main className="wpl-main">
          {visibleSections
            .filter((sectionKey) => sectionKey !== "hero")
            .map((sectionKey) => renderSection(sectionKey))}
        </main>

        <footer className="wpl-footer">
          <span>{displayName}</span>
          <span>Powered by DoorRent</span>
        </footer>
      </div>

      <style jsx>{`
        .wpl-root {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, rgba(210, 168, 90, 0.1), transparent 28%),
            #f7f4ee;
          color: #171914;
        }
        .wpl-nav,
        .wpl-main,
        .wpl-footer {
          width: min(1120px, calc(100% - 32px));
          margin: 0 auto;
        }
        .wpl-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 0;
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
        .wpl-brand span {
          font-size: 12px;
          color: #5d6357;
        }
        .wpl-logo,
        .wpl-brandmark {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .wpl-brandmark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
        }
        .wpl-hero {
          width: min(1160px, calc(100% - 24px));
          margin: 0 auto 28px;
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
          gap: 18px;
          padding: clamp(28px, 5vw, 54px);
          border-radius: 28px;
          color: #fff;
          box-shadow: 0 24px 48px rgba(17, 22, 18, 0.12);
        }
        .wpl-eyebrow,
        .wpl-section-topline {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .wpl-eyebrow {
          margin-bottom: 12px;
          opacity: 0.72;
        }
        .wpl-hero h1 {
          margin: 0 0 14px;
          font-size: clamp(34px, 6vw, 62px);
          line-height: 0.98;
        }
        .wpl-hero p {
          margin: 0 0 20px;
          max-width: 720px;
          font-size: clamp(16px, 2vw, 20px);
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.84);
        }
        .wpl-hero-card {
          align-self: end;
          padding: 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .wpl-hero-card h3 {
          margin: 8px 0 8px;
          font-size: 22px;
          line-height: 1.1;
        }
        .wpl-hero-card p,
        .wpl-hero-card span {
          margin: 0;
          display: block;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }
        .wpl-main {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
          padding-bottom: 32px;
        }
        .wpl-section {
          padding: 22px;
          border-radius: 22px;
          border: 1px solid rgba(25, 30, 23, 0.08);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 14px 28px rgba(18, 22, 16, 0.05);
        }
        .wpl-copy-card h2,
        .wpl-cta-card h2 {
          margin: 8px 0 10px;
          font-size: 28px;
          line-height: 1.05;
        }
        .wpl-copy-card p,
        .wpl-cta-card p {
          margin: 0;
          font-size: 15px;
          line-height: 1.65;
          color: #565d52;
        }
        .wpl-notice-card {
          background: linear-gradient(180deg, #fff8e9, #ffffff);
        }
        .wpl-cta-card {
          background: linear-gradient(135deg, rgba(26, 92, 66, 0.08), rgba(210, 168, 90, 0.16));
        }
        .wpl-list {
          margin: 14px 0 0;
          padding-left: 18px;
          display: grid;
          gap: 8px;
          color: #333a31;
          line-height: 1.55;
        }
        .wpl-gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }
        .wpl-gallery-tile {
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          background-size: cover;
          background-position: center;
          border: 1px solid rgba(25, 30, 23, 0.08);
        }
        .wpl-contact-grid {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .wpl-contact-grid a,
        .wpl-contact-grid span {
          color: #333a31;
          text-decoration: none;
          font-size: 15px;
        }
        .wpl-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 20px;
        }
        .wpl-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .wpl-button:hover {
          transform: translateY(-1px);
          opacity: 0.94;
        }
        .wpl-button-primary {
          background: ${primaryColor};
          color: #fff;
        }
        .wpl-button-light {
          background: #fff;
          color: ${primaryColor};
        }
        .wpl-button-outline,
        .wpl-button-secondary {
          border: 1.5px solid rgba(255, 255, 255, 0.34);
          color: #fff;
          background: rgba(255, 255, 255, 0.12);
        }
        .wpl-button-secondary {
          border-color: rgba(25, 30, 23, 0.1);
          background: #fff;
          color: #171914;
        }
        .wpl-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 0 28px;
          color: #6c7367;
          font-size: 13px;
        }
        @media (max-width: 920px) {
          .wpl-hero {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .wpl-nav,
          .wpl-footer {
            flex-direction: column;
            align-items: flex-start;
          }
          .wpl-main {
            grid-template-columns: 1fr;
          }
          .wpl-gallery-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </>
  );
}
