"use client";

import {
  Editor,
  Element,
  Frame,
  useEditor,
  useNode,
} from "@craftjs/core";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  LANDING_BUILDER_SECTION_KEYS,
  type LandingBuilderDraft,
  type LandingBuilderSectionKey,
  type LandingBuilderSectionLayout,
} from "../../lib/landing-builder";

type CraftVisibility = "visible" | "hidden";
type CraftOnNodesChange = NonNullable<ComponentProps<typeof Editor>["onNodesChange"]>;
type CraftQuery = Parameters<CraftOnNodesChange>[0];

interface CraftLandingEditorProps {
  draft: LandingBuilderDraft;
  resetKey: number;
  onChange: (nextDraft: LandingBuilderDraft) => void;
}

interface CraftCanvasProps {
  canvasKey: string;
  children?: ReactNode;
}

interface CraftSectionProps {
  sectionKey: LandingBuilderSectionKey;
  label: string;
  visibility: CraftVisibility;
  layout: LandingBuilderSectionLayout;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  itemsText?: string;
  imageUrlsText?: string;
  primaryLabel?: string;
  primaryUrl?: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
}

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

function countItems(value?: string) {
  return splitListInput(value ?? "").length;
}

function getEmptyStateCopy(sectionKey: LandingBuilderSectionKey) {
  switch (sectionKey) {
    case "features":
      return {
        title: "No approved features yet",
        description: "Add amenities, services, or trust points in the properties panel.",
      };
    case "listings":
      return {
        title: "No listing highlights yet",
        description: "Add portfolio or unit highlights one per line in the properties panel.",
      };
    case "team":
      return {
        title: "No team roles yet",
        description: "Add visible leadership or exco roles to make the page feel complete.",
      };
    case "fees":
      return {
        title: "No pricing guidance yet",
        description: "Add fee items or payment notes to make this section useful.",
      };
    case "notices":
      return {
        title: "No notices yet",
        description: "Add announcements, schedules, or updates in the properties panel.",
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
        description: "Use the properties panel to finish this section.",
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

function getCraftSectionSummary(props: CraftSectionProps) {
  switch (props.sectionKey) {
    case "hero":
      return hasText(props.title) ? "Headline ready" : "Needs a hero headline";
    case "about":
      return hasText(props.body) ? "Overview copy added" : "Needs an overview";
    case "features":
    case "listings":
    case "team":
    case "fees":
    case "notices":
    case "faq": {
      const total = countItems(props.itemsText);
      return total ? `${total} line${total === 1 ? "" : "s"} added` : "No items yet";
    }
    case "gallery": {
      const total = countItems(props.imageUrlsText);
      return total ? `${total} image URL${total === 1 ? "" : "s"} added` : "No gallery images";
    }
    case "contact":
      return "Uses branding email, phone, and address";
    case "cta": {
      const total = [props.primaryLabel, props.secondaryLabel].filter(hasText).length;
      return total ? `${total} CTA label${total === 1 ? "" : "s"} ready` : "Needs CTA labels";
    }
  }
}

function sectionNeedsAttention(props: CraftSectionProps) {
  switch (props.sectionKey) {
    case "hero":
      return !hasText(props.title) || !hasText(props.subtitle);
    case "about":
      return !hasText(props.body);
    case "features":
    case "listings":
    case "team":
    case "fees":
    case "notices":
    case "faq":
      return countItems(props.itemsText) === 0;
    case "gallery":
      return countItems(props.imageUrlsText) === 0;
    case "contact":
      return false;
    case "cta":
      return !hasText(props.primaryLabel) || !hasText(props.primaryUrl);
  }
}

function getVisibility(
  draft: LandingBuilderDraft,
  sectionKey: LandingBuilderSectionKey,
): CraftVisibility {
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

  return [...draft.sectionOrder, ...LANDING_BUILDER_SECTION_KEYS].filter((sectionKey) => {
    if (seen.has(sectionKey)) {
      return false;
    }

    seen.add(sectionKey);
    return true;
  });
}

function createSectionProps(
  draft: LandingBuilderDraft,
  sectionKey: LandingBuilderSectionKey,
): CraftSectionProps {
  const baseProps = {
    sectionKey,
    label:
      sectionKey === "hero"
        ? "Hero"
        : sectionKey === "about"
          ? "About"
          : sectionKey === "features"
            ? "Services / Features"
            : sectionKey === "listings"
              ? "Listings Highlight"
              : sectionKey === "team"
                ? "Team / Exco"
                : sectionKey === "fees"
                  ? "Fees / Payment Info"
                  : sectionKey === "notices"
                    ? "Notices"
                    : sectionKey === "contact"
                      ? "Contact Details"
                      : sectionKey === "faq"
                        ? "FAQ"
                        : sectionKey === "gallery"
                          ? "Gallery"
                          : "CTA Buttons",
    visibility: getVisibility(draft, sectionKey),
    layout: getLayout(draft, sectionKey),
  };

  switch (sectionKey) {
    case "hero":
      return {
        ...baseProps,
        layout: "full",
        eyebrow: draft.heroEyebrow,
        title: draft.heroTitle,
        subtitle: draft.heroSubtitle,
      };
    case "about":
      return {
        ...baseProps,
        title: draft.aboutTitle,
        body: draft.aboutBody,
      };
    case "features":
      return {
        ...baseProps,
        title: draft.featuresTitle,
        body: draft.featuresBody,
        itemsText: joinListInput(draft.featuresItems),
      };
    case "listings":
      return {
        ...baseProps,
        title: draft.listingsTitle,
        body: draft.listingsBody,
        itemsText: joinListInput(draft.listingItems),
      };
    case "team":
      return {
        ...baseProps,
        title: draft.teamTitle,
        body: draft.teamBody,
        itemsText: joinListInput(draft.teamItems),
      };
    case "fees":
      return {
        ...baseProps,
        title: draft.feesTitle,
        body: draft.feesBody,
        itemsText: joinListInput(draft.feeItems),
      };
    case "notices":
      return {
        ...baseProps,
        title: draft.noticesTitle,
        body: draft.noticesBody,
        itemsText: joinListInput(draft.noticeItems),
      };
    case "contact":
      return {
        ...baseProps,
        title: draft.contactTitle,
      };
    case "faq":
      return {
        ...baseProps,
        title: draft.faqTitle,
        itemsText: joinListInput(draft.faqItems),
      };
    case "gallery":
      return {
        ...baseProps,
        title: draft.galleryTitle,
        body: draft.galleryBody,
        imageUrlsText: joinListInput(draft.galleryImageUrls),
      };
    case "cta":
      return {
        ...baseProps,
        primaryLabel: draft.ctaPrimaryLabel,
        primaryUrl: draft.ctaPrimaryUrl,
        secondaryLabel: draft.ctaSecondaryLabel,
        secondaryUrl: draft.ctaSecondaryUrl,
      };
  }
}

function applyCraftQueryToDraft(
  currentDraft: LandingBuilderDraft,
  query: CraftQuery,
): LandingBuilderDraft {
  const nodes = query.getNodes();
  const canvasNode = Object.values(nodes).find(
    (node) => node.data.props?.canvasKey === "landing-canvas",
  );

  if (!canvasNode) {
    return currentDraft;
  }

  const nextDraft = { ...currentDraft };
  const nextOrder: LandingBuilderSectionKey[] = [];
  const hiddenKeys = new Set<LandingBuilderSectionKey>();
  const nextLayouts: Partial<Record<LandingBuilderSectionKey, LandingBuilderSectionLayout>> = {};
  const seen = new Set<LandingBuilderSectionKey>();

  for (const nodeId of canvasNode.data.nodes ?? []) {
    const node = nodes[nodeId];
    const props = node?.data.props as CraftSectionProps | undefined;
    const sectionKey = props?.sectionKey;

    if (!sectionKey || !LANDING_BUILDER_SECTION_KEYS.includes(sectionKey) || seen.has(sectionKey)) {
      continue;
    }

    seen.add(sectionKey);
    nextOrder.push(sectionKey);

    if (props.visibility === "hidden") {
      hiddenKeys.add(sectionKey);
    }

    nextLayouts[sectionKey] =
      sectionKey === "hero" ? "full" : props.layout ?? getLayout(currentDraft, sectionKey);

    switch (sectionKey) {
      case "hero":
        nextDraft.heroEyebrow = props.eyebrow ?? "";
        nextDraft.heroTitle = props.title ?? "";
        nextDraft.heroSubtitle = props.subtitle ?? "";
        break;
      case "about":
        nextDraft.aboutTitle = props.title ?? "";
        nextDraft.aboutBody = props.body ?? "";
        break;
      case "features":
        nextDraft.featuresTitle = props.title ?? "";
        nextDraft.featuresBody = props.body ?? "";
        nextDraft.featuresItems = splitListInput(props.itemsText ?? "");
        break;
      case "listings":
        nextDraft.listingsTitle = props.title ?? "";
        nextDraft.listingsBody = props.body ?? "";
        nextDraft.listingItems = splitListInput(props.itemsText ?? "");
        break;
      case "team":
        nextDraft.teamTitle = props.title ?? "";
        nextDraft.teamBody = props.body ?? "";
        nextDraft.teamItems = splitListInput(props.itemsText ?? "");
        break;
      case "fees":
        nextDraft.feesTitle = props.title ?? "";
        nextDraft.feesBody = props.body ?? "";
        nextDraft.feeItems = splitListInput(props.itemsText ?? "");
        break;
      case "notices":
        nextDraft.noticesTitle = props.title ?? "";
        nextDraft.noticesBody = props.body ?? "";
        nextDraft.noticeItems = splitListInput(props.itemsText ?? "");
        break;
      case "contact":
        nextDraft.contactTitle = props.title ?? "";
        break;
      case "faq":
        nextDraft.faqTitle = props.title ?? "";
        nextDraft.faqItems = splitListInput(props.itemsText ?? "");
        break;
      case "gallery":
        nextDraft.galleryTitle = props.title ?? "";
        nextDraft.galleryBody = props.body ?? "";
        nextDraft.galleryImageUrls = splitListInput(props.imageUrlsText ?? "");
        break;
      case "cta":
        nextDraft.ctaPrimaryLabel = props.primaryLabel ?? "";
        nextDraft.ctaPrimaryUrl = props.primaryUrl ?? "";
        nextDraft.ctaSecondaryLabel = props.secondaryLabel ?? "";
        nextDraft.ctaSecondaryUrl = props.secondaryUrl ?? "";
        break;
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

function renderListPreview(
  sectionKey: LandingBuilderSectionKey,
  itemsText?: string,
  tone: "green" | "gold" = "green",
) {
  const items = splitListInput(itemsText ?? "").slice(0, 4);

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

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel";
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      style={styles.input}
    />
  );
}

function TextAreaInput({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value?: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{ ...styles.input, ...styles.textarea }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value?: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={onChange}
      disabled={disabled}
      style={styles.input}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function CraftLandingCanvas({ children }: CraftCanvasProps) {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(dom) => {
        if (dom) {
          connect(dom);
        }
      }}
      style={styles.canvasInner}
    >
      {children}
    </div>
  );
}

function CraftLandingSection(props: CraftSectionProps) {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((node) => ({
    selected: node.events.selected,
  }));

  const isHidden = props.visibility === "hidden";
  const cardStyle = {
    ...styles.sectionCard,
    ...(selected ? styles.sectionCardSelected : null),
    ...(isHidden ? styles.sectionCardHidden : null),
  };

  return (
    <div
      ref={(dom) => {
        if (dom) {
          connect(drag(dom));
        }
      }}
      style={cardStyle}
    >
      <div style={styles.sectionTopline}>
        <span style={styles.sectionLabel}>{props.label}</span>
        <div style={styles.badges}>
          <span style={styles.badge}>{props.layout}</span>
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

      {props.sectionKey === "hero" ? (
        <>
          <div style={styles.heroEyebrow}>{props.eyebrow || "Hero"}</div>
          <h3 style={styles.sectionTitle}>{props.title || "Hero title"}</h3>
          {props.subtitle ? <p style={styles.sectionBody}>{props.subtitle}</p> : null}
        </>
      ) : props.sectionKey === "cta" ? (
        <>
          <h3 style={styles.sectionTitle}>Calls to action</h3>
          <div style={styles.ctaStack}>
            <div style={styles.ctaButtonPrimary}>{props.primaryLabel || "Primary CTA"}</div>
            <div style={styles.ctaButtonSecondary}>{props.secondaryLabel || "Secondary CTA"}</div>
          </div>
          <div style={styles.urlStack}>
            <span>{props.primaryUrl || "/portal"}</span>
            <span>{props.secondaryUrl || "mailto:support@workspace.com"}</span>
          </div>
        </>
      ) : (
        <>
          <h3 style={styles.sectionTitle}>{props.title || props.label}</h3>
          {props.body ? <p style={styles.sectionBody}>{props.body}</p> : null}
          {props.sectionKey === "contact" ? (
            <p style={styles.emptyText}>
              Support details still come from the branding panel above.
            </p>
          ) : null}
          {["features", "listings", "team", "fees", "notices", "faq"].includes(props.sectionKey)
            ? renderListPreview(
                props.sectionKey,
                props.itemsText,
                ["listings", "fees"].includes(props.sectionKey) ? "gold" : "green",
              )
            : null}
          {props.sectionKey === "gallery"
            ? renderListPreview(props.sectionKey, props.imageUrlsText, "gold")
            : null}
        </>
      )}
    </div>
  );
}

CraftLandingCanvas.craft = {
  displayName: "Landing Canvas",
};

CraftLandingSection.craft = {
  displayName: "Landing Section",
};

function CraftSidebar() {
  const { selectedId, actions, nodes } = useEditor((state) => ({
    selectedId: Array.from(state.events.selected || [])[0] ?? null,
    nodes: state.nodes,
  }));

  const layers = useMemo(() => {
    const canvasNode = Object.values(nodes).find(
      (node) => node.data.props?.canvasKey === "landing-canvas",
    );

    if (!canvasNode) {
      return [];
    }

    return (canvasNode.data.nodes ?? [])
      .map((nodeId, index) => {
        const node = nodes[nodeId];
        const props = (node?.data.props ?? null) as CraftSectionProps | null;

        if (!props?.sectionKey) {
          return null;
        }

        return {
          id: nodeId,
          index,
          isSelected: selectedId === nodeId,
          props,
        };
      })
      .filter(
        (
          layer,
        ): layer is {
          id: string;
          index: number;
          isSelected: boolean;
          props: CraftSectionProps;
        } => Boolean(layer),
      );
  }, [nodes, selectedId]);

  const props = layers.find((layer) => layer.isSelected)?.props ?? null;
  const visibleLayerCount = layers.filter((layer) => layer.props.visibility === "visible").length;
  const attentionCount = layers.filter((layer) => sectionNeedsAttention(layer.props)).length;

  function updateSelectedProp<K extends keyof CraftSectionProps>(
    key: K,
    value: CraftSectionProps[K],
  ) {
    if (!selectedId) {
      return;
    }

    actions.setProp(selectedId, (draftProps: CraftSectionProps) => {
      draftProps[key] = value;
    });
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarPanel}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>Layers</div>
          <div style={styles.sidebarMeta}>{layers.length} approved sections</div>
        </div>
        <p style={styles.sidebarCopy}>
          Click a layer to edit it here, or drag the cards on the canvas to change the order.
        </p>
        <div style={styles.sidebarSummaryRow}>
          <span style={styles.sidebarChip}>{visibleLayerCount} visible</span>
          <span style={styles.sidebarChip}>{layers.length - visibleLayerCount} hidden</span>
          <span
            style={{
              ...styles.sidebarChip,
              ...(attentionCount ? styles.sidebarChipWarning : styles.sidebarChipReady),
            }}
          >
            {attentionCount
              ? `${attentionCount} section${attentionCount === 1 ? "" : "s"} need content`
              : "All sections have core content"}
          </span>
        </div>
        <div style={styles.layerList}>
          {layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => actions.selectNode(layer.id)}
              style={{
                ...styles.layerButton,
                ...(layer.isSelected ? styles.layerButtonSelected : null),
                ...(layer.props.visibility === "hidden" ? styles.layerButtonHidden : null),
              }}
            >
              <span style={styles.layerIndex}>
                {String(layer.index + 1).padStart(2, "0")}
              </span>
              <span style={styles.layerBody}>
                <span style={styles.layerTitleRow}>
                  <strong style={styles.layerTitle}>{layer.props.label}</strong>
                </span>
                <span style={styles.layerSummary}>{getCraftSectionSummary(layer.props)}</span>
                <span style={styles.layerMetaRow}>
                  <span style={styles.layerTag}>{layer.props.layout}</span>
                  <span
                    style={{
                      ...styles.layerTag,
                      ...(layer.props.visibility === "hidden"
                        ? styles.layerTagHidden
                        : styles.layerTagVisible),
                    }}
                  >
                    {layer.props.visibility === "hidden" ? "Hidden" : "Visible"}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.sidebarPanel}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>Properties</div>
          <div style={styles.sidebarMeta}>
            {props?.sectionKey ? "Selected in Craft" : "Select a layer"}
          </div>
        </div>

        {!selectedId || !props?.sectionKey ? (
          <>
            <p style={styles.sidebarCopy}>
              Choose a section from Layers or click a card in the canvas to edit its approved
              fields here.
            </p>
            <div style={styles.emptyStateCard}>
              <strong style={styles.emptyStateTitle}>Start with Hero or About</strong>
              <p style={styles.emptyStateBody}>
                Those two sections usually shape the rest of the page fastest, and the layers rail
                on top will keep the current section order visible while you work.
              </p>
            </div>
          </>
        ) : (
          <div style={styles.sidebarStack}>
            <div
              style={{
                ...styles.sidebarHint,
                ...(sectionNeedsAttention(props)
                  ? styles.sidebarHintWarning
                  : styles.sidebarHintReady),
              }}
            >
              {sectionNeedsAttention(props)
                ? "This section still needs a bit more content before the public preview will feel complete."
                : "This section already has enough core content to preview well."}
            </div>

            <FieldShell label="Visibility">
              <SelectInput
                value={props.visibility}
                onChange={(event) =>
                  updateSelectedProp("visibility", event.target.value as CraftVisibility)
                }
                options={VISIBILITY_OPTIONS}
              />
            </FieldShell>

            <FieldShell label="Width">
              <SelectInput
                value={props.sectionKey === "hero" ? "full" : props.layout}
                onChange={(event) =>
                  updateSelectedProp(
                    "layout",
                    event.target.value as LandingBuilderSectionLayout,
                  )
                }
                options={LAYOUT_OPTIONS}
                disabled={props.sectionKey === "hero"}
              />
            </FieldShell>

            {props.sectionKey === "hero" ? (
              <>
                <FieldShell label="Eyebrow">
                  <TextInput
                    value={props.eyebrow}
                    onChange={(event) => updateSelectedProp("eyebrow", event.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Hero title">
                  <TextInput
                    value={props.title}
                    onChange={(event) => updateSelectedProp("title", event.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Hero subtitle">
                  <TextAreaInput
                    value={props.subtitle}
                    rows={4}
                    onChange={(event) => updateSelectedProp("subtitle", event.target.value)}
                  />
                </FieldShell>
              </>
            ) : null}

            {["about", "features", "listings", "team", "fees", "notices", "contact", "faq", "gallery"].includes(
              props.sectionKey,
            ) ? (
              <FieldShell label="Section title">
                <TextInput
                  value={props.title}
                  onChange={(event) => updateSelectedProp("title", event.target.value)}
                />
              </FieldShell>
            ) : null}

            {["about", "features", "listings", "team", "fees", "notices", "gallery"].includes(
              props.sectionKey,
            ) ? (
              <FieldShell label="Section copy">
                <TextAreaInput
                  value={props.body}
                  rows={4}
                  onChange={(event) => updateSelectedProp("body", event.target.value)}
                />
              </FieldShell>
            ) : null}

            {["features", "listings", "team", "fees", "notices", "faq"].includes(props.sectionKey) ? (
              <FieldShell
                label={
                  props.sectionKey === "features"
                    ? "Items"
                    : props.sectionKey === "listings"
                      ? "Listing highlights"
                      : props.sectionKey === "fees"
                        ? "Fee items"
                        : props.sectionKey === "faq"
                          ? "Questions or answers"
                          : "Items"
                }
              >
                <TextAreaInput
                  value={props.itemsText}
                  rows={5}
                  onChange={(event) => updateSelectedProp("itemsText", event.target.value)}
                  placeholder="One approved item per line"
                />
              </FieldShell>
            ) : null}

            {props.sectionKey === "gallery" ? (
              <FieldShell label="Image URLs">
                <TextAreaInput
                  value={props.imageUrlsText}
                  rows={5}
                  onChange={(event) => updateSelectedProp("imageUrlsText", event.target.value)}
                  placeholder="One HTTPS image URL per line"
                />
              </FieldShell>
            ) : null}

            {props.sectionKey === "cta" ? (
              <>
                <FieldShell label="Primary CTA label">
                  <TextInput
                    value={props.primaryLabel}
                    onChange={(event) => updateSelectedProp("primaryLabel", event.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Primary CTA URL">
                  <TextInput
                    value={props.primaryUrl}
                    onChange={(event) => updateSelectedProp("primaryUrl", event.target.value)}
                    placeholder="/portal"
                  />
                </FieldShell>
                <FieldShell label="Secondary CTA label">
                  <TextInput
                    value={props.secondaryLabel}
                    onChange={(event) => updateSelectedProp("secondaryLabel", event.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Secondary CTA URL">
                  <TextInput
                    value={props.secondaryUrl}
                    onChange={(event) => updateSelectedProp("secondaryUrl", event.target.value)}
                    placeholder="mailto:support@workspace.com"
                  />
                </FieldShell>
              </>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

export default function CraftLandingEditor({
  draft,
  resetKey,
  onChange,
}: CraftLandingEditorProps) {
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const sections = useMemo(
    () => getOrderedSectionKeys(draft).map((sectionKey) => createSectionProps(draft, sectionKey)),
    [draft, resetKey],
  );
  const visibleSectionCount = useMemo(
    () => sections.filter((section) => section.visibility === "visible").length,
    [sections],
  );
  const sectionsNeedingContent = useMemo(
    () => sections.filter((section) => sectionNeedsAttention(section)).length,
    [sections],
  );

  return (
    <div style={styles.shell}>
      <div style={styles.helperNote}>
        Drag approved section cards into order on the left, then edit the selected section from the
        Craft properties panel on the right. This stays synced with the landing-page preview and
        publish flow.
      </div>

      <div style={styles.statusRow}>
        <span style={styles.statusChip}>{sections.length} approved sections</span>
        <span style={styles.statusChip}>{visibleSectionCount} visible</span>
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

      <div style={styles.editorLayout}>
        <Editor
          resolver={{ CraftLandingCanvas, CraftLandingSection }}
          onNodesChange={(query) => {
            startTransition(() => {
              onChange(applyCraftQueryToDraft(draftRef.current, query));
            });
          }}
        >
          <div style={styles.canvasColumn}>
            <div style={styles.editorWrap}>
              <Frame key={resetKey}>
                <Element is={CraftLandingCanvas} canvas canvasKey="landing-canvas">
                  {sections.map((section) => (
                    <Element
                      key={section.sectionKey}
                      id={`${section.sectionKey}-section`}
                      is={CraftLandingSection}
                      {...section}
                    />
                  ))}
                </Element>
              </Frame>
            </div>
          </div>
          <CraftSidebar />
        </Editor>
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
  editorLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.8fr)",
    gap: 16,
    alignItems: "start",
  },
  canvasColumn: {
    minWidth: 0,
  },
  editorWrap: {
    borderRadius: 20,
    overflow: "hidden",
    border: "1px solid rgba(44, 62, 49, 0.1)",
    boxShadow: "0 22px 50px rgba(31, 49, 35, 0.1)",
    background:
      "radial-gradient(circle at top left, rgba(26, 92, 66, 0.08), transparent 35%), linear-gradient(180deg, rgba(247, 250, 246, 0.98), rgba(241, 246, 239, 0.96))",
  },
  canvasInner: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
    minHeight: 820,
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
    cursor: "grab",
  },
  sectionCardSelected: {
    borderColor: "rgba(26, 92, 66, 0.34)",
    boxShadow: "0 22px 44px rgba(26, 92, 66, 0.14)",
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
  heroEyebrow: {
    fontSize: "0.8rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(26, 92, 66, 0.76)",
    fontWeight: 700,
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
  sidebar: {
    display: "grid",
    gap: 16,
    position: "sticky",
    top: 16,
  },
  sidebarPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(44, 62, 49, 0.1)",
    background: "rgba(255, 255, 255, 0.96)",
    boxShadow: "0 16px 32px rgba(31, 49, 35, 0.08)",
  },
  sidebarHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  sidebarTitle: {
    fontSize: "1rem",
    fontWeight: 800,
    color: "var(--text)",
  },
  sidebarMeta: {
    fontSize: "0.78rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(26, 92, 66, 0.72)",
    fontWeight: 700,
  },
  sidebarCopy: {
    margin: 0,
    color: "var(--text-muted)",
    lineHeight: 1.6,
  },
  sidebarSummaryRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  sidebarChip: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(19, 41, 30, 0.06)",
    color: "rgba(19, 41, 30, 0.78)",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  sidebarChipWarning: {
    background: "rgba(210, 168, 90, 0.18)",
    color: "#7a5b18",
  },
  sidebarChipReady: {
    background: "rgba(26, 92, 66, 0.12)",
    color: "rgba(26, 92, 66, 0.88)",
  },
  layerList: {
    display: "grid",
    gap: 10,
  },
  layerButton: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gap: 12,
    alignItems: "start",
    width: "100%",
    padding: "14px 14px 14px 12px",
    borderRadius: 16,
    border: "1px solid rgba(44, 62, 49, 0.1)",
    background: "rgba(247, 250, 246, 0.96)",
    textAlign: "left",
    cursor: "pointer",
    transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
  },
  layerButtonSelected: {
    borderColor: "rgba(26, 92, 66, 0.28)",
    boxShadow: "0 16px 32px rgba(26, 92, 66, 0.12)",
    transform: "translateY(-1px)",
    background: "rgba(243, 248, 244, 0.98)",
  },
  layerButtonHidden: {
    opacity: 0.9,
    borderStyle: "dashed",
  },
  layerIndex: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 34,
    height: 34,
    borderRadius: 12,
    background: "rgba(26, 92, 66, 0.08)",
    color: "rgba(26, 92, 66, 0.84)",
    fontSize: "0.78rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
  },
  layerBody: {
    display: "grid",
    gap: 8,
    minWidth: 0,
  },
  layerTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  layerTitle: {
    fontSize: "0.95rem",
    lineHeight: 1.3,
    color: "var(--text)",
  },
  layerSummary: {
    color: "var(--text-muted)",
    fontSize: "0.84rem",
    lineHeight: 1.5,
  },
  layerMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  layerTag: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(19, 41, 30, 0.06)",
    color: "rgba(19, 41, 30, 0.74)",
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  layerTagVisible: {
    background: "rgba(26, 92, 66, 0.1)",
    color: "rgba(26, 92, 66, 0.88)",
  },
  layerTagHidden: {
    background: "rgba(122, 42, 42, 0.08)",
    color: "rgba(122, 42, 42, 0.82)",
  },
  sidebarStack: {
    display: "grid",
    gap: 14,
  },
  sidebarHint: {
    padding: "12px 14px",
    borderRadius: 14,
    fontSize: "0.86rem",
    lineHeight: 1.55,
  },
  sidebarHintWarning: {
    background: "rgba(210, 168, 90, 0.14)",
    color: "#7a5b18",
  },
  sidebarHintReady: {
    background: "rgba(26, 92, 66, 0.08)",
    color: "rgba(26, 92, 66, 0.88)",
  },
  field: {
    display: "grid",
    gap: 6,
  },
  fieldLabel: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "var(--text)",
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(19, 41, 30, 0.12)",
    background: "#fff",
    padding: "10px 12px",
    fontSize: "0.94rem",
    color: "var(--text)",
  },
  textarea: {
    resize: "vertical",
  },
};
