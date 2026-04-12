import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import PageMeta from "../../components/layout/PageMeta";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { ResidentPortalSession } from "../../context/TenantSessionContext";

type Step = "email" | "code";

export default function ResidentLoginPage() {
  const router = useRouter();
  const { isHydrated, residentSession, saveResidentSession } = useResidentPortalSession();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicLinkPreview, setMagicLinkPreview] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Read token from URL for magic link
  useEffect(() => {
    if (!router.isReady) return;
    const token = router.query.token as string | undefined;
    if (token) {
      void handleVerifyWithToken(token);
    }
  }, [router.isReady, router.query.token]);

  // Redirect if already logged in
  useEffect(() => {
    if (isHydrated && residentSession) {
      void router.replace("/resident");
    }
  }, [isHydrated, residentSession, router]);

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

  return (
    <>
      <PageMeta title="Estate Resident Login" />
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "24px 16px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Estate Resident Login</h1>
            <p style={{ color: "var(--ink3)", fontSize: 15 }}>
              {step === "email" ? "Enter your email to sign in to your estate resident account." : `Enter the 6-digit code sent to ${email}.`}
            </p>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 28 }}>
              {step === "email" ? (
                <form onSubmit={handleRequestCode} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email address</label>
                    <input
                      className="form-input"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  {error ? <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div> : null}
                  {magicLinkPreview ? (
                    <div style={{ fontSize: 12, background: "var(--bg)", padding: "8px 12px", borderRadius: 8, wordBreak: "break-all" }}>
                      Magic link preview: <a href={magicLinkPreview}>{magicLinkPreview}</a>
                    </div>
                  ) : null}
                  <button type="submit" className="btn btn-primary" disabled={loading || !email.trim()}>
                    {loading ? "Sending…" : "Send Sign-In Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">6-digit code</label>
                    <input
                      ref={codeInputRef}
                      className="form-input"
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
                  {error ? <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div> : null}
                  <button type="submit" className="btn btn-primary" disabled={loading || code.length !== 6}>
                    {loading ? "Verifying…" : "Sign In"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => { setStep("email"); setCode(""); setError(""); }}
                  >
                    Back
                  </button>
                </form>
              )}
            </div>
          </div>

          <div style={{ marginTop: 20, textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>
            Signing in as a tenant instead?{" "}
            <Link href="/tenant/login" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Tenant Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
