import { useEffect, useMemo, useState, type DragEvent } from "react";
import LandingTemplateThumbnail from "../estate/LandingTemplateThumbnail";
import WorkspacePublicLanding from "../public/WorkspacePublicLanding";
import {
  LANDING_BUILDER_SECTIONS,
  applyTemplateToDraft,
  createLandingBuilderDraft,
  getDefaultLandingBuilderSectionLayout,
  getLandingBuilderTemplate,
  getLandingBuilderTemplates,
  mergeLandingBuilderDraft,
  type LandingBuilderDraft,
  type LandingBuilderProfile,
  type LandingBuilderSectionLayout,
  type LandingBuilderSectionKey,
  type LandingBuilderWorkspace,
} from "../../lib/landing-builder";
import type { PublicWorkspaceContext } from "../../lib/workspace-context";
import {
  buildSafeTelephoneHref,
  sanitizeHexColor,
  sanitizeRemoteAssetUrl,
} from "../../lib/frontend-security";

interface LandingPageBuilderProps {
  workspace: LandingBuilderWorkspace;
  workspaceLabel: string;
  profile: LandingBuilderProfile;
  storageKey: string;
  publishDomain: string;
  canPublishBranding: boolean;
  enterpriseEnabled: boolean;
  publishedDraft?: Partial<LandingBuilderDraft> | null;
  onPublishBranding: (draft: LandingBuilderDraft) => Promise<void>;
}

