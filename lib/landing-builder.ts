import type { LandingTemplateThumbnailId } from "../components/estate/LandingTemplateThumbnail";

export type LandingBuilderWorkspace = "estate" | "property";

export type LandingBuilderEditorType = "controlled" | "puck" | "craft";

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

export type LandingBuilderSectionLayout = "half" | "center" | "full";

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
  editorType: LandingBuilderEditorType;
  templateId: LandingBuilderTemplateId;
  hiddenSectionKeys: LandingBuilderSectionKey[];
  sectionOrder: LandingBuilderSectionKey[];
  sectionLayouts: Partial<Record<LandingBuilderSectionKey, LandingBuilderSectionLayout>>;
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

export const LANDING_BUILDER_EDITORS: Array<{
  key: LandingBuilderEditorType;
  label: string;
  description: string;
  status: string;
}> = [
  {
    key: "controlled",
    label: "Controlled",
    description: "Approved templates and section rails with the lowest publishing risk.",
    status: "Available now",
  },
  {
    key: "puck",
    label: "Puck",
    description: "Visual block editing for teams that want a more flexible page-builder feel.",
    status: "Available now",
  },
  {
    key: "craft",
    label: "Craft.js",
    description: "Custom canvas editing for advanced teams that want deeper layout control.",
    status: "Available now",
  },
];

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

function isLandingBuilderEditorType(value: unknown): value is LandingBuilderEditorType {
  return value === "controlled" || value === "puck" || value === "craft";
}

const DEFAULT_FULL_WIDTH_SECTIONS: LandingBuilderSectionKey[] = [
  "hero",
  "about",
  "gallery",
  "cta",
];

export function getDefaultLandingBuilderSectionLayout(
  sectionKey: LandingBuilderSectionKey,
): LandingBuilderSectionLayout {
  return DEFAULT_FULL_WIDTH_SECTIONS.includes(sectionKey) ? "full" : "half";
}

function createSectionLayouts(
  sectionOrder: LandingBuilderSectionKey[],
  overrides?: Partial<Record<LandingBuilderSectionKey, LandingBuilderSectionLayout>>,
) {
  return sectionOrder.reduce<Partial<Record<LandingBuilderSectionKey, LandingBuilderSectionLayout>>>(
    (layouts, sectionKey) => {
      const override = overrides?.[sectionKey];
      layouts[sectionKey] =
        override === "full" || override === "half" || override === "center"
          ? override
          : getDefaultLandingBuilderSectionLayout(sectionKey);
      return layouts;
    },
    {},
  );
}

