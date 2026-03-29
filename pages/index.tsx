import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import Link from "next/link";
import { Fragment, type FormEvent, useEffect, useRef, useState } from "react";
import PageMeta from "../components/layout/PageMeta";
import { apiRequest, getApiRequestBaseUrl } from "../lib/api";
import { LOGO_PATH } from "../lib/site";
import { fetchWorkspaceContextByHost } from "../lib/workspace-context";

type RoleKey = "landlord" | "tenant";
const PUBLIC_PORTAL_URL = "https://usedoorrent.com/portal";

function isWorkspaceSubdomainHost(host?: string | null) {
  const normalizedHost = host?.trim().toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");

  if (!normalizedHost) {
    return false;
  }

  const rootHost = new URL(PUBLIC_PORTAL_URL).hostname.replace(/^www\./, "").toLowerCase();
  const suffix = `.${rootHost}`;

  return normalizedHost.endsWith(suffix) && normalizedHost !== rootHost;
}

const trustedLogos = [
  "Lekki Realty",
  "Abuja Estates",
  "VI Holdings",
  "BuildRight NG",
  "GreenCourt",
  "Ikoyi Premium",
];

const features = [
  {
    icon: "💳",
    tone: "default",
    title: "Smart Rent Collection",
    description:
      "Automated invoicing, payment reminders, and real-time tracking for every rent cycle and every naira.",
  },
  {
    icon: "📋",
    tone: "gold",
    title: "Digital Agreements",
    description:
      "Create, send, and track tenancy agreements with tenant and guarantor signatures in one workflow.",
  },
  {
    icon: "👥",
    tone: "blue",
    title: "Tenant Management",
    description:
      "Keep tenant profiles, onboarding records, guarantor details, and communication history in one place.",
  },
  {
    icon: "🏢",
    tone: "gold",
    title: "Property Portfolio",
    description:
      "Manage multiple properties and units from one dashboard with occupancy and rent visibility at portfolio level.",
  },
  {
    icon: "🔔",
    tone: "default",
    title: "Automated Notices",
    description:
      "Send reminders, lease updates, and operational notices to a single tenant or your full portfolio in minutes.",
  },
  {
    icon: "📊",
    tone: "blue",
    title: "Financial Reports",
    description:
      "Track arrears, portfolio performance, and property-level revenue with clean, landlord-friendly reporting.",
  },
];

const rolePanels: Record<
  RoleKey,
  {
    title: string;
    body: string;
    badge: string;
    badgeClass: string;
    features: Array<{ icon: string; title: string; body: string }>;
    stats: Array<{ label: string; value: string; sub: string; subClass?: string }>;
    items: Array<{
      initials: string;
      name: string;
      meta: string;
      amount?: string;
      status: string;
      statusClass: string;
    }>;
  }
> = {
  landlord: {
    title: "Everything a landlord needs",
    body:
      "Manage your portfolio, invite tenants, collect rent, track arrears, issue agreements, and stay on top of renewals without spreadsheet drift.",
    badge: "4 Properties",
    badgeClass: "is-green",
    features: [
      {
        icon: "📈",
        title: "Portfolio overview",
        body: "See properties, occupancy, collections, and overdue rent from one surface.",
      },
      {
        icon: "💸",
        title: "Rent and arrears tracking",
        body: "Know exactly who has paid, who is due, and who needs follow-up.",
      },
      {
        icon: "✍️",
        title: "Digital agreements",
        body: "Send agreements, receive signatures, and manage template uploads online.",
      },
      {
        icon: "📣",
        title: "Bulk communication",
        body: "Send notices and reminders across your units without switching tools.",
      },
    ],
    stats: [
      { label: "Collected (Mar)", value: "₦3.12M", sub: "↑ 12% vs Feb" },
      { label: "Overdue", value: "₦780K", sub: "3 tenants", subClass: "is-red" },
      { label: "Occupancy", value: "87.5%", sub: "21 of 24" },
      { label: "Agreements", value: "2", sub: "Pending sign", subClass: "is-gold" },
    ],
    items: [
      {
        initials: "CE",
        name: "Chidinma Eze",
        meta: "Unit 5A · Ikoyi",
        amount: "₦320,000",
        status: "Paid",
        statusClass: "is-paid",
      },
      {
        initials: "TA",
        name: "Tunde Adeola",
        meta: "Unit B1 · Lekki",
        amount: "₦150,000",
        status: "21d late",
        statusClass: "is-late",
      },
      {
        initials: "AO",
        name: "Amaka Obi",
        meta: "Unit A3 · Lekki",
        amount: "₦150,000",
        status: "Due Apr 1",
        statusClass: "is-due",
      },
    ],
  },
  tenant: {
    title: "A simple, clear portal for tenants",
    body:
      "Tenants sign in with their email and a one-time code, then pay rent, view agreements, download receipts, and read landlord notices without an app download.",
    badge: "Unit A3 · Lekki",
    badgeClass: "is-gold",
    features: [
      {
        icon: "💳",
        title: "Pay rent online",
        body: "Card, bank transfer, or USSD-ready flows for quick rent payment.",
      },
      {
        icon: "🧾",
        title: "Instant receipts",
        body: "Download receipts the moment a payment lands in the portal.",
      },
      {
        icon: "📄",
        title: "Agreement review",
        body: "Review and sign tenancy agreements from any phone or laptop.",
      },
      {
        icon: "🔔",
        title: "Notices from landlord",
        body: "Receive rent updates, maintenance alerts, and renewal notices in one inbox.",
      },
    ],
    stats: [
      { label: "Billing Cycle", value: "₦150K/month", sub: "₦1.8M annual equivalent" },
      { label: "Lease Ends", value: "Mar '27", sub: "12 months left" },
    ],
    items: [
      {
        initials: "💸",
        name: "March 2026 Rent",
        meta: "Paid Mar 1, 2026",
        status: "Paid",
        statusClass: "is-paid",
      },
      {
        initials: "📋",
        name: "Tenancy Agreement",
        meta: "Pending your signature",
        status: "Sign",
        statusClass: "is-due",
      },
      {
        initials: "🔔",
        name: "Notice: Rent Increase",
        meta: "Effective July 1, 2026",
        status: "New",
        statusClass: "is-late",
      },
    ],
  },
};

const steps = [
  {
    step: "1",
    title: "Create your account",
    body: "Sign up as a landlord and start setting up your portfolio in minutes with the full platform included.",
  },
  {
    step: "2",
    title: "Add properties and tenants",
    body: "Import properties, add units, invite tenants, and let them complete their own onboarding online.",
  },
  {
    step: "3",
    title: "Collect and manage",
    body: "Send your first agreement, collect rent, and keep every notice, payment, and renewal visible.",
  },
];

const BASIC_MONTHLY_PRICE = 8500;
const basicPlanFeatures = [
  "Dashboard, payout settings, and notification preferences",
  "Up to 5 units with tenant invitations, tenant records, and lease dates",
  "Billing frequencies and basic occupancy summary",
  "Agreement creation, resend, tenant signature, and PDF export",
  "Paystack rent payments, offline payment recording, and receipts",
  "In-app notifications, payment-success SMS, and basic reminders",
  "Tenant login, rent dashboard, payment flow, agreement signing, receipts, and profile",
  "Biometric unlock, account deletion, and offline support across mobile and web",
];

const proPlanFeatures = [
  "Everything in Basic",
  "Unlimited units, meter numbers, and portfolio summary",
  "Agreement templates, signed-copy viewing, and witness visibility",
  "Workspace branding, workspace mode, slug/subdomain, and branded tenant experience",
  "Payment detail view, push notifications, SMS payment alerts, and SMS notices",
  "Notices, meetings, automations, rent-default cases, and grace-period workflow",
  "Caretaker login, scoped caretaker assignments, property-scoped access, and reports",
  "Community, emergency tools, and SMS escalation",
];

const enterprisePlanFeatures = [
  "Everything in Pro",
  "Company-owned Paystack collections direct to the client's own Paystack account",
  "Multiple staff logins with role-based permissions",
  "Branded subdomains, branded public pages, and branded login pages",
  "Full white-label and advanced workspace branding",
  "Enterprise collections, guided onboarding, and company legal pages on client subdomain",
  "Dedicated account manager and priority support",
];

