"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import {
  LANDING_BUILDER_SECTION_KEYS,
  type LandingBuilderDraft,
  type LandingBuilderSectionKey,
  type LandingBuilderSectionLayout,
} from "../../lib/landing-builder";

type PuckVisibility = "visible" | "hidden";

type SectionComponentType =
  | "HeroSection"
  | "AboutSection"
  | "FeaturesSection"
  | "ListingsSection"
  | "TeamSection"
  | "FeesSection"
  | "NoticesSection"
  | "ContactSection"
  | "FaqSection"
  | "GallerySection"
  | "CtaSection";

// Primitive block prop types
interface HeadingBlockProps { text: string; level: "h1" | "h2" | "h3" | "h4"; align: "left" | "center" | "right"; }
interface TextBlockProps { text: string; align: "left" | "center" | "right"; size: "small" | "medium" | "large"; }
interface RichTextBlockProps { text: string; }
interface ButtonBlockProps { label: string; url: string; variant: "primary" | "secondary" | "outline"; }
interface GridBlockProps { columns: "1" | "2" | "3" | "4"; gap: "small" | "medium" | "large"; }
interface FlexBlockProps { direction: "row" | "column"; align: "start" | "center" | "end"; justify: "start" | "center" | "end" | "between"; gap: "small" | "medium" | "large"; }
interface SpaceBlockProps { size: "small" | "medium" | "large" | "xlarge"; }
interface CardBlockProps { title: string; body: string; }
interface ImageBlockProps { url: string; alt: string; caption: string; }

type LandingPuckData = Data<{
  // Sections
  HeroSection: HeroSectionProps;
  AboutSection: StandardSectionProps;
  FeaturesSection: ListSectionProps;
  ListingsSection: ListSectionProps;
  TeamSection: ListSectionProps;
  FeesSection: ListSectionProps;
  NoticesSection: ListSectionProps;
  ContactSection: ContactSectionProps;
  FaqSection: ListSectionProps;
  GallerySection: GallerySectionProps;
  CtaSection: CtaSectionProps;
  // Primitives
  HeadingBlock: HeadingBlockProps;
  TextBlock: TextBlockProps;
  RichTextBlock: RichTextBlockProps;
  ButtonBlock: ButtonBlockProps;
  GridBlock: GridBlockProps;
  FlexBlock: FlexBlockProps;
  SpaceBlock: SpaceBlockProps;
  CardBlock: CardBlockProps;
  ImageBlock: ImageBlockProps;
}>;

interface PuckLandingEditorProps {
  draft: LandingBuilderDraft;
  resetKey: number;
  onChange: (nextDraft: LandingBuilderDraft) => void;
}

interface BaseSectionProps {
  visibility: PuckVisibility;
  layout: LandingBuilderSectionLayout;
}

interface HeroSectionProps extends BaseSectionProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

interface StandardSectionProps extends BaseSectionProps {
  title: string;
  body: string;
}

interface ListSectionProps extends StandardSectionProps {
  itemsText: string;
}

interface ContactSectionProps extends BaseSectionProps {
  title: string;
}

interface GallerySectionProps extends StandardSectionProps {
  imageUrlsText: string;
}

interface CtaSectionProps extends BaseSectionProps {
  title: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
}

const SECTION_TYPE_BY_KEY: Record<LandingBuilderSectionKey, SectionComponentType> = {
  hero: "HeroSection",
  about: "AboutSection",
  features: "FeaturesSection",
  listings: "ListingsSection",
  team: "TeamSection",
  fees: "FeesSection",
  notices: "NoticesSection",
  contact: "ContactSection",
  faq: "FaqSection",
  gallery: "GallerySection",
  cta: "CtaSection",
};

