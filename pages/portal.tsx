import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, useEffect, useState } from "react";
import PageMeta from "../components/layout/PageMeta";
import { apiRequest } from "../lib/api";
import {
  TENANT_LAST_EMAIL_STORAGE_KEY,
  type AdminPortalIdentity,
  type LandlordPortalIdentity,
  type TenantPortalIdentity,
  useTenantPortalSession,
} from "../context/TenantSessionContext";
import { usePrototypeUI } from "../context/PrototypeUIContext";

type RoleKey = "landlord" | "admin" | "tenant";

type TenantRequestResult = {
  email: string;
  expiresAt: string;
  expiresInMinutes: number;
  delivery: "sent" | "failed" | "preview";
  magicLinkPreview?: string;
  loginCodePreview?: string;
};

type TenantVerifyResult = {
  tenant: TenantPortalIdentity;
  dashboardPath: string;
  session: {
    token: string;
    expiresAt: string;
  };
};

type LandlordAuthResult = {
  landlord: LandlordPortalIdentity;
  dashboardPath: string;
  session: {
    token: string;
    expiresAt: string;
  };
};

type AdminAuthResult = {
  superAdmin: AdminPortalIdentity;
  dashboardPath: string;
  session: {
    token: string;
    expiresAt: string;
  };
};

const roles: Record<RoleKey, { label: string; href: string; button: string }> = {
  landlord: {
    label: "Landlord",
    href: "/landlord",
    button: "Sign in as Landlord",
  },
  admin: {
    label: "Admin",
    href: "/admin",
    button: "Sign in as Admin",
  },
  tenant: {
    label: "Tenant",
    href: "/tenant",
    button: "Open Tenant Portal",
  },
};

const LANDLORD_PLACEHOLDERS = {
  companyName: "Lekki Property Holdings Ltd",
  firstName: "Babatunde",
  lastName: "Adeyemi",
  email: "babatunde@lekki.io",
  phone: "+234 801 234 5678",
  password: "password123",
};

const ADMIN_PLACEHOLDERS = {
  email: "admin@doorrent.com",
  password: "password123",
};

type PortalExperienceProps = {
  forcedRole: RoleKey;
};

function buildQueryString(query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (key === "role") {
      return;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  });

  return params.toString();
}