const pricingMatrixRows = [
  {
    feature: "Core property management",
    description: "Dashboard, properties, units, tenant records, lease dates, and occupancy visibility.",
    basic: "Included",
    pro: "Included",
    enterprise: "Included",
  },
  {
    feature: "Agreements",
    description: "Agreement creation, resend, signatures, PDF export, templates, and signed-copy visibility.",
    basic: "Creation, resend, tenant signature, PDF export",
    pro: "Full agreement workflow",
    enterprise: "Full agreement workflow",
  },
  {
    feature: "Payments",
    description: "Paystack collections, offline records, receipts, payment detail, and collection ownership.",
    basic: "Paystack + offline + receipts",
    pro: "Advanced payment ops",
    enterprise: "Client-owned Paystack collections",
  },
  {
    feature: "Notifications & reminders",
    description: "In-app notifications, push, SMS, and automations.",
    basic: "In-app + payment-success SMS + reminders",
    pro: "Push, SMS, and automations",
    enterprise: "Advanced at scale",
  },
  {
    feature: "Security & account control",
    description: "Biometric unlock, account deletion, and offline support across mobile and web.",
    basic: "Included",
    pro: "Included",
    enterprise: "Included",
  },
  {
    feature: "Unit scale",
    description: "How many units can sit under one workspace.",
    basic: "Up to 5 units",
    pro: "Unlimited units",
    enterprise: "Unlimited units",
  },
  {
    feature: "Property intelligence",
    description: "Portfolio summaries, reporting, billing frequencies, and meter numbers.",
    basic: "Billing frequency + occupancy summary",
    pro: "Included",
    enterprise: "Included",
  },
  {
    feature: "Communication",
    description: "Notices, meetings, community, and tenant communication tools.",
    basic: "Not included",
    pro: "Included",
    enterprise: "Included",
  },
  {
    feature: "Risk & compliance",
    description: "Grace period workflow, rent-default tracking, and follow-up tooling.",
    basic: "Basic reminders only",
    pro: "Included",
    enterprise: "Included",
  },
  {
    feature: "Tenant experience",
    description: "Tenant login plus rent dashboard, payments, receipts, profile, and branded experience.",
    basic: "Core tenant portal",
    pro: "Expanded + branded",
    enterprise: "Included",
  },
  {
    feature: "Workspace branding",
    description: "Workspace mode, colors, logo, login background, and branded tenant experience.",
    basic: "Not included",
    pro: "Included",
    enterprise: "Advanced white-label",
  },
  {
    feature: "Caretaker & emergency",
    description: "Caretaker operations, scoped access, emergency tools, and escalation support.",
    basic: "Not included",
    pro: "Included",
    enterprise: "Included",
  },
  {
    feature: "Staff logins",
    description: "Multiple staff accounts with role-based permissions.",
    basic: "Not included",
    pro: "Not included",
    enterprise: "Included",
  },
  {
    feature: "Subdomain & white-label",
    description: "Branded subdomain, branded public pages, branded login, and white-label presentation.",
    basic: "Not included",
    pro: "Branded workspace + subdomain",
    enterprise: "Included",
  },
  {
    feature: "Onboarding & support",
    description: "How each plan is activated and supported.",
    basic: "Self-serve",
    pro: "Self-serve",
    enterprise: "Guided onboarding + account manager",
  },
] as const;

type EnterpriseRequestResponse = {
  submitted: boolean;
  delivery: "sent" | "failed" | "preview";
};

type LandingPageProps = {
  isRootDomain?: boolean;
  marketingOverview?: {
    proofStats?: Array<{ label: string; value: string }>;
    heroDashboard?: {
      propertiesValue: string;
      propertiesSubtext: string;
      collectedValue: string;
      collectedSubtext: string;
      occupancyValue: string;
      occupancySubtext: string;
      collectionSeries: number[];
    };
    heroFloatingCards?: {
      payment: { title: string; subtitle: string };
      overdue: { eyebrow: string; value: string; subtitle: string };
    };
    tickerItems?: string[];
    landlordExperience?: {
      badge?: string;
      stats?: Array<{ label: string; value: string; sub: string; subClass?: string }>;
      items?: Array<{
        initials: string;
        name: string;
        meta: string;
        amount?: string;
        status: string;
        statusClass: string;
      }>;
    };
    tenantExperience?: {
      badge?: string;
      stats?: Array<{ label: string; value: string; sub: string; subClass?: string }>;
      items?: Array<{
        initials: string;
        name: string;
        meta: string;
        amount?: string;
        status: string;
        statusClass: string;
      }>;
    };
  } | null;
};

const testimonials = [
  {
    quote:
      "Before DoorRent I was managing everything on WhatsApp and Excel. Now I can see all my units, know who owes me what, and send reminders with one click.",
    name: "Babatunde Adeyemi",
    role: "Landlord · 8 units · Lekki",
    initials: "BA",
  },
  {
    quote:
      "The digital agreement feature alone made the switch worth it. My lawyer drafts the template once and I reuse it for every tenant.",
    name: "Funke Oyelaran",
    role: "Property investor · 14 units · Abuja",
    initials: "FO",
  },
  {
    quote:
      "My tenants love the portal. They can see their balance, download receipts, and pay without calling me. The overdue notifications have cut my chase-up calls down massively.",
    name: "Chike Uzodinma",
    role: "Estate manager · 22 units · Port Harcourt",
    initials: "CU",
  },
];

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async (
  context: GetServerSidePropsContext,
) => {
  const hostHeader =
    (Array.isArray(context.req.headers["x-forwarded-host"])
      ? context.req.headers["x-forwarded-host"][0]
      : context.req.headers["x-forwarded-host"]) ??
    context.req.headers.host ??
    null;
  const workspaceContext = await fetchWorkspaceContextByHost(hostHeader);

  if (workspaceContext?.workspace?.workspaceSlug) {
    return {
      redirect: {
        destination: "/portal",
        permanent: false,
      },
    };
  }

  if (isWorkspaceSubdomainHost(hostHeader)) {
    return {
      redirect: {
        destination: PUBLIC_PORTAL_URL,
        permanent: false,
      },
    };
  }

  let marketingOverview: LandingPageProps["marketingOverview"] = null;

  try {
    const response = await fetch(`${getApiRequestBaseUrl()}/marketplace/public-overview`);
    const payload = (await response.json()) as {
      data?: LandingPageProps["marketingOverview"];
    };
    marketingOverview = payload?.data ?? null;
  } catch {
    marketingOverview = null;
  }

  return {
    props: {
      isRootDomain: true,
      marketingOverview,
    },
  };
};