const LANDING_TEMPLATES: LandingBuilderTemplate[] = [
  // ─── ESTATE TEMPLATES ────────────────────────────────────────────────────────

  {
    id: "estate-official",
    workspace: "estate",
    name: "Luxury Estate Showcase",
    category: "Premium gated community",
    summary: "For high-end gated estates that need a premium, minimal public presence with amenities, governance, and resident access.",
    description:
      "A refined, editorial-quality template for premium residential estates. High whitespace, sparse authoritative copy, and conversion-focused CTAs that feel earned rather than pushed. Designed for Banana Island, Old Ikoyi, Lekki Phase 1, and Maitama-tier communities.",
    previewTemplateId: "estate-official",
    recommendedSections: ["hero", "about", "features", "gallery", "fees", "contact", "cta"],
    defaults: {
      heroEyebrow: "A private residential community",
      heroTitle: "Where exceptional living meets thoughtful management",
      heroSubtitle:
        "A fully managed, gated community offering premium amenities, 24-hour security, and a resident experience designed to the highest standard.",
      aboutTitle: "About the estate",
      aboutBody:
        "Set within a secured perimeter with landscaped grounds, the estate was built to an uncompromising standard. Common facilities are maintained year-round and managed by a standing committee accountable to all residents. Estate governance is transparent, documented, and resident-led.",
      featuresTitle: "Facilities and amenities",
      featuresBody:
        "Every shared amenity is maintained to the same standard as the homes within the estate.",
      featuresItems: [
        "24-hour manned security and CCTV surveillance",
        "Smart gate system with resident access codes",
        "Landscaped common areas and green spaces",
        "Residents' clubhouse and event pavilion",
        "Dedicated waste management and sanitation schedule",
        "On-call facility management and maintenance team",
      ],
      galleryTitle: "Inside the estate",
      galleryBody:
        "A curated view of the estate environment.",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      ],
      feesTitle: "Estate dues and levies",
      feesBody:
        "All service charges are approved by the residents' association at the Annual General Meeting. Payment details and due dates are communicated through the resident portal.",
      feeItems: [
        "Monthly service charge — facility upkeep, security, and utilities",
        "Annual infrastructure levy — roads, drainage, and common area upgrades",
        "One-off entry and access registration fee",
        "Special project levy — communicated with at least 30 days notice",
      ],
      faqTitle: "Resident questions",
      faqItems: [
        "How are estate dues collected and confirmed?",
        "What is included in the monthly service charge?",
        "How does the visitor pass system work?",
        "Who do I contact for a facilities emergency?",
        "How are major levy decisions made and communicated?",
      ],
      contactTitle: "Estate administration",
      ctaPrimaryLabel: "Open resident portal",
      ctaSecondaryLabel: "Contact the estate office",
    },
  },

  {
    id: "estate-resident",
    workspace: "estate",
    name: "Community Living Estate",
    category: "Residential community hub",
    summary: "For mid-market and family-oriented gated estates that want a warm, practical resident information centre.",
    description:
      "A community-first template built for estates where residents need clear service guidance, emergency contacts, notice updates, and access to common facilities. Approachable tone, practical structure. Best for Magodo, Omole, GRA Ikeja, Jabi, and Wuse 2 community estates.",
    previewTemplateId: "estate-resident",
    recommendedSections: ["hero", "features", "notices", "gallery", "faq", "contact", "cta"],
    defaults: {
      heroEyebrow: "Your home. Your community.",
      heroTitle: "Everything residents need, in one place",
      heroSubtitle:
        "Service contacts, community updates, visitor guidelines, and estate notices — all accessible without waiting on phone calls or gate conversations.",
      featuresTitle: "Community services",
      featuresBody:
        "Everything your household needs to live comfortably and stay informed.",
      featuresItems: [
        "Visitor and delivery pass requests",
        "Gate access and entry code management",
        "Estate notice board and meeting reminders",
        "Maintenance and repair request contacts",
        "Waste collection and sanitation schedules",
        "Emergency line for security and facilities",
      ],
      noticesTitle: "Estate updates",
      noticesBody:
        "The latest from the estate management office and residents' association.",
      noticeItems: [
        "Monthly sanitation exercise — first Saturday of each month",
        "AGM date and agenda — check the portal for details",
        "New visitor registration procedure now active",
        "Road resurfacing works — Phase 2 begins next quarter",
      ],
      galleryTitle: "Community life",
      galleryBody:
        "A glimpse into the shared spaces and everyday moments that make this estate worth calling home.",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        "https://images.unsplash.com/photo-1515263487990-61b07816dd6e?w=800",
        "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
      ],
      faqTitle: "Common questions",
      faqItems: [
        "How do I register a new vehicle for gate access?",
        "Where do I report a security concern after hours?",
        "How do I get a visitor pass for a long-stay guest?",
        "When are the AGM and exco meeting dates?",
        "How do I report a broken facility or streetlight?",
      ],
      contactTitle: "Reach the estate team",
      ctaPrimaryLabel: "Access the resident portal",
      ctaSecondaryLabel: "Contact admin",
    },
  },

  {
    id: "estate-fees",
    workspace: "estate",
    name: "Smart & Tech-Enabled Estate",
    category: "Modern digital community",
    summary: "For tech-forward estates with digital access control, app-based services, and residents who expect a frictionless experience.",
    description:
      "A clean, minimal template that matches the experience of a modern estate — digital gates, QR access, online dues, and real-time notice feeds. Designed for new-build developments, smart gated communities, and estates running digital-first operations.",
    previewTemplateId: "estate-fees",
    recommendedSections: ["hero", "features", "fees", "notices", "faq", "contact", "cta"],
    defaults: {
      heroEyebrow: "A smarter way to live in a community",
      heroTitle: "Digital access. Real-time updates. Zero friction.",
      heroSubtitle:
        "From QR entry codes to online dues and instant notices, this estate is built for residents who want everything to just work.",
      featuresTitle: "Digital-first estate features",
      featuresBody:
        "Technology that makes living here easier for everyone.",
      featuresItems: [
        "QR code and app-based gate entry for residents",
        "Digital visitor pass generation — no paperwork",
        "Instant estate notices to your phone and portal",
        "Online dues payment with automated confirmation",
        "Real-time facility booking for common spaces",
        "24-hour CCTV with event logging and alerts",
      ],
      feesTitle: "Dues and payment schedule",
      feesBody:
        "All estate charges are billed and tracked digitally. Residents receive payment confirmations automatically.",
      feeItems: [
        "Monthly service charge — paid via resident portal",
        "Annual security and surveillance levy",
        "Smart infrastructure maintenance contribution",
        "Optional facility usage credits for clubhouse and gym",
      ],
      noticesTitle: "Live notice board",
      noticesBody:
        "Notices are pushed to the portal and your phone the moment they are published.",
      noticeItems: [
        "Gate system upgrade — Saturday 07:00–10:00",
        "Internet infrastructure maintenance window confirmed",
        "New resident onboarding: digital check-in now available",
        "Quarterly facility inspection — schedule posted in the portal",
      ],
      faqTitle: "How it works",
      faqItems: [
        "How do I get my gate entry QR code?",
        "Can I issue a temporary visitor pass from my phone?",
        "How does online dues payment work?",
        "What happens if the smart gate has a technical fault?",
        "How are notices sent to residents?",
      ],
      contactTitle: "Support",
      ctaPrimaryLabel: "Open resident portal",
      ctaSecondaryLabel: "Contact tech support",
    },
  },

  {
    id: "estate-exco",
    workspace: "estate",
    name: "Affordable Housing Estate",
    category: "Community governance",
    summary: "For residents' associations and publicly developed housing estates focused on transparency, governance, and inclusive community management.",
    description:
      "A people-first, governance-forward template designed for estates where resident trust is built through visible leadership, open notice boards, and transparent fee management. Ideal for FHA estates, government-developed housing schemes, and community associations managing shared resources.",
    previewTemplateId: "estate-exco",
    recommendedSections: ["hero", "about", "team", "fees", "notices", "faq", "contact", "cta"],
    defaults: {
      heroEyebrow: "A community built on transparency",
      heroTitle: "Leadership you can see. Services you can trust.",
      heroSubtitle:
        "This estate is governed by an elected committee of residents. Every charge, every notice, and every decision is documented and shared with the community.",
      aboutTitle: "About this community",
      aboutBody:
        "A residents-led association manages this estate on behalf of all homeowners and tenants. The committee is elected annually and is accountable to residents through quarterly town halls, an open notice board, and a published annual report. Every financial decision is open for review.",
      teamTitle: "Your elected committee",
      teamBody:
        "These are the residents who volunteered to serve the community this term. All committee decisions require a quorum.",
      teamItems: [
        "Chairperson — elected for 2-year term",
        "Vice Chairperson — elected for 2-year term",
        "Secretary — appointed by committee vote",
        "Treasurer — certified accountant from within the estate",
        "Infrastructure Officer — oversees roads, drainage, and repairs",
        "Women and Youth Representative",
      ],
      feesTitle: "Community dues and levies",
      feesBody:
        "All dues are set by a majority vote at the Annual General Meeting. No charge is introduced without a community resolution.",
      feeItems: [
        "Monthly service charge — security, waste, and shared utilities",
        "Annual development levy — agreed at AGM",
        "Emergency repairs fund — held in escrow, reported quarterly",
        "School holiday community activities contribution — optional",
      ],
      noticesTitle: "Official notice board",
      noticesBody:
        "All communications from the committee are posted here and announced via the resident portal.",
      noticeItems: [
        "Next quarterly town hall — date and venue posted in portal",
        "Annual accounts review — open to all residents",
        "Road and drainage repair update",
        "Community sanitation day — all households expected to participate",
      ],
      faqTitle: "Your rights as a resident",
      faqItems: [
        "How do I challenge a committee decision?",
        "How can I stand for election to the committee?",
        "How are funds managed and audited?",
        "What happens if I cannot pay dues on time?",
        "How do I raise a complaint about estate management?",
      ],
      contactTitle: "Committee secretariat",
      ctaPrimaryLabel: "Access the resident portal",
      ctaSecondaryLabel: "Contact the committee",
    },
  },

  // ─── PROPERTY COMPANY TEMPLATES ──────────────────────────────────────────────

  {
    id: "property-profile",
    workspace: "property",
    name: "Corporate Property Brand",
    category: "Established property company",
    summary: "For property management firms, landlord groups, and real estate companies that need a polished, authoritative public presence.",
    description:
      "A premium corporate profile template designed to communicate credibility, operational scale, and service quality. Built for property companies that want to attract landlord clients, institutional investors, and high-value tenants. Inspired by the visual discipline of Stripe and Linear — clean, typographically led, conversion-ready.",
    previewTemplateId: "property-profile",
    recommendedSections: ["hero", "about", "features", "team", "contact", "cta"],
    defaults: {
      heroEyebrow: "Property management, built for scale",
      heroTitle: "The operating standard behind well-run properties in Nigeria",
      heroSubtitle:
        "We manage the full property lifecycle — leasing, collections, maintenance, and resident operations — so our clients never have to chase paperwork.",
      aboutTitle: "Who we are",
      aboutBody:
        "Founded by a team of property professionals with decades of combined experience across Lagos, Abuja, and Port Harcourt, we manage a portfolio of residential and mixed-use assets on behalf of landlords, family trusts, and real estate developers. Our operating model is built around transparency, verified collections, and proactive resident service. Our clients sleep easy knowing their assets are in professional hands.",
      featuresTitle: "What we do well",
      featuresBody:
        "Every service we offer exists because a client needed it done reliably.",
      featuresItems: [
        "End-to-end tenancy and leasing management",
        "Monthly rent collection with real-time landlord reporting",
        "Resident onboarding, agreements, and digital signing",
        "Maintenance scheduling and contractor management",
        "Legal compliance and tenancy dispute support",
        "Portfolio performance reporting and advisory",
      ],
      teamTitle: "Leadership team",
      teamBody:
        "Our senior team is accessible, experienced, and directly accountable to every client.",
      teamItems: [
        "Managing Director — 18 years in Lagos property markets",
        "Head of Leasing and Acquisitions",
        "Director of Operations and Resident Services",
        "Head of Legal and Compliance",
      ],
      contactTitle: "Speak to our team",
      ctaPrimaryLabel: "Schedule an introduction",
      ctaSecondaryLabel: "Download company profile",
    },
  },

  {
    id: "property-leasing",
    workspace: "property",
    name: "Developer Sales Funnel",
    category: "New development launch",
    summary: "For property developers and agencies running active sales or leasing campaigns on new developments.",
    description:
      "A conversion-first template designed to move prospects from awareness to inspection booking in as few steps as possible. Built for off-plan launches, new development sales offices, and leasing campaigns in high-demand markets. Every section earns its place by advancing the prospect toward an action.",
    previewTemplateId: "property-leasing",
    recommendedSections: ["hero", "listings", "features", "gallery", "faq", "contact", "cta"],
    defaults: {
      heroEyebrow: "Now available — limited units remaining",
      heroTitle: "Secure your unit before the inspection phase closes",
      heroSubtitle:
        "A new residential development within a gated perimeter, minutes from major commercial corridors. Inspection appointments are open — book now to hold your preferred unit.",
      listingsTitle: "Available unit types",
      listingsBody:
        "Pricing and availability are confirmed at inspection. Units are allocated on a first-confirmed basis.",
      listingItems: [
        "2-bedroom apartment — Lekki Phase 2 (from ₦35M)",
        "3-bedroom terrace — Chevron Drive corridor (from ₦65M)",
        "4-bedroom semi-detached — Sangotedo axis (from ₦90M)",
        "Penthouse unit — fully serviced, limited availability",
      ],
      featuresTitle: "Why buyers and renters choose this development",
      featuresBody:
        "These are not marketing claims. They are construction commitments verified at inspection.",
      featuresItems: [
        "Pre-certified structural integrity and finishing quality",
        "Flexible off-plan payment plan — spread over 18 months",
        "Legal title documentation verified and provided at completion",
        "Dedicated post-handover support team",
        "Access to private security, parking, and residents' lounge",
        "Fibre-ready infrastructure in all units",
      ],
      galleryTitle: "Development preview",
      galleryBody:
        "Site photography taken during the most recent inspection window.",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
        "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
        "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800",
      ],
      faqTitle: "Before you book an inspection",
      faqItems: [
        "What documentation do I need to bring to inspection?",
        "Is the title document a C of O or governor's consent?",
        "What is the off-plan payment structure?",
        "What is included in the purchase price?",
        "When is the expected handover date?",
      ],
      contactTitle: "Book an inspection",
      ctaPrimaryLabel: "Book your inspection now",
      ctaSecondaryLabel: "Download the brochure",
    },
  },

  {
    id: "property-portfolio",
    workspace: "property",
    name: "Luxury Real Estate Agency",
    category: "Premium listings and agency",
    summary: "For boutique real estate agencies and high-end property firms representing premium residential and commercial assets.",
    description:
      "An aspirational, gallery-led template for agencies that live in the luxury segment — Banana Island, Eko Atlantic, Old Ikoyi, Maitama, and Asokoro. The design prioritises visual authority and selective listing presentation. Inspired by Airbnb Luxe and premium property portals — refined, unhurried, exclusive.",
    previewTemplateId: "property-portfolio",
    recommendedSections: ["hero", "about", "listings", "gallery", "team", "contact", "cta"],
    defaults: {
      heroEyebrow: "Exclusive residential and commercial listings",
      heroTitle: "The finest properties in Nigeria's premium addresses",
      heroSubtitle:
        "We represent a carefully selected portfolio of premium residential and commercial properties. Every listing has been personally assessed by our advisory team.",
      aboutTitle: "Our advisory standard",
      aboutBody:
        "We do not list every property — we list the right ones. Our advisory team has over two decades of experience in premium Nigerian real estate, with a track record across Banana Island, Old Ikoyi, Lekki Phase 1, Eko Atlantic, Maitama, and Asokoro. Every client relationship is built on confidentiality, precision, and an honest assessment of market value.",
      listingsTitle: "Selected listings",
      listingsBody:
        "A curated selection of properties currently available through our agency. Full details available on request.",
      listingItems: [
        "5-bedroom waterfront villa — Banana Island, Lagos",
        "Penthouse apartment — Eko Atlantic (tower floor, sea view)",
        "4-bedroom mansion — Old Ikoyi, off Bourdillon Road",
        "Corporate headquarters building — Victoria Island",
        "4-bedroom detached — Maitama, Abuja (off Richard Akinjide)",
      ],
      galleryTitle: "Property photography",
      galleryBody:
        "All photography commissioned for listings represented by this agency.",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      ],
      teamTitle: "Our advisory team",
      teamBody:
        "Every client relationship is managed personally by a senior member of our team.",
      teamItems: [
        "Principal Advisor — luxury residential, Lagos",
        "Senior Advisor — commercial and investment properties",
        "International Liaison — diaspora and overseas buyer representation",
      ],
      contactTitle: "Private enquiry",
      ctaPrimaryLabel: "Request a private showing",
      ctaSecondaryLabel: "Contact a senior advisor",
    },
  },

  {
    id: "property-corporate",
    workspace: "property",
    name: "Property Management SaaS Profile",
    category: "Tech-forward operations",
    summary: "For modern property management companies that run their operations on software and want a services-led enterprise public profile.",
    description:
      "A corporate, services-forward template for property management companies that lead with systems, reporting, and operational transparency rather than traditional agency positioning. Built for companies that use technology as a competitive advantage — automated collections, real-time reporting, digital lease management, and proactive maintenance workflows.",
    previewTemplateId: "property-corporate",
    recommendedSections: ["hero", "about", "features", "team", "faq", "contact", "cta"],
    defaults: {
      heroEyebrow: "Systematic property management",
      heroTitle: "We run your properties. You see the results.",
      heroSubtitle:
        "Real-time collections, digital agreements, maintenance scheduling, and resident communications — managed on a single operating platform and reported monthly to every client.",
      aboutTitle: "A different kind of property manager",
      aboutBody:
        "Most property managers rely on spreadsheets, phone calls, and informal agreements. We built our operations on a dedicated property management platform — automated rent reminders, digital lease generation, maintenance ticket tracking, and live portfolio dashboards that clients can access at any time. We currently manage over 400 residential units across Lagos and Abuja on behalf of 38 landlord clients.",
      featuresTitle: "Core services",
      featuresBody:
        "Every service is built around systems, not guesswork.",
      featuresItems: [
        "Automated rent collection with Paystack integration",
        "Digital lease generation and e-signature workflows",
        "Resident onboarding with self-serve portal access",
        "Monthly landlord performance reports — sent on the 5th",
        "Maintenance ticket system with contractor SLA tracking",
        "Portfolio growth advisory and market rate benchmarking",
      ],
      teamTitle: "Operations leadership",
      teamBody:
        "Our team combines real estate expertise with operational discipline.",
      teamItems: [
        "CEO — former head of operations at a Lagos estate developer",
        "Head of Technology and Platform",
        "Director of Property Services",
        "Head of Client Success and Landlord Relations",
      ],
      faqTitle: "Before you sign with us",
      faqItems: [
        "How do clients access their portfolio dashboard?",
        "How are maintenance issues reported and tracked?",
        "What is your fee structure for property management?",
        "How are rental collections handled and remitted?",
        "What happens when a tenant defaults?",
      ],
      contactTitle: "Book a management consultation",
      ctaPrimaryLabel: "Schedule a management review",
      ctaSecondaryLabel: "Download service brochure",
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
    editorType: "puck",
    templateId: fallbackTemplate.id,
    hiddenSectionKeys: [],
    sectionOrder: uniqueSectionOrder(fallbackTemplate.recommendedSections),
    sectionLayouts: createSectionLayouts(
      uniqueSectionOrder(fallbackTemplate.recommendedSections),
    ),
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
    sectionLayouts: createSectionLayouts(
      uniqueSectionOrder(selectedTemplate.recommendedSections),
    ),
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
    sectionLayouts: createSectionLayouts(uniqueSectionOrder(template.recommendedSections)),
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
    editorType: isLandingBuilderEditorType(partialDraft?.editorType)
      ? partialDraft.editorType
      : baseDraft.editorType,
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
    sectionLayouts: createSectionLayouts(
      Array.isArray(partialDraft?.sectionOrder)
        ? uniqueSectionOrder(
            partialDraft.sectionOrder.filter((key): key is LandingBuilderSectionKey =>
              LANDING_BUILDER_SECTION_KEYS.includes(key as LandingBuilderSectionKey),
            ),
          )
        : baseDraft.sectionOrder,
      partialDraft?.sectionLayouts,
    ),
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
