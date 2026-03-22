export interface LandingAction {
  id: string;
  label: string;
  kind: "navigate" | "modal" | "track" | "download" | "submit";
  variant: "primary" | "secondary" | "ghost";
  description?: string;
  href?: string;
  modalId?: string;
  successMessage?: string;
}

export interface LandingModalField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
}

export interface LandingModal {
  id: string;
  title: string;
  description: string;
  category: string;
  submitLabel?: string;
  successMessage: string;
  fields: LandingModalField[];
}

export interface LandingPageData {
  brand: string;
  announcement: string;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    trustNote: string;
    primaryActionId: string;
    secondaryActionId: string;
  };
  statStrip: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  featureBlocks: Array<{
    title: string;
    body: string;
    bullets: string[];
  }>;
  roles: Array<{
    name: string;
    path: string;
    summary: string;
    highlights: string[];
  }>;
  workflow: Array<{
    step: string;
    title: string;
    body: string;
  }>;
  quotes: Array<{
    quote: string;
    person: string;
    role: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  footerActionIds: string[];
  modalIds: string[];
  actions: LandingAction[];
  modals: LandingModal[];
}

export interface DemoRequestInput {
  name: string;
  email: string;
  company: string;
  phone: string;
  portfolioSize: string;
  message: string;
}

export const defaultDemoRequest: DemoRequestInput = {
  name: "",
  email: "",
  company: "",
  phone: "",
  portfolioSize: "",
  message: "",
};