export default function LandingPage({ marketingOverview }: LandingPageProps) {
  const [activeRole, setActiveRole] = useState<RoleKey>("landlord");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [enterpriseFormOpen, setEnterpriseFormOpen] = useState(false);
  const [enterpriseSubmitting, setEnterpriseSubmitting] = useState(false);
  const [enterpriseFeedback, setEnterpriseFeedback] = useState("");
  const [enterpriseForm, setEnterpriseForm] = useState({
    companyName: "",
    contactName: "",
    workEmail: "",
    phone: "",
    portfolioSize: "",
    city: "",
    notes: "",
  });

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12 },
    );

    document
      .querySelectorAll(".marketing-home .reveal")
      .forEach((element) => observer.observe(element));

    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousedown", onClickOutside);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!enterpriseFormOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !enterpriseSubmitting) {
        setEnterpriseFormOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enterpriseFormOpen, enterpriseSubmitting]);

  const activePanel = {
    ...rolePanels[activeRole],
    ...(activeRole === "landlord"
      ? marketingOverview?.landlordExperience
      : marketingOverview?.tenantExperience),
  };
  const proofStats = marketingOverview?.proofStats ?? [
    { label: "Properties managed", value: "12,000+" },
    { label: "Rent collected", value: "₦4.2B+" },
    { label: "Active tenancies", value: "98.3%" },
    { label: "Active landlords", value: "5,200+" },
  ];
  const heroDashboard = marketingOverview?.heroDashboard ?? {
    propertiesValue: "4",
    propertiesSubtext: "24 units",
    collectedValue: "₦3.1M",
    collectedSubtext: "↑ 12%",
    occupancyValue: "87%",
    occupancySubtext: "21 / 24",
    collectionSeries: [30, 38, 35, 45, 52, 48, 58, 50, 70, 61, 73, 80],
  };
  const heroFloatingCards = marketingOverview?.heroFloatingCards ?? {
    payment: {
      title: "Payment received",
      subtitle: "Chidinma Eze · ₦320,000",
    },
    overdue: {
      eyebrow: "Overdue rent",
      value: "₦780K",
      subtitle: "3 tenants · send reminders →",
    },
  };
  const tickerItems =
    marketingOverview?.tickerItems ??
    [
      "₦320,000 rent received",
      "Kelechi Dike signed tenancy agreement",
      "Unit A3 renewed for 12 months",
      "Overdue notice sent to Tunde Adeola",
      "₦1.2M disbursed to landlord",
      "New property added — Banana Island Towers",
      "Receipt generated for Ikoyi Residences",
    ];
  const basicPriceLabel = `₦${BASIC_MONTHLY_PRICE.toLocaleString("en-NG")}`;
  const basicBillingNote = "per month";

  async function submitEnterpriseRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnterpriseSubmitting(true);
    setEnterpriseFeedback("");

    try {
      const { message } = await apiRequest<EnterpriseRequestResponse>(
        "/marketplace/enterprise-onboarding-request",
        {
          method: "POST",
          body: enterpriseForm,
        },
      );

      setEnterpriseFeedback(
        message ||
          "Your Enterprise request has been sent. DoorRent will reach out to you shortly.",
      );
      setEnterpriseForm({
        companyName: "",
        contactName: "",
        workEmail: "",
        phone: "",
        portfolioSize: "",
        city: "",
        notes: "",
      });
      setEnterpriseFormOpen(false);
    } catch (error) {
      setEnterpriseFeedback(
        error instanceof Error
          ? error.message
          : "We could not submit your Enterprise request right now.",
      );
    } finally {
      setEnterpriseSubmitting(false);
    }
  }

  return (
    <>
      <PageMeta
        title="DoorRent — Property Management, Reimagined"
        description="Collect rent, manage tenants, send agreements, and track every property workflow in one elegant platform built for Nigerian landlords."
      />

      <div className="marketing-home">
        <nav ref={navRef} className={`marketing-nav${isScrolled ? " is-scrolled" : ""}${mobileMenuOpen ? " menu-open" : ""}`}>
          <div className="marketing-container">
            <div className="marketing-nav-inner">
              <Link href="/" className="marketing-brand">
                <img src={LOGO_PATH} alt="DoorRent logo" className="marketing-brand-logo" />
                <span className="marketing-brand-name">DoorRent</span>
              </Link>

              <div className="marketing-nav-links">
                <Link href="/marketplace">Marketplace</Link>
                <a href="#features">Features</a>
                <a href="#roles">For Landlords</a>
                <a href="#pricing">Pricing</a>
                <a href="#testimonials">Testimonials</a>
              </div>

              <div className="marketing-nav-cta">
                <Link href="/portal" className="btn btn-primary">
                  Get started →
                </Link>
                <button
                  type="button"
                  className={`marketing-hamburger${mobileMenuOpen ? " is-open" : ""}`}
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((o) => !o)}
                >
                  <span className="bar bar-top" />
                  <span className="bar bar-mid" />
                  <span className="bar bar-bot" />
                </button>
              </div>
            </div>

            <div className={`marketing-mobile-menu${mobileMenuOpen ? " is-open" : ""}`} aria-hidden={!mobileMenuOpen}>
              <Link href="/marketplace" className="mmenu-item" style={{ "--i": 0 } as React.CSSProperties} onClick={() => setMobileMenuOpen(false)}>Marketplace</Link>
              <a href="#features" className="mmenu-item" style={{ "--i": 1 } as React.CSSProperties} onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#roles" className="mmenu-item" style={{ "--i": 2 } as React.CSSProperties} onClick={() => setMobileMenuOpen(false)}>For Landlords</a>
              <a href="#pricing" className="mmenu-item" style={{ "--i": 3 } as React.CSSProperties} onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#testimonials" className="mmenu-item" style={{ "--i": 4 } as React.CSSProperties} onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
            </div>
          </div>
        </nav>

        <section className="marketing-hero">
          <div className="marketing-hero-bg" />
          <div className="marketing-hero-arcs">
            <div className="marketing-arc arc-1" />
            <div className="marketing-arc arc-2" />
            <div className="marketing-arc arc-3" />
          </div>

          <div className="marketing-hero-body">
            <div className="marketing-hero-grid">
              <div className="marketing-hero-copy-wrap">
                <div className="marketing-badge">
                  <span className="marketing-badge-dot" />
                  Built for Nigerian Property Owners
                </div>

                <h1 className="marketing-hero-title">
                  Property management
                  <br />
                  <em>built for how</em>
                  <span>Nigeria rents.</span>
                </h1>

                <p className="marketing-hero-copy">
                  Collect rent, manage tenants, send agreements, and track every
                  naira in one elegant platform designed for landlords and their
                  teams.
                </p>

                <div className="marketing-hero-actions">
                  <Link href="/portal" className="btn btn-gold marketing-btn-lg">
                    Start free
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </Link>
                  <Link href="/marketplace" className="btn btn-ghost-light marketing-btn-lg">
                    Browse marketplace
                  </Link>
                </div>

                <div className="marketing-proof">
                  {proofStats.map((stat, index) => (
                    <Fragment key={stat.label}>
                      <div>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                      {index < proofStats.length - 1 ? <div className="marketing-proof-divider" /> : null}
                    </Fragment>
                  ))}
                </div>
              </div>

              <div className="marketing-hero-visual">
                <div className="marketing-dashboard">
                  <div className="marketing-dashboard-topbar">
                    <div className="marketing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="marketing-dashboard-title">
                      DoorRent — Landlord Dashboard
                    </div>
                  </div>

                  <div className="marketing-dashboard-body">
                    <div className="marketing-dashboard-sidebar">
                      <div className="marketing-dashboard-logo">
                        <img
                          src={LOGO_PATH}
                          alt="DoorRent logo"
                          className="marketing-dashboard-logo-image"
                        />
                        <strong>DoorRent</strong>
                      </div>
                      <div className="marketing-dashboard-section">Main</div>
                      {["Overview", "Properties", "Tenants", "Agreements"].map(
                        (item, index) => (
                          <div
                            key={item}
                            className={`marketing-dashboard-item ${
                              index === 0 ? "is-active" : ""
                            }`}
                          >
                            <span />
                            {item}
                          </div>
                        ),
                      )}
                      <div className="marketing-dashboard-section">Finance</div>
                      {["Payments", "Receipts"].map((item) => (
                        <div key={item} className="marketing-dashboard-item">
                          <span />
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="marketing-dashboard-content">
                      <div className="marketing-dashboard-stats">
                        <div className="marketing-mini-stat">
                          <label>Properties</label>
                          <strong>{heroDashboard.propertiesValue}</strong>
                          <span>{heroDashboard.propertiesSubtext}</span>
                        </div>
                        <div className="marketing-mini-stat">
                          <label>Collected</label>
                          <strong>{heroDashboard.collectedValue}</strong>
                          <span>{heroDashboard.collectedSubtext}</span>
                        </div>
                        <div className="marketing-mini-stat">
                          <label>Occupancy</label>
                          <strong>{heroDashboard.occupancyValue}</strong>
                          <span>{heroDashboard.occupancySubtext}</span>
                        </div>
                      </div>

                      <div className="marketing-chart-card">
                        <div className="marketing-chart-title">
                          Rent Collection · 12 months
                        </div>
                        <div className="marketing-chart-bars">
                          {heroDashboard.collectionSeries.map(
                            (height, index) => (
                              <div
                                key={`${height}-${index}`}
                                className={`marketing-chart-bar ${
                                  index === 11 ? "is-highlight" : ""
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="marketing-floating-card left">
                  <div className="icon">✅</div>
                  <div>
                    <strong>{heroFloatingCards.payment.title}</strong>
                    <span>{heroFloatingCards.payment.subtitle}</span>
                  </div>
                </div>

                <div className="marketing-floating-card right dark">
                  <small>{heroFloatingCards.overdue.eyebrow}</small>
                  <strong>{heroFloatingCards.overdue.value}</strong>
                  <span>{heroFloatingCards.overdue.subtitle}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="marketing-ticker">
            <div className="marketing-ticker-track">
              {tickerItems
                .concat(tickerItems)
                .map((item, index) => (
                  <span key={`${item}-${index}`} className="marketing-ticker-item">
                    {item}
                  </span>
                ))}
            </div>
          </div>
        </section>

        <section className="marketing-logos">
          <p>Trusted by landlords across Lagos, Abuja and Port Harcourt</p>
          <div className="marketing-logo-row">
            {trustedLogos.map((logo) => (
              <div key={logo} className="marketing-logo-pill">
                <span className="marketing-logo-icon">◌</span>
                {logo}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="marketing-section">
          <div className="marketing-container">
            <div className="marketing-section-head reveal">
              <p>Everything you need</p>
              <h2>
                One platform.
                <br />
                <em>Every detail covered.</em>
              </h2>
              <span>
                From collecting rent to managing agreements and communicating
                with tenants, DoorRent handles the full day-to-day flow.
              </span>
            </div>

            <div className="marketing-feature-grid reveal">
              {features.map((feature) => (
                <article key={feature.title} className="marketing-feature-card">
                  <div className={`marketing-feature-icon is-${feature.tone}`}>
                    {feature.icon}
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="marketing-roles">
          <div className="marketing-container">
            <div className="marketing-section-head reveal light">
              <p>Two experiences. One workflow.</p>
              <h2>
                Built for every role
                <br />
                <em>in the chain.</em>
              </h2>
              <span>
                DoorRent gives landlords and tenants their own focused
                experience without breaking the workflow between them.
              </span>
            </div>

            <div className="marketing-role-tabs reveal">
              {[
                { key: "landlord", label: "🏠 Landlord" },
                { key: "tenant", label: "🔑 Tenant" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeRole === tab.key ? "is-active" : ""}
                  onClick={() => setActiveRole(tab.key as RoleKey)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="marketing-role-panel">
              <div className="reveal">
                <h3>{activePanel.title}</h3>
                <p>{activePanel.body}</p>

                <div className="marketing-role-feature-list">
                  {activePanel.features.map((feature) => (
                    <div key={feature.title} className="marketing-role-feature">
                      <div className="icon">{feature.icon}</div>
                      <div>
                        <strong>{feature.title}</strong>
                        <span>{feature.body}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="marketing-role-screen reveal">
                <div className="marketing-role-screen-head">
                  <div className="title">
                    {activeRole === "landlord"
                      ? "Babatunde's Dashboard"
                      : "Amaka's Portal"}
                  </div>
                  <span className={`marketing-role-badge ${activePanel.badgeClass}`}>
                    {activePanel.badge}
                  </span>
                </div>

                <div
                  className={`marketing-role-stats ${
                    activeRole === "tenant" ? "is-compact" : ""
                  }`}
                >
                  {activePanel.stats.map((stat) => (
                    <div key={stat.label} className="marketing-role-stat">
                      <label>{stat.label}</label>
                      <strong>{stat.value}</strong>
                      <span className={stat.subClass}>{stat.sub}</span>
                    </div>
                  ))}
                </div>

                <div className="marketing-role-items">
                  {activePanel.items.map((item) => (
                    <div key={item.name} className="marketing-role-item">
                      <div className="left">
                        <div className="avatar">{item.initials}</div>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.meta}</span>
                        </div>
                      </div>
                      <div className="right">
                        {item.amount ? <strong>{item.amount}</strong> : null}
                        <span className={`status ${item.statusClass}`}>{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-section">
          <div className="marketing-container">
            <div className="marketing-section-head centered reveal">
              <p>Simple to get started</p>
              <h2>
                Up and running
                <br />
                <em>in under 10 minutes.</em>
              </h2>
            </div>

            <div className="marketing-steps reveal">
              {steps.map((step) => (
                <article key={step.step} className="marketing-step">
                  <div className="step-num">{step.step}</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="marketing-pricing">
          <div className="marketing-container">
            <div className="marketing-section-head centered reveal">
              <p>Choose your model</p>
              <h2>
                Basic, Pro, or Enterprise.
                <br />
                <em>Built around your maturity level.</em>
              </h2>
              <span>
                Start with Basic when you just need to manage property, move to Pro when
                you want collections and automation, and use Enterprise when you run your
                operations like a real estate business.
              </span>
            </div>

            <div className="marketing-pricing-grid reveal">
              <article className="marketing-pricing-card">
                <div className="marketing-pricing-card-top">
                  <p className="plan-name">Basic</p>
                </div>
                <div className="plan-price">{basicPriceLabel}</div>
                <div className="plan-sub">{basicBillingNote}</div>
                <p className="plan-description">
                  Entry-level access for individual landlords with small portfolios who need the essentials
                  and a clear upgrade path to Pro.
                </p>
                <div className="plan-divider" />
                <div className="marketing-pricing-rows">
                  {basicPlanFeatures.map((feature) => (
                    <div key={feature} className="marketing-pricing-row is-included">
                      <span className="row-check">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Link href="/portal" className="btn btn-secondary btn-full">
                  Choose Basic
                </Link>
              </article>

              <article className="marketing-pricing-card is-featured">
                <div className="marketing-pricing-badge">Popular choice</div>
                <p className="plan-name">Pro</p>
                <div className="plan-price">3%</div>
                <div className="plan-sub">of rent collected</div>
                <p className="plan-description">
                  The serious-landlord tier for automation, professionalism, branding, and operational control
                  without moving into full enterprise rollout.
                </p>
                <div className="plan-divider" />
                <div className="marketing-pricing-rows">
                  {proPlanFeatures.map((feature) => (
                    <div key={feature} className="marketing-pricing-row is-included">
                      <span className="row-check">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Link href="/portal" className="btn btn-secondary btn-full">
                  Choose Pro
                </Link>
              </article>

              <article className="marketing-pricing-card">
                <div className="marketing-pricing-card-top">
                  <p className="plan-name">Enterprise</p>
                </div>
                <div className="plan-price">₦200,000</div>
                <div className="plan-sub">per month · guided setup</div>
                <p className="plan-description">
                  Built for large property companies and estate developers that want staff access,
                  white-label presentation, and rent flowing directly into their own Paystack.
                </p>
                <div className="plan-divider" />
                <div className="marketing-pricing-rows">
                  {enterprisePlanFeatures.map((feature) => (
                    <div key={feature} className="marketing-pricing-row is-included">
                      <span className="row-check">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <a
                  href="#enterprise-request"
                  className="btn btn-primary btn-full"
                  onClick={(event) => {
                    event.preventDefault();
                    setEnterpriseFormOpen(true);
                    setEnterpriseFeedback("");
                  }}
                >
                  Request Enterprise Setup
                </a>
                {enterpriseFeedback ? (
                  <div className="marketing-enterprise-feedback">
                    {enterpriseFeedback}
                  </div>
                ) : null}
              </article>
            </div>

            <div className="marketing-pricing-matrix reveal">
              <div className="marketing-pricing-matrix-head">
                <p>Plan comparison</p>
                <h3>See exactly what sits in each plan.</h3>
                <span>
                  Use this matrix to decide which features stay basic, which unlock
                  professional operations, and which are reserved for business-grade teams.
                </span>
              </div>

              <div className="marketing-pricing-matrix-table">
                <div className="marketing-pricing-matrix-row is-head">
                  <div>Feature</div>
                  <div>Basic</div>
                  <div>Pro</div>
                  <div>Enterprise</div>
                </div>

                {pricingMatrixRows.map((row) => (
                  <div key={row.feature} className="marketing-pricing-matrix-row">
                    <div>
                      <strong>{row.feature}</strong>
                      <span>{row.description}</span>
                    </div>
                    <div>{row.basic}</div>
                    <div>{row.pro}</div>
                    <div>{row.enterprise}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="marketing-section">
          <div className="marketing-container">
            <div className="marketing-section-head centered reveal">
              <p>What landlords say</p>
              <h2>
                Real people.
                <br />
                <em>Real results.</em>
              </h2>
            </div>

            <div className="marketing-testimonial-grid reveal">
              {testimonials.map((testimonial) => (
                <article key={testimonial.name} className="marketing-testimonial-card">
                  <div className="stars">★★★★★</div>
                  <p>{testimonial.quote}</p>
                  <div className="author">
                    <div className="avatar">{testimonial.initials}</div>
                    <div>
                      <strong>{testimonial.name}</strong>
                      <span>{testimonial.role}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-cta">
          <div className="marketing-container">
            <div className="marketing-cta-inner reveal">
              <h2>
                Ready to run your
                <br />
                properties <em>properly?</em>
              </h2>
              <p>
                Join Nigerian landlords moving from WhatsApp and spreadsheets to
                DoorRent. The platform is free for landlords, so you can start
                now without setup fees or time limits.
              </p>
              <div className="marketing-cta-actions">
                <Link href="/portal" className="btn btn-gold marketing-btn-lg">
                  Start free →
                </Link>
                <Link href="/portal" className="btn btn-ghost-light marketing-btn-lg">
                  View demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="marketing-footer">
          <div className="marketing-container">
            <div className="marketing-footer-top">
              <div className="marketing-footer-brand">
                <div className="marketing-footer-logo">
                  <img
                    src={LOGO_PATH}
                    alt="DoorRent logo"
                    className="marketing-footer-logo-image"
                  />
                  <span>DoorRent</span>
                </div>
                <p>
                  The complete property management platform for Nigerian
                  landlords. Collect rent, manage tenants, and grow your
                  portfolio.
                </p>
              </div>

              <div>
                <h4>Product</h4>
                <ul>
                  <li><Link href="/marketplace">Marketplace</Link></li>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#roles">For Landlords</a></li>
                  <li><a href="#roles">For Tenants</a></li>
                </ul>
              </div>

<div>
                <h4>Company</h4>
                <ul>
                  <li><a href="#testimonials">Testimonials</a></li>
                  <li><Link href="/portal">Live Demo</Link></li>
                  <li><a href="mailto:hello@doorrent.com">Contact</a></li>
                </ul>
              </div>

              <div>
                <h4>Legal</h4>
                <ul>
                  <li><Link href="/privacy">Privacy Policy</Link></li>
                  <li><Link href="/terms">Terms of Use</Link></li>
                  <li><Link href="/refund-policy">Refund Policy</Link></li>
                  <li><Link href="/account-deletion">Account Deletion</Link></li>
                  <li><Link href="/security">Security</Link></li>
                </ul>
              </div>
            </div>

            <div className="marketing-footer-bottom">
              <p>© 2026 DoorRent – Subsidiary of ReSuply Technologies Limited. All rights reserved.</p>
              <div className="links">
                <a href="https://x.com/usedoorrent" target="_blank" rel="noreferrer">
                  Twitter / X
                </a>
                <a href="https://www.linkedin.com/company/doorrent/" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
                <a href="https://www.instagram.com/usedoorrent" target="_blank" rel="noreferrer">
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </footer>

        {enterpriseFormOpen ? (
          <div
            className="marketing-enterprise-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enterprise-request-title"
          >
            <div
              className="marketing-enterprise-backdrop"
              onClick={() => {
                if (!enterpriseSubmitting) {
                  setEnterpriseFormOpen(false);
                }
              }}
            />

            <div className="marketing-enterprise-shell">
              <div className="marketing-enterprise-panel">
                <div className="marketing-enterprise-hero">
                  <div className="marketing-enterprise-badge">
                    Enterprise rollout
                  </div>
                  <button
                    type="button"
                    className="marketing-enterprise-close"
                    onClick={() => setEnterpriseFormOpen(false)}
                    disabled={enterpriseSubmitting}
                    aria-label="Close enterprise setup form"
                  >
                    ×
                  </button>
                  <h2 id="enterprise-request-title">
                    Let’s set up a branded workspace for your property company.
                  </h2>
                  <p>
                    Tell us about your portfolio, operating team, and rollout goals.
                    DoorRent will use this to plan your branding, collections, access,
                    and onboarding path.
                  </p>

                  <div className="marketing-enterprise-highlight-grid">
                    <div className="marketing-enterprise-highlight">
                      <strong>Branded workspace</strong>
                      <span>Subdomain, logo, colors, and public company pages.</span>
                    </div>
                    <div className="marketing-enterprise-highlight">
                      <strong>Collections setup</strong>
                      <span>Company-owned Paystack flow and payout routing support.</span>
                    </div>
                    <div className="marketing-enterprise-highlight">
                      <strong>Guided onboarding</strong>
                      <span>Role setup, portfolio migration, and go-live planning.</span>
                    </div>
                  </div>

                  <div className="marketing-enterprise-next">
                    <div className="marketing-enterprise-next-title">
                      What happens after this
                    </div>
                    <div className="marketing-enterprise-next-list">
                      <div>
                        <span>01</span>
                        <p>We review your portfolio size, city, and operating model.</p>
                      </div>
                      <div>
                        <span>02</span>
                        <p>We confirm the Enterprise setup scope for your team.</p>
                      </div>
                      <div>
                        <span>03</span>
                        <p>We schedule your branded rollout and collections activation.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <form
                  id="enterprise-request"
                  className="marketing-enterprise-form-card"
                  onSubmit={submitEnterpriseRequest}
                >
                  <div className="marketing-enterprise-form-head">
                    <p>Enterprise setup request</p>
                    <h3>Tell us about your company</h3>
                  </div>

                  <div className="marketing-enterprise-form-grid">
                    <label className="marketing-enterprise-field">
                      <span>Company name</span>
                      <input
                        className="marketing-enterprise-input"
                        placeholder="Lekki Property Holdings Ltd"
                        value={enterpriseForm.companyName}
                        onChange={(event) =>
                          setEnterpriseForm((current) => ({
                            ...current,
                            companyName: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>

                    <label className="marketing-enterprise-field">
                      <span>Contact name</span>
                      <input
                        className="marketing-enterprise-input"
                        placeholder="Babatunde Adeyemi"
                        value={enterpriseForm.contactName}
                        onChange={(event) =>
                          setEnterpriseForm((current) => ({
                            ...current,
                            contactName: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>

                    <label className="marketing-enterprise-field">
                      <span>Work email</span>
                      <input
                        className="marketing-enterprise-input"
                        type="email"
                        placeholder="ops@lekki.io"
                        value={enterpriseForm.workEmail}
                        onChange={(event) =>
                          setEnterpriseForm((current) => ({
                            ...current,
                            workEmail: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>

                    <label className="marketing-enterprise-field">
                      <span>Phone number</span>
                      <input
                        className="marketing-enterprise-input"
                        placeholder="+234 801 234 5678"
                        value={enterpriseForm.phone}
                        onChange={(event) =>
                          setEnterpriseForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>

                    <label className="marketing-enterprise-field">
                      <span>Portfolio size</span>
                      <input
                        className="marketing-enterprise-input"
                        placeholder="120 units across 8 properties"
                        value={enterpriseForm.portfolioSize}
                        onChange={(event) =>
                          setEnterpriseForm((current) => ({
                            ...current,
                            portfolioSize: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>

                    <label className="marketing-enterprise-field">
                      <span>Primary city</span>
                      <input
                        className="marketing-enterprise-input"
                        placeholder="Lagos"
                        value={enterpriseForm.city}
                        onChange={(event) =>
                          setEnterpriseForm((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  </div>

                  <label className="marketing-enterprise-field">
                    <span>Setup goals</span>
                    <textarea
                      className="marketing-enterprise-input marketing-enterprise-textarea"
                      placeholder="Tell us what you want DoorRent to help you configure for your team."
                      value={enterpriseForm.notes}
                      onChange={(event) =>
                        setEnterpriseForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </label>

                  {enterpriseFeedback ? (
                    <div className="marketing-enterprise-feedback is-modal">
                      {enterpriseFeedback}
                    </div>
                  ) : null}

                  <div className="marketing-enterprise-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={enterpriseSubmitting}
                    >
                      {enterpriseSubmitting
                        ? "Submitting..."
                        : "Send Enterprise Request"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEnterpriseFormOpen(false)}
                      disabled={enterpriseSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        .marketing-home {
          background: var(--bg);
          color: var(--ink);
          overflow-x: clip;
        }

        .marketing-container {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .marketing-home .marketing-btn-lg {
          padding: 15px 32px;
          font-size: 15px;
          border-radius: var(--radius);
        }

        .marketing-home .btn-ghost-light {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
        }

        .marketing-home .btn-ghost-light:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.32);
        }

        .marketing-home .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }

        .marketing-home .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .marketing-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: auto;
          z-index: 90;
          transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          overflow: hidden;
        }
        .marketing-nav.menu-open {
          bottom: 0;
          overflow-y: auto;
        }

        .marketing-nav.is-scrolled {
          background: rgba(245, 244, 240, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow);
        }
        .marketing-nav.menu-open:not(.is-scrolled) {
          background: #0f1210;
        }
        .marketing-nav.menu-open.is-scrolled {
          background: #f5f4f0;
        }

        .marketing-nav-inner {
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .marketing-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .marketing-brand-logo,
        .marketing-footer-logo-image {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .marketing-brand-logo {
          filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.15));
        }

        .marketing-brand-name,
        .marketing-footer-logo span {
          font-family: var(--font-display);
          font-size: 21px;
          letter-spacing: -0.02em;
          color: #fff;
        }

        .marketing-nav-links,
        .marketing-nav-cta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* ── Hamburger button ── */
        .marketing-hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
          position: relative;
          transition: background 0.25s, border-color 0.25s;
        }
        .marketing-hamburger:hover {
          background: rgba(255,255,255,0.18);
        }
        .marketing-nav.is-scrolled .marketing-hamburger {
          background: rgba(26,25,22,0.07);
          border-color: var(--border);
        }
        .marketing-nav.is-scrolled .marketing-hamburger:hover {
          background: rgba(26,25,22,0.12);
        }

        /* Three bars */
        .marketing-hamburger .bar {
          position: absolute;
          left: 50%;
          width: 20px;
          height: 2px;
          border-radius: 2px;
          background: #fff;
          transform-origin: center;
          transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1),
                      opacity 0.25s ease,
                      top 0.35s cubic-bezier(0.23, 1, 0.32, 1);
          translate: -50% 0;
        }
        .marketing-nav.is-scrolled .marketing-hamburger .bar {
          background: var(--ink);
        }
        .bar-top { top: 13px; }
        .bar-mid { top: 19px; }
        .bar-bot { top: 25px; }

        /* Open state → X */
        .marketing-hamburger.is-open .bar-top {
          top: 19px;
          transform: translateX(-50%) rotate(45deg);
        }
        .marketing-hamburger.is-open .bar-mid {
          opacity: 0;
          transform: translateX(-50%) scaleX(0);
        }
        .marketing-hamburger.is-open .bar-bot {
          top: 19px;
          transform: translateX(-50%) rotate(-45deg);
        }

        /* ── Mobile slide-down menu ── */
        @keyframes mmenu-in {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mmenu-item-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .marketing-mobile-menu {
          display: none;
          flex-direction: column;
          gap: 2px;
          border-top: 1px solid rgba(255,255,255,0.12);
          margin-top: 6px;
          padding: 16px 20px 40px;
          min-height: calc(100vh - 80px);
        }
        .marketing-nav.is-scrolled .marketing-mobile-menu {
          border-top-color: var(--border);
        }
        .marketing-mobile-menu.is-open {
          display: flex;
          animation: mmenu-in 0.3s cubic-bezier(0.23, 1, 0.32, 1) both;
        }

        .mmenu-item {
          display: flex;
          align-items: center;
          padding: 16px 14px;
          font-size: 18px;
          font-weight: 500;
          color: rgba(255,255,255,0.82);
          text-decoration: none;
          border-radius: 12px;
          letter-spacing: -0.01em;
          transition: background 0.15s, color 0.15s;
          opacity: 0;
          animation: mmenu-item-in 0.35s cubic-bezier(0.23, 1, 0.32, 1) both;
          animation-delay: calc(var(--i) * 60ms + 80ms);
        }
        .mmenu-item:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .marketing-nav.is-scrolled .mmenu-item {
          color: var(--ink2);
        }
        .marketing-nav.is-scrolled .mmenu-item:hover {
          background: rgba(26,25,22,0.06);
          color: var(--ink);
        }

        .portal-menu-wrap {
          position: relative;
        }
        .portal-menu-wrap:hover .portal-menu,
        .portal-menu-wrap:focus-within .portal-menu {
          display: flex;
        }
        .portal-menu-btn {
          cursor: pointer;
        }
        .portal-menu {
          display: none;
          flex-direction: column;
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: #fff;
          border: 1px solid var(--border, #e8e6df);
          border-radius: 10px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.14);
          z-index: 200;
          padding: 6px;
        }
        .portal-menu-item {
          display: block;
          padding: 9px 14px;
          border-radius: 7px;
          font-size: 14px;
          color: var(--ink, #1a1916);
          font-weight: 500;
          transition: background 0.12s;
          text-decoration: none;
        }
        .portal-menu-item:hover {
          background: var(--bg, #f5f4f0);
        }
        .portal-menu-item-muted {
          color: var(--ink2, #6b6860);
          font-size: 13px;
          font-weight: 400;
        }
        .portal-menu-divider {
          height: 1px;
          background: var(--border, #e8e6df);
          margin: 4px 0;
        }

        .marketing-nav-links a {
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          color: rgba(255, 255, 255, 0.68);
          transition: var(--transition);
        }

        .marketing-nav-links a:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .marketing-nav.is-scrolled .marketing-brand-name {
          color: var(--ink);
        }

        .marketing-nav.is-scrolled .marketing-nav-links a {
          color: var(--ink2);
        }

        .marketing-nav.is-scrolled .marketing-nav-links a:hover {
          background: rgba(26, 25, 22, 0.05);
          color: var(--ink);
        }

        .marketing-hero {
          min-height: 100vh;
          position: relative;
          background: var(--ink);
          overflow: hidden;
        }

        .marketing-hero-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 15% 60%, rgba(26, 58, 42, 0.75) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 15%, rgba(200, 169, 110, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(26, 74, 122, 0.08) 0%, transparent 45%);
        }

        .marketing-hero-arcs .marketing-arc {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .marketing-arc.arc-1 {
          width: 700px;
          height: 700px;
          top: -200px;
          right: -200px;
        }

        .marketing-arc.arc-2 {
          width: 500px;
          height: 500px;
          top: -100px;
          right: -100px;
          border-color: rgba(200, 169, 110, 0.08);
        }

        .marketing-arc.arc-3 {
          width: 300px;
          height: 300px;
          top: 0;
          right: 0;
          border-color: rgba(200, 169, 110, 0.12);
        }

        .marketing-hero-body {
          max-width: 1160px;
          margin: 0 auto;
          width: 100%;
          min-height: calc(100vh - 46px);
          padding: 120px 40px 80px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .marketing-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(380px, 520px);
          gap: 48px;
          align-items: center;
          width: 100%;
        }

        .marketing-hero-copy-wrap {
          max-width: 620px;
          position: relative;
          z-index: 2;
          min-width: 0;
        }

        .marketing-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border: 1px solid rgba(200, 169, 110, 0.35);
          background: rgba(200, 169, 110, 0.08);
          border-radius: 40px;
          font-size: 12px;
          font-weight: 500;
          color: var(--accent2);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 28px;
        }

        .marketing-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent2);
          box-shadow: 0 0 0 6px rgba(200, 169, 110, 0.16);
        }

        .marketing-hero-title {
          font-family: var(--font-display);
          font-size: clamp(46px, 6vw, 80px);
          line-height: 1;
          letter-spacing: -0.035em;
          color: #fff;
          max-width: 820px;
          margin-bottom: 28px;
          text-wrap: balance;
        }

        .marketing-hero-title em {
          color: var(--accent2);
          font-style: italic;
        }

        .marketing-hero-title span {
          display: block;
          color: rgba(255, 255, 255, 0.45);
        }

        .marketing-hero-copy {
          max-width: 480px;
          font-size: 17px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.58);
          margin-bottom: 44px;
        }

        .marketing-hero-actions,
        .marketing-cta-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }

        .marketing-proof {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-top: 56px;
          flex-wrap: wrap;
          max-width: 620px;
        }

        .marketing-proof > div:not(.marketing-proof-divider) {
          min-width: 0;
        }

        .marketing-proof strong {
          display: block;
          color: #fff;
          font-size: 26px;
          line-height: 1;
        }

        .marketing-proof span {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
        }

        .marketing-proof-divider {
          width: 1px;
          height: 36px;
          background: rgba(255, 255, 255, 0.12);
        }

        .marketing-hero-visual {
          position: relative;
          width: min(100%, 520px);
          justify-self: end;
          padding: 42px 34px 32px 0;
          z-index: 1;
        }

        .marketing-hero-visual::before {
          content: "";
          position: absolute;
          inset: 20px -30px 0 -30px;
          background: radial-gradient(ellipse at 50% 40%, rgba(26, 107, 74, 0.18) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .marketing-dashboard {
          position: relative;
          z-index: 1;
          background: var(--surface);
          border-radius: 24px;
          box-shadow: 0 24px 64px rgba(26, 25, 22, 0.18), 0 8px 24px rgba(26, 25, 22, 0.08);
          overflow: hidden;
          border: 1px solid rgba(26, 25, 22, 0.08);
        }

        .marketing-dashboard-topbar {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .marketing-dots {
          display: flex;
          gap: 5px;
        }

        .marketing-dots span {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .marketing-dots span:nth-child(1) { background: #fc5f57; }
        .marketing-dots span:nth-child(2) { background: #fdbc2c; }
        .marketing-dots span:nth-child(3) { background: #33c748; }

        .marketing-dashboard-title {
          font-size: 12px;
          color: var(--ink2);
          font-weight: 500;
        }

        .marketing-dashboard-body {
          display: flex;
          height: 320px;
          min-width: 0;
        }

        .marketing-dashboard-sidebar {
          width: 140px;
          border-right: 1px solid var(--border);
          padding: 12px 8px;
        }

        .marketing-dashboard-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          margin-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .marketing-dashboard-logo-image {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }

        .marketing-dashboard-section {
          padding: 8px 10px 4px;
          font-size: 9px;
          font-weight: 600;
          color: var(--ink3);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .marketing-dashboard-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          color: var(--ink3);
          font-size: 11px;
          border-radius: 6px;
        }

        .marketing-dashboard-item span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.5;
        }

        .marketing-dashboard-item.is-active {
          background: var(--accent-light);
          color: var(--accent);
          font-weight: 500;
        }

        .marketing-dashboard-content {
          flex: 1;
          background: var(--bg);
          padding: 14px;
          min-width: 0;
        }

        .marketing-dashboard-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .marketing-mini-stat,
        .marketing-chart-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px;
          min-width: 0;
        }

        .marketing-mini-stat label {
          display: block;
          font-size: 9px;
          font-weight: 600;
          color: var(--ink3);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .marketing-mini-stat strong {
          display: block;
          font-size: 16px;
          line-height: 1;
        }

        .marketing-mini-stat span {
          font-size: 9px;
          color: var(--green);
        }

        .marketing-chart-title {
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .marketing-chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 60px;
        }

        .marketing-chart-bar {
          flex: 1;
          background: var(--accent);
          opacity: 0.5;
          border-radius: 3px 3px 0 0;
        }

        .marketing-chart-bar.is-highlight {
          background: var(--accent2);
          opacity: 1;
        }

        .marketing-floating-card {
          position: absolute;
          z-index: 2;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 14px 18px;
        }

        .marketing-floating-card.left {
          left: -50px;
          bottom: -20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .marketing-floating-card.right {
          top: 30px;
          right: -40px;
          min-width: 170px;
        }

        .marketing-floating-card.right.dark {
          background: var(--accent);
          border-color: transparent;
          color: #fff;
        }

        .marketing-floating-card .icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--green-light);
        }

        .marketing-floating-card strong {
          display: block;
          font-size: 13px;
        }

        .marketing-floating-card span,
        .marketing-floating-card small {
          font-size: 11px;
          color: var(--ink3);
        }

        .marketing-floating-card.dark span,
        .marketing-floating-card.dark small {
          color: rgba(255, 255, 255, 0.62);
        }

        .marketing-floating-card.right.dark strong {
          font-size: 22px;
          margin: 4px 0;
        }

        .marketing-ticker {
          background: var(--accent);
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          overflow: hidden;
          padding: 11px 0;
        }

        .marketing-ticker-track {
          display: flex;
          gap: 32px;
          min-width: max-content;
          animation: marketingTicker 32s linear infinite;
        }

        .marketing-ticker-item {
          color: rgba(255, 255, 255, 0.65);
          font-size: 12px;
          white-space: nowrap;
        }

        .marketing-logos {
          padding: 56px 40px;
          text-align: center;
          border-bottom: 1px solid var(--border);
        }

        .marketing-logos p,
        .marketing-section-head p {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .marketing-logos p {
          color: var(--ink3);
          margin-bottom: 28px;
        }

        .marketing-logo-row {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .marketing-logo-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-display);
          color: var(--ink3);
          opacity: 0.62;
        }

        .marketing-section {
          padding: 100px 0;
        }

        .marketing-section-head {
          margin-bottom: 60px;
          max-width: 560px;
        }

        .marketing-section-head.centered {
          text-align: center;
          margin-left: auto;
          margin-right: auto;
        }

        .marketing-section-head.light p {
          color: var(--accent2);
        }

        .marketing-section-head p {
          color: var(--accent);
          margin-bottom: 14px;
        }

        .marketing-section-head h2 {
          font-family: var(--font-display);
          font-size: clamp(32px, 4vw, 50px);
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 16px;
        }

        .marketing-section-head.light h2 {
          color: #fff;
        }

        .marketing-section-head h2 em {
          color: var(--accent);
          font-style: italic;
        }

        .marketing-section-head.light h2 em {
          color: var(--accent2);
        }

        .marketing-section-head span {
          font-size: 16px;
          line-height: 1.7;
          color: var(--ink2);
        }

        .marketing-section-head.light span {
          color: rgba(255, 255, 255, 0.48);
        }

        .marketing-feature-grid,
        .marketing-testimonial-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .marketing-pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          max-width: 1180px;
          margin: 0 auto;
          align-items: stretch;
        }

        .marketing-feature-card,
        .marketing-pricing-card,
        .marketing-testimonial-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 32px;
        }

        .marketing-feature-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          margin-bottom: 20px;
          background: var(--accent-light);
        }

        .marketing-feature-icon.is-gold { background: var(--accent2-light); }
        .marketing-feature-icon.is-blue { background: var(--blue-light); }

        .marketing-feature-card h3,
        .marketing-step h3,
        .marketing-testimonial-card strong {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .marketing-feature-card p,
        .marketing-step p,
        .marketing-testimonial-card p {
          color: var(--ink2);
          line-height: 1.65;
        }

        .marketing-roles {
          background: var(--ink);
          padding: 100px 0;
        }

        .marketing-role-tabs {
          display: inline-flex;
          gap: 3px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: var(--radius);
          margin-bottom: 32px;
        }

        .marketing-role-tabs button {
          padding: 10px 22px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.45);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .marketing-role-tabs button.is-active {
          background: var(--surface);
          color: var(--ink);
          box-shadow: var(--shadow);
        }

        .marketing-role-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }

        .marketing-role-panel h3 {
          font-family: var(--font-display);
          font-size: 30px;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 10px;
        }

        .marketing-role-panel > div > p {
          color: rgba(255, 255, 255, 0.45);
          font-size: 15px;
          line-height: 1.65;
        }

        .marketing-role-feature-list {
          display: grid;
          gap: 16px;
          margin-top: 28px;
        }

        .marketing-role-feature {
          display: flex;
          gap: 14px;
        }

        .marketing-role-feature .icon,
        .marketing-role-item .avatar {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .marketing-role-feature strong,
        .marketing-role-item strong {
          display: block;
          color: #fff;
          margin-bottom: 3px;
        }

        .marketing-role-feature span,
        .marketing-role-item span {
          color: rgba(255, 255, 255, 0.45);
          font-size: 13px;
          line-height: 1.5;
        }

        .marketing-role-screen {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 24px;
        }

        .marketing-role-screen-head,
        .marketing-role-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .marketing-role-screen-head {
          margin-bottom: 20px;
        }

        .marketing-role-screen-head .title {
          font-family: var(--font-display);
          font-size: 18px;
          color: #fff;
        }

        .marketing-role-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .marketing-role-badge.is-green {
          background: #e6f4ee;
          color: #1a6b4a;
        }

        .marketing-role-badge.is-gold,
        .marketing-role-badge.is-amber {
          background: rgba(200, 169, 110, 0.2);
          color: var(--accent2);
        }

        .marketing-role-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .marketing-role-stats.is-compact {
          grid-template-columns: repeat(2, 1fr);
        }

        .marketing-role-stat {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          padding: 14px;
        }

        .marketing-role-stat label {
          display: block;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }

        .marketing-role-stat strong {
          color: #fff;
          font-size: 22px;
          line-height: 1;
        }

        .marketing-role-stat span {
          font-size: 11px;
          color: var(--accent2);
        }

        .marketing-role-stat span.is-red {
          color: #f07c72;
        }

        .marketing-role-items {
          display: grid;
        }

        .marketing-role-item {
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .marketing-role-item:last-child {
          border-bottom: none;
        }

        .marketing-role-item .left,
        .marketing-role-item .right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .marketing-role-item .status {
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
        }

        .marketing-role-item .status.is-paid {
          background: rgba(26, 107, 74, 0.3);
          color: #6adba8;
        }

        .marketing-role-item .status.is-due {
          background: rgba(176, 125, 42, 0.3);
          color: var(--accent2);
        }

        .marketing-role-item .status.is-late {
          background: rgba(192, 57, 43, 0.3);
          color: #f07c72;
        }

        .marketing-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }

        .marketing-step .step-num {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--accent);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 18px;
          margin-bottom: 20px;
          box-shadow: 0 0 0 8px var(--accent-light);
        }

        .marketing-pricing {
          background: var(--surface2);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 100px 0;
        }

        .marketing-pricing-card {
          position: relative;
        }

        .marketing-pricing-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 16px;
        }

        .marketing-pricing-card.is-featured {
          background: linear-gradient(180deg, #1c9a72 0%, #1a6b4a 100%);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 56px rgba(26, 107, 74, 0.24);
        }

        .marketing-pricing-badge {
          position: absolute;
          top: -14px;
          left: 24px;
          background: var(--accent2);
          color: var(--ink);
          font-size: 11px;
          font-weight: 600;
          padding: 4px 14px;
          border-radius: 20px;
        }

        .marketing-pricing-card .plan-name {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink3);
          margin-bottom: 8px;
        }

        .marketing-pricing-card.is-featured .plan-name,
        .marketing-pricing-card.is-featured .plan-sub,
        .marketing-pricing-card.is-featured .plan-description,
        .marketing-pricing-card.is-featured .marketing-pricing-row,
        .marketing-pricing-card.is-featured .marketing-pricing-total span,
        .marketing-pricing-card.is-featured .marketing-pricing-total small {
          color: rgba(255, 255, 255, 0.7);
        }

        .marketing-pricing-card .plan-price {
          font-family: var(--font-display);
          font-size: 44px;
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 4px;
        }

        .marketing-pricing-card.is-featured .plan-price {
          color: #fff;
        }

        .marketing-pricing-card .plan-sub {
          color: var(--ink3);
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .marketing-pricing-card .plan-description {
          color: var(--ink2);
          margin-bottom: 18px;
        }

        .marketing-pricing-card .plan-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 24px;
        }

        .marketing-pricing-card.is-featured .plan-divider {
          background: rgba(255, 255, 255, 0.12);
        }

        .marketing-pricing-rows {
          display: grid;
          gap: 0;
          margin-bottom: 32px;
        }

        .marketing-pricing-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: var(--ink2);
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
        }

        .marketing-pricing-card.is-featured .marketing-pricing-row {
          border-bottom-color: rgba(255, 255, 255, 0.14);
        }

        .marketing-pricing-row.is-cost strong {
          color: var(--ink);
          font-size: 15px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .marketing-pricing-card.is-featured .marketing-pricing-row.is-cost strong {
          color: #fff;
        }

        .marketing-pricing-row.is-included {
          justify-content: flex-start;
        }

        .marketing-pricing-row .row-check {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-light);
          color: var(--accent);
          font-size: 10px;
          flex-shrink: 0;
        }

        .marketing-pricing-card.is-featured .row-check {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .marketing-enterprise-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: stretch;
          justify-content: center;
          padding: 24px;
        }

        .marketing-enterprise-backdrop {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top left, rgba(200, 169, 110, 0.16), transparent 32%),
            rgba(7, 11, 8, 0.72);
          backdrop-filter: blur(10px);
        }

        .marketing-enterprise-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          max-height: 100%;
          margin: auto;
          display: flex;
        }

        .marketing-enterprise-panel {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(380px, 0.95fr);
          min-height: min(760px, calc(100vh - 48px));
          max-height: calc(100vh - 48px);
          width: 100%;
          border-radius: 32px;
          overflow: auto;
          overscroll-behavior: contain;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(135deg, rgba(11, 18, 14, 0.98), rgba(22, 28, 23, 0.96));
          box-shadow: 0 40px 140px rgba(0, 0, 0, 0.34);
        }

        .marketing-enterprise-hero {
          position: relative;
          padding: 42px 40px;
          background:
            radial-gradient(circle at top left, rgba(200, 169, 110, 0.22), transparent 28%),
            radial-gradient(circle at bottom left, rgba(47, 107, 148, 0.18), transparent 24%),
            linear-gradient(155deg, #0d1511 0%, #182019 100%);
          color: #f7f4ea;
        }

        .marketing-enterprise-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #d9c394;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .marketing-enterprise-close {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
        }

        .marketing-enterprise-close:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .marketing-enterprise-hero h2 {
          margin: 24px 0 16px;
          font-size: clamp(34px, 4vw, 58px);
          line-height: 0.98;
          max-width: 12ch;
        }

        .marketing-enterprise-hero p {
          max-width: 56ch;
          font-size: 16px;
          line-height: 1.8;
          color: rgba(247, 244, 234, 0.78);
        }

        .marketing-enterprise-highlight-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 34px;
        }

        .marketing-enterprise-highlight {
          padding: 18px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .marketing-enterprise-highlight strong {
          display: block;
          font-size: 15px;
          margin-bottom: 8px;
          color: #fff;
        }

        .marketing-enterprise-highlight span {
          display: block;
          font-size: 13px;
          line-height: 1.7;
          color: rgba(247, 244, 234, 0.72);
        }

        .marketing-enterprise-next {
          margin-top: 32px;
          padding: 24px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .marketing-enterprise-next-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #d9c394;
          margin-bottom: 16px;
        }

        .marketing-enterprise-next-list {
          display: grid;
          gap: 14px;
        }

        .marketing-enterprise-next-list div {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }

        .marketing-enterprise-next-list span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: rgba(200, 169, 110, 0.14);
          color: #d9c394;
          font-size: 13px;
          font-weight: 700;
        }

        .marketing-enterprise-next-list p {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: rgba(247, 244, 234, 0.82);
        }

        .marketing-enterprise-form-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 40px 36px;
          background: linear-gradient(180deg, #f7f4ea 0%, #f1eee2 100%);
        }

        .marketing-enterprise-form-head p {
          margin: 0 0 8px;
          color: var(--accent);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .marketing-enterprise-form-head h3 {
          margin: 0;
          font-size: 32px;
          line-height: 1.05;
        }

        .marketing-enterprise-form-head span {
          display: block;
          margin-top: 10px;
          color: var(--ink3);
          font-size: 14px;
          line-height: 1.7;
        }

        .marketing-enterprise-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .marketing-enterprise-field {
          display: grid;
          gap: 8px;
        }

        .marketing-enterprise-field > span {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink2);
          letter-spacing: 0.02em;
        }

        .marketing-enterprise-input {
          width: 100%;
          border: 1px solid rgba(20, 22, 19, 0.12);
          border-radius: 16px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.88);
          color: var(--ink);
          font: inherit;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .marketing-enterprise-input:focus {
          outline: none;
          border-color: rgba(26, 58, 42, 0.5);
          box-shadow:
            0 0 0 4px rgba(26, 58, 42, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .marketing-enterprise-input::placeholder {
          color: var(--ink3);
        }

        .marketing-enterprise-textarea {
          min-height: 132px;
          resize: vertical;
        }

        .marketing-enterprise-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .marketing-enterprise-feedback {
          margin-top: 14px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink2);
        }

        .marketing-enterprise-feedback.is-modal {
          margin-top: 0;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(26, 58, 42, 0.08);
          border: 1px solid rgba(26, 58, 42, 0.12);
          color: var(--ink2);
        }

        .marketing-pricing-matrix {
          margin-top: 36px;
          padding: 28px;
          border-radius: 28px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.62);
          box-shadow: 0 16px 50px rgba(20, 26, 20, 0.06);
        }

        .marketing-pricing-matrix-head p {
          margin: 0 0 8px;
          color: var(--accent);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .marketing-pricing-matrix-head h3 {
          margin: 0;
          font-size: clamp(28px, 3vw, 36px);
          line-height: 1.05;
        }

        .marketing-pricing-matrix-head span {
          display: block;
          margin-top: 10px;
          color: var(--ink3);
          line-height: 1.7;
          max-width: 72ch;
        }

        .marketing-pricing-matrix-table {
          margin-top: 22px;
          display: grid;
          border: 1px solid var(--border);
          border-radius: 22px;
          overflow: hidden;
          background: var(--surface);
        }

        .marketing-pricing-matrix-row {
          display: grid;
          grid-template-columns: minmax(280px, 2.2fr) repeat(3, minmax(140px, 1fr));
          gap: 0;
          border-bottom: 1px solid var(--border);
        }

        .marketing-pricing-matrix-row:last-child {
          border-bottom: 0;
        }

        .marketing-pricing-matrix-row > div {
          padding: 18px 20px;
          border-right: 1px solid var(--border);
          min-width: 0;
        }

        .marketing-pricing-matrix-row > div:last-child {
          border-right: 0;
        }

        .marketing-pricing-matrix-row.is-head {
          background: #121612;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .marketing-pricing-matrix-row strong {
          display: block;
          font-size: 15px;
          color: var(--ink);
        }

        .marketing-pricing-matrix-row span {
          display: block;
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.7;
          color: var(--ink3);
        }

        .marketing-billing-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          border-radius: 999px;
          background: #131512;
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .marketing-billing-toggle button {
          border: 0;
          background: transparent;
          color: var(--ink3);
          padding: 10px 16px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .marketing-billing-toggle button span {
          color: #2083ff;
        }

        .marketing-billing-toggle button.is-active {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .marketing-pricing-highlight {
          margin-bottom: 24px;
          padding: 14px 16px;
          border-radius: 16px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--ink2);
          line-height: 1.7;
        }

        .marketing-pricing-highlight strong {
          color: var(--ink);
        }

        .marketing-pricing-highlight.is-featured {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.82);
        }

        .marketing-pricing-highlight.is-featured strong {
          color: #fff;
        }

        .marketing-pricing-total {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          border-top: 1px solid var(--border);
          padding-top: 20px;
          margin-bottom: 28px;
        }

        .marketing-pricing-card.is-featured .marketing-pricing-total {
          border-top-color: rgba(255, 255, 255, 0.14);
        }

        .marketing-pricing-total span,
        .marketing-pricing-total small {
          display: block;
        }

        .marketing-pricing-total span {
          color: var(--ink2);
          font-weight: 500;
          margin-bottom: 4px;
        }

        .marketing-pricing-total small {
          color: var(--ink3);
          line-height: 1.5;
        }

        .marketing-pricing-total strong {
          font-family: var(--font-display);
          font-size: 36px;
          line-height: 1;
          letter-spacing: -0.04em;
          color: var(--ink);
          flex-shrink: 0;
        }

        .marketing-testimonial-card .stars {
          color: var(--accent2);
          margin-bottom: 18px;
        }

        .marketing-testimonial-card .author {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
        }

        .marketing-testimonial-card .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--accent-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: var(--accent);
        }

        .marketing-testimonial-card .author span {
          display: block;
          font-size: 12px;
          color: var(--ink3);
          margin-top: 4px;
        }

        .marketing-cta {
          background: var(--accent);
          padding: 80px 0;
          text-align: center;
        }

        .marketing-cta-inner {
          max-width: 640px;
          margin: 0 auto;
        }

        .marketing-cta-inner h2 {
          font-family: var(--font-display);
          color: #fff;
          font-size: clamp(32px, 4vw, 50px);
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 16px;
        }

        .marketing-cta-inner h2 em {
          color: var(--accent2);
          font-style: italic;
        }

        .marketing-cta-inner p {
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.6;
          margin-bottom: 36px;
        }

        .marketing-cta-actions {
          justify-content: center;
        }

        .marketing-cta-actions .marketing-btn-lg {
          min-width: 196px;
        }

        .marketing-footer {
          background: var(--ink);
          padding: 64px 0 40px;
        }

        .marketing-footer-top {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 56px;
        }

        .marketing-footer-brand p,
        .marketing-footer ul a,
        .marketing-footer-bottom p,
        .marketing-footer-bottom .links a {
          color: rgba(255, 255, 255, 0.4);
        }

        .marketing-footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .marketing-footer h4 {
          color: rgba(255, 255, 255, 0.55);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
        }

        .marketing-footer ul {
          list-style: none;
          display: grid;
          gap: 10px;
        }

        .marketing-footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          padding-top: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .marketing-footer-bottom .links {
          display: flex;
          gap: 20px;
        }

        @keyframes marketingTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @media (max-width: 1024px) {
          .marketing-hero-body {
            display: block;
            min-height: auto;
            padding-bottom: 64px;
          }

          .marketing-hero-grid {
            grid-template-columns: 1fr;
          }

          .marketing-hero-visual {
            display: block;
            width: 100%;
            max-width: 560px;
            margin: 56px auto 52px;
            padding: 20px 70px 0;
            justify-self: unset;
          }

          .marketing-floating-card.left {
            left: -8px;
            bottom: -24px;
          }

          .marketing-floating-card.right {
            right: -8px;
            top: 16px;
          }

          .marketing-role-panel {
            grid-template-columns: 1fr;
          }

          .marketing-pricing-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .marketing-enterprise-overlay {
            padding: 14px;
          }

          .marketing-enterprise-panel {
            grid-template-columns: 1fr;
            min-height: auto;
            max-height: calc(100vh - 28px);
            overflow: auto;
          }

          .marketing-enterprise-hero,
          .marketing-enterprise-form-card {
            padding: 28px 22px;
          }

          .marketing-enterprise-highlight-grid,
          .marketing-enterprise-form-grid {
            grid-template-columns: 1fr;
          }

          .marketing-enterprise-hero h2 {
            max-width: none;
          }
        }

        @media (max-width: 768px) {
          .marketing-container,
          .marketing-hero-body {
            padding-left: 20px;
            padding-right: 20px;
          }

          .marketing-nav-links {
            display: none;
          }

          .marketing-nav-inner {
            gap: 12px;
          }

          .marketing-nav-cta {
            gap: 8px;
          }

          .marketing-nav-cta .btn-primary {
            padding: 10px 14px;
            font-size: 13px;
          }

          .marketing-hamburger {
            display: flex;
          }

          .marketing-hero-body {
            padding-top: 100px;
            padding-bottom: 60px;
          }

          .marketing-hero-visual {
            padding: 16px 12px 28px;
            margin-top: 40px;
          }

          .marketing-floating-card {
            display: none;
          }

          .marketing-proof {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px 14px;
            width: 100%;
            max-width: none;
          }

          .marketing-proof-divider {
            display: none;
          }

          .marketing-hero-title {
            font-size: clamp(38px, 13vw, 56px);
            max-width: 10ch;
            margin-bottom: 22px;
          }

          .marketing-hero-copy {
            max-width: none;
            font-size: 16px;
          }

          .marketing-hero-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: 100%;
          }

          .marketing-hero-actions .marketing-btn-lg {
            width: 100%;
            justify-content: center;
          }

          .marketing-proof strong {
            font-size: 22px;
          }

          .marketing-proof span {
            display: block;
            margin-top: 6px;
          }

          .marketing-hero-visual {
            max-width: none;
            padding: 8px 0 24px;
            margin-top: 32px;
          }

          .marketing-dashboard-body {
            flex-direction: column;
            height: auto;
          }

          .marketing-dashboard-sidebar {
            width: 100%;
            border-right: 0;
            border-bottom: 1px solid var(--border);
            padding: 12px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
          }

          .marketing-dashboard-logo {
            grid-column: 1 / -1;
            margin-bottom: 0;
          }

          .marketing-dashboard-section {
            padding: 6px 4px 0;
          }

          .marketing-dashboard-item {
            min-width: 0;
          }

          .marketing-dashboard-content {
            padding: 12px;
          }

          .marketing-mini-stat strong {
            font-size: 14px;
            word-break: break-word;
          }

          .marketing-feature-grid,
          .marketing-pricing-grid,
          .marketing-testimonial-grid,
          .marketing-steps,
          .marketing-footer-top {
            grid-template-columns: 1fr;
          }

          .marketing-pricing-card-top {
            flex-direction: column;
            align-items: stretch;
          }

          .marketing-billing-toggle {
            width: fit-content;
            max-width: 100%;
            flex-wrap: wrap;
          }

          .marketing-pricing-matrix {
            padding: 20px;
          }

          .marketing-pricing-matrix-table {
            overflow: auto;
          }

          .marketing-pricing-matrix-row {
            min-width: 760px;
          }

          .marketing-roles,
          .marketing-pricing,
          .marketing-section,
          .marketing-cta {
            padding-top: 64px;
            padding-bottom: 64px;
          }

          .marketing-logos {
            padding: 48px 20px;
          }

          .marketing-footer {
            padding: 48px 0 32px;
          }

          .marketing-footer-bottom {
            flex-direction: column;
            text-align: center;
          }

          .marketing-footer-bottom .links {
            flex-wrap: wrap;
            justify-content: center;
          }

          .marketing-role-tabs {
            width: 100%;
            flex-wrap: wrap;
          }

          .marketing-enterprise-overlay {
            padding: 0;
          }

          .marketing-enterprise-shell {
            width: 100%;
            height: 100%;
          }

          .marketing-enterprise-panel {
            border-radius: 0;
            min-height: 100vh;
            max-height: 100vh;
          }

          .marketing-enterprise-close {
            top: 18px;
            right: 18px;
          }
        }

        @media (max-width: 520px) {
          .marketing-brand-name,
          .marketing-footer-logo span {
            font-size: 18px;
          }

          .marketing-nav-cta .btn {
            padding: 9px 12px;
          }

          .marketing-hero-body {
            padding-top: 88px;
          }

          .marketing-hero-title {
            font-size: clamp(34px, 12vw, 48px);
          }

          .marketing-dashboard-stats {
            grid-template-columns: 1fr;
          }

          .marketing-pricing-matrix {
            padding: 18px 16px;
          }

          .marketing-enterprise-hero,
          .marketing-enterprise-form-card {
            padding: 24px 18px;
          }

          .marketing-enterprise-next {
            padding: 18px;
          }

          .marketing-enterprise-next-list div {
            grid-template-columns: 40px minmax(0, 1fr);
            gap: 12px;
          }

          .marketing-enterprise-next-list span {
            width: 40px;
            height: 40px;
            border-radius: 14px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}
