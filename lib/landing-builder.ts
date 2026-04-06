import type { LandingTemplateThumbnailId } from "../components/estate/LandingTemplateThumbnail";

export type LandingBuilderWorkspace = "estate" | "property";

export type LandingBuilderSectionKey =
  | "hero"
  | "about"
  | "features"
  | "listings"
  | "team"
  | "fees"
  | "notices"
  | "contact"
  | "faq"
  | "gallery"
  | "cta";

export type LandingBuilderTemplateId =
  | "estate-official"
  | "estate-resident"
  | "estate-fees"
  | "estate-exco"
  | "property-profile"
  | "property-leasing"
  | "property-portfolio"
  | "property-corporate";

export interface LandingBuilderProfile {
  companyName: string;
  workspaceMode?: "SOLO_LANDLORD" | "PROPERTY_MANAGER_COMPANY" | "ESTATE_ADMIN" | null;
  workspaceSlug?: string | null;
  workspaceOrigin?: string | null;
  brandDisplayName?: string | null;
  brandLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
  publicSupportEmail?: string | null;
  publicSupportPhone?: string | null;
  publicLegalAddress?: string | null;
}

export interface LandingBuilderTemplate {
  id: LandingBuilderTemplateId;
  workspace: LandingBuilderWorkspace;
  name: string;
  category: string;
  summary: string;
  description: string;
  previewTemplateId: LandingTemplateThumbnailId;
  recommendedSections: LandingBuilderSectionKey[];
  defaults: Partial<LandingBuilderDraft>;
}

export interface LandingBuilderDraft {
  templateId: LandingBuilderTemplateId;
  hiddenSectionKeys: LandingBuilderSectionKey[];
  sectionOrder: LandingBuilderSectionKey[];
  brandDisplayName: string;
  brandLogoUrl: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  publicSupportEmail: string;
  publicSupportPhone: string;
  publicLegalAddress: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutBody: string;
  featuresTitle: string;
  featuresBody: string;
  featuresItems: string[];
  listingsTitle: string;
  listingsBody: string;
  listingItems: string[];
  teamTitle: string;
  teamBody: string;
  teamItems: string[];
  feesTitle: string;
  feesBody: string;
  feeItems: string[];
  noticesTitle: string;
  noticesBody: string;
  noticeItems: string[];
  contactTitle: string;
  faqTitle: string;
  faqItems: string[];
  galleryTitle: string;
  galleryBody: string;
  galleryImageUrls: string[];
  ctaPrimaryLabel: string;
  ctaPrimaryUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
}

export const LANDING_BUILDER_SECTIONS: Array<{
  key: LandingBuilderSectionKey;
  label: string;
  description: string;
}> = [
  {
    key: "hero",
    label: "Hero",
    description: "Main headline, subheading, and opening promise.",
  },
  {
    key: "about",
    label: "About",
    description: "A quick intro to the community, company, or portfolio.",
  },
  {
    key: "features",
    label: "Services / Features",
    description: "Key services, amenities, or trust-building highlights.",
  },
  {
    key: "listings",
    label: "Listings Highlight",
    description: "Featured properties, units, or leasing opportunities.",
  },
  {
    key: "team",
    label: "Team / Exco",
    description: "Visible leadership, exco roles, or property managers.",
  },
  {
    key: "fees",
    label: "Fees / Payment Info",
    description: "Pricing guidance, dues, and payment-related information.",
  },
  {
    key: "notices",
    label: "Notices",
    description: "Announcements, schedules, and resident updates.",
  },
  {
    key: "contact",
    label: "Contact Details",
    description: "Support email, phone line, and legal or office address.",
  },
  {
    key: "faq",
    label: "FAQ",
    description: "Approved questions and short answers for common requests.",
  },
  {
    key: "gallery",
    label: "Gallery",
    description: "Curated image slots for properties, facilities, or events.",
  },
  {
    key: "cta",
    label: "CTA Buttons",
    description: "Primary and secondary actions for enquiries and conversions.",
  },
];

export const LANDING_BUILDER_SECTION_KEYS = LANDING_BUILDER_SECTIONS.map(
  (section) => section.key,
);