export const fallbackLandingContent: LandingPageData = {
  brand: "DoorRent",
  announcement: "Separate Express API, Prisma models, Swagger docs, and a new marketing front door are all included.",
  hero: {
    eyebrow: "Property operations, notices, payments, agreements, and tenant comms in one product surface.",
    title: "Run every landlord, admin, and tenant workflow from a single operating layer.",
    subtitle:
      "DoorRent gives property teams a shared command center for rent collection, agreements, support operations, reminders, and self-serve tenant experiences.",
    trustNote: "Built for multi-role property operations teams that need both workflow speed and a clean API surface.",
    primaryActionId: "landing.request-demo",
    secondaryActionId: "landing.open-portal",
  },
  statStrip: [
    { label: "Properties managed", value: "12K+", detail: "Across landlord and admin workspaces" },
    { label: "Rent processed", value: "N4.2B", detail: "Representative monthly platform volume" },
    { label: "Uptime target", value: "99.6%", detail: "Operational benchmark tracked by the admin console" },
    { label: "Portal roles", value: "3", detail: "Landlord, admin, and tenant experiences" },
  ],
  featureBlocks: [
    {
      title: "Landlord operations without spreadsheet drift",
      body: "Portfolio health, overdue rent, notices, and e-signature workflows live together so the next action is always obvious.",
      bullets: ["Portfolio and payment snapshots", "Bulk notices and reminder automations", "Agreement lifecycle visibility"],
    },
    {
      title: "Admin visibility across the full platform",
      body: "Support, landlord management, audit trails, and growth reporting share one back office view for the DoorRent team.",
      bullets: ["Landlord account monitoring", "Support center and ticket queue", "Audit-ready activity logs"],
    },
    {
      title: "Tenant experiences that reduce support load",
      body: "Tenants can review agreements, pay rent, access receipts, and stay current on notices without waiting on manual follow-up.",
      bullets: ["Agreement review and signing", "Paystack-style payment flow", "Receipts and notice history"],
    },
  ],
  roles: [
    {
      name: "Landlord Portal",
      path: "/landlord",
      summary: "Run property, tenant, notice, payment, and report workflows from one dashboard.",
      highlights: ["Overview, properties, units, tenants", "Payments, receipts, agreements", "Reports, reminders, settings"],
    },
    {
      name: "Admin Console",
      path: "/admin",
      summary: "Give the platform team operational visibility across subscriptions, support, audit logs, and landlord accounts.",
      highlights: ["Overview and landlord management", "Support center and audit trail", "Operations placeholders ready for expansion"],
    },
    {
      name: "Tenant Portal",
      path: "/tenant",
      summary: "Let tenants pay rent, sign agreements, access receipts, and read notices in one clean experience.",
      highlights: ["Dashboard and payment flow", "Agreement timeline and notices", "Receipt history and profile pages"],
    },
  ],
  workflow: [
    {
      step: "01",
      title: "Capture the property and unit structure",
      body: "Properties, units, and occupancy context are ready before tenant onboarding starts.",
    },
    {
      step: "02",
      title: "Assign tenants and generate agreements",
      body: "Onboarding flows can trigger invites and agreement generation from the same operational surface.",
    },
    {
      step: "03",
      title: "Collect rent and automate comms",
      body: "Payments, receipts, notices, reminders, and renewal activity stay visible as the portfolio changes.",
    },
  ],
  quotes: [
    {
      quote: "We needed a portal that felt usable by the property manager, the ops team, and the tenant on day one. DoorRent closes that gap.",
      person: "Funmi Adeola",
      role: "Property Operations Lead",
    },
    {
      quote: "The admin side makes it much easier to monitor landlord health, support load, and product activity from the same screen.",
      person: "Olu Johnson",
      role: "Platform Operations",
    },
  ],
  faqs: [
    {
      question: "What does the new API cover?",
      answer: "The API exposes landing content, every current landlord, admin, and tenant page payload, CTA tracking, modal definitions, modal submissions, and the notification feed.",
    },
    {
      question: "Where does Prisma fit in?",
      answer: "Prisma models persist CTA leads, modal submissions, action events, and email delivery attempts in PostgreSQL while the page catalog ships as typed content for quick iteration.",
    },
    {
      question: "How is Resend used?",
      answer: "When Resend environment variables are configured, demo requests and modal submissions can notify the team through transactional email.",
    },
    {
      question: "Can the frontend still run if the API is not started yet?",
      answer: "Yes. The landing page uses a graceful fallback dataset so the experience still renders while the separate API is being wired up locally.",
    },
  ],
  footerActionIds: ["landing.request-demo", "landing.open-portal", "landing.view-api-docs"],
  modalIds: ["request-demo"],
  actions: [
    {
      id: "landing.request-demo",
      label: "Request a live demo",
      kind: "modal",
      variant: "primary",
      modalId: "request-demo",
      description: "Open the demo request modal for the landing page.",
    },
    {
      id: "landing.open-portal",
      label: "Open the demo portal",
      kind: "navigate",
      variant: "secondary",
      href: "/portal",
      description: "Go straight into the multi-role demo experience.",
    },
    {
      id: "landing.view-api-docs",
      label: "View API docs",
      kind: "navigate",
      variant: "ghost",
      href: "https://doorrent-api.onrender.com/docs",
      description: "Open Swagger documentation for the separate Node API.",
    },
  ],
  modals: [
    {
      id: "request-demo",
      title: "Request a live demo",
      description: "Tell the team about your portfolio and we will follow up with a walkthrough.",
      category: "lead",
      submitLabel: "Send request",
      successMessage: "Demo request received. The team has been notified.",
      fields: [
        { name: "name", label: "Full name", type: "text", required: true, placeholder: "Adaeze Okafor" },
        { name: "email", label: "Work email", type: "email", required: true, placeholder: "adaeze@company.com" },
        { name: "company", label: "Company", type: "text", required: true, placeholder: "Urban Oak Residences" },
        { name: "phone", label: "Phone", type: "tel", placeholder: "+234 800 000 0000" },
        { name: "portfolioSize", label: "Portfolio size", type: "text", placeholder: "52 units across 3 properties" },
        { name: "message", label: "What should we cover?", type: "textarea", placeholder: "Show rent collection, notices, and e-signatures." },
      ],
    },
  ],
};

export async function fetchLandingContent(apiBaseUrl: string) {
  const response = await fetch(`${apiBaseUrl}/landing`);

  if (!response.ok) {
    throw new Error(`Landing fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { data: LandingPageData };
  return payload.data;
}
