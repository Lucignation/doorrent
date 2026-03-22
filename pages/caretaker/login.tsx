import { useRouter } from "next/router";
import { type FormEvent, useEffect, useState } from "react";
import PageMeta from "../../components/layout/PageMeta";
import { useCaretakerPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import { LOGO_PATH } from "../../lib/site";

interface CaretakerRequestResult {
  email: string;
  expiresAt: string;
  expiresInMinutes: number;
  delivery: "sent" | "failed" | "preview";
  magicLinkPreview?: string;
  loginCodePreview?: string;
}

interface CaretakerVerifyResult {
  caretaker: {
    id: string;
    role: "caretaker";
    organizationName: string;
    contactName: string;
    fullName: string;
    email: string;
    phone?: string | null;
    serviceType?: string | null;
    assignmentsCount?: number;
    landlordCount?: number;
    scopedPropertyCount?: number;
  };
  dashboardPath: string;
  session: {
    token: string;
    expiresAt: string;
  };
}

export default function CaretakerLoginPage() {
  const router = useRouter();
  const { showToast } = usePrototypeUI();
  const { caretakerSession, saveCaretakerSession } = useCaretakerPortalSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [busyState, setBusyState] = useState<"idle" | "requesting" | "verifying">(
    "idle",
  );
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState<CaretakerRequestResult | null>(null);

  useEffect(() => {
    if (caretakerSession) {
      void router.replace("/caretaker");
      return;
    }

    const token = typeof router.query.token === "string" ? router.query.token : null;

    if (token) {
      setStep("verify");
      void handleVerification({ token });
    }
  }, [caretakerSession, router, router.query.token]);

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyState("requesting");
    setFeedback("");
    setPreview(null);

    try {
      const { data } = await apiRequest<CaretakerRequestResult>(
        "/caretaker/auth/request-login",
        {
          method: "POST",
          body: {
            email,
          },
        },
      );

      setStep("verify");
      setPreview(data);
      setFeedback(
        data.delivery === "sent"
          ? `We sent a sign-in code to ${data.email}. It expires in ${data.expiresInMinutes} minutes.`
          : "Email delivery is unavailable right now, so a preview code and magic link are shown below for local testing.",
      );
      showToast("Caretaker sign-in code generated", "success");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "We could not send a caretaker sign-in code.",
      );
    } finally {
      setBusyState("idle");
    }
  }

  async function handleVerification({
    token,
    verificationCode,
  }: {
    token?: string;
    verificationCode?: string;
  }) {
    setBusyState("verifying");
    setFeedback(token ? "Verifying your magic link..." : "");

    try {
      const { data } = await apiRequest<CaretakerVerifyResult>(
        "/caretaker/auth/verify-login",
        {
          method: "POST",
          body: {
            email: token ? undefined : email,
            code: verificationCode,
            token,
            rememberMe,
          },
        },
      );

      saveCaretakerSession({
        token: data.session.token,
        expiresAt: data.session.expiresAt,
        caretaker: data.caretaker,
      });
      showToast("Caretaker login successful", "success");
      await router.replace(data.dashboardPath);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "We could not verify your caretaker sign-in.",
      );
    } finally {
      setBusyState("idle");
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleVerification({ verificationCode: code });
  }

  return (
    <>
      <PageMeta
        title="DoorRent — Caretaker Login"
        description="Passwordless access for caretaker teams managing landlord properties on DoorRent."
        urlPath="/caretaker/login"
      />

      <div id="auth-screen">
        <div className="auth-left">
          <div className="auth-logo">
            <img src={LOGO_PATH} alt="DoorRent logo" className="auth-logo-image" />
            <span className="auth-logo-name">DoorRent</span>
          </div>

          <div className="auth-tagline">
            <h1>
              Property operations
              <br />
              <em>for teams managing many landlords.</em>
            </h1>
            <p>
              Caretakers can review assigned properties, send notices, and monitor
              cross-landlord performance from one focused workspace.
            </p>
          </div>

          <div className="auth-stats">
            <div className="auth-stat">
              <strong>24h</strong>
              <span>Session window</span>
            </div>
            <div className="auth-stat">
              <strong>10m</strong>
              <span>Code expiry</span>
            </div>
            <div className="auth-stat">
              <strong>1</strong>
              <span>Shared workspace</span>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrap">
            <h2>{step === "request" ? "Caretaker access" : "Verify sign-in"}</h2>
            <p>
              Use the email your landlord invited. DoorRent will send a one-time code
              and magic link.
            </p>

            {step === "request" ? (
              <form onSubmit={handleRequest}>
                <div className="tenant-auth-panel">
                  <div className="tenant-auth-panel-title">How it works</div>
                  <div className="tenant-auth-panel-copy">
                    Enter your invited email to receive a one-time code for your
                    caretaker workspace.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="caretaker@company.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={busyState !== "idle"}
                >
                  {busyState === "requesting" ? "Sending code..." : "Send sign-in code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifySubmit}>
                <div className="tenant-auth-panel">
                  <div className="tenant-auth-panel-title">Check your inbox</div>
                  <div className="tenant-auth-panel-copy">
                    We sent a six-digit code to <strong>{email}</strong>. Enter it below
                    or use the magic link from your email.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Sign-in code</label>
                  <input
                    className="form-input tenant-code-input"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                </div>

                <label className="checkbox-wrap" style={{ marginBottom: 18 }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Keep me signed in on this device</span>
                </label>

                <div className="tenant-auth-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={busyState !== "idle"}
                  >
                    {busyState === "verifying" ? "Verifying..." : "Sign in"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setStep("request")}
                    disabled={busyState !== "idle"}
                  >
                    Use another email
                  </button>
                </div>
              </form>
            )}

            {feedback ? <div className="tenant-auth-feedback">{feedback}</div> : null}

            {preview ? (
              <div className="tenant-auth-preview">
                <div className="tenant-auth-preview-title">Local testing preview</div>
                {preview.loginCodePreview ? (
                  <div className="tenant-auth-preview-line">
                    Code: <strong>{preview.loginCodePreview}</strong>
                  </div>
                ) : null}
                {preview.magicLinkPreview ? (
                  <div className="tenant-auth-preview-line">
                    Magic link: <a href={preview.magicLinkPreview}>{preview.magicLinkPreview}</a>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