const LANDING_TEMPLATES: LandingBuilderTemplate[] = [
  {
    id: "estate-official",
    workspace: "estate",
    name: "Estate Official Page",
    category: "Residents association",
    summary: "Best for the main estate website with dues, notices, and contact details.",
    description:
      "A formal official page for resident-facing communication, billing guidance, and estate office contact points.",
    previewTemplateId: "estate-official",
    recommendedSections: ["hero", "about", "fees", "notices", "contact", "faq", "cta"],
    defaults: {
      heroEyebrow: "Approved community updates",
      heroTitle: "Welcome to the official estate page",
      heroSubtitle:
        "Share estate notices, dues guidance, office contacts, and resident-service updates from one trusted destination.",
      aboutTitle: "About the estate",
      aboutBody:
        "Introduce the estate, its standards, and what residents should expect from the management or exco team.",
      feesTitle: "Estate dues and payment information",
      feesBody:
        "Clarify current estate levies, fee cycles, and the best channel for payment follow-up.",
      feeItems: ["Monthly service charge", "Security levy", "Special project dues"],
      noticesTitle: "Latest notices",
      noticesBody:
        "Use this area for AGM reminders, utility advisories, visitor guidelines, and facility updates.",
      noticeItems: ["Gate access reminders", "Power and water updates", "Upcoming meetings"],
      faqTitle: "Resident questions",
      faqItems: [
        "How do residents make estate payments?",
        "Where can I see official notices?",
        "Who do I contact for gate or facility issues?",
      ],
      ctaPrimaryLabel: "Open resident portal",
      ctaSecondaryLabel: "Contact estate desk",
    },
  },
  {
    id: "estate-resident",
    workspace: "estate",
    name: "Resident Information Page",
    category: "Information hub",
    summary: "Best for onboarding residents into notices, FAQs, and service contacts.",
    description:
      "A lighter information-first template that helps residents quickly find what to do, who to contact, and where to get updates.",
    previewTemplateId: "estate-resident",
    recommendedSections: ["hero", "features", "notices", "contact", "faq", "gallery", "cta"],
    defaults: {
      heroEyebrow: "Everything residents need in one place",
      heroTitle: "Resident information and service guide",
      heroSubtitle:
        "Keep new and existing residents informed with service guidance, emergency contacts, and clear next steps.",
      featuresTitle: "Resident services",
      featuresBody:
        "Show the approved services or support channels that residents can rely on.",
      featuresItems: [
        "Visitor pass and gate access guidance",
        "Service request contacts",
        "Committee and meeting updates",
      ],
      noticesTitle: "Resident updates",
      noticesBody:
        "Highlight estate operations, maintenance schedules, and community-wide announcements.",
      noticeItems: [
        "Weekend maintenance windows",
        "Waste and sanitation reminders",
        "General resident advisories",
      ],
      galleryTitle: "Community snapshots",
      galleryBody:
        "Use a small curated gallery to reinforce trust and show the estate environment residents can expect.",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1484154218962-a197022b5858",
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
        "https://images.unsplash.com/photo-1460317442991-0ec209397118",
      ],
      faqTitle: "Helpful answers",
      faqItems: [
        "How do I request visitor access?",
        "Where can I find emergency numbers?",
        "How are community updates shared?",
      ],
      ctaPrimaryLabel: "View resident updates",
      ctaSecondaryLabel: "Contact admin office",
    },
  },
  {
    id: "estate-fees",
    workspace: "estate",
    name: "Fees and Notices Board",
    category: "Payments and notices",
    summary: "Best for estates that want dues, levies, and notice visibility up front.",
    description:
      "Designed for billing transparency, scheduled dues, project levies, and official public notices.",
    previewTemplateId: "estate-fees",
    recommendedSections: ["hero", "fees", "notices", "faq", "contact", "cta"],
    defaults: {
      heroEyebrow: "Transparent estate billing",
      heroTitle: "Fees, levies, and official announcements",
      heroSubtitle:
        "Keep dues schedules and community notices easy to review before residents need to ask for help.",
      feesTitle: "Current fees",
      feesBody:
        "Display the approved recurring charges, one-off levies, and collection expectations.",
      feeItems: [
        "Monthly estate service charge",
        "Quarterly environmental levy",
        "Special infrastructure contribution",
      ],
      noticesTitle: "Public notice board",
      noticesBody:
        "Summarise deadlines, planned works, and community-wide communications in one controlled space.",
      noticeItems: [
        "Collection deadlines",
        "Upcoming infrastructure works",
        "Community compliance reminders",
      ],
      faqTitle: "Payment FAQs",
      faqItems: [
        "Which fees are recurring?",
        "How can residents confirm payment?",
        "Who handles levy-related disputes?",
      ],
      ctaPrimaryLabel: "View payment guidance",
      ctaSecondaryLabel: "Contact finance desk",
    },
  },
  {
    id: "estate-exco",
    workspace: "estate",
    name: "Exco and Community Highlights",
    category: "Leadership and trust",
    summary: "Best for estates that want to spotlight exco members, committees, and community activity.",
    description:
      "A people-first template for associations that want visible leadership, committee highlights, and trustworthy public messaging.",
    previewTemplateId: "estate-exco",
    recommendedSections: ["hero", "about", "team", "gallery", "notices", "contact", "cta"],
    defaults: {
      heroEyebrow: "Leadership, service, and community trust",
      heroTitle: "Meet the estate exco and community team",
      heroSubtitle:
        "Introduce the people behind the estate administration and make communication channels feel open and official.",
      aboutTitle: "How the estate is governed",
      aboutBody:
        "Explain your committee structure, service standards, and how decisions or notices are communicated.",
      teamTitle: "Exco and committee members",
      teamBody:
        "Use this section to make public-facing leadership visible and credible.",
      teamItems: ["Chairperson", "Secretary", "Treasurer", "Infrastructure committee"],
      galleryTitle: "Community gallery",
      galleryBody:
        "Highlight facilities, estate events, and shared spaces with approved imagery.",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1448630360428-65456885c650",
        "https://images.unsplash.com/photo-1511818966892-d7d671e672a2",
        "https://images.unsplash.com/photo-1494526585095-c41746248156",
      ],
      noticesTitle: "Community highlights",
      noticesBody:
        "Share recent milestones, upcoming events, or committee-driven improvements.",
      noticeItems: [
        "Estate clean-up schedule",
        "Community event reminders",
        "Committee progress updates",
      ],
      ctaPrimaryLabel: "Meet the leadership team",
      ctaSecondaryLabel: "Send an enquiry",
    },
  },
  {
    id: "property-profile",
    workspace: "property",
    name: "Property Company Profile",
    category: "Company profile",
    summary: "Best for positioning a landlord brand or property company with trust and service clarity.",
    description:
      "A polished company-profile layout for firms that want to show who they are, what they manage, and how prospects can reach them.",
    previewTemplateId: "property-profile",
    recommendedSections: ["hero", "about", "features", "team", "contact", "cta"],
    defaults: {
      heroEyebrow: "Modern property operations",
      heroTitle: "A trusted partner for rentals, management, and resident service",
      heroSubtitle:
        "Showcase your company profile, service range, and reputation with a clean enterprise-friendly landing page.",
      aboutTitle: "Who we are",
      aboutBody:
        "Introduce your property company, portfolio focus, and operating standards in plain language.",
      featuresTitle: "What we offer",
      featuresBody:
        "Give prospects a quick, controlled summary of the services your team provides.",
      featuresItems: [
        "Property management operations",
        "Tenant onboarding and support",
        "Rent collection and reporting",
      ],
      teamTitle: "Leadership and operations team",
      teamBody:
        "Add a short introduction to the people clients and residents can expect to work with.",
      teamItems: ["Managing partner", "Leasing lead", "Operations manager"],
      ctaPrimaryLabel: "Book an introduction",
      ctaSecondaryLabel: "Contact our team",
    },
  },
  {
    id: "property-leasing",
    workspace: "property",
    name: "Available Listings / Leasing Page",
    category: "Leasing",
    summary: "Best for available units, leasing campaigns, and enquiry conversion.",
    description:
      "A listings-first template that keeps hero messaging, featured properties, and CTA conversion tightly controlled.",
    previewTemplateId: "property-leasing",
    recommendedSections: ["hero", "listings", "features", "gallery", "contact", "cta"],
    defaults: {
      heroEyebrow: "Now leasing",
      heroTitle: "Explore available units and request a guided inspection",
      heroSubtitle:
        "Lead with active listings, inspection CTAs, and just enough supporting detail to build trust quickly.",
      listingsTitle: "Featured listings",
      listingsBody:
        "Use approved content blocks to highlight your priority properties or unit categories.",
      listingItems: [
        "2-bedroom apartments in Lekki",
        "Serviced corporate units in Victoria Island",
        "Family homes in gated communities",
      ],
      featuresTitle: "Why prospects choose us",
      featuresBody:
        "Reinforce confidence with a short list of leasing and management advantages.",
      featuresItems: [
        "Verified unit availability",
        "Inspection scheduling support",
        "Transparent leasing process",
      ],
      galleryTitle: "Property gallery",
      galleryBody:
        "Use image slots for exterior shots, interiors, and standout amenities.",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
        "https://images.unsplash.com/photo-1460317442991-0ec209397118",
        "https://images.unsplash.com/photo-1494526585095-c41746248156",
      ],
      ctaPrimaryLabel: "View available listings",
      ctaSecondaryLabel: "Request inspection",
    },
  },
  {
    id: "property-portfolio",
    workspace: "property",
    name: "Corporate Portfolio Page",
    category: "Portfolio showcase",
    summary: "Best for multi-property groups that want to display portfolio depth and credibility.",
    description:
      "A strong portfolio narrative with room for featured properties, operational scale, and curated visuals.",
    previewTemplateId: "property-portfolio",
    recommendedSections: ["hero", "about", "listings", "gallery", "team", "cta"],
    defaults: {
      heroEyebrow: "Portfolio confidence",
      heroTitle: "A corporate real estate portfolio built for scale",
      heroSubtitle:
        "Present your property footprint, featured assets, and the team that keeps operations moving smoothly.",
      aboutTitle: "Portfolio overview",
      aboutBody:
        "Summarise your footprint, geographic focus, and the kind of assets you manage or lease.",
      listingsTitle: "Featured assets",
      listingsBody:
        "Highlight representative properties or development categories with short controlled summaries.",
      listingItems: [
        "Premium residential developments",
        "Serviced business apartments",
        "Managed mixed-use estates",
      ],
      galleryTitle: "Portfolio snapshots",
      galleryBody:
        "Show a few high-quality asset images without opening up a free-form page builder.",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1448630360428-65456885c650",
        "https://images.unsplash.com/photo-1494526585095-c41746248156",
        "https://images.unsplash.com/photo-1511818966892-d7d671e672a2",
      ],
      teamTitle: "People behind the portfolio",
      teamBody:
        "Introduce the executive or operations team responsible for the portfolio.",
      teamItems: ["Portfolio director", "Operations lead", "Leasing and growth lead"],
      ctaPrimaryLabel: "Explore our portfolio",
      ctaSecondaryLabel: "Request the brochure",
    },
  },
  {
    id: "property-corporate",
    workspace: "property",
    name: "Managed Properties Showcase",
    category: "Enterprise showcase",
    summary: "Best for property managers who need a more corporate, services-led public presence.",
    description:
      "A services-led enterprise template for management companies, landlord groups, and corporate leasing teams.",
    previewTemplateId: "property-corporate",
    recommendedSections: ["hero", "about", "features", "team", "faq", "contact", "cta"],
    defaults: {
      heroEyebrow: "Enterprise property operations",
      heroTitle: "Management, leasing, and resident service under one operating team",
      heroSubtitle:
        "Give enterprise clients and residents a clear overview of your operating model, support channels, and credibility.",
      aboutTitle: "Our operating model",
      aboutBody:
        "Explain how your team manages properties, reporting, maintenance, and resident support.",
      featuresTitle: "Core capabilities",
      featuresBody:
        "Keep the service story focused, approved, and easy to scan.",
      featuresItems: [
        "Lease and resident lifecycle management",
        "Collections, reporting, and compliance",
        "Maintenance coordination and notices",
      ],
      teamTitle: "Account and operations team",
      teamBody:
        "Introduce the team structure prospects and residents will rely on.",
      teamItems: ["Client success manager", "Facilities operations", "Collections coordinator"],
      faqTitle: "Company FAQs",
      faqItems: [
        "Which property types do you manage?",
        "How do clients receive reports?",
        "What support channels are available to residents?",
      ],
      ctaPrimaryLabel: "Talk to our team",
      ctaSecondaryLabel: "View company profile",
    },
  },
];