export function PortalExperience({ forcedRole }: PortalExperienceProps) {
  const router = useRouter();
  const { showToast } = usePrototypeUI();
  const {
    saveTenantSession,
    saveLandlordSession,
    saveAdminSession,
    tenantSession,
    landlordSession,
    adminSession,
    clearTenantSession,
    clearLandlordSession,
    clearAdminSession,
  } = useTenantPortalSession();
  const [role, setRole] = useState<RoleKey>(forcedRole);
  const [landlordMode, setLandlordMode] = useState<"login" | "register">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authFeedback, setAuthFeedback] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [landlordFirstName, setLandlordFirstName] = useState("");
  const [landlordLastName, setLandlordLastName] = useState("");
  const [landlordCompanyName, setLandlordCompanyName] = useState("");
  const [landlordPhone, setLandlordPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [tenantRememberMe, setTenantRememberMe] = useState(true);
  const [tenantStep, setTenantStep] = useState<"request" | "verify">("request");
  const [tenantBusyState, setTenantBusyState] = useState<
    "idle" | "requesting" | "verifying"
  >("idle");
  const [tenantFeedback, setTenantFeedback] = useState("");
  const [tenantPreview, setTenantPreview] = useState<TenantRequestResult | null>(
    null,
  );

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    setRole(forcedRole);

    const requestedRole =
      typeof router.query.role === "string" ? router.query.role : null;
    const loginToken =
      typeof router.query.token === "string" ? router.query.token : null;
    const forwardQuery = buildQueryString(router.query);

    if (forcedRole === "landlord" && requestedRole && requestedRole !== "landlord") {
      const redirectPath =
        requestedRole === "tenant"
          ? "/tenant/login"
          : requestedRole === "admin"
            ? "/admin/login"
            : null;

      if (redirectPath) {
        void router.replace(forwardQuery ? `${redirectPath}?${forwardQuery}` : redirectPath);
        return;
      }
    }

    if (loginToken && forcedRole !== "tenant") {
      void router.replace(forwardQuery ? `/tenant/login?${forwardQuery}` : "/tenant/login");
      return;
    }

    if (forcedRole === "tenant" && typeof window !== "undefined") {
      const storedEmail = window.localStorage.getItem(
        TENANT_LAST_EMAIL_STORAGE_KEY,
      );
      if (storedEmail) {
        setTenantEmail(storedEmail);
      }
    }

    if (forcedRole === "tenant" && loginToken) {
      setRole("tenant");
      setTenantStep("verify");
      void handleTenantVerification({ token: loginToken });
    }
  }, [forcedRole, router, router.isReady, router.query]);

  useEffect(() => {
    if (role === "admin") {
      setLandlordMode("login");
    }
  }, [role]);

  async function handleTenantRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTenantBusyState("requesting");
    setTenantFeedback("");
    setTenantPreview(null);

    try {
      const { data } = await apiRequest<TenantRequestResult>(
        "/tenant/auth/request-login",
        {
          method: "POST",
          body: {
          email: tenantEmail,
          },
        },
      );

      if (typeof window !== "undefined") {
        window.localStorage.setItem(TENANT_LAST_EMAIL_STORAGE_KEY, tenantEmail);
      }

      setTenantStep("verify");
      setTenantPreview(data);
      setTenantFeedback(
        data.delivery === "sent"
          ? `We sent a sign-in code to ${data.email}. It expires in ${data.expiresInMinutes} minutes.`
          : "Email delivery is unavailable right now, so a preview code and magic link are shown below for local testing.",
      );
      showToast("Tenant sign-in code generated", "success");
    } catch (error) {
      setTenantFeedback(
        error instanceof Error
          ? error.message
          : "We could not send a tenant sign-in code.",
      );
    } finally {
      setTenantBusyState("idle");
    }
  }

  async function handleTenantVerification({
    code,
    token,
  }: {
    code?: string;
    token?: string;
  }) {
    setTenantBusyState("verifying");
    setTenantFeedback(token ? "Verifying your magic link..." : "");

    try {
      const { data } = await apiRequest<TenantVerifyResult>(
        "/tenant/auth/verify-login",
        {
          method: "POST",
          body: {
          email: token ? undefined : tenantEmail,
          code,
          token,
          rememberMe: tenantRememberMe,
          },
        },
      );

      saveTenantSession({
        token: data.session.token,
        expiresAt: data.session.expiresAt,
        tenant: data.tenant,
      });
      showToast("Tenant login successful", "success");
      await router.replace(data.dashboardPath);
    } catch (error) {
      setTenantFeedback(
        error instanceof Error
          ? error.message
          : "We could not verify your tenant sign-in.",
      );
      setTenantBusyState("idle");

      if (token) {
        await router.replace("/tenant/login");
      }
    }
  }

  async function handleWorkspaceAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthFeedback("");

    try {
      if (role === "landlord") {
        if (landlordMode === "register") {
          const { data } = await apiRequest<LandlordAuthResult>("/auth/register", {
            method: "POST",
            body: {
              companyName: landlordCompanyName,
              firstName: landlordFirstName,
              lastName: landlordLastName,
              email: authEmail,
              phone: landlordPhone,
              password: authPassword,
            },
          });

          saveLandlordSession({
            token: data.session.token,
            expiresAt: data.session.expiresAt,
            landlord: data.landlord,
          });
          showToast("Landlord account created", "success");
          await router.replace(data.dashboardPath);
          return;
        }

        const { data } = await apiRequest<LandlordAuthResult>("/auth/login", {
          method: "POST",
          body: {
            email: authEmail,
            password: authPassword,
          },
        });

        saveLandlordSession({
          token: data.session.token,
          expiresAt: data.session.expiresAt,
          landlord: data.landlord,
        });
        showToast("Landlord login successful", "success");
        await router.replace(data.dashboardPath);
        return;
      }

      const { data } = await apiRequest<AdminAuthResult>("/admin/auth/login", {
        method: "POST",
        body: {
          email: authEmail,
          password: authPassword,
        },
      });

      saveAdminSession({
        token: data.session.token,
        expiresAt: data.session.expiresAt,
        superAdmin: data.superAdmin,
      });
      showToast("Super admin login successful", "success");
      await router.replace(data.dashboardPath);
    } catch (error) {
      setAuthFeedback(
        error instanceof Error
          ? error.message
          : "We could not sign you in right now.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  function renderWorkspaceAccess() {
    const currentSession =
      role === "landlord" ? landlordSession : role === "admin" ? adminSession : null;

    const currentName =
      role === "landlord"
        ? landlordSession?.landlord.fullName
        : adminSession?.superAdmin.fullName;

    if (currentSession && currentName) {
      return (
        <div className="tenant-auth-panel">
          <div className="tenant-auth-panel-title">Signed in on this device</div>
          <div className="tenant-auth-panel-copy">Continue as {currentName}.</div>
          <div className="tenant-auth-actions">
            <Link href={roles[role].href} className="btn btn-primary">
              Continue to workspace
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (role === "landlord") {
                  clearLandlordSession();
                } else {
                  clearAdminSession();
                }
              }}
            >
              Use another account
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {role === "landlord" ? (
          <div className="role-pills" style={{ marginBottom: 18 }}>
            <button
              type="button"
              className={`role-pill ${landlordMode === "login" ? "active" : ""}`}
              onClick={() => setLandlordMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`role-pill ${landlordMode === "register" ? "active" : ""}`}
              onClick={() => setLandlordMode("register")}
            >
              Create account
            </button>
          </div>
        ) : null}

        <form onSubmit={handleWorkspaceAuth}>
          {role === "landlord" && landlordMode === "register" ? (
            <>
              <div className="form-group">
                <label className="form-label">Company name</label>
                <input
                  className="form-input"
                  placeholder={LANDLORD_PLACEHOLDERS.companyName}
                  value={landlordCompanyName}
                  onChange={(event) => setLandlordCompanyName(event.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First name</label>
                  <input
                    className="form-input"
                    placeholder={LANDLORD_PLACEHOLDERS.firstName}
                    value={landlordFirstName}
                    onChange={(event) => setLandlordFirstName(event.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last name</label>
                  <input
                    className="form-input"
                    placeholder={LANDLORD_PLACEHOLDERS.lastName}
                    value={landlordLastName}
                    onChange={(event) => setLandlordLastName(event.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              placeholder={
                role === "admin"
                  ? ADMIN_PLACEHOLDERS.email
                  : LANDLORD_PLACEHOLDERS.email
              }
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              required
            />
          </div>

          {role === "landlord" && landlordMode === "register" ? (
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                type="tel"
                placeholder={LANDLORD_PLACEHOLDERS.phone}
                value={landlordPhone}
                onChange={(event) => setLandlordPhone(event.target.value)}
              />
            </div>
          ) : null}

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrap">
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                placeholder={
                  role === "admin"
                    ? ADMIN_PLACEHOLDERS.password
                    : LANDLORD_PLACEHOLDERS.password
                }
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div className="checkbox-wrap">
              <input type="checkbox" id="remember" defaultChecked />
              <label htmlFor="remember">Remember me</label>
            </div>
            <span
              style={{
                fontSize: 12,
                color: "var(--accent)",
                fontWeight: 500,
              }}
            >
              {role === "landlord" && landlordMode === "register"
                ? "Start your landlord workspace"
                : "Forgot password?"}
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ padding: 12 }}
            disabled={authBusy}
          >
            {authBusy
              ? role === "landlord" && landlordMode === "register"
                ? "Creating account..."
                : "Signing you in..."
              : role === "landlord" && landlordMode === "register"
                ? "Create landlord account"
                : roles[role].button}
          </button>
        </form>

        {authFeedback ? <div className="tenant-auth-feedback">{authFeedback}</div> : null}

        <div className="auth-link">
          {role === "landlord" ? (
            <>
              {landlordMode === "register" ? "Already have an account? " : "Need a landlord account? "}
              <button
                type="button"
                onClick={() =>
                  setLandlordMode((current) => (current === "login" ? "register" : "login"))
                }
                style={{
                  color: "var(--accent)",
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {landlordMode === "register" ? "Sign in →" : "Create one →"}
              </button>
            </>
          ) : (
            <>
              Super admin access is provisioned by DoorRent.
            </>
          )}
        </div>
      </>
    );
  }

  async function submitTenantCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleTenantVerification({ code: tenantCode });
  }

  function renderTenantAccess() {
    const isRequesting = tenantBusyState === "requesting";
    const isVerifying = tenantBusyState === "verifying";

    return (
      <>
        <h2>Tenant portal sign in</h2>
        <p>
          Enter the email you used during onboarding. DoorRent will send you a
          6-digit code and a one-time sign-in link.
        </p>

        {tenantSession ? (
          <div className="tenant-auth-panel">
            <div className="tenant-auth-panel-title">Signed in on this device</div>
            <div className="tenant-auth-panel-copy">
              Continue as {tenantSession.tenant.fullName} for{" "}
              {tenantSession.tenant.propertyName}.
            </div>
            <div className="tenant-auth-actions">
              <Link href="/tenant" className="btn btn-primary">
                Continue to portal
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  clearTenantSession();
                  setTenantStep("request");
                  setTenantFeedback("");
                }}
              >
                Use another email
              </button>
            </div>
          </div>
        ) : null}

        {tenantStep === "request" ? (
          <form onSubmit={handleTenantRequest}>
            <div className="form-group">
              <label className="form-label">Tenant email</label>
              <input
                className="form-input"
                type="email"
                placeholder="amaka@email.com"
                value={tenantEmail}
                onChange={(event) => setTenantEmail(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ padding: 12 }}
              disabled={isRequesting || !tenantEmail}
            >
              {isRequesting ? "Sending code..." : "Send sign-in code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitTenantCode}>
            <div className="form-group">
              <label className="form-label">Tenant email</label>
              <input
                className="form-input"
                type="email"
                value={tenantEmail}
                onChange={(event) => setTenantEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">6-digit sign-in code</label>
              <input
                className="form-input tenant-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                value={tenantCode}
                onChange={(event) =>
                  setTenantCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
              />
            </div>

            <div className="checkbox-wrap" style={{ marginBottom: 18 }}>
              <input
                type="checkbox"
                id="tenant-remember"
                checked={tenantRememberMe}
                onChange={(event) => setTenantRememberMe(event.target.checked)}
              />
              <label htmlFor="tenant-remember">Keep me signed in for 24 hours on this device</label>
            </div>

            <div className="tenant-auth-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isVerifying || tenantCode.length !== 6}
              >
                {isVerifying ? "Signing you in..." : "Continue to portal"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setTenantStep("request");
                  setTenantCode("");
                  setTenantFeedback("");
                }}
              >
                Request a new code
              </button>
            </div>
          </form>
        )}

        {tenantFeedback ? (
          <div className="tenant-auth-feedback">{tenantFeedback}</div>
        ) : null}

        {tenantPreview ? (
          <div className="tenant-auth-preview">
            <div className="tenant-auth-preview-title">
              {tenantPreview.delivery === "sent"
                ? "Email sent"
                : "Local preview access"}
            </div>
            <div className="tenant-auth-preview-copy">
              {tenantPreview.delivery === "sent"
                ? "If email is slow on your network, you can also use the magic link from your inbox."
                : "Email is not configured in this environment, so you can keep testing with the values below."}
            </div>
            {tenantPreview.loginCodePreview ? (
              <div className="tenant-auth-preview-line">
                <strong>Preview code:</strong> {tenantPreview.loginCodePreview}
              </div>
            ) : null}
            {tenantPreview.magicLinkPreview ? (
              <div className="tenant-auth-preview-line">
                <strong>Magic link:</strong>{" "}
                <a href={tenantPreview.magicLinkPreview}>
                  Open tenant sign-in link
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="auth-link">
          Need access? Ask your landlord to invite you, then use the same email
          here after onboarding.
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={
          role === "tenant"
            ? "DoorRent — Tenant Login"
            : role === "admin"
              ? "DoorRent — Internal Admin Login"
              : "DoorRent — Landlord Login"
        }
        description={
          role === "tenant"
            ? "Passwordless tenant login for DoorRent."
            : role === "admin"
              ? "Internal DoorRent admin access."
              : "Landlord sign-in and registration for DoorRent."
        }
      />

      <div id="auth-screen">
        <div className="auth-left">
          <div className="auth-logo">
            <div className="auth-logo-mark">D</div>
            <span className="auth-logo-name">DoorRent</span>
          </div>

          <div className="auth-tagline">
            <h1>
              Property management
              <br />
              <em>built for how Nigeria rents.</em>
            </h1>
            <p>
              {role === "tenant"
                ? "Access your tenant portal securely with a one-time code or magic link sent to your email."
                : role === "admin"
                  ? "Internal operations access for the DoorRent team."
                  : "Collect rent, manage tenants, send agreements, and keep every property workflow in one place."}
            </p>
          </div>

          <div className="auth-stats">
            <div className="auth-stat">
              <strong>12K+</strong>
              <span>Properties managed</span>
            </div>
            <div className="auth-stat">
              <strong>₦4.2B</strong>
              <span>Rent collected</span>
            </div>
            <div className="auth-stat">
              <strong>5.2K</strong>
              <span>Active landlords</span>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrap">
            <h2>
              {role === "tenant"
                ? "Tenant access"
                : role === "admin"
                  ? "Internal admin access"
                  : "Welcome back"}
            </h2>
            <p>
              {role === "tenant"
                ? "Passwordless sign-in built for quick, low-friction access."
                : role === "admin"
                  ? "Internal DoorRent operations access."
                  : "Sign in to your DoorRent landlord workspace"}
            </p>

            {role === "tenant" ? (
              renderTenantAccess()
            ) : (
              renderWorkspaceAccess()
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function PortalPage() {
  return <PortalExperience forcedRole="landlord" />;
}
