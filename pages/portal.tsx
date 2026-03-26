import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, useEffect, useState } from "react";
import PageMeta from "../components/layout/PageMeta";
import { apiRequest } from "../lib/api";
import { LOGO_PATH } from "../lib/site";
import { buildBrandShellStyle, resolveBrandDisplayName, type WorkspaceBranding } from "../lib/branding";
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
  branding?: WorkspaceBranding;
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

type LandlordOnboardingResult = {
  flow: "onboarding_required";
  landlord: LandlordPortalIdentity;
  onboarding: {
    landlordId: string;
    email: string;
    emailVerificationDelivery: "sent" | "failed" | "preview";
    emailVerificationExpiresAt: string;
    emailVerificationLinkPreview?: string;
    phoneOtpDelivery: "sent" | "failed" | "preview";
    phoneOtpExpiresAt: string;
    phoneOtpPreview?: string;
    requiresPayment: boolean;
    checkout?: {
      reference: string;
      authorizationUrl: string;
      accessCode: string;
      amount: number;
      amountLabel: string;
      interval: "monthly" | "yearly";
      provider: "paystack";
    } | null;
  };
};

type LandlordRegisterResult = LandlordAuthResult | LandlordOnboardingResult;

type LandlordOnboardingState = {
  landlordId: string;
  email?: string;
  emailVerificationDelivery?: "sent" | "failed" | "preview";
  emailVerificationExpiresAt?: string;
  emailVerificationLinkPreview?: string;
  emailToken?: string;
  phoneOtpDelivery?: "sent" | "failed" | "preview";
  phoneOtpExpiresAt?: string;
  phoneOtpPreview?: string;
  requiresPayment?: boolean;
  checkout?: LandlordOnboardingResult["onboarding"]["checkout"];
  paymentReference?: string;
};

type AdminAuthResult = {
  superAdmin: AdminPortalIdentity;
  dashboardPath: string;
  session: {
    token: string;
    expiresAt: string;
  };
};

type PasswordResetRequestResult = {
  email: string;
  expiresAt?: string;
  expiresInMinutes: number;
  delivery: "sent" | "failed" | "preview";
  resetLinkPreview?: string;
  resetTokenPreview?: string;
};

const roles: Record<RoleKey, { label: string; href: string; button: string }> = {
  landlord: {
    label: "Landlord",
    href: "/landlord",
    button: "Sign in as Landlord",
  },
  admin: {
    label: "Super Admin",
    href: "/admin",
    button: "Sign in as Super Admin",
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

const LANDLORD_ONBOARDING_STORAGE_KEY = "doorrent.landlord.onboarding";

function loadStoredLandlordOnboarding() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LANDLORD_ONBOARDING_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LandlordOnboardingState;
  } catch {
    window.localStorage.removeItem(LANDLORD_ONBOARDING_STORAGE_KEY);
    return null;
  }
}

function persistLandlordOnboarding(value: LandlordOnboardingState | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(LANDLORD_ONBOARDING_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    LANDLORD_ONBOARDING_STORAGE_KEY,
    JSON.stringify(value),
  );
}

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