export function getLandingBuilderTemplates(
  workspace: LandingBuilderWorkspace,
) {
  return LANDING_TEMPLATES.filter((template) => template.workspace === workspace);
}

export function getLandingBuilderTemplate(
  templateId: LandingBuilderTemplateId,
) {
  return LANDING_TEMPLATES.find((template) => template.id === templateId);
}

function uniqueSectionOrder(recommendedSections: LandingBuilderSectionKey[]) {
  const seen = new Set<LandingBuilderSectionKey>();
  const ordered = [...recommendedSections, ...LANDING_BUILDER_SECTION_KEYS].filter((key) => {
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return ordered;
}

function buildDefaultDraft(
  workspace: LandingBuilderWorkspace,
  profile: LandingBuilderProfile,
): LandingBuilderDraft {
  const templates = getLandingBuilderTemplates(workspace);
  const fallbackTemplate = templates[0];

  if (!fallbackTemplate) {
    throw new Error(`No landing templates configured for workspace type: ${workspace}`);
  }

  const brandDisplayName = profile.brandDisplayName?.trim() || profile.companyName.trim();
  const supportEmail = profile.publicSupportEmail?.trim() || "";
  const supportPhone = profile.publicSupportPhone?.trim() || "";
  const supportAddress = profile.publicLegalAddress?.trim() || "";

  return {
    templateId: fallbackTemplate.id,
    hiddenSectionKeys: [],
    sectionOrder: uniqueSectionOrder(fallbackTemplate.recommendedSections),
    brandDisplayName,
    brandLogoUrl: profile.brandLogoUrl?.trim() || "",
    brandPrimaryColor:
      profile.brandPrimaryColor?.trim() || (workspace === "estate" ? "#1A5C42" : "#8A1538"),
    brandAccentColor:
      profile.brandAccentColor?.trim() || (workspace === "estate" ? "#D2A85A" : "#E4C470"),
    publicSupportEmail: supportEmail,
    publicSupportPhone: supportPhone,
    publicLegalAddress: supportAddress,
    heroEyebrow: workspace === "estate" ? "Official community page" : "Professional property company",
    heroTitle:
      workspace === "estate"
        ? `Welcome to ${brandDisplayName || "your estate"}`
        : `${brandDisplayName || "Your company"} public profile`,
    heroSubtitle:
      workspace === "estate"
        ? "Share resident updates, dues guidance, and verified estate contact details."
        : "Showcase your properties, services, and contact channels without editing raw code.",
    aboutTitle: workspace === "estate" ? "About the estate" : "About our company",
    aboutBody:
      workspace === "estate"
        ? "A concise introduction to the estate, its standards, and the resident experience."
        : "A concise introduction to your property company, operating focus, and service promise.",
    featuresTitle: workspace === "estate" ? "Community services" : "Services and features",
    featuresBody: "Highlight approved services or value points in a controlled format.",
    featuresItems: [],
    listingsTitle: workspace === "estate" ? "Featured spaces" : "Featured listings",
    listingsBody: "Highlight selected properties, listings, or community spaces.",
    listingItems: [],
    teamTitle: workspace === "estate" ? "Exco and committees" : "Team and leadership",
    teamBody: "Introduce the people prospects or residents should know.",
    teamItems: [],
    feesTitle: workspace === "estate" ? "Fees and levies" : "Pricing and payment guidance",
    feesBody: "Keep billing guidance clear and easy to reference.",
    feeItems: [],
    noticesTitle: "Latest notices",
    noticesBody: "Post official updates, schedules, and important announcements.",
    noticeItems: [],
    contactTitle: "Contact us",
    faqTitle: "Frequently asked questions",
    faqItems: [],
    galleryTitle: "Gallery",
    galleryBody: "Add a few approved images that reflect the workspace brand.",
    galleryImageUrls: [],
    ctaPrimaryLabel:
      workspace === "estate" ? "Open resident portal" : "Contact our team",
    ctaPrimaryUrl: "/portal",
    ctaSecondaryLabel:
      workspace === "estate" ? "Contact admin office" : "View our services",
    ctaSecondaryUrl: supportEmail ? `mailto:${supportEmail}` : "",
  };
}

export function createLandingBuilderDraft(
  workspace: LandingBuilderWorkspace,
  profile: LandingBuilderProfile,
  templateId?: LandingBuilderTemplateId,
) {
  const baseDraft = buildDefaultDraft(workspace, profile);
  const selectedTemplate =
    (templateId ? getLandingBuilderTemplate(templateId) : null) ??
    getLandingBuilderTemplate(baseDraft.templateId);

  if (!selectedTemplate) {
    return baseDraft;
  }

  return {
    ...baseDraft,
    ...selectedTemplate.defaults,
    templateId: selectedTemplate.id,
    hiddenSectionKeys: LANDING_BUILDER_SECTION_KEYS.filter(
      (key) => !selectedTemplate.recommendedSections.includes(key),
    ),
    sectionOrder: uniqueSectionOrder(selectedTemplate.recommendedSections),
  };
}

export function applyTemplateToDraft(
  currentDraft: LandingBuilderDraft,
  template: LandingBuilderTemplate,
) {
  const nextDraft = {
    ...currentDraft,
    ...template.defaults,
    templateId: template.id,
    hiddenSectionKeys: LANDING_BUILDER_SECTION_KEYS.filter(
      (key) => !template.recommendedSections.includes(key),
    ),
    sectionOrder: uniqueSectionOrder(template.recommendedSections),
  };

  return nextDraft;
}

export function mergeLandingBuilderDraft(
  workspace: LandingBuilderWorkspace,
  profile: LandingBuilderProfile,
  partialDraft?: Partial<LandingBuilderDraft> | null,
) {
  const templateId =
    partialDraft?.templateId &&
    getLandingBuilderTemplate(partialDraft.templateId as LandingBuilderTemplateId)
      ? (partialDraft.templateId as LandingBuilderTemplateId)
      : undefined;
  const baseDraft = createLandingBuilderDraft(workspace, profile, templateId);

  return {
    ...baseDraft,
    ...partialDraft,
    hiddenSectionKeys: Array.isArray(partialDraft?.hiddenSectionKeys)
      ? partialDraft.hiddenSectionKeys.filter((key): key is LandingBuilderSectionKey =>
          LANDING_BUILDER_SECTION_KEYS.includes(key as LandingBuilderSectionKey),
        )
      : baseDraft.hiddenSectionKeys,
    sectionOrder: Array.isArray(partialDraft?.sectionOrder)
      ? uniqueSectionOrder(
          partialDraft.sectionOrder.filter((key): key is LandingBuilderSectionKey =>
            LANDING_BUILDER_SECTION_KEYS.includes(key as LandingBuilderSectionKey),
          ),
        )
      : baseDraft.sectionOrder,
    featuresItems: Array.isArray(partialDraft?.featuresItems)
      ? partialDraft.featuresItems
      : baseDraft.featuresItems,
    listingItems: Array.isArray(partialDraft?.listingItems)
      ? partialDraft.listingItems
      : baseDraft.listingItems,
    teamItems: Array.isArray(partialDraft?.teamItems)
      ? partialDraft.teamItems
      : baseDraft.teamItems,
    feeItems: Array.isArray(partialDraft?.feeItems)
      ? partialDraft.feeItems
      : baseDraft.feeItems,
    noticeItems: Array.isArray(partialDraft?.noticeItems)
      ? partialDraft.noticeItems
      : baseDraft.noticeItems,
    faqItems: Array.isArray(partialDraft?.faqItems)
      ? partialDraft.faqItems
      : baseDraft.faqItems,
    galleryImageUrls: Array.isArray(partialDraft?.galleryImageUrls)
      ? partialDraft.galleryImageUrls
      : baseDraft.galleryImageUrls,
  };
}