function splitListInput(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinListInput(items: string[]) {
  return items.join("\n");
}

function sectionMeta(sectionKey: LandingBuilderSectionKey) {
  return LANDING_BUILDER_SECTIONS.find((section) => section.key === sectionKey);
}

function renderPreviewList(items: string[], tone: "dark" | "light" = "dark") {
  if (!items.length) {
    return null;
  }

  return (
    <ul className={`lpb-preview-list tone-${tone}`}>
      {items.slice(0, 4).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function LandingPageBuilder({
  workspace,
  workspaceLabel,
  profile,
  storageKey,
  publishDomain,
  canPublishBranding,
  enterpriseEnabled,
  publishedDraft = null,
  onPublishBranding,
}: LandingPageBuilderProps) {
  const templates = useMemo(
    () => getLandingBuilderTemplates(workspace),
    [workspace],
  );
  const [draft, setDraft] = useState<LandingBuilderDraft>(() =>
    createLandingBuilderDraft(workspace, profile),
  );
  const [draggingSection, setDraggingSection] =
    useState<LandingBuilderSectionKey | null>(null);
  const [dragOverSection, setDragOverSection] =
    useState<LandingBuilderSectionKey | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const baseDraft = mergeLandingBuilderDraft(workspace, profile, publishedDraft);

    if (typeof window === "undefined") {
      setDraft(baseDraft);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setDraft(baseDraft);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<LandingBuilderDraft>;
      setDraft(mergeLandingBuilderDraft(workspace, profile, parsed));
    } catch {
      setDraft(baseDraft);
    }
  }, [profile, publishedDraft, storageKey, workspace]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  const selectedTemplate =
    getLandingBuilderTemplate(draft.templateId) ?? templates[0];
  const primaryColor =
    sanitizeHexColor(draft.brandPrimaryColor) ??
    (workspace === "estate" ? "#1A5C42" : "#8A1538");
  const accentColor =
    sanitizeHexColor(draft.brandAccentColor) ?? "#D2A85A";
  const heroGradient = `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`;
  const visibleSections = draft.sectionOrder.filter(
    (key) => !draft.hiddenSectionKeys.includes(key),
  );
  const galleryImages = draft.galleryImageUrls
    .map((url) => sanitizeRemoteAssetUrl(url))
    .filter((url): url is string => Boolean(url))
    .slice(0, 3);
  const telephoneHref = buildSafeTelephoneHref(draft.publicSupportPhone);

  function updateDraft<K extends keyof LandingBuilderDraft>(
    key: K,
    value: LandingBuilderDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateTemplate(templateId: LandingBuilderDraft["templateId"]) {
    const template = getLandingBuilderTemplate(templateId);
    if (!template) {
      return;
    }

    setDraft((current) => applyTemplateToDraft(current, template));
  }

  function toggleSection(sectionKey: LandingBuilderSectionKey) {
    setDraft((current) => {
      const isHidden = current.hiddenSectionKeys.includes(sectionKey);
      return {
        ...current,
        hiddenSectionKeys: isHidden
          ? current.hiddenSectionKeys.filter((key) => key !== sectionKey)
          : [...current.hiddenSectionKeys, sectionKey],
      };
    });
  }

  function reorderSections(targetSection: LandingBuilderSectionKey) {
    if (!draggingSection || draggingSection === targetSection) {
      return;
    }

    setDraft((current) => {
      const sourceIndex = current.sectionOrder.indexOf(draggingSection);
      const targetIndex = current.sectionOrder.indexOf(targetSection);

      if (sourceIndex === -1 || targetIndex === -1) {
        return current;
      }

      const nextOrder = [...current.sectionOrder];
      nextOrder.splice(sourceIndex, 1);
      nextOrder.splice(targetIndex, 0, draggingSection);

      return {
        ...current,
        sectionOrder: nextOrder,
      };
    });
  }

  function moveSection(sectionKey: LandingBuilderSectionKey, direction: -1 | 1) {
    setDraft((current) => {
      const currentIndex = current.sectionOrder.indexOf(sectionKey);

      if (currentIndex === -1) {
        return current;
      }

      const targetIndex = currentIndex + direction;

      if (targetIndex < 0 || targetIndex >= current.sectionOrder.length) {
        return current;
      }

      const nextOrder = [...current.sectionOrder];
      nextOrder.splice(currentIndex, 1);
      nextOrder.splice(targetIndex, 0, sectionKey);

      return {
        ...current,
        sectionOrder: nextOrder,
      };
    });
  }

  function updateSectionLayout(
    sectionKey: LandingBuilderSectionKey,
    layout: LandingBuilderSectionLayout,
  ) {
    setDraft((current) => ({
      ...current,
      sectionLayouts: {
        ...current.sectionLayouts,
        [sectionKey]: layout,
      },
    }));
  }

  function getSectionLayout(sectionKey: LandingBuilderSectionKey) {
    return draft.sectionLayouts?.[sectionKey] ?? getDefaultLandingBuilderSectionLayout(sectionKey);
  }

  async function publishBranding() {
    setPublishing(true);

    try {
      await onPublishBranding(draft);
    } finally {
      setPublishing(false);
    }
  }

  function resetCurrentTemplate() {
    const template = getLandingBuilderTemplate(draft.templateId);
    if (!template) {
      return;
    }

    setDraft((current) => applyTemplateToDraft(current, template));
  }

  const previewWorkspace = useMemo<NonNullable<PublicWorkspaceContext["workspace"]>>(
    () => ({
      id: `${workspace}-preview`,
      companyName: profile.companyName,
      workspaceMode:
        workspace === "estate"
          ? "ESTATE_ADMIN"
          : profile.workspaceMode === "SOLO_LANDLORD"
            ? "SOLO_LANDLORD"
            : "PROPERTY_MANAGER_COMPANY",
      workspaceSlug: profile.workspaceSlug ?? null,
      publicSupportEmail: draft.publicSupportEmail || profile.publicSupportEmail || null,
      publicSupportPhone: draft.publicSupportPhone || profile.publicSupportPhone || null,
      publicLegalAddress: draft.publicLegalAddress || profile.publicLegalAddress || null,
      branding: {
        displayName: draft.brandDisplayName || workspaceLabel || profile.companyName,
        logoUrl: draft.brandLogoUrl || profile.brandLogoUrl || null,
        primaryColor: draft.brandPrimaryColor || profile.brandPrimaryColor || null,
        accentColor: draft.brandAccentColor || profile.brandAccentColor || null,
      },
    }),
    [draft, profile, workspace, workspaceLabel],
  );
  const previewEstate = useMemo(
    () =>
      workspace === "estate"
        ? {
            id: "preview-estate",
            name: draft.brandDisplayName || workspaceLabel || profile.companyName,
            location: draft.publicLegalAddress || publishDomain,
            description: draft.aboutBody,
          }
        : null,
    [draft.aboutBody, draft.brandDisplayName, draft.publicLegalAddress, profile.companyName, publishDomain, workspace, workspaceLabel],
  );
  const previewPortalUrl = draft.ctaPrimaryUrl || "/portal";

  function renderSectionEditor(sectionKey: LandingBuilderSectionKey) {
    switch (sectionKey) {
      case "hero":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Eyebrow</span>
              <input
                className="form-input"
                value={draft.heroEyebrow}
                onChange={(event) => updateDraft("heroEyebrow", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Hero title</span>
              <input
                className="form-input"
                value={draft.heroTitle}
                onChange={(event) => updateDraft("heroTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Hero subtitle</span>
              <textarea
                className="form-input"
                rows={3}
                value={draft.heroSubtitle}
                onChange={(event) => updateDraft("heroSubtitle", event.target.value)}
              />
            </label>
          </div>
        );
      case "about":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.aboutTitle}
                onChange={(event) => updateDraft("aboutTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Summary</span>
              <textarea
                className="form-input"
                rows={4}
                value={draft.aboutBody}
                onChange={(event) => updateDraft("aboutBody", event.target.value)}
              />
            </label>
          </div>
        );
      case "features":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.featuresTitle}
                onChange={(event) => updateDraft("featuresTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Intro copy</span>
              <textarea
                className="form-input"
                rows={3}
                value={draft.featuresBody}
                onChange={(event) => updateDraft("featuresBody", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Feature items</span>
              <textarea
                className="form-input"
                rows={4}
                value={joinListInput(draft.featuresItems)}
                onChange={(event) =>
                  updateDraft("featuresItems", splitListInput(event.target.value))
                }
                placeholder="One approved feature per line"
              />
            </label>
          </div>
        );
      case "listings":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.listingsTitle}
                onChange={(event) => updateDraft("listingsTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Section copy</span>
              <textarea
                className="form-input"
                rows={3}
                value={draft.listingsBody}
                onChange={(event) => updateDraft("listingsBody", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Listings highlight items</span>
              <textarea
                className="form-input"
                rows={4}
                value={joinListInput(draft.listingItems)}
                onChange={(event) =>
                  updateDraft("listingItems", splitListInput(event.target.value))
                }
                placeholder="One listing or portfolio highlight per line"
              />
            </label>
          </div>
        );
      case "team":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.teamTitle}
                onChange={(event) => updateDraft("teamTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Section copy</span>
              <textarea
                className="form-input"
                rows={3}
                value={draft.teamBody}
                onChange={(event) => updateDraft("teamBody", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Team or exco roles</span>
              <textarea
                className="form-input"
                rows={4}
                value={joinListInput(draft.teamItems)}
                onChange={(event) =>
                  updateDraft("teamItems", splitListInput(event.target.value))
                }
                placeholder="One role or team highlight per line"
              />
            </label>
          </div>
        );
      case "fees":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.feesTitle}
                onChange={(event) => updateDraft("feesTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Section copy</span>
              <textarea
                className="form-input"
                rows={3}
                value={draft.feesBody}
                onChange={(event) => updateDraft("feesBody", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Fee or payment items</span>
              <textarea
                className="form-input"
                rows={4}
                value={joinListInput(draft.feeItems)}
                onChange={(event) =>
                  updateDraft("feeItems", splitListInput(event.target.value))
                }
                placeholder="One fee item per line"
              />
            </label>
          </div>
        );
      case "notices":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.noticesTitle}
                onChange={(event) => updateDraft("noticesTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Section copy</span>
              <textarea
                className="form-input"
                rows={3}
                value={draft.noticesBody}
                onChange={(event) => updateDraft("noticesBody", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Notice items</span>
              <textarea
                className="form-input"
                rows={4}
                value={joinListInput(draft.noticeItems)}
                onChange={(event) =>
                  updateDraft("noticeItems", splitListInput(event.target.value))
                }
                placeholder="One notice item per line"
              />
            </label>
          </div>
        );
      case "contact":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.contactTitle}
                onChange={(event) => updateDraft("contactTitle", event.target.value)}
              />
            </label>
            <div className="lpb-inline-note">
              Contact content is powered by the branding fields above so the public page and legal details stay aligned.
            </div>
          </div>
        );
      case "faq":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.faqTitle}
                onChange={(event) => updateDraft("faqTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Questions or approved answers</span>
              <textarea
                className="form-input"
                rows={5}
                value={joinListInput(draft.faqItems)}
                onChange={(event) =>
                  updateDraft("faqItems", splitListInput(event.target.value))
                }
                placeholder="One FAQ line per row"
              />
            </label>
          </div>
        );
      case "gallery":
        return (
          <div className="lpb-editor-grid">
            <label className="lpb-field">
              <span>Section title</span>
              <input
                className="form-input"
                value={draft.galleryTitle}
                onChange={(event) => updateDraft("galleryTitle", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Section copy</span>
              <textarea
                className="form-input"
                rows={3}
                value={draft.galleryBody}
                onChange={(event) => updateDraft("galleryBody", event.target.value)}
              />
            </label>
            <label className="lpb-field lpb-field-wide">
              <span>Image URLs</span>
              <textarea
                className="form-input"
                rows={4}
                value={joinListInput(draft.galleryImageUrls)}
                onChange={(event) =>
                  updateDraft("galleryImageUrls", splitListInput(event.target.value))
                }
                placeholder="One HTTPS image URL per line"
              />
            </label>
          </div>
        );
      case "cta":
        return (
          <div className="lpb-inline-note">
            CTA button labels and destinations are managed in the hero and publish controls so the page stays on an approved rail.
          </div>
        );
      default:
        return null;
    }
  }

  function renderPreviewSection(sectionKey: LandingBuilderSectionKey) {
    switch (sectionKey) {
      case "about":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>{draft.aboutTitle}</h4>
            <p>{draft.aboutBody}</p>
          </div>
        );
      case "features":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>{draft.featuresTitle}</h4>
            <p>{draft.featuresBody}</p>
            {renderPreviewList(draft.featuresItems)}
          </div>
        );
      case "listings":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>{draft.listingsTitle}</h4>
            <p>{draft.listingsBody}</p>
            {renderPreviewList(draft.listingItems)}
          </div>
        );
      case "team":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>{draft.teamTitle}</h4>
            <p>{draft.teamBody}</p>
            {renderPreviewList(draft.teamItems)}
          </div>
        );
      case "fees":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>{draft.feesTitle}</h4>
            <p>{draft.feesBody}</p>
            {renderPreviewList(draft.feeItems)}
          </div>
        );
      case "notices":
        return (
          <div className="lpb-preview-card lpb-preview-card-notice" key={sectionKey}>
            <h4>{draft.noticesTitle}</h4>
            <p>{draft.noticesBody}</p>
            {renderPreviewList(draft.noticeItems)}
          </div>
        );
      case "contact":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>{draft.contactTitle}</h4>
            <div className="lpb-contact-stack">
              {draft.publicSupportEmail ? (
                <a href={`mailto:${draft.publicSupportEmail}`}>{draft.publicSupportEmail}</a>
              ) : null}
              {draft.publicSupportPhone && telephoneHref ? (
                <a href={telephoneHref}>{draft.publicSupportPhone}</a>
              ) : null}
              {draft.publicLegalAddress ? (
                <span>{draft.publicLegalAddress}</span>
              ) : null}
            </div>
          </div>
        );
      case "faq":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>{draft.faqTitle}</h4>
            {renderPreviewList(draft.faqItems)}
          </div>
        );
      case "gallery":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>{draft.galleryTitle}</h4>
            <p>{draft.galleryBody}</p>
            <div className="lpb-gallery-grid">
              {galleryImages.length
                ? galleryImages.map((imageUrl) => (
                    <div
                      key={imageUrl}
                      className="lpb-gallery-tile"
                      style={{ backgroundImage: `url(${imageUrl})` }}
                    />
                  ))
                : [0, 1, 2].map((tile) => (
                    <div
                      key={tile}
                      className="lpb-gallery-tile lpb-gallery-placeholder"
                      style={{ backgroundImage: heroGradient }}
                    />
                  ))}
            </div>
          </div>
        );
      case "cta":
        return (
          <div className="lpb-preview-card" key={sectionKey}>
            <h4>Calls to action</h4>
            <div className="lpb-preview-actions">
              <button type="button" className="btn btn-primary">
                {draft.ctaPrimaryLabel}
              </button>
              <button type="button" className="btn btn-secondary">
                {draft.ctaSecondaryLabel}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="lpb-root">
      <section className="lpb-banner">
        <div>
          <div className="lpb-eyebrow">Landing Page Builder</div>
          <h2>Pick an approved template, drag sections into place, and preview before publish.</h2>
          <p>
            This builder stays intentionally controlled: visual templates, reusable content blocks,
            approved branding fields, and drag-and-drop section ordering instead of free-form page
            design.
          </p>
        </div>
        <div className="lpb-banner-meta">
          <span className="lpb-pill">Visual snapshots</span>
          <span className="lpb-pill">Controlled sections</span>
          <span className="lpb-pill">
            {enterpriseEnabled ? "Enterprise publish enabled" : "Enterprise publish recommended"}
          </span>
        </div>
      </section>

      <section className="lpb-templates">
        {templates.map((template) => {
          const isActive = template.id === draft.templateId;
          return (
            <button
              key={template.id}
              type="button"
              className={`lpb-template-card${isActive ? " is-active" : ""}`}
              onClick={() => updateTemplate(template.id)}
            >
              <div className="lpb-template-topline">
                <span>{template.category}</span>
                <strong>{isActive ? "Selected" : "Approved"}</strong>
              </div>
              <LandingTemplateThumbnail
                templateId={template.previewTemplateId}
                primaryColor={primaryColor}
                accentColor={accentColor}
                className="lpb-template-thumb"
              />
              <div className="lpb-template-copy">
                <h3>{template.name}</h3>
                <p>{template.summary}</p>
                <div className="lpb-template-chips">
                  {template.recommendedSections.map((sectionKey) => (
                    <span key={sectionKey}>
                      {sectionMeta(sectionKey)?.label ?? sectionKey}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <div className="lpb-main">
        <div className="lpb-editor-column">
          <section className="card lpb-card">
            <div className="card-header">
              <div>
                <div className="card-title">Branding and publishing</div>
                <div className="card-subtitle">
                  Publish the selected template, approved sections, and brand shell to{" "}
                  <strong>{publishDomain}</strong>.
                </div>
              </div>
              <div className="lpb-card-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetCurrentTemplate}
                >
                  Reset template
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={publishing || !canPublishBranding}
                  onClick={() => {
                    void publishBranding();
                  }}
                >
                  {publishing ? "Publishing..." : "Publish landing page"}
                </button>
              </div>
            </div>
            <div className="card-body lpb-stack">
              <div className="lpb-publish-note">
                Publishing saves your selected template, section order, and controlled content
                fields to the live landing page on this workspace subdomain.
              </div>
              {!canPublishBranding ? (
                <div className="lpb-warning-note">
                  This workspace can preview and arrange approved templates here, but public
                  publishing depends on branding access and a branded subdomain.
                </div>
              ) : null}
              <div className="lpb-editor-grid">
                <label className="lpb-field">
                  <span>Display name</span>
                  <input
                    className="form-input"
                    value={draft.brandDisplayName}
                    onChange={(event) => updateDraft("brandDisplayName", event.target.value)}
                  />
                </label>
                <label className="lpb-field">
                  <span>Logo URL</span>
                  <input
                    className="form-input"
                    value={draft.brandLogoUrl}
                    onChange={(event) => updateDraft("brandLogoUrl", event.target.value)}
                    placeholder="https://..."
                  />
                </label>
                <label className="lpb-field">
                  <span>Primary color</span>
                  <div className="lpb-color-field">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(event) => updateDraft("brandPrimaryColor", event.target.value)}
                    />
                    <input
                      className="form-input"
                      value={draft.brandPrimaryColor}
                      onChange={(event) => updateDraft("brandPrimaryColor", event.target.value)}
                      placeholder="#1A5C42"
                    />
                  </div>
                </label>
                <label className="lpb-field">
                  <span>Accent color</span>
                  <div className="lpb-color-field">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(event) => updateDraft("brandAccentColor", event.target.value)}
                    />
                    <input
                      className="form-input"
                      value={draft.brandAccentColor}
                      onChange={(event) => updateDraft("brandAccentColor", event.target.value)}
                      placeholder="#D2A85A"
                    />
                  </div>
                </label>
                <label className="lpb-field">
                  <span>Support email</span>
                  <input
                    className="form-input"
                    type="email"
                    value={draft.publicSupportEmail}
                    onChange={(event) => updateDraft("publicSupportEmail", event.target.value)}
                    placeholder="support@workspace.com"
                  />
                </label>
                <label className="lpb-field">
                  <span>Support phone</span>
                  <input
                    className="form-input"
                    type="tel"
                    value={draft.publicSupportPhone}
                    onChange={(event) => updateDraft("publicSupportPhone", event.target.value)}
                    placeholder="+234..."
                  />
                </label>
                <label className="lpb-field lpb-field-wide">
                  <span>Legal or office address</span>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={draft.publicLegalAddress}
                    onChange={(event) => updateDraft("publicLegalAddress", event.target.value)}
                    placeholder="Visible on the public page and policy links"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="card lpb-card">
            <div className="card-header">
              <div>
                <div className="card-title">Hero and CTA controls</div>
                <div className="card-subtitle">
                  Edit approved headline and button content, not raw code.
                </div>
              </div>
            </div>
            <div className="card-body lpb-stack">
              {renderSectionEditor("hero")}
              <div className="lpb-editor-grid">
                <label className="lpb-field">
                  <span>Primary CTA label</span>
                  <input
                    className="form-input"
                    value={draft.ctaPrimaryLabel}
                    onChange={(event) => updateDraft("ctaPrimaryLabel", event.target.value)}
                  />
                </label>
                <label className="lpb-field">
                  <span>Primary CTA URL</span>
                  <input
                    className="form-input"
                    value={draft.ctaPrimaryUrl}
                    onChange={(event) => updateDraft("ctaPrimaryUrl", event.target.value)}
                    placeholder="/portal"
                  />
                </label>
                <label className="lpb-field">
                  <span>Secondary CTA label</span>
                  <input
                    className="form-input"
                    value={draft.ctaSecondaryLabel}
                    onChange={(event) => updateDraft("ctaSecondaryLabel", event.target.value)}
                  />
                </label>
                <label className="lpb-field">
                  <span>Secondary CTA URL</span>
                  <input
                    className="form-input"
                    value={draft.ctaSecondaryUrl}
                    onChange={(event) => updateDraft("ctaSecondaryUrl", event.target.value)}
                    placeholder="mailto:support@workspace.com"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="card lpb-card">
            <div className="card-header">
              <div>
                <div className="card-title">Section-based editor</div>
                <div className="card-subtitle">
                  Drag approved blocks with the handle, or use move controls for precise section
                  ordering.
                </div>
              </div>
            </div>
            <div className="card-body lpb-stack">
              {draft.sectionOrder.map((sectionKey, index) => {
                const meta = sectionMeta(sectionKey);
                const isHidden = draft.hiddenSectionKeys.includes(sectionKey);

                return (
                  <div
                    key={sectionKey}
                    className={`lpb-section-card${isHidden ? " is-hidden" : ""}${
                      draggingSection === sectionKey ? " is-dragging" : ""
                    }${dragOverSection === sectionKey ? " is-drop-target" : ""}`}
                    onDragOver={(event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDragEnter={(event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault();
                      if (draggingSection && draggingSection !== sectionKey) {
                        setDragOverSection(sectionKey);
                      }
                    }}
                    onDrop={(event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault();
                      reorderSections(sectionKey);
                      setDraggingSection(null);
                      setDragOverSection(null);
                    }}
                  >
                    <div className="lpb-section-header">
                      <div>
                        <div className="lpb-section-title">
                          <span
                            className="lpb-drag-handle"
                            draggable
                            onDragStart={(event) => {
                              event.stopPropagation();
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", sectionKey);
                              setDraggingSection(sectionKey);
                              setDragOverSection(sectionKey);
                            }}
                            onDragEnd={() => {
                              setDraggingSection(null);
                              setDragOverSection(null);
                            }}
                            title="Drag to reorder this section"
                            aria-label={`Drag ${meta?.label ?? sectionKey} section`}
                          >
                            ::
                          </span>
                          {meta?.label ?? sectionKey}
                        </div>
                        <div className="lpb-section-copy">
                          {meta?.description ?? "Reusable content block"}
                        </div>
                      </div>
                      <div className="lpb-section-actions">
                        <label className="lpb-layout-picker">
                          <span>Width</span>
                          <select
                            className="form-input"
                            value={getSectionLayout(sectionKey)}
                            onChange={(event) =>
                              updateSectionLayout(
                                sectionKey,
                                event.target.value as LandingBuilderSectionLayout,
                              )
                            }
                            disabled={sectionKey === "hero"}
                          >
                            <option value="half">Side by side</option>
                            <option value="center">Center</option>
                            <option value="full">Full width</option>
                          </select>
                        </label>
                        <div className="lpb-reorder-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={index === 0}
                            onClick={() => moveSection(sectionKey, -1)}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={index === draft.sectionOrder.length - 1}
                            onClick={() => moveSection(sectionKey, 1)}
                          >
                            Down
                          </button>
                        </div>
                        <button
                          type="button"
                          className={`btn ${isHidden ? "btn-ghost" : "btn-secondary"} btn-xs`}
                          onClick={() => toggleSection(sectionKey)}
                        >
                          {isHidden ? "Show section" : "Hide section"}
                        </button>
                      </div>
                    </div>
                    {!isHidden ? renderSectionEditor(sectionKey) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lpb-preview-column">
          <div className="lpb-preview-shell">
            <div className="lpb-preview-top">
              <div>
                <div className="lpb-preview-label">Exact preview</div>
                <strong>{selectedTemplate?.name ?? "Approved template"}</strong>
              </div>
              <span className="lpb-domain-chip">{publishDomain}</span>
            </div>

            <LandingTemplateThumbnail
              templateId={selectedTemplate?.previewTemplateId ?? draft.templateId}
              primaryColor={primaryColor}
              accentColor={accentColor}
              className="lpb-preview-thumbnail"
            />

            <div className="lpb-preview-note">
              This preview uses the same public landing component rendered on the workspace
              subdomain.
            </div>

            <div className="lpb-preview-note lpb-preview-note-layout">
              Set neighboring sections to <strong>Side by side</strong> to place them on one row,
              or switch a section to <strong>Full width</strong> to let it span the full content
              area. Layout settings stay separate from the text, images, and CTA content.
            </div>

            <div className="lpb-preview-live">
              <WorkspacePublicLanding
                workspace={previewWorkspace}
                estate={previewEstate}
                portalUrl={previewPortalUrl}
                draftOverride={draft}
                previewMode
              />
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .lpb-root {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .lpb-banner {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
          gap: 18px;
          padding: 22px 24px;
          border-radius: 20px;
          border: 1px solid rgba(44, 62, 49, 0.08);
          background:
            radial-gradient(circle at top right, rgba(210, 168, 90, 0.18), transparent 30%),
            linear-gradient(135deg, rgba(30, 48, 39, 0.98), rgba(52, 67, 58, 0.96));
          color: #fff;
        }
        .lpb-eyebrow {
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.72;
        }
        .lpb-banner h2 {
          margin: 0 0 10px;
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.1;
        }
        .lpb-banner p {
          margin: 0;
          max-width: 680px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
        }
        .lpb-banner-meta {
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 10px;
          justify-content: flex-end;
        }
        .lpb-pill {
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .lpb-templates {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .lpb-template-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: linear-gradient(180deg, #ffffff, #f7f4ef);
          text-align: left;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }
        .lpb-template-card:hover,
        .lpb-template-card.is-active {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(19, 27, 22, 0.08);
          border-color: rgba(28, 60, 47, 0.2);
        }
        .lpb-template-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ink3);
        }
        .lpb-template-topline strong {
          color: var(--accent);
        }
        .lpb-template-thumb {
          width: 100%;
          height: auto;
          border-radius: 14px;
          border: 1px solid rgba(31, 34, 30, 0.08);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
        }
        .lpb-template-copy h3 {
          margin: 0 0 6px;
          font-size: 16px;
        }
        .lpb-template-copy p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink3);
        }
        .lpb-template-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .lpb-template-chips span {
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(26, 92, 66, 0.08);
          font-size: 11px;
          font-weight: 600;
          color: var(--ink2);
        }
        .lpb-main {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          gap: 20px;
          align-items: start;
        }
        .lpb-editor-column,
        .lpb-preview-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .lpb-card :global(.card-body) {
          padding-top: 0;
        }
        .lpb-card-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .lpb-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .lpb-publish-note,
        .lpb-warning-note,
        .lpb-inline-note {
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.55;
        }
        .lpb-publish-note {
          background: rgba(26, 92, 66, 0.08);
          color: var(--ink2);
        }
        .lpb-warning-note {
          background: rgba(210, 168, 90, 0.14);
          color: #7a5b18;
        }
        .lpb-inline-note {
          background: var(--surface2);
          color: var(--ink3);
        }
        .lpb-editor-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .lpb-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink2);
        }
        .lpb-field span {
          color: var(--ink2);
        }
        .lpb-field-wide {
          grid-column: 1 / -1;
        }
        .lpb-color-field {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          gap: 10px;
        }
        .lpb-color-field input[type="color"] {
          width: 48px;
          height: 42px;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
        }
        .lpb-section-card {
          padding: 14px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: #fff;
          transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }
        .lpb-section-card.is-hidden {
          background: #faf7f1;
          border-style: dashed;
          opacity: 0.92;
        }
        .lpb-section-card.is-dragging {
          opacity: 0.72;
        }
        .lpb-section-card.is-drop-target {
          border-color: rgba(26, 92, 66, 0.36);
          box-shadow: 0 0 0 2px rgba(26, 92, 66, 0.08);
          transform: translateY(-1px);
        }
        .lpb-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
        .lpb-section-actions,
        .lpb-reorder-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .lpb-layout-picker {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--ink2);
          font-weight: 600;
        }
        .lpb-layout-picker :global(select) {
          min-width: 148px;
        }
        .lpb-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: var(--ink1);
        }
        .lpb-section-copy {
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.5;
          color: var(--ink3);
        }
        .lpb-drag-handle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 7px;
          background: var(--surface2);
          color: var(--ink3);
          font-size: 10px;
          letter-spacing: 0.08em;
          cursor: grab;
        }
        .lpb-preview-shell {
          position: sticky;
          top: 88px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 16px;
          border-radius: 20px;
          border: 1px solid rgba(29, 37, 31, 0.08);
          background:
            radial-gradient(circle at top right, rgba(210, 168, 90, 0.14), transparent 32%),
            #fbfaf7;
        }
        .lpb-preview-note {
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(26, 92, 66, 0.08);
          color: var(--ink2);
          font-size: 12px;
          line-height: 1.5;
        }
        .lpb-preview-note-layout {
          background: rgba(210, 168, 90, 0.14);
        }
        .lpb-preview-live {
          max-height: min(80vh, 980px);
          overflow: auto;
          border-radius: 18px;
          border: 1px solid rgba(29, 37, 31, 0.08);
          background: #fff;
        }
        .lpb-preview-live :global(a),
        .lpb-preview-live :global(button) {
          pointer-events: none;
        }
        .lpb-preview-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .lpb-preview-label {
          margin-bottom: 4px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--ink3);
        }
        .lpb-domain-chip {
          padding: 8px 10px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid var(--border);
          font-size: 11px;
          font-weight: 700;
          color: var(--ink2);
          white-space: nowrap;
        }
        .lpb-preview-thumbnail {
          width: 100%;
          height: auto;
          border-radius: 16px;
          border: 1px solid rgba(31, 34, 30, 0.08);
        }
        .lpb-preview-page {
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(31, 34, 30, 0.08);
          background: #fff;
        }
        .lpb-preview-hero {
          padding: 22px;
          color: #fff;
        }
        .lpb-preview-hero-meta {
          margin-bottom: 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.72;
        }
        .lpb-preview-hero h3 {
          margin: 0 0 10px;
          font-size: 28px;
          line-height: 1.05;
        }
        .lpb-preview-hero p {
          margin: 0 0 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.82);
        }
        .lpb-preview-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .lpb-preview-brandbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(31, 34, 30, 0.08);
          background: #faf7f1;
        }
        .lpb-preview-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .lpb-preview-brand img,
        .lpb-preview-brandmark {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .lpb-preview-brandmark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 13px;
          font-weight: 800;
        }
        .lpb-preview-brand strong,
        .lpb-preview-brand span {
          display: block;
        }
        .lpb-preview-brand span {
          font-size: 12px;
          color: var(--ink3);
        }
        .lpb-preview-status {
          font-size: 12px;
          color: var(--ink3);
        }
        .lpb-preview-grid {
          display: grid;
          gap: 12px;
          padding: 16px;
        }
        .lpb-preview-card {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid rgba(31, 34, 30, 0.08);
          background: #fff;
        }
        .lpb-preview-card-notice {
          background: #fff8ea;
        }
        .lpb-preview-card h4 {
          margin: 0 0 8px;
          font-size: 16px;
        }
        .lpb-preview-card p {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink3);
        }
        .lpb-preview-list {
          margin: 12px 0 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
          font-size: 13px;
          line-height: 1.5;
        }
        .lpb-preview-list.tone-light {
          color: rgba(255, 255, 255, 0.84);
        }
        .lpb-contact-stack {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }
        .lpb-contact-stack a,
        .lpb-contact-stack span {
          color: var(--ink2);
          text-decoration: none;
          font-size: 13px;
        }
        .lpb-gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }
        .lpb-gallery-tile {
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          background-size: cover;
          background-position: center;
          border: 1px solid rgba(31, 34, 30, 0.08);
        }
        .lpb-gallery-placeholder {
          opacity: 0.72;
        }
        @media (max-width: 1080px) {
          .lpb-main {
            grid-template-columns: 1fr;
          }
          .lpb-preview-shell {
            position: static;
          }
        }
        @media (max-width: 860px) {
          .lpb-banner {
            grid-template-columns: 1fr;
          }
          .lpb-banner-meta {
            justify-content: flex-start;
          }
        }
        @media (max-width: 720px) {
          .lpb-editor-grid {
            grid-template-columns: 1fr;
          }
          .lpb-card-actions,
          .lpb-section-header,
          .lpb-preview-brandbar,
          .lpb-preview-top {
            flex-direction: column;
            align-items: stretch;
          }
          .lpb-gallery-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