const SECTION_KEY_BY_TYPE: Record<SectionComponentType, LandingBuilderSectionKey> = {
  HeroSection: "hero",
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

const VISIBILITY_OPTIONS = [
  { label: "Visible", value: "visible" },
  { label: "Hidden", value: "hidden" },
] as const;

const LAYOUT_OPTIONS = [
  { label: "Side by side", value: "half" },
  { label: "Center", value: "center" },
  { label: "Full width", value: "full" },
] as const;

function splitListInput(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinListInput(items: string[]) {
  return items.join("\n");
}

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function getEmptyStateCopy(sectionKey: LandingBuilderSectionKey) {
  switch (sectionKey) {
    case "features":
      return {
        title: "No approved features yet",
        description: "Add services, amenities, or trust points in the right sidebar.",
      };
    case "listings":
      return {
        title: "No listing highlights yet",
        description: "Add portfolio or unit highlights one per line in the right sidebar.",
      };
    case "team":
      return {
        title: "No team roles yet",
        description: "Add leadership or exco roles to make this section feel real.",
      };
    case "fees":
      return {
        title: "No pricing guidance yet",
        description: "Add fee items or payment notes to make this section useful.",
      };
    case "notices":
      return {
        title: "No notices yet",
        description: "Add announcements, schedules, or public updates in the right sidebar.",
      };
    case "faq":
      return {
        title: "No FAQs yet",
        description: "Add approved questions and answers one per line.",
      };
    case "gallery":
      return {
        title: "No gallery images yet",
        description: "Paste HTTPS image URLs to turn this section into a visual highlight.",
      };
    default:
      return {
        title: "Add approved content",
        description: "Use the right sidebar to finish this section.",
      };
  }
}

function renderEmptyPreviewState(sectionKey: LandingBuilderSectionKey) {
  const copy = getEmptyStateCopy(sectionKey);

  return (
    <div style={styles.emptyStateCard}>
      <strong style={styles.emptyStateTitle}>{copy.title}</strong>
      <p style={styles.emptyStateBody}>{copy.description}</p>
    </div>
  );
}

function sectionNeedsAttention(draft: LandingBuilderDraft, sectionKey: LandingBuilderSectionKey) {
  switch (sectionKey) {
    case "hero":
      return !hasText(draft.heroTitle) || !hasText(draft.heroSubtitle);
    case "about":
      return !hasText(draft.aboutBody);
    case "features":
      return draft.featuresItems.length === 0;
    case "listings":
      return draft.listingItems.length === 0;
    case "team":
      return draft.teamItems.length === 0;
    case "fees":
      return draft.feeItems.length === 0;
    case "notices":
      return draft.noticeItems.length === 0;
    case "contact":
      return false;
    case "faq":
      return draft.faqItems.length === 0;
    case "gallery":
      return draft.galleryImageUrls.length === 0;
    case "cta":
      return !hasText(draft.ctaPrimaryLabel) || !hasText(draft.ctaPrimaryUrl);
  }
}

function getVisibility(
  draft: LandingBuilderDraft,
  sectionKey: LandingBuilderSectionKey,
): PuckVisibility {
  return draft.hiddenSectionKeys.includes(sectionKey) ? "hidden" : "visible";
}

function getLayout(
  draft: LandingBuilderDraft,
  sectionKey: LandingBuilderSectionKey,
): LandingBuilderSectionLayout {
  if (sectionKey === "hero") {
    return "full";
  }

  return draft.sectionLayouts?.[sectionKey] ?? "half";
}

function getOrderedSectionKeys(draft: LandingBuilderDraft) {
  const seen = new Set<LandingBuilderSectionKey>();
  const ordered = [...draft.sectionOrder, ...LANDING_BUILDER_SECTION_KEYS].filter((sectionKey) => {
    if (seen.has(sectionKey)) {
      return false;
    }

    seen.add(sectionKey);
    return true;
  });

  return ordered;
}

function createPuckDataFromDraft(draft: LandingBuilderDraft): LandingPuckData {
  const content = getOrderedSectionKeys(draft).map((sectionKey) =>
    createPuckSection(sectionKey, draft),
  );

  return {
    root: {
      props: {
        title: `${draft.brandDisplayName || "Workspace"} landing page`,
      },
    },
    content,
  };
}

function createPuckSection(
  sectionKey: LandingBuilderSectionKey,
  draft: LandingBuilderDraft,
): LandingPuckData["content"][number] {
  const baseProps = {
    id: `${sectionKey}-section`,
    visibility: getVisibility(draft, sectionKey),
    layout: getLayout(draft, sectionKey),
  };

  switch (sectionKey) {
    case "hero":
      return {
        type: "HeroSection",
        props: {
          ...baseProps,
          layout: "full",
          eyebrow: draft.heroEyebrow,
          title: draft.heroTitle,
          subtitle: draft.heroSubtitle,
        },
      };
    case "about":
      return {
        type: "AboutSection",
        props: {
          ...baseProps,
          title: draft.aboutTitle,
          body: draft.aboutBody,
        },
      };
    case "features":
      return {
        type: "FeaturesSection",
        props: {
          ...baseProps,
          title: draft.featuresTitle,
          body: draft.featuresBody,
          itemsText: joinListInput(draft.featuresItems),
        },
      };
    case "listings":
      return {
        type: "ListingsSection",
        props: {
          ...baseProps,
          title: draft.listingsTitle,
          body: draft.listingsBody,
          itemsText: joinListInput(draft.listingItems),
        },
      };
    case "team":
      return {
        type: "TeamSection",
        props: {
          ...baseProps,
          title: draft.teamTitle,
          body: draft.teamBody,
          itemsText: joinListInput(draft.teamItems),
        },
      };
    case "fees":
      return {
        type: "FeesSection",
        props: {
          ...baseProps,
          title: draft.feesTitle,
          body: draft.feesBody,
          itemsText: joinListInput(draft.feeItems),
        },
      };
    case "notices":
      return {
        type: "NoticesSection",
        props: {
          ...baseProps,
          title: draft.noticesTitle,
          body: draft.noticesBody,
          itemsText: joinListInput(draft.noticeItems),
        },
      };
    case "contact":
      return {
        type: "ContactSection",
        props: {
          ...baseProps,
          title: draft.contactTitle,
        },
      };
    case "faq":
      return {
        type: "FaqSection",
        props: {
          ...baseProps,
          title: draft.faqTitle,
          body: "",
          itemsText: joinListInput(draft.faqItems),
        },
      };
    case "gallery":
      return {
        type: "GallerySection",
        props: {
          ...baseProps,
          title: draft.galleryTitle,
          body: draft.galleryBody,
          imageUrlsText: joinListInput(draft.galleryImageUrls),
        },
      };
    case "cta":
      return {
        type: "CtaSection",
        props: {
          ...baseProps,
          title: "Calls to action",
          primaryLabel: draft.ctaPrimaryLabel,
          primaryUrl: draft.ctaPrimaryUrl,
          secondaryLabel: draft.ctaSecondaryLabel,
          secondaryUrl: draft.ctaSecondaryUrl,
        },
      };
  }
}

function applyPuckDataToDraft(
  currentDraft: LandingBuilderDraft,
  data: LandingPuckData,
): LandingBuilderDraft {
  const nextDraft = { ...currentDraft };
  const nextOrder: LandingBuilderSectionKey[] = [];
  const hiddenKeys = new Set<LandingBuilderSectionKey>();
  const nextLayouts: Partial<Record<LandingBuilderSectionKey, LandingBuilderSectionLayout>> = {};
  const seen = new Set<LandingBuilderSectionKey>();

  for (const item of data.content ?? []) {
    const sectionKey = SECTION_KEY_BY_TYPE[item.type as SectionComponentType];

    if (!sectionKey || seen.has(sectionKey)) {
      continue;
    }

    seen.add(sectionKey);
    nextOrder.push(sectionKey);

    const sectionProps = item.props as BaseSectionProps & { id: string };

    if (sectionProps.visibility === "hidden") {
      hiddenKeys.add(sectionKey);
    }

    nextLayouts[sectionKey] =
      sectionKey === "hero"
        ? "full"
        : (sectionProps.layout as LandingBuilderSectionLayout) ?? getLayout(currentDraft, sectionKey);

    switch (sectionKey) {
      case "hero":
        {
          const props = item.props as HeroSectionProps & { id: string };
          nextDraft.heroEyebrow = props.eyebrow ?? "";
          nextDraft.heroTitle = props.title ?? "";
          nextDraft.heroSubtitle = props.subtitle ?? "";
          break;
        }
      case "about":
        {
          const props = item.props as StandardSectionProps & { id: string };
          nextDraft.aboutTitle = props.title ?? "";
          nextDraft.aboutBody = props.body ?? "";
          break;
        }
      case "features":
        {
          const props = item.props as ListSectionProps & { id: string };
          nextDraft.featuresTitle = props.title ?? "";
          nextDraft.featuresBody = props.body ?? "";
          nextDraft.featuresItems = splitListInput(props.itemsText ?? "");
          break;
        }
      case "listings":
        {
          const props = item.props as ListSectionProps & { id: string };
          nextDraft.listingsTitle = props.title ?? "";
          nextDraft.listingsBody = props.body ?? "";
          nextDraft.listingItems = splitListInput(props.itemsText ?? "");
          break;
        }
      case "team":
        {
          const props = item.props as ListSectionProps & { id: string };
          nextDraft.teamTitle = props.title ?? "";
          nextDraft.teamBody = props.body ?? "";
          nextDraft.teamItems = splitListInput(props.itemsText ?? "");
          break;
        }
      case "fees":
        {
          const props = item.props as ListSectionProps & { id: string };
          nextDraft.feesTitle = props.title ?? "";
          nextDraft.feesBody = props.body ?? "";
          nextDraft.feeItems = splitListInput(props.itemsText ?? "");
          break;
        }
      case "notices":
        {
          const props = item.props as ListSectionProps & { id: string };
          nextDraft.noticesTitle = props.title ?? "";
          nextDraft.noticesBody = props.body ?? "";
          nextDraft.noticeItems = splitListInput(props.itemsText ?? "");
          break;
        }
      case "contact":
        nextDraft.contactTitle = (item.props as ContactSectionProps & { id: string }).title ?? "";
        break;
      case "faq":
        {
          const props = item.props as ListSectionProps & { id: string };
          nextDraft.faqTitle = props.title ?? "";
          nextDraft.faqItems = splitListInput(props.itemsText ?? "");
          break;
        }
      case "gallery":
        {
          const props = item.props as GallerySectionProps & { id: string };
          nextDraft.galleryTitle = props.title ?? "";
          nextDraft.galleryBody = props.body ?? "";
          nextDraft.galleryImageUrls = splitListInput(props.imageUrlsText ?? "");
          break;
        }
      case "cta":
        {
          const props = item.props as CtaSectionProps & { id: string };
          nextDraft.ctaPrimaryLabel = props.primaryLabel ?? "";
          nextDraft.ctaPrimaryUrl = props.primaryUrl ?? "";
          nextDraft.ctaSecondaryLabel = props.secondaryLabel ?? "";
          nextDraft.ctaSecondaryUrl = props.secondaryUrl ?? "";
          break;
        }
    }
  }

  for (const sectionKey of LANDING_BUILDER_SECTION_KEYS) {
    if (!seen.has(sectionKey)) {
      nextOrder.push(sectionKey);
      nextLayouts[sectionKey] = getLayout(currentDraft, sectionKey);
      hiddenKeys.add(sectionKey);
    }
  }

  nextDraft.sectionOrder = nextOrder;
  nextDraft.hiddenSectionKeys = Array.from(hiddenKeys);
  nextDraft.sectionLayouts = nextLayouts;

  return nextDraft;
}

function renderSectionItems(
  sectionKey: LandingBuilderSectionKey,
  itemsText: string,
  tone: "gold" | "green" = "green",
) {
  const items = splitListInput(itemsText).slice(0, 4);

  if (!items.length) {
    return renderEmptyPreviewState(sectionKey);
  }

  return (
    <ul style={styles.list}>
      {items.map((item) => (
        <li key={item} style={styles.listItem}>
          <span
            style={{
              ...styles.listMarker,
              background:
                tone === "gold"
                  ? "linear-gradient(135deg, rgba(210, 168, 90, 0.95), rgba(160, 116, 40, 0.9))"
                  : "linear-gradient(135deg, rgba(26, 92, 66, 0.95), rgba(77, 128, 102, 0.88))",
            }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionFrame({
  puck,
  label,
  title,
  subtitle,
  layout,
  visibility,
  children,
}: {
  puck: { dragRef: ((element: Element | null) => void) | null };
  label: string;
  title: string;
  subtitle?: string;
  layout: LandingBuilderSectionLayout;
  visibility: PuckVisibility;
  children?: ReactNode;
}) {
  const isHidden = visibility === "hidden";

  return (
    <div
      ref={puck.dragRef as ((element: HTMLDivElement | null) => void) | null}
      style={{
        ...styles.sectionCard,
        ...(isHidden ? styles.sectionCardHidden : null),
      }}
    >
      <div style={styles.sectionTopline}>
        <span style={styles.sectionLabel}>{label}</span>
        <div style={styles.badges}>
          <span style={styles.badge}>{layout}</span>
          <span
            style={{
              ...styles.badge,
              ...(isHidden ? styles.hiddenBadge : styles.visibleBadge),
            }}
          >
            {isHidden ? "Hidden" : "Visible"}
          </span>
        </div>
      </div>
      <h3 style={styles.sectionTitle}>{title || "Untitled section"}</h3>
      {subtitle ? <p style={styles.sectionBody}>{subtitle}</p> : null}
      {children}
    </div>
  );
}

const puckConfig: Config = {
  root: {
    render: ({ children }: { children: ReactNode }) => (
      <div style={styles.canvasStack}>{children}</div>
    ),
  },
  components: {
    HeroSection: {
      label: "Hero",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        eyebrow: {
          type: "text",
          label: "Eyebrow",
        },
        title: {
          type: "text",
          label: "Hero title",
        },
        subtitle: {
          type: "textarea",
          label: "Hero subtitle",
        },
      },
      render: ({ puck, visibility, title, eyebrow, subtitle }) => (
        <SectionFrame
          puck={puck}
          label={eyebrow || "Hero"}
          title={title}
          subtitle={subtitle}
          layout="full"
          visibility={visibility}
        />
      ),
    },
    AboutSection: {
      label: "About",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
        body: {
          type: "textarea",
          label: "Summary",
        },
      },
      render: ({ puck, visibility, layout, title, body }) => (
        <SectionFrame
          puck={puck}
          label="About"
          title={title}
          subtitle={body}
          layout={layout}
          visibility={visibility}
        />
      ),
    },
    FeaturesSection: {
      label: "Services / Features",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
        body: {
          type: "textarea",
          label: "Intro copy",
        },
        itemsText: {
          type: "textarea",
          label: "Feature items",
        },
      },
      render: ({ puck, visibility, layout, title, body, itemsText }) => (
        <SectionFrame
          puck={puck}
          label="Services / Features"
          title={title}
          subtitle={body}
          layout={layout}
          visibility={visibility}
        >
          {renderSectionItems("features", itemsText)}
        </SectionFrame>
      ),
    },
    ListingsSection: {
      label: "Listings Highlight",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
        body: {
          type: "textarea",
          label: "Section copy",
        },
        itemsText: {
          type: "textarea",
          label: "Listing highlights",
        },
      },
      render: ({ puck, visibility, layout, title, body, itemsText }) => (
        <SectionFrame
          puck={puck}
          label="Listings Highlight"
          title={title}
          subtitle={body}
          layout={layout}
          visibility={visibility}
        >
          {renderSectionItems("listings", itemsText, "gold")}
        </SectionFrame>
      ),
    },
    TeamSection: {
      label: "Team / Exco",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
        body: {
          type: "textarea",
          label: "Section copy",
        },
        itemsText: {
          type: "textarea",
          label: "Roles or highlights",
        },
      },
      render: ({ puck, visibility, layout, title, body, itemsText }) => (
        <SectionFrame
          puck={puck}
          label="Team / Exco"
          title={title}
          subtitle={body}
          layout={layout}
          visibility={visibility}
        >
          {renderSectionItems("team", itemsText)}
        </SectionFrame>
      ),
    },
    FeesSection: {
      label: "Fees / Payment Info",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
        body: {
          type: "textarea",
          label: "Section copy",
        },
        itemsText: {
          type: "textarea",
          label: "Fee items",
        },
      },
      render: ({ puck, visibility, layout, title, body, itemsText }) => (
        <SectionFrame
          puck={puck}
          label="Fees / Payment Info"
          title={title}
          subtitle={body}
          layout={layout}
          visibility={visibility}
        >
          {renderSectionItems("fees", itemsText, "gold")}
        </SectionFrame>
      ),
    },
    NoticesSection: {
      label: "Notices",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
        body: {
          type: "textarea",
          label: "Section copy",
        },
        itemsText: {
          type: "textarea",
          label: "Notice items",
        },
      },
      render: ({ puck, visibility, layout, title, body, itemsText }) => (
        <SectionFrame
          puck={puck}
          label="Notices"
          title={title}
          subtitle={body}
          layout={layout}
          visibility={visibility}
        >
          {renderSectionItems("notices", itemsText)}
        </SectionFrame>
      ),
    },
    ContactSection: {
      label: "Contact Details",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
      },
      render: ({ puck, visibility, layout, title }) => (
        <SectionFrame
          puck={puck}
          label="Contact Details"
          title={title}
          subtitle="Support email, phone, and legal address still flow from the branding panel above."
          layout={layout}
          visibility={visibility}
        />
      ),
    },
    FaqSection: {
      label: "FAQ",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
        itemsText: {
          type: "textarea",
          label: "Questions or answers",
        },
      },
      render: ({ puck, visibility, layout, title, itemsText }) => (
        <SectionFrame
          puck={puck}
          label="FAQ"
          title={title}
          layout={layout}
          visibility={visibility}
        >
          {renderSectionItems("faq", itemsText)}
        </SectionFrame>
      ),
    },
    GallerySection: {
      label: "Gallery",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        title: {
          type: "text",
          label: "Section title",
        },
        body: {
          type: "textarea",
          label: "Section copy",
        },
        imageUrlsText: {
          type: "textarea",
          label: "Image URLs",
        },
      },
      render: ({ puck, visibility, layout, title, body, imageUrlsText }) => (
        <SectionFrame
          puck={puck}
          label="Gallery"
          title={title}
          subtitle={body}
          layout={layout}
          visibility={visibility}
        >
          {renderSectionItems("gallery", imageUrlsText, "gold")}
        </SectionFrame>
      ),
    },
    CtaSection: {
      label: "CTA Buttons",
      fields: {
        visibility: {
          type: "radio",
          label: "Visibility",
          options: VISIBILITY_OPTIONS,
        },
        layout: {
          type: "select",
          label: "Width",
          options: LAYOUT_OPTIONS,
        },
        primaryLabel: {
          type: "text",
          label: "Primary CTA label",
        },
        primaryUrl: {
          type: "text",
          label: "Primary CTA URL",
        },
        secondaryLabel: {
          type: "text",
          label: "Secondary CTA label",
        },
        secondaryUrl: {
          type: "text",
          label: "Secondary CTA URL",
        },
      },
      render: ({
        puck,
        visibility,
        layout,
        primaryLabel,
        primaryUrl,
        secondaryLabel,
        secondaryUrl,
      }) => (
        <SectionFrame
          puck={puck}
          label="CTA Buttons"
          title="Calls to action"
          subtitle="Edit CTA labels and destinations in the right sidebar."
          layout={layout}
          visibility={visibility}
        >
          <div style={styles.ctaStack}>
            <div style={styles.ctaButtonPrimary}>{primaryLabel || "Primary CTA"}</div>
            <div style={styles.ctaButtonSecondary}>{secondaryLabel || "Secondary CTA"}</div>
          </div>
          <div style={styles.urlStack}>
            <span>{primaryUrl || "/portal"}</span>
            <span>{secondaryUrl || "mailto:support@workspace.com"}</span>
          </div>
        </SectionFrame>
      ),
    },

    // ─── PRIMITIVE BLOCKS ────────────────────────────────────────────────────

    HeadingBlock: {
      label: "Heading",
      fields: {
        text: { type: "text", label: "Text" },
        level: { type: "select", label: "Level", options: [{ label: "H1", value: "h1" }, { label: "H2", value: "h2" }, { label: "H3", value: "h3" }, { label: "H4", value: "h4" }] },
        align: { type: "select", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
      },
      defaultProps: { text: "Your heading", level: "h2", align: "left" },
      render: ({ puck, text, level: Tag, align }) => (
        <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={{ ...styles.primitiveBlock, textAlign: align }}>
          <Tag style={styles.primitiveHeading}>{text || "Your heading"}</Tag>
        </div>
      ),
    },

    TextBlock: {
      label: "Text",
      fields: {
        text: { type: "textarea", label: "Text" },
        align: { type: "select", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
        size: { type: "select", label: "Size", options: [{ label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" }] },
      },
      defaultProps: { text: "Your paragraph text goes here.", align: "left", size: "medium" },
      render: ({ puck, text, align, size }) => (
        <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={{ ...styles.primitiveBlock, textAlign: align }}>
          <p style={{ margin: 0, fontSize: size === "small" ? 14 : size === "large" ? 20 : 16, lineHeight: 1.7, color: "#2f372f" }}>{text || "Your paragraph text goes here."}</p>
        </div>
      ),
    },

    RichTextBlock: {
      label: "RichText",
      fields: {
        text: { type: "textarea", label: "Content" },
      },
      defaultProps: { text: "Add your rich content here." },
      render: ({ puck, text }) => (
        <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={styles.primitiveBlock}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: "#2f372f", whiteSpace: "pre-wrap" }}>{text || "Add your rich content here."}</p>
        </div>
      ),
    },

    ButtonBlock: {
      label: "Button",
      fields: {
        label: { type: "text", label: "Button label" },
        url: { type: "text", label: "URL" },
        variant: { type: "select", label: "Style", options: [{ label: "Primary", value: "primary" }, { label: "Secondary", value: "secondary" }, { label: "Outline", value: "outline" }] },
      },
      defaultProps: { label: "Click here", url: "/", variant: "primary" },
      render: ({ puck, label, variant }) => (
        <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={{ ...styles.primitiveBlock, display: "flex" }}>
          <div style={variant === "primary" ? styles.ctaButtonPrimary : variant === "outline" ? styles.ctaButtonSecondary : { ...styles.ctaButtonSecondary, background: "#e8f0e9" }}>
            {label || "Click here"}
          </div>
        </div>
      ),
    },

    GridBlock: {
      label: "Grid",
      fields: {
        columns: { type: "select", label: "Columns", options: [{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }] },
        gap: { type: "select", label: "Gap", options: [{ label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" }] },
      },
      defaultProps: { columns: "2", gap: "medium" },
      render: ({ puck, columns, gap }) => (
        <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={{ ...styles.primitiveBlock }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: gap === "small" ? 8 : gap === "large" ? 24 : 16, minHeight: 48 }}>
            {Array.from({ length: Number(columns) }).map((_, i) => (
              <div key={i} style={{ border: "1.5px dashed rgba(26,92,66,0.18)", borderRadius: 8, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "#aaa" }}>Column {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    FlexBlock: {
      label: "Flex",
      fields: {
        direction: { type: "select", label: "Direction", options: [{ label: "Row", value: "row" }, { label: "Column", value: "column" }] },
        align: { type: "select", label: "Align items", options: [{ label: "Start", value: "start" }, { label: "Center", value: "center" }, { label: "End", value: "end" }] },
        justify: { type: "select", label: "Justify", options: [{ label: "Start", value: "start" }, { label: "Center", value: "center" }, { label: "End", value: "end" }, { label: "Space between", value: "between" }] },
        gap: { type: "select", label: "Gap", options: [{ label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" }] },
      },
      defaultProps: { direction: "row", align: "center", justify: "start", gap: "medium" },
      render: ({ puck, direction, align, justify, gap }) => (
        <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={{ ...styles.primitiveBlock }}>
          <div style={{ display: "flex", flexDirection: direction, alignItems: align, justifyContent: justify === "between" ? "space-between" : justify, gap: gap === "small" ? 8 : gap === "large" ? 24 : 16, minHeight: 48, border: "1.5px dashed rgba(26,92,66,0.18)", borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>Flex — {direction}</span>
          </div>
        </div>
      ),
    },

    SpaceBlock: {
      label: "Space",
      fields: {
        size: { type: "select", label: "Height", options: [{ label: "Small (16px)", value: "small" }, { label: "Medium (32px)", value: "medium" }, { label: "Large (64px)", value: "large" }, { label: "X-Large (96px)", value: "xlarge" }] },
      },
      defaultProps: { size: "medium" },
      render: ({ puck, size }) => {
        const height = size === "small" ? 16 : size === "large" ? 64 : size === "xlarge" ? 96 : 32;
        return (
          <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={{ width: "100%", height, border: "1.5px dashed rgba(26,92,66,0.14)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#bbb" }}>Space — {height}px</span>
          </div>
        );
      },
    },

    CardBlock: {
      label: "Card",
      fields: {
        title: { type: "text", label: "Title" },
        body: { type: "textarea", label: "Body" },
      },
      defaultProps: { title: "Card title", body: "Card body text goes here." },
      render: ({ puck, title, body }) => (
        <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={{ ...styles.sectionCard, padding: 20 }}>
          <strong style={{ display: "block", marginBottom: 8, fontSize: 16 }}>{title || "Card title"}</strong>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#555" }}>{body || "Card body text goes here."}</p>
        </div>
      ),
    },

    ImageBlock: {
      label: "Image",
      fields: {
        url: { type: "text", label: "Image URL (https://...)" },
        alt: { type: "text", label: "Alt text" },
        caption: { type: "text", label: "Caption" },
      },
      defaultProps: { url: "", alt: "", caption: "" },
      render: ({ puck, url, alt, caption }) => (
        <div ref={puck.dragRef as ((el: HTMLDivElement | null) => void)} style={styles.primitiveBlock}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={alt} style={{ width: "100%", borderRadius: 10, display: "block", objectFit: "cover", maxHeight: 320 }} />
          ) : (
            <div style={{ width: "100%", height: 120, borderRadius: 10, background: "rgba(26,92,66,0.08)", border: "1.5px dashed rgba(26,92,66,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 13, color: "#aaa" }}>Paste an image URL in the sidebar</span>
            </div>
          )}
          {caption ? <p style={{ margin: "8px 0 0", fontSize: 13, color: "#888", textAlign: "center" }}>{caption}</p> : null}
        </div>
      ),
    },
  },

  categories: {
    layout: {
      title: "Layout",
      components: ["GridBlock", "FlexBlock", "SpaceBlock"],
    },
    typography: {
      title: "Typography",
      components: ["HeadingBlock", "TextBlock", "RichTextBlock"],
    },
    actions: {
      title: "Actions",
      components: ["ButtonBlock"],
    },
    other: {
      title: "Other",
      components: ["CardBlock", "ImageBlock"],
    },
    sections: {
      title: "Sections",
      components: ["HeroSection", "AboutSection", "FeaturesSection", "ListingsSection", "TeamSection", "FeesSection", "NoticesSection", "ContactSection", "FaqSection", "GallerySection", "CtaSection"],
    },
  },
};

export default function PuckLandingEditor({
  draft,
  resetKey,
  onChange,
}: PuckLandingEditorProps) {
  const [editorData, setEditorData] = useState<LandingPuckData>(() =>
    createPuckDataFromDraft(draft),
  );

  useEffect(() => {
    setEditorData(createPuckDataFromDraft(draft));
  }, [resetKey]);

  const totalSections = useMemo(() => getOrderedSectionKeys(draft).length, [draft]);
  const visibleSections = useMemo(
    () =>
      getOrderedSectionKeys(draft).filter(
        (sectionKey) => !draft.hiddenSectionKeys.includes(sectionKey),
      ).length,
    [draft],
  );
  const sectionsNeedingContent = useMemo(
    () =>
      getOrderedSectionKeys(draft).filter((sectionKey) =>
        sectionNeedsAttention(draft, sectionKey),
      ).length,
    [draft],
  );

  return (
    <div style={styles.shell}>
      <div style={styles.helperNote}>
        Drag the section cards into order, click any card to edit it, and use the right sidebar for
        fields. Visibility and layout settings here stay synced with the live landing-page preview.
      </div>

      <div style={styles.statusRow}>
        <span style={styles.statusChip}>{totalSections} approved sections</span>
        <span style={styles.statusChip}>{visibleSections} visible</span>
        <span
          style={{
            ...styles.statusChip,
            ...(sectionsNeedingContent ? styles.statusChipWarning : styles.statusChipReady),
          }}
        >
          {sectionsNeedingContent
            ? `${sectionsNeedingContent} section${sectionsNeedingContent === 1 ? "" : "s"} need content`
            : "All sections have core content"}
        </span>
      </div>

      <div style={styles.editorWrap}>
        <Puck
          config={puckConfig}
          data={editorData}
          onChange={(nextData) => {
            const typedData = nextData as LandingPuckData;
            setEditorData(typedData);
            onChange(applyPuckDataToDraft(draft, typedData));
          }}
          permissions={{
            delete: true,
            duplicate: false,
            insert: true,
          }}
          ui={{
            leftSideBarVisible: true,
            rightSideBarVisible: true,
          }}
          overrides={{
            headerActions: () => <></>,
          }}
          headerTitle="Puck Canvas"
          headerPath="Approved sections only"
          iframe={{
            enabled: false,
          }}
          height="820px"
        />
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  helperNote: {
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid rgba(26, 92, 66, 0.12)",
    background: "rgba(243, 248, 244, 0.92)",
    color: "var(--text-muted)",
    fontSize: "0.94rem",
    lineHeight: 1.5,
  },
  statusRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  statusChip: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(44, 62, 49, 0.08)",
    color: "var(--text)",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  statusChipWarning: {
    background: "rgba(210, 168, 90, 0.18)",
    color: "#7a5b18",
  },
  statusChipReady: {
    background: "rgba(26, 92, 66, 0.12)",
    color: "rgba(26, 92, 66, 0.88)",
  },
  editorWrap: {
    borderRadius: 20,
    overflow: "hidden",
    border: "1px solid rgba(44, 62, 49, 0.1)",
    boxShadow: "0 22px 50px rgba(31, 49, 35, 0.1)",
  },
  canvasStack: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
    background:
      "radial-gradient(circle at top left, rgba(26, 92, 66, 0.08), transparent 35%), linear-gradient(180deg, rgba(247, 250, 246, 0.98), rgba(241, 246, 239, 0.96))",
    minHeight: "100%",
  },
  sectionCard: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(44, 62, 49, 0.1)",
    background: "rgba(255, 255, 255, 0.96)",
    boxShadow: "0 16px 32px rgba(31, 49, 35, 0.08)",
  },
  sectionCardHidden: {
    opacity: 0.72,
    borderStyle: "dashed",
    background: "rgba(248, 248, 246, 0.96)",
  },
  sectionTopline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionLabel: {
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(26, 92, 66, 0.78)",
  },
  badges: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    padding: "5px 10px",
    borderRadius: 999,
    background: "rgba(19, 41, 30, 0.06)",
    color: "rgba(19, 41, 30, 0.74)",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  hiddenBadge: {
    background: "rgba(122, 42, 42, 0.08)",
    color: "rgba(122, 42, 42, 0.82)",
  },
  visibleBadge: {
    background: "rgba(26, 92, 66, 0.1)",
    color: "rgba(26, 92, 66, 0.88)",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1.2rem",
    lineHeight: 1.2,
    color: "var(--text)",
  },
  sectionBody: {
    margin: 0,
    color: "var(--text-muted)",
    lineHeight: 1.6,
  },
  list: {
    display: "grid",
    gap: 8,
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    color: "var(--text)",
  },
  listMarker: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 8,
    flexShrink: 0,
  },
  emptyText: {
    margin: 0,
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  emptyStateCard: {
    display: "grid",
    gap: 6,
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px dashed rgba(44, 62, 49, 0.16)",
    background: "rgba(250, 252, 249, 0.96)",
  },
  emptyStateTitle: {
    color: "var(--text)",
    fontSize: "0.92rem",
    lineHeight: 1.35,
  },
  emptyStateBody: {
    margin: 0,
    color: "var(--text-muted)",
    fontSize: "0.84rem",
    lineHeight: 1.55,
  },
  ctaStack: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  ctaButtonPrimary: {
    padding: "12px 16px",
    borderRadius: 14,
    background: "linear-gradient(135deg, rgba(26, 92, 66, 0.95), rgba(77, 128, 102, 0.88))",
    color: "#fff",
    fontWeight: 700,
  },
  ctaButtonSecondary: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(19, 41, 30, 0.12)",
    background: "rgba(255, 255, 255, 0.96)",
    color: "var(--text)",
    fontWeight: 700,
  },
  urlStack: {
    display: "grid",
    gap: 6,
    color: "var(--text-muted)",
    fontSize: "0.88rem",
  },
  primitiveBlock: {
    padding: "16px 18px",
    borderRadius: 12,
    border: "1px solid rgba(26, 92, 66, 0.1)",
    background: "rgba(255, 255, 255, 0.9)",
  },
  primitiveHeading: {
    margin: 0,
    fontWeight: 700,
    lineHeight: 1.15,
    color: "#171914",
  },
};
