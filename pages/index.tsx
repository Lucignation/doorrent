import Link from "next/link";
import { useEffect, useState } from "react";
import PageMeta from "../components/layout/PageMeta";
import { LOGO_PATH } from "../lib/site";

type RoleKey = "landlord" | "tenant";

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
const BASIC_YEARLY_LIST_PRICE = 102000;
const BASIC_YEARLY_DISCOUNT_PRICE = 95000;
const BASIC_YEARLY_SAVINGS_AMOUNT =
  BASIC_YEARLY_LIST_PRICE - BASIC_YEARLY_DISCOUNT_PRICE;
const BASIC_YEARLY_SAVINGS_PERCENT = Math.round(
  (BASIC_YEARLY_SAVINGS_AMOUNT / BASIC_YEARLY_LIST_PRICE) * 100,
);

const basicPlanFeatures = [
  "Arranging Google Meet meetings with one tenant",
  "Arranging Google Meet meetings with all tenants",
  "Units management",
  "Properties management",
];

const fullServiceFeatures = [
  "Agreements",
  "Payments",
  "Receipts",
  "Reminders & automations",
  "Caretaker access",
  "Reports",
  "Account updates",
  "Team member management",
];

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

export default function LandingPage() {
  const [activeRole, setActiveRole] = useState<RoleKey>("landlord");
  const [basicBillingCycle, setBasicBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [isScrolled, setIsScrolled] = useState(false);

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

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const activePanel = rolePanels[activeRole];
  const basicPrice =
    basicBillingCycle === "monthly" ? BASIC_MONTHLY_PRICE : BASIC_YEARLY_DISCOUNT_PRICE;
  const basicPriceLabel = `₦${basicPrice.toLocaleString("en-NG")}`;
  const basicBillingNote =
    basicBillingCycle === "monthly" ? "per month billed monthly" : "per year billed yearly";

  return (
    <>
      <PageMeta
        title="DoorRent — Property Management, Reimagined"
        description="Collect rent, manage tenants, send agreements, and track every property workflow in one elegant platform built for Nigerian landlords."
      />

      <div className="marketing-home">
        <nav className={`marketing-nav ${isScrolled ? "is-scrolled" : ""}`}>
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
                <a href="#pricing">Why it's free</a>
                <a href="#testimonials">Testimonials</a>
              </div>

              <div className="marketing-nav-cta">
                <Link href="/marketplace" className="btn btn-ghost-light marketing-mobile-marketplace">
                  Marketplace
                </Link>
                <Link href="/portal" className="btn btn-secondary">
                  Sign in
                </Link>
                <Link href="/portal" className="btn btn-primary">
                  Get started →
                </Link>
              </div>
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
                  <div>
                    <strong>12,000+</strong>
                    <span>Properties managed</span>
                  </div>
                  <div className="marketing-proof-divider" />
                  <div>
                    <strong>₦4.2B+</strong>
                    <span>Rent collected</span>
                  </div>
                  <div className="marketing-proof-divider" />
                  <div>
                    <strong>98.3%</strong>
                    <span>Platform uptime</span>
                  </div>
                  <div className="marketing-proof-divider" />
                  <div>
                    <strong>5,200+</strong>
                    <span>Active landlords</span>
                  </div>
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
                          <strong>4</strong>
                          <span>24 units</span>
                        </div>
                        <div className="marketing-mini-stat">
                          <label>Collected</label>
                          <strong>₦3.1M</strong>
                          <span>↑ 12%</span>
                        </div>
                        <div className="marketing-mini-stat">
                          <label>Occupancy</label>
                          <strong>87%</strong>
                          <span>21 / 24</span>
                        </div>
                      </div>

                      <div className="marketing-chart-card">
                        <div className="marketing-chart-title">
                          Rent Collection · 12 months
                        </div>
                        <div className="marketing-chart-bars">
                          {[30, 38, 35, 45, 52, 48, 58, 50, 70, 61, 73, 80].map(
                            (height, index) => (
                              <div
                                key={height}
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
                    <strong>Payment received</strong>
                    <span>Chidinma Eze · ₦320,000</span>
                  </div>
                </div>

                <div className="marketing-floating-card right dark">
                  <small>Overdue rent</small>
                  <strong>₦780K</strong>
                  <span>3 tenants · send reminders →</span>
                </div>
              </div>
            </div>
          </div>

          <div className="marketing-ticker">
            <div className="marketing-ticker-track">
              {[
                "₦320,000 rent received",
                "Kelechi Dike signed tenancy agreement",
                "Unit A3 renewed for 12 months",
                "Overdue notice sent to Tunde Adeola",
                "₦1.2M disbursed to landlord",
                "New property added — Banana Island Towers",
                "Receipt generated for Ikoyi Residences",
              ]
                .concat([
                  "₦320,000 rent received",
                  "Kelechi Dike signed tenancy agreement",
                  "Unit A3 renewed for 12 months",
                  "Overdue notice sent to Tunde Adeola",
                  "₦1.2M disbursed to landlord",
                  "New property added — Banana Island Towers",
                  "Receipt generated for Ikoyi Residences",
                ])
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
                Basic or Full Service.
                <br />
                <em>Built around how rent is collected.</em>
              </h2>
              <span>
                Basic lets landlords choose monthly or yearly billing for property and unit
                management. Full Service adds the operational tools Basic does not include,
                and charges a 3% base commission at collection time, scaled by the rent
                years paid upfront.
              </span>
            </div>

            <div className="marketing-pricing-grid reveal">
              <article className="marketing-pricing-card">
                <div className="marketing-pricing-card-top">
                  <p className="plan-name">Basic</p>
                  <div className="marketing-billing-toggle" role="tablist" aria-label="Basic billing cycle">
                    <button
                      type="button"
                      className={basicBillingCycle === "monthly" ? "is-active" : ""}
                      onClick={() => setBasicBillingCycle("monthly")}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      className={basicBillingCycle === "yearly" ? "is-active" : ""}
                      onClick={() => setBasicBillingCycle("yearly")}
                    >
                      Yearly <span>· Save {BASIC_YEARLY_SAVINGS_PERCENT}%</span>
                    </button>
                  </div>
                </div>
                <div className="plan-price">{basicPriceLabel}</div>
                <div className="plan-sub">{basicBillingNote}</div>
                <p className="plan-description">
                  Subscription plan for landlords who want to manage properties and units,
                  and arrange Google Meet sessions with a tenant or the full tenant base.
                </p>
                {basicBillingCycle === "yearly" ? (
                  <div className="marketing-pricing-highlight">
                    <strong>Standard yearly price:</strong> ₦
                    {BASIC_YEARLY_LIST_PRICE.toLocaleString("en-NG")}/year
                    <br />
                    <strong>Discounted price:</strong> ₦
                    {BASIC_YEARLY_DISCOUNT_PRICE.toLocaleString("en-NG")}/year
                    <br />
                    <strong>You save:</strong> ₦
                    {BASIC_YEARLY_SAVINGS_AMOUNT.toLocaleString("en-NG")} (
                    {BASIC_YEARLY_SAVINGS_PERCENT}%)
                  </div>
                ) : (
                  <div className="marketing-pricing-highlight">
                    Monthly billing is ₦{BASIC_MONTHLY_PRICE.toLocaleString("en-NG")}/month,
                    and landlords can switch to yearly billing at ₦
                    {BASIC_YEARLY_DISCOUNT_PRICE.toLocaleString("en-NG")}/year.
                  </div>
                )}
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
                <p className="plan-name">Full Service</p>
                <div className="plan-price">3%</div>
                <div className="plan-sub">base per rent year covered</div>
                <p className="plan-description">
                  Popular choice for landlords who need the operational tools that Basic
                  does not include, from agreements and collections to reports and account
                  controls.
                </p>
                <div className="marketing-pricing-highlight is-featured">
                  No monthly subscription. DoorRent applies a 3% base commission per rent
                  year covered, so multi-year upfront rent increases the total commission in
                  that collection.
                </div>
                <div className="plan-divider" />
                <div className="marketing-pricing-rows">
                  {fullServiceFeatures.map((feature) => (
                    <div key={feature} className="marketing-pricing-row is-included">
                      <span className="row-check">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Link href="/portal" className="btn btn-secondary btn-full">
                  Choose Full Service
                </Link>
              </article>
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
                  <li><a href="#pricing">Why it's free</a></li>
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
                  <li><a href="/">Privacy Policy</a></li>
                  <li><a href="/">Terms of Service</a></li>
                  <li><a href="/">Security</a></li>
                </ul>
              </div>
            </div>

            <div className="marketing-footer-bottom">
              <p>© 2026 DoorRent – Subsidiary of ReSuply Technologies Limited. All rights reserved.</p>
              <div className="links">
                <a href="https://x.com" target="_blank" rel="noreferrer">
                  Twitter / X
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer">
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .marketing-home {
          background: var(--bg);
          color: var(--ink);
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
          z-index: 90;
          transition: all 0.3s ease;
        }

        .marketing-nav.is-scrolled {
          background: rgba(245, 244, 240, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow);
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

        .marketing-mobile-marketplace {
          display: none;
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

        .marketing-dashboard {
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
        }

        .marketing-dashboard-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .marketing-mini-stat,
        .marketing-chart-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px;
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
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          max-width: 1040px;
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
          }

          .marketing-hero-grid {
            grid-template-columns: 1fr;
          }

          .marketing-hero-visual {
            display: none;
          }

          .marketing-role-panel {
            grid-template-columns: 1fr;
          }

          .marketing-pricing-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .marketing-container,
          .marketing-hero-body {
            padding-left: 20px;
            padding-right: 20px;
          }

          .marketing-nav-links,
          .marketing-nav-cta .btn-secondary {
            display: none;
          }

          .marketing-nav-inner {
            gap: 12px;
          }

          .marketing-nav-cta {
            gap: 8px;
          }

          .marketing-nav-cta .btn {
            padding: 10px 14px;
            font-size: 12px;
          }

          .marketing-mobile-marketplace {
            display: inline-flex;
          }

          .marketing-nav.is-scrolled .marketing-mobile-marketplace {
            background: var(--accent-light);
            color: var(--accent);
            border-color: rgba(26, 58, 42, 0.14);
          }

          .marketing-hero-body {
            padding-top: 100px;
            padding-bottom: 60px;
          }

          .marketing-proof {
            gap: 16px;
          }

          .marketing-proof-divider {
            display: none;
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
        }
      `}</style>
    </>
  );
}