function getWorkspaceLoginPath(role: RoleKey) {
  return role === "admin" ? "/admin/login" : "/portal";
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
  const [workspaceAuthView, setWorkspaceAuthView] = useState<
    "auth" | "forgot" | "reset"
  >("auth");
  const [authBusy, setAuthBusy] = useState(false);
  const [authFeedback, setAuthFeedback] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPasswords, setShowResetPasswords] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [landlordFirstName, setLandlordFirstName] = useState("");
  const [landlordLastName, setLandlordLastName] = useState("");
  const [landlordCompanyName, setLandlordCompanyName] = useState("");
  const [landlordPhone, setLandlordPhone] = useState("");
  const [landlordSubscriptionModel, setLandlordSubscriptionModel] = useState<
    "SUBSCRIPTION" | "COMMISSION"
  >("SUBSCRIPTION");
  const [landlordSubscriptionInterval, setLandlordSubscriptionInterval] = useState<
    "MONTHLY" | "YEARLY"
  >("MONTHLY");
  const [landlordPromoCode, setLandlordPromoCode] = useState("");
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
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordBusy, setForgotPasswordBusy] = useState(false);
  const [forgotPasswordFeedback, setForgotPasswordFeedback] = useState("");
  const [forgotPasswordPreview, setForgotPasswordPreview] =
    useState<PasswordResetRequestResult | null>(null);
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetFeedback, setResetFeedback] = useState("");
  const [landlordOnboarding, setLandlordOnboarding] =
    useState<LandlordOnboardingState | null>(null);
  const [landlordOnboardingOtp, setLandlordOnboardingOtp] = useState("");
  const [landlordOnboardingBusy, setLandlordOnboardingBusy] = useState(false);
  const [landlordOnboardingFeedback, setLandlordOnboardingFeedback] = useState("");

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    setRole(forcedRole);

    const requestedRole = typeof router.query.role === "string" ? router.query.role : null;
    const loginToken = typeof router.query.token === "string" ? router.query.token : null;
    const passwordResetToken =
      typeof router.query.resetToken === "string" ? router.query.resetToken : "";
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
    if (forcedRole !== "tenant") {
      setResetToken(passwordResetToken);
      if (passwordResetToken) {
        setWorkspaceAuthView("reset");
        setResetFeedback("");
      } else {
        setWorkspaceAuthView((current) => (current === "reset" ? "auth" : current));
      }
    }
  }, [
    forcedRole,
    router.isReady,
    router.query,
    router.query.resetToken,
    router.query.role,
    router.query.token,
  ]);

  useEffect(() => {
    if (role === "admin") {
      setLandlordMode("login");
    }
  }, [role]);

  useEffect(() => {
    if (!router.isReady || forcedRole !== "landlord") return;
    const mode = typeof router.query.mode === "string" ? router.query.mode : null;
    if (mode === "register") {
      setLandlordMode("register");
    }
  }, [router.isReady, router.query.mode, forcedRole]);

  useEffect(() => {
    if (workspaceAuthView === "auth") {
      setForgotPasswordFeedback("");
      setForgotPasswordPreview(null);
      setResetFeedback("");
    }
  }, [workspaceAuthView]);

  function saveLandlordOnboardingState(value: LandlordOnboardingState | null) {
    setLandlordOnboarding(value);
    persistLandlordOnboarding(value);
  }

  function clearLandlordOnboardingState() {
    saveLandlordOnboardingState(null);
    setLandlordOnboardingOtp("");
    setLandlordOnboardingFeedback("");
  }

  useEffect(() => {
    if (!router.isReady || forcedRole !== "landlord") {
      return;
    }

    const storedOnboarding = loadStoredLandlordOnboarding();
    const landlordOnboardingId =
      typeof router.query.landlordOnboardingId === "string"
        ? router.query.landlordOnboardingId
        : null;
    const emailToken =
      typeof router.query.emailToken === "string" ? router.query.emailToken : "";
    const paymentReference =
      typeof router.query.reference === "string"
        ? router.query.reference
        : typeof router.query.trxref === "string"
          ? router.query.trxref
          : "";

    if (!landlordOnboardingId && !storedOnboarding) {
      return;
    }

    const nextState =
      storedOnboarding &&
      (!landlordOnboardingId || storedOnboarding.landlordId === landlordOnboardingId)
        ? {
            ...storedOnboarding,
            emailToken: emailToken || storedOnboarding.emailToken,
            paymentReference: paymentReference || storedOnboarding.paymentReference,
          }
        : landlordOnboardingId
          ? {
              landlordId: landlordOnboardingId,
              emailToken: emailToken || undefined,
              paymentReference: paymentReference || undefined,
            }
          : storedOnboarding;

    if (!nextState) {
      return;
    }

    setRole("landlord");
    setLandlordMode("register");
    setWorkspaceAuthView("auth");
    saveLandlordOnboardingState(nextState);
  }, [
    forcedRole,
    router.isReady,
    router.query.emailToken,
    router.query.landlordOnboardingId,
    router.query.reference,
    router.query.trxref,
  ]);

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
          const { data } = await apiRequest<LandlordRegisterResult>("/auth/register", {
            method: "POST",
            body: {
              companyName: landlordCompanyName,
              firstName: landlordFirstName,
              lastName: landlordLastName,
              email: authEmail,
              phone: landlordPhone,
              password: authPassword,
              subscriptionModel: landlordSubscriptionModel,
              subscriptionInterval:
                landlordSubscriptionModel === "SUBSCRIPTION"
                  ? landlordSubscriptionInterval
                  : undefined,
              promoCode: landlordPromoCode || undefined,
            },
          });

          if ("session" in data) {
            clearLandlordOnboardingState();
            saveLandlordSession({
              token: data.session.token,
              expiresAt: data.session.expiresAt,
              landlord: data.landlord,
            });
            showToast("Landlord account created", "success");
            await router.replace(data.dashboardPath);
            return;
          }

          saveLandlordOnboardingState({
            landlordId: data.onboarding.landlordId,
            email: data.onboarding.email,
            emailVerificationDelivery: data.onboarding.emailVerificationDelivery,
            emailVerificationExpiresAt: data.onboarding.emailVerificationExpiresAt,
            emailVerificationLinkPreview: data.onboarding.emailVerificationLinkPreview,
            phoneOtpDelivery: data.onboarding.phoneOtpDelivery,
            phoneOtpExpiresAt: data.onboarding.phoneOtpExpiresAt,
            phoneOtpPreview: data.onboarding.phoneOtpPreview,
            requiresPayment: data.onboarding.requiresPayment,
            checkout: data.onboarding.checkout,
            paymentReference: data.onboarding.checkout?.reference,
          });
          setLandlordOnboardingOtp("");
          setLandlordOnboardingFeedback(
            data.onboarding.requiresPayment
              ? "Finish email verification, enter the OTP, and complete the Paystack checkout to activate this landlord account."
              : "Finish email verification and enter the OTP to activate this landlord account.",
          );
          showToast("Landlord onboarding started", "success");
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
        clearLandlordOnboardingState();
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

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotPasswordBusy(true);
    setForgotPasswordFeedback("");
    setForgotPasswordPreview(null);

    try {
      const path =
        role === "admin" ? "/admin/auth/forgot-password" : "/auth/forgot-password";
      const { data } = await apiRequest<PasswordResetRequestResult>(path, {
        method: "POST",
        body: {
          email: forgotPasswordEmail,
        },
      });

      setForgotPasswordPreview(data);
      setForgotPasswordFeedback(
        data.delivery === "sent"
          ? `A password reset link was sent to ${data.email}. It expires in ${data.expiresInMinutes} minutes.`
          : "Email delivery is unavailable right now, so a preview reset link is shown below for local testing.",
      );
      showToast("Password reset link prepared", "success");
    } catch (error) {
      setForgotPasswordFeedback(
        error instanceof Error
          ? error.message
          : "We could not prepare a password reset link.",
      );
    } finally {
      setForgotPasswordBusy(false);
    }
  }

  async function handleLandlordOnboardingCompletion() {
    if (!landlordOnboarding?.landlordId) {
      return;
    }

    setLandlordOnboardingBusy(true);
    setLandlordOnboardingFeedback("");

    try {
      const { data } = await apiRequest<LandlordAuthResult>("/auth/register/complete", {
        method: "POST",
        body: {
          landlordId: landlordOnboarding.landlordId,
          emailToken: landlordOnboarding.emailToken || undefined,
          phoneOtpCode: landlordOnboardingOtp || undefined,
          paymentReference: landlordOnboarding.paymentReference || undefined,
        },
      });

      clearLandlordOnboardingState();
      saveLandlordSession({
        token: data.session.token,
        expiresAt: data.session.expiresAt,
        landlord: data.landlord,
      });
      showToast("Landlord account activated", "success");
      await router.replace(data.dashboardPath);
    } catch (error) {
      setLandlordOnboardingFeedback(
        error instanceof Error
          ? error.message
          : "We could not complete landlord onboarding.",
      );
    } finally {
      setLandlordOnboardingBusy(false);
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetBusy(true);
    setResetFeedback("");

    try {
      const path =
        role === "admin" ? "/admin/auth/reset-password" : "/auth/reset-password";
      await apiRequest<{ email: string }>(path, {
        method: "POST",
        body: {
          token: resetToken,
          password: resetPassword,
          confirmPassword: resetPasswordConfirm,
        },
      });

      setResetPassword("");
      setResetPasswordConfirm("");
      setShowResetPasswords(false);
      setWorkspaceAuthView("auth");
      setAuthFeedback("Password reset successful. Sign in with your new password.");
      showToast("Password reset successful", "success");
      await router.replace(getWorkspaceLoginPath(role));
    } catch (error) {
      setResetFeedback(
        error instanceof Error
          ? error.message
          : "We could not reset that password.",
      );
    } finally {
      setResetBusy(false);
    }
  }

  function renderWorkspaceAccess() {
    const currentSession =
      role === "landlord" ? landlordSession : role === "admin" ? adminSession : null;

    const currentName =
      role === "landlord"
        ? landlordSession?.landlord.fullName
        : adminSession?.superAdmin.fullName;

    if (
      role === "landlord" &&
      landlordMode === "register" &&
      workspaceAuthView === "auth" &&
      landlordOnboarding
    ) {
      return (
        <>
          <div className="tenant-auth-panel">
            <div className="tenant-auth-panel-title">Finish landlord onboarding</div>
            <div className="tenant-auth-panel-copy">
              Complete the verification steps for{" "}
              {landlordOnboarding.email || "your landlord account"} before DoorRent signs
              you in.
            </div>
          </div>

          <div className="tenant-auth-preview">
            <div className="tenant-auth-preview-title">Step 1: Verify email</div>
            <div className="tenant-auth-preview-copy">
              {landlordOnboarding.emailToken
                ? "Email verification link detected for this account."
                : landlordOnboarding.emailVerificationDelivery === "sent"
                  ? "Open the verification link from your inbox."
                  : "Use the preview verification link below in this environment."}
            </div>
            {landlordOnboarding.emailVerificationLinkPreview ? (
              <div className="tenant-auth-preview-line">
                <strong>Verification link:</strong>{" "}
                <a href={landlordOnboarding.emailVerificationLinkPreview}>
                  Open email verification
                </a>
              </div>
            ) : null}
          </div>

          <div className="tenant-auth-preview">
            <div className="tenant-auth-preview-title">Step 2: Enter phone OTP</div>
            <div className="tenant-auth-preview-copy">
              Enter the 6-digit verification code prepared for this landlord registration.
            </div>
            {landlordOnboarding.phoneOtpPreview ? (
              <div className="tenant-auth-preview-line">
                <strong>Preview OTP:</strong> {landlordOnboarding.phoneOtpPreview}
              </div>
            ) : null}
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Phone verification code</label>
              <input
                className="form-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={landlordOnboardingOtp}
                onChange={(event) =>
                  setLandlordOnboardingOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
              />
            </div>
          </div>

          {landlordOnboarding.checkout ? (
            <div className="tenant-auth-preview">
              <div className="tenant-auth-preview-title">Step 3: Pay with Paystack</div>
              <div className="tenant-auth-preview-copy">
                Complete your Basic checkout before DoorRent activates this landlord
                account.
              </div>
              <div className="tenant-auth-preview-line">
                <strong>Checkout:</strong>{" "}
                <a href={landlordOnboarding.checkout.authorizationUrl}>Continue to Paystack</a>
              </div>
              <div className="tenant-auth-preview-line">
                <strong>Reference:</strong>{" "}
                {landlordOnboarding.paymentReference || landlordOnboarding.checkout.reference}
              </div>
            </div>
          ) : null}

          <div className="tenant-auth-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={landlordOnboardingBusy || landlordOnboardingOtp.length !== 6}
              onClick={() => void handleLandlordOnboardingCompletion()}
            >
              {landlordOnboardingBusy ? "Finishing..." : "Complete onboarding"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                clearLandlordOnboardingState();
                void router.replace("/portal");
              }}
            >
              Start over
            </button>
          </div>

          {landlordOnboardingFeedback ? (
            <div className="tenant-auth-feedback">{landlordOnboardingFeedback}</div>
          ) : null}
        </>
      );
    }

    if (currentSession && currentName && workspaceAuthView === "auth") {
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

    if (workspaceAuthView === "forgot") {
      return (
        <>
          <form onSubmit={handleForgotPassword}>
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
                value={forgotPasswordEmail}
                onChange={(event) => setForgotPasswordEmail(event.target.value)}
                required
              />
            </div>

            <div className="tenant-auth-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={forgotPasswordBusy || !forgotPasswordEmail}
              >
                {forgotPasswordBusy ? "Sending reset link..." : "Send reset link"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setWorkspaceAuthView("auth")}
              >
                Back to sign in
              </button>
            </div>
          </form>

          {forgotPasswordFeedback ? (
            <div className="tenant-auth-feedback">{forgotPasswordFeedback}</div>
          ) : null}

          {forgotPasswordPreview ? (
            <div className="tenant-auth-preview">
              <div className="tenant-auth-preview-title">
                {forgotPasswordPreview.delivery === "sent"
                  ? "Reset email sent"
                  : "Local preview access"}
              </div>
              <div className="tenant-auth-preview-copy">
                {forgotPasswordPreview.delivery === "sent"
                  ? "Open the link from your inbox to continue."
                  : "Email is not configured in this environment, so you can keep testing with the reset link below."}
              </div>
              {forgotPasswordPreview.resetLinkPreview ? (
                <div className="tenant-auth-preview-line">
                  <strong>Reset link:</strong>{" "}
                  <a href={forgotPasswordPreview.resetLinkPreview}>
                    Open password reset
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="auth-link">
            We&apos;ll email a one-time reset link to the account owner.
          </div>
        </>
      );
    }

    if (workspaceAuthView === "reset") {
      return (
        <>
          <form onSubmit={handlePasswordReset}>
            <div className="form-group">
              <label className="form-label">New password</label>
              <div className="password-input-wrap">
                <input
                  className="form-input"
                  type={showResetPasswords ? "text" : "password"}
                  placeholder="Create a new password"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowResetPasswords((current) => !current)}
                  aria-label={showResetPasswords ? "Hide password" : "Show password"}
                  aria-pressed={showResetPasswords}
                >
                  {showResetPasswords ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <input
                className="form-input"
                type={showResetPasswords ? "text" : "password"}
                placeholder="Repeat your new password"
                value={resetPasswordConfirm}
                onChange={(event) => setResetPasswordConfirm(event.target.value)}
                required
              />
            </div>

            <div className="tenant-auth-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={resetBusy || !resetToken || !resetPassword || !resetPasswordConfirm}
              >
                {resetBusy ? "Updating password..." : "Set new password"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void router.replace(getWorkspaceLoginPath(role))}
              >
                Cancel
              </button>
            </div>
          </form>

          {resetFeedback ? <div className="tenant-auth-feedback">{resetFeedback}</div> : null}

          <div className="auth-link">
            This reset link expires shortly for security. If it has expired, request a fresh one.
          </div>
        </>
      );
    }

    return (
      <>

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
                required
              />
            </div>
          ) : null}

          {role === "landlord" && landlordMode === "register" ? (
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrap">
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  placeholder={LANDLORD_PLACEHOLDERS.password}
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
          ) : null}

          {role === "landlord" && landlordMode === "register" ? (
            <>
              <div className="form-group">
                <label className="form-label">Choose your plan</label>
                <div className="plan-toggle">
                  <button
                    type="button"
                    className={`plan-toggle-opt ${landlordSubscriptionModel === "SUBSCRIPTION" ? "active" : ""}`}
                    onClick={() => setLandlordSubscriptionModel("SUBSCRIPTION")}
                  >
                    Basic
                  </button>
                  <button
                    type="button"
                    className={`plan-toggle-opt ${landlordSubscriptionModel === "COMMISSION" ? "active" : ""}`}
                    onClick={() => setLandlordSubscriptionModel("COMMISSION")}
                  >
                    Full Service
                  </button>
                </div>
                <div className="plan-detail">
                  {landlordSubscriptionModel === "SUBSCRIPTION" ? (
                    <>
                      <span className="plan-detail-price">
                        {landlordSubscriptionInterval === "YEARLY" ? "₦95,000 / year" : "₦8,500 / month"}
                      </span>
                      <span className="plan-detail-features">Properties &amp; units · Google Meet scheduling · Tenant portal</span>
                    </>
                  ) : (
                    <>
                      <span className="plan-detail-price">3% per payment collected</span>
                      <span className="plan-detail-features">Everything in Basic · Payments &amp; receipts · Agreements · Reports · Caretakers · Reminders</span>
                    </>
                  )}
                </div>
              </div>

              {landlordSubscriptionModel === "SUBSCRIPTION" ? (
                <div className="form-group">
                  <label className="form-label">Billing cycle</label>
                  <div className="billing-toggle">
                    <button
                      type="button"
                      className={`billing-opt ${landlordSubscriptionInterval === "MONTHLY" ? "active" : ""}`}
                      onClick={() => setLandlordSubscriptionInterval("MONTHLY")}
                    >
                      Monthly
                      <span>₦8,500 / month</span>
                    </button>
                    <button
                      type="button"
                      className={`billing-opt ${landlordSubscriptionInterval === "YEARLY" ? "active" : ""}`}
                      onClick={() => setLandlordSubscriptionInterval("YEARLY")}
                    >
                      Yearly
                      <span>₦95,000 / year · save 7%</span>
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="form-group">
                <label className="form-label">Promo code <span style={{ fontWeight: 400, color: "var(--ink3)" }}>(optional)</span></label>
                <input
                  className="form-input"
                  placeholder="Enter referral code"
                  value={landlordPromoCode}
                  onChange={(event) => setLandlordPromoCode(event.target.value.toUpperCase())}
                />
              </div>
            </>
          ) : null}

          {!(role === "landlord" && landlordMode === "register") ? (
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
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            {!(role === "landlord" && landlordMode === "register") ? (
              <div className="checkbox-wrap">
                <input type="checkbox" id="remember" defaultChecked />
                <label htmlFor="remember">Remember me</label>
              </div>
            ) : <div />}
            <span
              role={role === "landlord" && landlordMode === "register" ? undefined : "button"}
              tabIndex={role === "landlord" && landlordMode === "register" ? -1 : 0}
              style={{
                fontSize: 12,
                color: "var(--accent)",
                fontWeight: 500,
                cursor:
                  role === "landlord" && landlordMode === "register"
                    ? "default"
                    : "pointer",
              }}
              onClick={() => {
                if (role === "landlord" && landlordMode === "register") {
                  return;
                }

                setForgotPasswordEmail(authEmail);
                setWorkspaceAuthView("forgot");
              }}
            >
              {!(role === "landlord" && landlordMode === "register") ? "Forgot password?" : ""}
            </span>
          </div>

          {role === "landlord" && landlordMode === "register" ? (
            <div className="form-group" style={{ marginBottom: 4 }}>
              <div className="checkbox-wrap">
                <input type="checkbox" id="terms-agree" required />
                <label htmlFor="terms-agree" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)", fontWeight: 600 }}
                  >
                    Terms of Use
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)", fontWeight: 600 }}
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.6 }}>
                Refunds and account deletion are governed by our{" "}
                <Link href="/refund-policy" target="_blank" rel="noopener noreferrer">
                  Refund Policy
                </Link>{" "}
                and{" "}
                <Link href="/account-deletion" target="_blank" rel="noopener noreferrer">
                  Account Deletion Policy
                </Link>
                .
              </div>
            </div>
          ) : null}

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
              {landlordMode === "register" ? "Already a member? " : "Don't have an account? "}
              <button
                type="button"
                onClick={() =>
                  setLandlordMode((current) => (current === "login" ? "register" : "login"))
                }
                style={{
                  color: "var(--accent)",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "inherit",
                }}
              >
                {landlordMode === "register" ? "Sign in" : "Create account"}
              </button>
            </>
          ) : role === "admin" ? (
            <>Super admin access is provisioned by DoorRent.</>
          ) : null}
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

  const tenantBranding = role === "tenant" ? tenantPreview?.branding ?? null : null;

  return (
    <>
      <PageMeta
        title={
          role === "tenant"
            ? "DoorRent — Tenant Login"
            : role === "admin"
              ? "DoorRent — Internal Super Admin Login"
              : "DoorRent — Landlord Login"
        }
        description={
          role === "tenant"
            ? "Passwordless tenant login for DoorRent."
            : role === "admin"
              ? "Internal DoorRent super admin access."
              : "Landlord sign-in and registration for DoorRent."
        }
      />

      <div id="auth-screen" style={buildBrandShellStyle(tenantBranding)}>
        <div className="auth-left">
          <div className="auth-logo">
            <img
              src={tenantBranding?.logoUrl || LOGO_PATH}
              alt={`${resolveBrandDisplayName(tenantBranding, "DoorRent")} logo`}
              className="auth-logo-image"
            />
            <span className="auth-logo-name">
              {resolveBrandDisplayName(tenantBranding, "DoorRent")}
            </span>
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

          <div className="auth-activity">
            <div className="auth-activity-item">
              <div className="auth-activity-icon" style={{ background: "rgba(46,160,67,0.18)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5L6.5 11.5L3 8" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="auth-activity-body">
                <span className="auth-activity-title">Rent received</span>
                <span className="auth-activity-sub">Chidinma Eze · ₦320,000</span>
              </div>
              <span className="auth-activity-time">2m ago</span>
            </div>
            <div className="auth-activity-item">
              <div className="auth-activity-icon" style={{ background: "rgba(200,169,110,0.18)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="#c8a96e" strokeWidth="1.6"/><path d="M2 6h12" stroke="#c8a96e" strokeWidth="1.4"/></svg>
              </div>
              <div className="auth-activity-body">
                <span className="auth-activity-title">Agreement signed</span>
                <span className="auth-activity-sub">Kelechi Dike · Unit B2, Lekki</span>
              </div>
              <span className="auth-activity-time">18m ago</span>
            </div>
            <div className="auth-activity-item">
              <div className="auth-activity-icon" style={{ background: "rgba(96,165,250,0.15)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="#60a5fa" strokeWidth="1.6"/><path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="#60a5fa" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </div>
              <div className="auth-activity-body">
                <span className="auth-activity-title">New tenant onboarded</span>
                <span className="auth-activity-sub">Amara Okonkwo · Victoria Island</span>
              </div>
              <span className="auth-activity-time">1h ago</span>
            </div>
            <div className="auth-activity-item">
              <div className="auth-activity-icon" style={{ background: "rgba(251,146,60,0.15)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v4M8 10v.5M8 13a5 5 0 100-10A5 5 0 008 13z" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </div>
              <div className="auth-activity-body">
                <span className="auth-activity-title">Overdue reminder sent</span>
                <span className="auth-activity-sub">Tunde Adeola · ₦180,000 due</span>
              </div>
              <span className="auth-activity-time">3h ago</span>
            </div>
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
                : workspaceAuthView === "forgot"
                  ? "Forgot password"
                  : workspaceAuthView === "reset"
                    ? "Set a new password"
                : role === "admin"
                  ? "Internal super admin access"
                  : landlordMode === "register"
                    ? "Create your account"
                    : "Welcome back"}
            </h2>
            <p>
              {role === "tenant"
                ? "Passwordless sign-in built for quick, low-friction access."
                : workspaceAuthView === "forgot"
                  ? "Enter your account email and we will send you a one-time reset link."
                  : workspaceAuthView === "reset"
                    ? "Create a fresh password for your DoorRent account."
                : role === "admin"
                  ? "Internal DoorRent operations access."
                  : landlordMode === "register"
                    ? "Set up your DoorRent landlord workspace."
                    : "Sign in to your DoorRent landlord workspace"}
            </p>

            {role === "tenant" ? (
              renderTenantAccess()
            ) : (
              renderWorkspaceAccess()
            )}

            {role === "landlord" && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 13, color: "var(--ink3)" }}>
                <Link href="/tenant/login" style={{ color: "var(--accent)", fontWeight: 600, marginRight: 16 }}>
                  Tenant Login
                </Link>
                <Link href="/caretaker/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Caretaker Login
                </Link>
              </div>
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
