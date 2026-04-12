import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import PageMeta from "../../components/layout/PageMeta";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { ResidentPortalSession } from "../../context/TenantSessionContext";

type Step = "email" | "code";
type WorkspaceKind = "estate" | "property" | null;

const PRIMARY = "#1A5C42";
const ACCENT = "#D2A85A";

export default function ResidentLoginPage() {
  const router = useRouter();
  const { isHydrated, residentSession, saveResidentSession } = useResidentPortalSession();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicLinkPreview, setMagicLinkPreview] = useState("");
  const [workspaceKind, setWorkspaceKind] = useState<WorkspaceKind>(null);
  const [slugResolved, setSlugResolved] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const token = router.query.token as string | undefined;
    if (token) {
      void handleVerifyWithToken(token);
    }
  }, [router.isReady, router.query.token]);

  useEffect(() => {
    if (isHydrated && residentSession) {
      void router.replace("/resident");
    }
  }, [isHydrated, residentSession, router]);

  useEffect(() => {
    if (!router.isReady) return;
    const slug = router.query.workspace as string | undefined;
    if (!slug?.trim()) {
      setSlugResolved(true);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/landing-builder/${encodeURIComponent(slug.trim())}`);
        if (res.ok) {
          const payload = (await res.json()) as { data?: { workspaceType?: string } } | null;
          const wt = payload?.data?.workspaceType;
          setWorkspaceKind(wt === "estate" ? "estate" : wt === "property" ? "property" : null);
        }
      } catch {
        // ignore — fall back to showing both
      } finally {
        setSlugResolved(true);
      }
    })();
  }, [router.isReady, router.query.workspace]);

  async function handleVerifyWithToken(token: string) {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiRequest<{ token: string; expiresAt: string; resident: ResidentPortalSession["resident"] }>("/resident/auth/verify-login", {
        method: "POST",
        body: { token },
      });
      saveResidentSession({ token: data.token, expiresAt: data.expiresAt, resident: data.resident }, { persist: true });
      void router.replace("/resident");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await apiRequest<{ email: string; magicLinkPreview?: string }>("/resident/auth/request-login", {
        method: "POST",
        body: { email: email.trim().toLowerCase() },
      });
      setMagicLinkPreview(data.magicLinkPreview ?? "");
      setStep("code");
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send sign-in code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await apiRequest<{ token: string; expiresAt: string; resident: ResidentPortalSession["resident"] }>("/resident/auth/verify-login", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), code: code.trim(), rememberMe: true },
      });
      saveResidentSession({ token: data.token, expiresAt: data.expiresAt, resident: data.resident }, { persist: true });
      void router.replace("/resident");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  if (!isHydrated) return null;
  if (residentSession) return null;

  const activities = [
    { icon: "🏡", label: "Gate pass approved", sub: "Visitor • 2m ago" },
    { icon: "📋", label: "Estate dues reminder", sub: "Q2 levy due in 5 days" },
    { icon: "📢", label: "New notice posted", sub: "Road works — Phase 2" },
    { icon: "✅", label: "Contribution recorded", sub: "₦45,000 received" },
  ];

  return (
    <>
      <PageMeta title="Estate Resident Login" />

      <div className="rl-root">
        {/* ── Left panel ── */}
        <div className="rl-panel rl-left">
          {/* Ambient orbs */}
          <div className="rl-orb rl-orb-1" />
          <div className="rl-orb rl-orb-2" />
          <div className="rl-orb rl-orb-3" />

          {/* Brand */}
          <div className="rl-brand">
            <div className="rl-brand-mark">DR</div>
            <span>DoorRent</span>
          </div>

          {/* Hero copy */}
          <div className="rl-hero-copy">
            <div className="rl-pill">Estate resident portal</div>
            <h1 className="rl-headline">
              Your community,<br />
              <em>right here.</em>
            </h1>
            <p className="rl-subline">
              Access gate passes, dues, notices, and estate governance — all in one secure resident portal.
            </p>
          </div>

          {/* Activity feed */}
          <div className="rl-feed">
            {activities.map((a) => (
              <div key={a.label} className="rl-feed-item">
                <div className="rl-feed-icon">{a.icon}</div>
                <div>
                  <strong>{a.label}</strong>
                  <span>{a.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="rl-stats">
            {[
              { value: "12K+", label: "Residents" },
              { value: "98%", label: "Uptime" },
              { value: "4.9★", label: "Rating" },
            ].map((s) => (
              <div key={s.label} className="rl-stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="rl-panel rl-right">
          <div className="rl-form-wrap">
            {/* Header */}
            <div className="rl-form-header">
              <div className="rl-form-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secure access
              </div>
              <h2 className="rl-form-title">
                {step === "email" ? "Resident sign in" : "Enter your code"}
              </h2>
              <p className="rl-form-sub">
                {step === "email"
                  ? "Enter your registered email address to receive a one-time sign-in code."
                  : `We sent a 6-digit code to ${email}. Check your inbox.`}
              </p>
            </div>

            {/* Step indicator */}
            <div className="rl-steps">
              <div className={`rl-step ${step === "email" ? "active" : "done"}`}>
                <div className="rl-step-dot">{step === "code" ? "✓" : "1"}</div>
                <span>Email</span>
              </div>
              <div className="rl-step-line" />
              <div className={`rl-step ${step === "code" ? "active" : ""}`}>
                <div className="rl-step-dot">2</div>
                <span>Verify</span>
              </div>
            </div>

            {/* Form */}
            {step === "email" ? (
              <form className="rl-form" onSubmit={handleRequestCode}>
                <div className="rl-field">
                  <label className="rl-label">Email address</label>
                  <div className="rl-input-wrap">
                    <svg className="rl-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <input
                      className="rl-input"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error ? <div className="rl-error">{error}</div> : null}

                {magicLinkPreview ? (
                  <div className="rl-magic-preview">
                    Magic link: <a href={magicLinkPreview}>{magicLinkPreview}</a>
                  </div>
                ) : null}

                <button type="submit" className="rl-btn" disabled={loading || !email.trim()}>
                  {loading ? (
                    <><span className="rl-spinner" /> Sending…</>
                  ) : (
                    <>Send sign-in code <span className="rl-arrow">→</span></>
                  )}
                </button>
              </form>
            ) : (
              <form className="rl-form" onSubmit={handleVerifyCode}>
                <div className="rl-field">
                  <label className="rl-label">6-digit code</label>
                  <div className="rl-input-wrap">
                    <svg className="rl-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4l3 3" />
                    </svg>
                    <input
                      ref={codeInputRef}
                      className="rl-input rl-input-code"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                  <p className="rl-field-hint">Check your spam folder if you don't see it within a minute.</p>
                </div>

                {error ? <div className="rl-error">{error}</div> : null}

                <button type="submit" className="rl-btn" disabled={loading || code.length !== 6}>
                  {loading ? (
                    <><span className="rl-spinner" /> Verifying…</>
                  ) : (
                    <>Sign in to my account <span className="rl-arrow">→</span></>
                  )}
                </button>

                <button
                  type="button"
                  className="rl-btn-ghost"
                  onClick={() => { setStep("email"); setCode(""); setError(""); }}
                >
                  ← Use a different email
                </button>
              </form>
            )}

            {/* Trust badges */}
            <div className="rl-trust">
              <span>🔒 End-to-end encrypted</span>
              <span>⚡ No password required</span>
              <span>🛡 Estate-verified access</span>
            </div>

            {/* Footer links */}
            <div className="rl-footer-link">
              <span className="rl-footer-admin">
                Signing in as an estate admin?{" "}
                <Link href="/portal">Estate admin login</Link>
              </span>
              {slugResolved && (
                <span className="rl-footer-alts">
                  {workspaceKind === "property" ? (
                    <Link href="/tenant/login">Tenant login</Link>
                  ) : workspaceKind === "estate" ? (
                    <Link href="/resident/login">Estate resident login</Link>
                  ) : (
                    <>
                      <Link href="/tenant/login">Tenant login</Link>
                      {" · "}
                      <Link href="/resident/login">Estate resident login</Link>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }

        .rl-root {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
          font-family: "Avenir Next", "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ── LEFT PANEL ── */
        .rl-left {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: clamp(32px, 5vw, 60px);
          background:
            radial-gradient(circle at 10% 0%, rgba(210,168,90,0.28) 0%, transparent 36%),
            radial-gradient(circle at 90% 80%, rgba(26,92,66,0.22) 0%, transparent 32%),
            linear-gradient(160deg, #0d1f17 0%, #1a3a28 50%, #0f2920 100%);
          color: #fff;
          overflow: hidden;
        }

        .rl-orb {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(60px);
          opacity: 0.5;
        }
        .rl-orb-1 {
          top: -80px;
          left: -60px;
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, ${ACCENT}, transparent 70%);
          animation: orb-float 8s ease-in-out infinite;
        }
        .rl-orb-2 {
          bottom: 40px;
          right: -80px;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, ${PRIMARY}, transparent 70%);
          animation: orb-float 11s ease-in-out infinite reverse;
        }
        .rl-orb-3 {
          top: 50%;
          left: 40%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%);
          animation: orb-float 14s ease-in-out infinite;
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-24px) scale(1.06); }
        }

        .rl-brand {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .rl-brand-mark {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, ${ACCENT}, rgba(210,168,90,0.6));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 900;
          color: #fff;
          box-shadow: 0 8px 24px rgba(210,168,90,0.3);
        }

        .rl-hero-copy {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 16px;
        }
        .rl-pill {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(210,168,90,0.4);
          background: rgba(210,168,90,0.12);
          color: ${ACCENT};
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .rl-headline {
          margin: 0;
          font-size: clamp(38px, 4.5vw, 58px);
          font-weight: 900;
          line-height: 1.0;
          letter-spacing: -0.04em;
          color: #fff;
        }
        .rl-headline em {
          font-style: normal;
          background: linear-gradient(90deg, ${ACCENT}, #f0c97a);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .rl-subline {
          margin: 0;
          max-width: 36ch;
          font-size: 16px;
          line-height: 1.72;
          color: rgba(255,255,255,0.68);
        }

        .rl-feed {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .rl-feed-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(8px);
          animation: fade-up 0.5s ease both;
        }
        .rl-feed-item:nth-child(1) { animation-delay: 0.05s; }
        .rl-feed-item:nth-child(2) { animation-delay: 0.12s; }
        .rl-feed-item:nth-child(3) { animation-delay: 0.19s; }
        .rl-feed-item:nth-child(4) { animation-delay: 0.26s; }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rl-feed-icon {
          width: 36px;
          height: 36px;
          border-radius: 11px;
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .rl-feed-item strong,
        .rl-feed-item span {
          display: block;
        }
        .rl-feed-item strong {
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.92);
          line-height: 1.3;
        }
        .rl-feed-item span {
          font-size: 11px;
          color: rgba(255,255,255,0.48);
          margin-top: 2px;
        }

        .rl-stats {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .rl-stat {
          text-align: center;
        }
        .rl-stat strong {
          display: block;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.04em;
          color: ${ACCENT};
          line-height: 1;
        }
        .rl-stat span {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: rgba(255,255,255,0.48);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* ── RIGHT PANEL ── */
        .rl-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(28px, 5vw, 60px) clamp(24px, 5vw, 72px);
          background: #f7f8f5;
        }
        .rl-form-wrap {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .rl-form-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .rl-form-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(26,92,66,0.08);
          color: ${PRIMARY};
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .rl-form-title {
          margin: 0;
          font-size: clamp(26px, 3vw, 34px);
          font-weight: 900;
          letter-spacing: -0.04em;
          color: #111;
          line-height: 1.05;
        }
        .rl-form-sub {
          margin: 0;
          font-size: 15px;
          line-height: 1.68;
          color: #6c7367;
        }

        /* Step indicator */
        .rl-steps {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rl-step {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          color: #bbb;
          letter-spacing: 0.04em;
        }
        .rl-step.active {
          color: ${PRIMARY};
        }
        .rl-step.done {
          color: ${ACCENT};
        }
        .rl-step-dot {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1.5px solid currentColor;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          transition: background 0.2s, color 0.2s;
        }
        .rl-step.active .rl-step-dot {
          background: ${PRIMARY};
          border-color: ${PRIMARY};
          color: #fff;
        }
        .rl-step.done .rl-step-dot {
          background: ${ACCENT};
          border-color: ${ACCENT};
          color: #fff;
        }
        .rl-step-line {
          flex: 1;
          height: 1.5px;
          background: linear-gradient(90deg, rgba(26,92,66,0.3), rgba(210,168,90,0.2));
          border-radius: 999px;
        }

        /* Form */
        .rl-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rl-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rl-label {
          font-size: 13px;
          font-weight: 700;
          color: #333;
          letter-spacing: 0.02em;
        }
        .rl-input-wrap {
          position: relative;
        }
        .rl-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca39a;
          pointer-events: none;
        }
        .rl-input {
          width: 100%;
          height: 50px;
          padding: 0 16px 0 42px;
          border-radius: 14px;
          border: 1.5px solid #e0e4df;
          background: #fff;
          font-size: 15px;
          color: #111;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .rl-input:focus {
          border-color: ${PRIMARY};
          box-shadow: 0 0 0 3px rgba(26,92,66,0.1);
        }
        .rl-input-code {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-align: center;
          padding-left: 16px;
        }
        .rl-field-hint {
          margin: 0;
          font-size: 12px;
          color: #9ca39a;
          line-height: 1.5;
        }

        .rl-error {
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(220,38,38,0.06);
          border: 1px solid rgba(220,38,38,0.18);
          color: #dc2626;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
        }

        .rl-magic-preview {
          font-size: 11px;
          background: rgba(26,92,66,0.06);
          padding: 8px 12px;
          border-radius: 10px;
          word-break: break-all;
          color: #5a6358;
        }
        .rl-magic-preview a {
          color: ${PRIMARY};
        }

        .rl-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 52px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, ${PRIMARY} 0%, #24784f 100%);
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(26,92,66,0.28), 0 2px 6px rgba(26,92,66,0.16);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s;
          font-family: inherit;
        }
        .rl-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(26,92,66,0.34), 0 2px 6px rgba(26,92,66,0.18);
        }
        .rl-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rl-arrow {
          font-size: 18px;
          line-height: 1;
        }
        .rl-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .rl-btn-ghost {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 44px;
          border: 1.5px solid #e0e4df;
          border-radius: 12px;
          background: transparent;
          color: #6c7367;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          font-family: inherit;
        }
        .rl-btn-ghost:hover {
          border-color: ${PRIMARY};
          color: ${PRIMARY};
        }

        /* Trust badges */
        .rl-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .rl-trust span {
          display: inline-flex;
          align-items: center;
          padding: 5px 11px;
          border-radius: 999px;
          background: rgba(26,92,66,0.06);
          border: 1px solid rgba(26,92,66,0.1);
          font-size: 11px;
          font-weight: 700;
          color: ${PRIMARY};
          letter-spacing: 0.02em;
        }

        .rl-footer-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #9ca39a;
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid #eaeee9;
        }
        .rl-footer-admin {
          font-size: 12px;
          color: #b0b8af;
        }
        .rl-footer-alts {
          font-size: 13px;
          color: #9ca39a;
        }
        .rl-footer-link a {
          color: ${PRIMARY};
          font-weight: 700;
          text-decoration: none;
        }
        .rl-footer-link a:hover {
          text-decoration: underline;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 860px) {
          .rl-root {
            grid-template-columns: 1fr;
          }
          .rl-left {
            padding: 32px 28px;
            min-height: auto;
          }
          .rl-hero-copy {
            flex: none;
          }
          .rl-feed {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .rl-right {
            padding: 32px 24px;
          }
        }
        @media (max-width: 520px) {
          .rl-feed {
            grid-template-columns: 1fr;
          }
          .rl-headline {
            font-size: 36px;
          }
        }
      `}</style>
    </>
  );
}
