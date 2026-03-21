import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/layout/PageMeta";
import {
  defaultDemoRequest,
  fallbackLandingContent,
  fetchLandingContent,
  type DemoRequestInput,
  type LandingAction,
  type LandingPageData,
} from "../lib/landing-content";

interface LandingPageProps {
  content: LandingPageData;
  apiBaseUrl: string;
  source: "api" | "fallback";
}

function resolveAction(content: LandingPageData, actionId: string) {
  return content.actions.find((action) => action.id === actionId) ?? null;
}

function ActionLink({
  action,
  onOpenModal,
}: {
  action: LandingAction;
  onOpenModal: (action: LandingAction) => void;
}) {
  const className = `landing-button landing-button-${action.variant}`;

  if (action.modalId) {
    return (
      <button type="button" className={className} onClick={() => onOpenModal(action)}>
        {action.label}
      </button>
    );
  }

  if (!action.href) {
    return (
      <button type="button" className={className}>
        {action.label}
      </button>
    );
  }

  if (action.href.startsWith("http")) {
    return (
      <a className={className} href={action.href} target="_blank" rel="noreferrer">
        {action.label}
      </a>
    );
  }

  return (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

export default function LandingPage({
  content,
  apiBaseUrl,
  source,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<DemoRequestInput>(defaultDemoRequest);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "preview">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedDraft = window.localStorage.getItem("propos-demo-request-draft");

    if (!savedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as Partial<DemoRequestInput>;
      setFormState((current) => ({ ...current, ...parsed }));
    } catch {
      window.localStorage.removeItem("propos-demo-request-draft");
    }
  }, []);

  const primaryAction = useMemo(
    () => resolveAction(content, content.hero.primaryActionId),
    [content],
  );
  const secondaryAction = useMemo(
    () => resolveAction(content, content.hero.secondaryActionId),
    [content],
  );
  const footerActions = useMemo(
    () =>
      content.footerActionIds
        .map((actionId) => resolveAction(content, actionId))
        .filter((item): item is LandingAction => Boolean(item)),
    [content],
  );
  const requestDemoModal = useMemo(
    () => content.modals.find((modal) => modal.id === "request-demo") ?? null,
    [content],
  );

  const handleFieldChange = (field: keyof DemoRequestInput, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleOpenModal = (action: LandingAction) => {
    if (action.modalId === "request-demo") {
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState("submitting");
    setFeedback("");

    try {
      const response = await fetch(`${apiBaseUrl}/modals/request-demo/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formState,
          pageSlug: "landing",
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Request could not be sent");
      }

      setSubmitState("success");
      setFeedback(payload.message ?? "Demo request received.");
      setFormState(defaultDemoRequest);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("propos-demo-request-draft");
      }
    } catch {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "propos-demo-request-draft",
          JSON.stringify(formState),
        );
      }

      setSubmitState("preview");
      setFeedback("API unavailable right now, so the request was saved locally in preview mode.");
    }
  };

  return (
    <>
      <PageMeta
        title="DoorRent — Property Management Platform"
        description="Landing page for the multi-role property management experience powered by the new Express and Prisma API."
      />

      <main className="landing-shell">
        <div className="landing-backdrop" />

        <section className="landing-nav-wrap">
          <nav className="landing-nav">
            <Link href="/" className="landing-brand">
              <span className="landing-brand-mark">P</span>
              <span>{content.brand}</span>
            </Link>

            <div className="landing-nav-links">
              <a href="#workflow">Workflow</a>
              <a href="#roles">Portals</a>
              <a href="#faq">FAQ</a>
            </div>

            <div className="landing-nav-actions">
              <Link href="/portal" className="landing-mini-link">
                Sign in
              </Link>
              {primaryAction ? (
                <ActionLink action={primaryAction} onOpenModal={handleOpenModal} />
              ) : null}
            </div>
          </nav>
        </section>

        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-chip-row">
              <span className="landing-chip">New marketing landing page</span>
              <span className={`landing-chip ${source === "api" ? "is-live" : ""}`}>
                {source === "api" ? "Live API data" : "Preview fallback"}
              </span>
            </div>

            <p className="landing-eyebrow">{content.hero.eyebrow}</p>
            <h1>{content.hero.title}</h1>
            <p className="landing-subtitle">{content.hero.subtitle}</p>

            <div className="landing-hero-actions">
              {primaryAction ? (
                <ActionLink action={primaryAction} onOpenModal={handleOpenModal} />
              ) : null}
              {secondaryAction ? (
                <ActionLink action={secondaryAction} onOpenModal={handleOpenModal} />
              ) : null}
            </div>

            <p className="landing-trust-note">{content.hero.trustNote}</p>
          </div>

          <div className="landing-hero-panel">
            <div className="landing-panel">
              <div className="landing-panel-label">Ops canvas</div>
              <h2>One product surface, three role-specific experiences.</h2>
              <div className="landing-panel-grid">
                <div className="landing-surface-card">
                  <span>Landlord</span>
                  <strong>Portfolio, notices, agreements</strong>
                  <p>Track occupancy, overdue rent, and renewal risk from one dashboard.</p>
                </div>
                <div className="landing-surface-card">
                  <span>Admin</span>
                  <strong>Back office, support, audit</strong>
                  <p>Monitor landlords, ticket pressure, and system activity in one place.</p>
                </div>
                <div className="landing-surface-card is-accent">
                  <span>Tenant</span>
                  <strong>Payments, receipts, notices</strong>
                  <p>Give tenants a clean self-serve path for rent and agreement actions.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stat-strip">
          {content.statStrip.map((item) => (
            <div key={item.label} className="landing-stat-card">
              <div className="landing-stat-label">{item.label}</div>
              <div className="landing-stat-value">{item.value}</div>
              <div className="landing-stat-detail">{item.detail}</div>
            </div>
          ))}
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <p>Product pillars</p>
            <h2>Everything the current app prototype already does, organized into a sharper front door.</h2>
          </div>
          <div className="landing-feature-grid">
            {content.featureBlocks.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
                <ul>
                  {feature.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="landing-section landing-section-alt">
          <div className="landing-section-head">
            <p>Workflow</p>
            <h2>From setup to collection to communication, the sequence stays visible.</h2>
          </div>
          <div className="landing-workflow">
            {content.workflow.map((item) => (
              <article key={item.step} className="landing-workflow-card">
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="roles" className="landing-section">
          <div className="landing-section-head">
            <p>Portal access</p>
            <h2>Jump straight into the role-based pages that the new API now exposes.</h2>
          </div>
          <div className="landing-role-grid">
            {content.roles.map((role) => (
              <article key={role.name} className="landing-role-card">
                <div className="landing-role-top">
                  <div>
                    <h3>{role.name}</h3>
                    <p>{role.summary}</p>
                  </div>
                  <Link href={role.path} className="landing-role-link">
                    Open
                  </Link>
                </div>
                <ul>
                  {role.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section-alt">
          <div className="landing-section-head">
            <p>Team feedback</p>
            <h2>Designed for the people moving property operations every day.</h2>
          </div>
          <div className="landing-quote-grid">
            {content.quotes.map((quote) => (
              <blockquote key={quote.person} className="landing-quote-card">
                <p>{quote.quote}</p>
                <footer>
                  <strong>{quote.person}</strong>
                  <span>{quote.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section id="faq" className="landing-section">
          <div className="landing-section-head">
            <p>FAQ</p>
            <h2>Implementation details the team will care about.</h2>
          </div>
          <div className="landing-faq-grid">
            {content.faqs.map((item) => (
              <article key={item.question} className="landing-faq-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta-band">
          <div>
            <p>Ready to explore the build?</p>
            <h2>Use the new landing page as the front door, then drop into the demo portal or the Swagger docs.</h2>
          </div>
          <div className="landing-cta-actions">
            {footerActions.map((action) => (
              <ActionLink
                key={action.id}
                action={action}
                onOpenModal={handleOpenModal}
              />
            ))}
          </div>
        </section>
      </main>

      {isModalOpen && requestDemoModal ? (
        <div
          className="landing-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="landing-modal-card">
            <div className="landing-modal-header">
              <div>
                <p className="landing-modal-kicker">Demo request</p>
                <h2>{requestDemoModal.title}</h2>
                <span>{requestDemoModal.description}</span>
              </div>
              <button
                type="button"
                className="landing-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                x
              </button>
            </div>

            <form className="landing-modal-form" onSubmit={handleSubmit}>
              <div className="landing-form-grid">
                <label>
                  <span>Full name</span>
                  <input
                    value={formState.name}
                    onChange={(event) => handleFieldChange("name", event.target.value)}
                    required
                    placeholder="Adaeze Okafor"
                  />
                </label>
                <label>
                  <span>Work email</span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) => handleFieldChange("email", event.target.value)}
                    required
                    placeholder="adaeze@company.com"
                  />
                </label>
                <label>
                  <span>Company</span>
                  <input
                    value={formState.company}
                    onChange={(event) => handleFieldChange("company", event.target.value)}
                    required
                    placeholder="Urban Oak Residences"
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    value={formState.phone}
                    onChange={(event) => handleFieldChange("phone", event.target.value)}
                    placeholder="+234 800 000 0000"
                  />
                </label>
              </div>

              <label>
                <span>Portfolio size</span>
                <input
                  value={formState.portfolioSize}
                  onChange={(event) => handleFieldChange("portfolioSize", event.target.value)}
                  placeholder="52 units across 3 properties"
                />
              </label>

              <label>
                <span>What should we cover?</span>
                <textarea
                  value={formState.message}
                  onChange={(event) => handleFieldChange("message", event.target.value)}
                  placeholder="Show rent collection, notices, and e-signatures."
                />
              </label>

              {feedback ? (
                <div className={`landing-form-feedback ${submitState}`}>
                  {feedback}
                </div>
              ) : null}

              <div className="landing-modal-actions">
                <button
                  type="button"
                  className="landing-button landing-button-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="landing-button landing-button-primary"
                  disabled={submitState === "submitting"}
                >
                  {submitState === "submitting"
                    ? "Sending..."
                    : requestDemoModal.submitLabel ?? "Send request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://localhost:4000/api/v1";

  try {
    const content = await fetchLandingContent(apiBaseUrl);

    return {
      props: {
        content,
        apiBaseUrl,
        source: "api",
      },
    };
  } catch {
    return {
      props: {
        content: fallbackLandingContent,
        apiBaseUrl,
        source: "fallback",
      },
    };
  }
};
