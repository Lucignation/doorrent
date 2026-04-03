import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import type { WorkspaceBranding } from "../../lib/branding";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { validateSubscriptionUpgradeTarget } from "../../lib/contracts/critical-flows";
import { sanitizeRemoteAssetUrl } from "../../lib/frontend-security";
import AccountDeletionConsentModal from "../../components/ui/AccountDeletionConsentModal";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type { LandlordCapabilities } from "../../lib/landlord-access";

interface LandlordSettingsResponse {
  capabilities: LandlordCapabilities;
  profile: {
    id: string;
    companyName: string;
    workspaceMode: WorkspaceMode;
    workspaceSlug?: string | null;
    workspaceOrigin?: string | null;
    brandDisplayName?: string | null;
    brandLogoUrl?: string | null;
    brandLoginBackgroundUrl?: string | null;
    publicSupportEmail?: string | null;
    publicSupportPhone?: string | null;
    publicLegalAddress?: string | null;
    brandPrimaryColor?: string | null;
    brandAccentColor?: string | null;
    branding?: WorkspaceBranding;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    photoUrl?: string | null;
    initials: string;
  };
  subscription: {
    plan: string;
    planKey?: string | null;
    planDescription: string;
    price: string;
    nextBilling: string;
    nextBillingAt?: string | null;
    status?: string;
    billingModel?: string;
    canManageLifecycle?: boolean;
    renewalStatus?: string;
    autoRenewEnabled?: boolean;
    cancelAtPeriodEnd?: boolean;
    cancelEffectiveAt?: string | null;
    renewalCheckoutUrl?: string | null;
    renewalFailureMessage?: string | null;
    authorizationHint?: string | null;
    commissionRatePercent?: number;
    availablePlanChanges?: Array<{
      planKey: "PRO" | "ENTERPRISE";
      plan: string;
      description: string;
      price: string;
      billingModel: "commission" | "subscription";
      billingInterval: "per_payment" | "monthly";
      requiresCheckout: boolean;
      ctaLabel: string;
    }>;
    pendingPlanChange?: {
      planKey: string;
      plan: string;
      price: string;
      requiresCheckout: boolean;
      checkoutUrl?: string | null;
      requestedAt?: string | null;
    } | null;
    foundingBeta?: {
      enabled: boolean;
      isActive: boolean;
      isEnded: boolean;
      status: "inactive" | "active" | "ended";
      statusLabel: string;
      startsAt: string | null;
      endsAt: string | null;
      endedAt: string | null;
      billingResumesAt: string | null;
      note: string | null;
      daysRemaining: number | null;
      durationDays: number | null;
    } | null;
  };
  payout: {
    bankId?: string | null;
    bankName: string | null;
    bankCode: string | null;
    accountNumber: string | null;
    accountName: string | null;
    subaccountCode?: string | null;
    isConfigured?: boolean;
    isVerified: boolean;
    platformFeePercent: number;
  };
  enterpriseCollections: {
    eligible: boolean;
    enabled: boolean;
    requiresEnterprise: boolean;
    requiredPriceAmount: number;
    provider: "paystack";
    publicKeyHint?: string | null;
    keyHint?: string | null;
    connectedAt?: string | null;
    webhookUrl?: string | null;
    publicSupportEmail?: string | null;
    publicSupportPhone?: string | null;
    publicLegalAddress?: string | null;
    reason?: string | null;
  };
  notifications: Array<{
    id: string;
    key: string;
    label: string;
    channel: string;
    enabled: boolean;
  }>;
  teamMembers: Array<{
    id: string;
    name: string;
    email: string;
    roleKey?: string | null;
    role: string;
    roleDescription?: string | null;
    initials: string;
    status: string;
    joinedAt?: string | null;
    permissions: Array<{
      key: string;
      label: string;
      description?: string;
    }>;
  }>;
  teamRoleOptions: Array<{
    key: string;
    label: string;
    description: string;
    permissions: Array<{
      key: string;
      label: string;
      description?: string;
    }>;
  }>;
}

type WorkspaceMode = "SOLO_LANDLORD" | "PROPERTY_MANAGER_COMPANY";

interface PayoutUpdateResponse {
  payout: LandlordSettingsResponse["payout"];
  syncStatus: "synced" | "saved_without_sync";
}

interface PayoutOtpRequestResponse {
  email: string;
  expiresAt: string;
  expiresInMinutes: number;
  delivery: "sent" | "failed" | "preview";
  codePreview?: string;
}

interface PayoutBanksResponse {
  banks: Array<{
    id: string;
    name: string;
  }>;
}

interface ResolvePayoutAccountResponse {
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface EnterpriseCollectionSettingsResponse {
  enterpriseCollections: LandlordSettingsResponse["enterpriseCollections"];
}

interface TeamInviteForm {
  name: string;
  email: string;
  roleKey: string;
}

const initialTeamInviteForm: TeamInviteForm = {
  name: "",
  email: "",
  roleKey: "",
};

const WORKSPACE_MODE_OPTIONS: Array<{
  value: WorkspaceMode;
  label: string;
  description: string;
}> = [
  {
    value: "SOLO_LANDLORD",
    label: "I manage my own properties",
    description:
      "Use this if you manage your properties directly and only add staff occasionally.",
  },
  {
    value: "PROPERTY_MANAGER_COMPANY",
    label: "We manage properties for clients",
    description:
      "Use this if your company operates properties on behalf of landlords or owners.",
  },
];

const FALLBACK_TEAM_ROLE_OPTIONS: LandlordSettingsResponse["teamRoleOptions"] = [
  {
    key: "COMPANY_ADMIN",
    label: "Company Admin",
    description: "Full internal workspace access for trusted operations leaders.",
    permissions: [
      "Properties","Units","Tenants","Agreements","Payments","Receipts","Notices","Meetings",
      "Reminders","Reports","Notifications","Caretakers","Team Members","Branding","Payout Settings","Emergency",
    ].map((label) => ({
      key: label.toLowerCase().replace(/\s+/g, "_"),
      label,
    })),
  },
  {
    key: "OPERATIONS_MANAGER",
    label: "Operations Manager",
    description: "Day-to-day portfolio management across properties, tenants, agreements, and notices.",
    permissions: ["Properties", "Units", "Tenants", "Agreements", "Notices", "Meetings", "Reminders", "Notifications", "Emergency"].map(
      (label) => ({ key: label.toLowerCase().replace(/\s+/g, "_"), label }),
    ),
  },
  {
    key: "FINANCE_OFFICER",
    label: "Finance Officer",
    description: "Rent collection, receipts, reporting, and finance monitoring.",
    permissions: ["Payments", "Receipts", "Reports", "Notifications"].map((label) => ({
      key: label.toLowerCase().replace(/\s+/g, "_"),
      label,
    })),
  },
  {
    key: "LEASING_MANAGER",
    label: "Leasing Manager",
    description: "Tenant onboarding, units, agreements, and leasing communication.",
    permissions: ["Properties", "Units", "Tenants", "Agreements", "Notices", "Meetings", "Notifications"].map(
      (label) => ({ key: label.toLowerCase().replace(/\s+/g, "_"), label }),
    ),
  },
  {
    key: "SUPPORT_STAFF",
    label: "Support Staff",
    description: "Tenant support, updates, and emergency coordination.",
    permissions: ["Tenants", "Notices", "Meetings", "Notifications", "Emergency"].map(
      (label) => ({ key: label.toLowerCase().replace(/\s+/g, "_"), label }),
    ),
  },
  {
    key: "VIEWER",
    label: "Viewer",
    description: "Read-only operational visibility for leadership or oversight teams.",
    permissions: ["Reports", "Receipts", "Notifications"].map((label) => ({
      key: label.toLowerCase().replace(/\s+/g, "_"),
      label,
    })),
  },
];

function formatSubscriptionDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function betaBadgeTone(
  beta?: LandlordSettingsResponse["subscription"]["foundingBeta"],
): "gray" | "blue" | "amber" {
  if (beta?.isActive) {
    return "blue";
  }

  if (beta?.isEnded) {
    return "amber";
  }

  return "gray";
}

function getWorkspaceModeCopy(mode?: WorkspaceMode) {
  if (mode === "PROPERTY_MANAGER_COMPANY") {
    return {
      profileTitle: "Company Workspace",
      nameLabel: "Company Name",
      namePlaceholder: "Registered or trading company name",
      displayLabel: "Company Platform Name",
      displayPlaceholder: "Defaults to company name",
      companyInfoLabel: "Operating company",
      modeLabel: "Property manager company",
      teamTitle: "Company Team",
      teamDescription:
        "Invite company staff into this workspace with the right access level.",
      emptyTeamTitle: "No company staff yet",
      emptyTeamText:
        "Invited company staff will appear here once you add them.",
      inviteNameLabel: "Company Staff Name",
    };
  }

  return {
    profileTitle: "Workspace Profile",
    nameLabel: "Workspace / Business Name",
    namePlaceholder: "Your name, business, or portfolio name",
    displayLabel: "Workspace Display Name",
    displayPlaceholder: "Defaults to workspace name",
    companyInfoLabel: "Workspace name",
    modeLabel: "Self-managed landlord",
    teamTitle: "Team & Access",
    teamDescription:
      "Invite assistants or support staff only when you need extra help.",
    emptyTeamTitle: "No support staff yet",
    emptyTeamText:
      "If you ever add staff or assistants, their workspace access will appear here.",
    inviteNameLabel: "Staff Name",
  };
}

function normalizePayoutValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export default function LandlordSettingsPage() {
  const router = useRouter();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const { landlordSession, clearLandlordSession, saveLandlordSession } =
    useLandlordPortalSession();
  const [settings, setSettings] = useState<LandlordSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [savingEnterpriseCollections, setSavingEnterpriseCollections] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [subscriptionAction, setSubscriptionAction] = useState<
    "renew" | "cancel" | "resume" | "upgrade" | null
  >(null);
  const [showPlanOptions, setShowPlanOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [availableBanks, setAvailableBanks] = useState<PayoutBanksResponse["banks"]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [payoutResolutionError, setPayoutResolutionError] = useState("");
  const [savedPayoutSnapshot, setSavedPayoutSnapshot] = useState<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    isConfigured: boolean;
  } | null>(null);
  const [requestingPayoutOtp, setRequestingPayoutOtp] = useState(false);
  const [payoutOtpCode, setPayoutOtpCode] = useState("");
  const [payoutOtpExpiresAt, setPayoutOtpExpiresAt] = useState("");
  const [payoutOtpPreview, setPayoutOtpPreview] = useState("");
  const [enterpriseCollectionsEnabled, setEnterpriseCollectionsEnabled] =
    useState(false);
  const [enterprisePaystackPublicKey, setEnterprisePaystackPublicKey] = useState("");
  const [enterprisePaystackSecretKey, setEnterprisePaystackSecretKey] = useState("");
  const [teamInviteForm, setTeamInviteForm] = useState<TeamInviteForm>(
    initialTeamInviteForm,
  );
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  const workspaceModeCopy = getWorkspaceModeCopy(
    settings?.profile.workspaceMode,
  );
  const selectedTeamRole = useMemo(
    () =>
      settings?.teamRoleOptions.find((option) => option.key === teamInviteForm.roleKey) ??
      null,
    [settings?.teamRoleOptions, teamInviteForm.roleKey],
  );

  useEffect(() => {
    if (!settings?.teamRoleOptions.length || teamInviteForm.roleKey) {
      return;
    }

    setTeamInviteForm((current) => ({
      ...current,
      roleKey: settings.teamRoleOptions[0]?.key ?? "",
    }));
  }, [settings?.teamRoleOptions, teamInviteForm.roleKey]);

  useEffect(() => {
    if (!landlordSession?.token) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

    async function loadBanks() {
      setLoadingBanks(true);

      try {
        const { data } = await apiRequest<PayoutBanksResponse>(
          "/landlord/settings/payout/banks",
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setAvailableBanks(data.banks);
        }
      } catch (requestError) {
        if (!cancelled) {
          showToast(
            requestError instanceof Error
              ? requestError.message
              : "We could not load Nigerian banks.",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingBanks(false);
        }
      }
    }

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordSettingsResponse>(
          "/landlord/settings",
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setSettings({
            ...data,
            teamRoleOptions:
              Array.isArray(data.teamRoleOptions) && data.teamRoleOptions.length
                ? data.teamRoleOptions
                : FALLBACK_TEAM_ROLE_OPTIONS,
          });
          setSavedPayoutSnapshot({
            bankName: data.payout.bankName ?? "",
            accountNumber: data.payout.accountNumber ?? "",
            accountName: data.payout.accountName ?? "",
            isConfigured: Boolean(data.payout.isConfigured),
          });

          if (data.capabilities.canManageAccountUpdates) {
            void loadBanks();
          } else {
            setAvailableBanks([]);
            setLoadingBanks(false);
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your landlord settings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token, showToast]);

  useEffect(() => {
    const token = landlordSession?.token;
    if (!token) return;
    apiRequest<{ connected: boolean; email: string | null }>("/landlord/google/status", { token })
      .then(({ data }) => setGoogleStatus(data))
      .catch(() => setGoogleStatus({ connected: false, email: null }));

    // Handle redirect back from Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected")) {
      showToast("Google Calendar connected successfully", "success");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google_error")) {
      showToast(`Google connection failed: ${params.get("google_error")}`, "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [landlordSession?.token, showToast]);

  useEffect(() => {
    if (settings?.payout.bankName) {
      setBankSearch(settings.payout.bankName);
    }
  }, [settings?.payout.bankName]);

  useEffect(() => {
    setEnterpriseCollectionsEnabled(Boolean(settings?.enterpriseCollections.enabled));
    setEnterprisePaystackPublicKey("");
    setEnterprisePaystackSecretKey("");
  }, [settings?.enterpriseCollections]);

  useEffect(() => {
    if (!settings || settings.payout.bankId || availableBanks.length === 0) {
      return;
    }

    const savedBankName = normalizePayoutValue(settings.payout.bankName);

    if (!savedBankName) {
      return;
    }

    const matchedBank = availableBanks.find(
      (bank) => normalizePayoutValue(bank.name) === savedBankName,
    );

    if (!matchedBank) {
      return;
    }

    setSettings((current) =>
      current
        ? {
            ...current,
            payout: {
              ...current.payout,
              bankId: matchedBank.id,
              bankName: matchedBank.name,
            },
          }
        : current,
    );
  }, [availableBanks, settings]);

  useEffect(() => {
    const landlordToken = landlordSession?.token;
    const bankId = settings?.payout.bankId;
    const accountNumber = settings?.payout.accountNumber ?? "";

    if (!landlordToken || !bankId) {
      return;
    }

    if (accountNumber.length !== 10 || settings?.payout.accountName) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setResolvingAccount(true);
      setPayoutResolutionError("");

      try {
        const { data } = await apiRequest<ResolvePayoutAccountResponse>(
          "/landlord/settings/payout/resolve-account",
          {
            method: "POST",
            token: landlordToken,
            body: {
              bankId,
              accountNumber,
            },
          },
        );

        if (!cancelled) {
          setSettings((current) =>
            current
              ? {
                  ...current,
                  payout: {
                    ...current.payout,
                    bankId: data.bankId,
                    bankName: data.bankName,
                    accountNumber: data.accountNumber,
                    accountName: data.accountName,
                  },
                }
              : current,
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setPayoutResolutionError(
            requestError instanceof Error
              ? requestError.message
              : "We could not verify this account number.",
          );
          setSettings((current) =>
            current
              ? {
                  ...current,
                  payout: {
                    ...current.payout,
                    accountName: "",
                  },
                }
              : current,
          );
        }
      } finally {
        if (!cancelled) {
          setResolvingAccount(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    landlordSession?.token,
    settings?.payout.accountName,
    settings?.payout.accountNumber,
    settings?.payout.bankId,
  ]);

  function updateProfileField(
    field: keyof LandlordSettingsResponse["profile"],
    value: string,
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              [field]: value,
            },
          }
        : current,
    );
  }

  function updatePayoutField(
    field: keyof LandlordSettingsResponse["payout"],
    value: string,
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            payout: {
              ...current.payout,
              [field]: value,
            },
          }
        : current,
    );
  }

  function selectPayoutBank(bankId: string) {
    const bank = availableBanks.find((item) => item.id === bankId);

    setSettings((current) =>
      current
        ? {
            ...current,
            payout: {
              ...current.payout,
              bankId,
              bankName: bank?.name ?? "",
              bankCode: "",
              accountNumber: "",
              accountName: "",
            },
          }
        : current,
    );
    setPayoutResolutionError("");
    setBankSearch(bank?.name ?? "");
  }

  function updatePayoutAccountNumber(value: string) {
    const sanitized = value.replace(/\D/g, "").slice(0, 10);

    setSettings((current) =>
      current
        ? {
            ...current,
            payout: {
              ...current.payout,
              accountNumber: sanitized,
              accountName: sanitized === current.payout.accountNumber ? current.payout.accountName : "",
            },
          }
        : current,
    );
    setPayoutResolutionError("");
  }

  const filteredBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();

    if (!query) {
      return availableBanks;
    }

    return availableBanks.filter((bank) => bank.name.toLowerCase().includes(query));
  }, [availableBanks, bankSearch]);

  const payoutChangeRequiresOtp = Boolean(
    savedPayoutSnapshot?.isConfigured &&
      settings &&
      settings.capabilities.canManageAccountUpdates &&
      (normalizePayoutValue(savedPayoutSnapshot.bankName) !==
        normalizePayoutValue(settings.payout.bankName) ||
        normalizePayoutValue(savedPayoutSnapshot.accountNumber) !==
          normalizePayoutValue(settings.payout.accountNumber) ||
        normalizePayoutValue(savedPayoutSnapshot.accountName) !==
          normalizePayoutValue(settings.payout.accountName)),
  );
  const canManageAccountUpdates = settings?.capabilities.canManageAccountUpdates ?? true;
  const canManageTeamMembers = settings?.capabilities.canManageTeamMembers ?? true;
  const canManageNotifications = settings?.capabilities.canViewNotifications ?? true;
  const canManageEmergency = settings?.capabilities.canManageEmergency ?? false;
  const canManageBranding = settings?.capabilities.canManageBranding ?? false;
  const canDeleteAccount = settings?.capabilities.canDeleteAccount ?? false;
  const canManageSubscriptionLifecycle =
    settings?.subscription.canManageLifecycle ?? false;
  const canUseEnterpriseCollections =
    settings?.capabilities.canUseEnterpriseCollections ?? false;

  async function requestPayoutUpdateOtp() {
    if (!landlordSession?.token || !settings) {
      return;
    }

    setRequestingPayoutOtp(true);

    try {
      const { data } = await apiRequest<PayoutOtpRequestResponse>(
        "/landlord/settings/payout/request-update-otp",
        {
          method: "POST",
          token: landlordSession.token,
        },
      );

      setPayoutOtpExpiresAt(data.expiresAt);
      setPayoutOtpPreview(data.codePreview ?? "");
      setPayoutOtpCode("");
      showToast(
        data.delivery === "sent"
          ? `A 6-digit payout update code was sent to ${data.email}.`
          : data.delivery === "preview"
            ? "Email delivery is unavailable here, so a preview code is shown below."
            : "We generated a payout update code, but email delivery failed. Use the preview code if available.",
        data.delivery === "failed" ? "error" : "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not send a payout update code.",
        "error",
      );
    } finally {
      setRequestingPayoutOtp(false);
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!landlordSession?.token || !settings) {
      return;
    }

    setSavingProfile(true);

    try {
      const response = await apiRequest<LandlordSettingsResponse["profile"]>(
        "/landlord/settings/profile",
        {
          method: "PATCH",
          token: landlordSession.token,
          body: {
            companyName: settings.profile.companyName,
            workspaceMode: settings.profile.workspaceMode,
            ...(canManageBranding
              ? {
                  workspaceSlug: settings.profile.workspaceSlug || undefined,
                  brandDisplayName: settings.profile.brandDisplayName || undefined,
                  brandLogoUrl: settings.profile.brandLogoUrl || undefined,
                  brandLoginBackgroundUrl:
                    settings.profile.brandLoginBackgroundUrl || undefined,
                  publicSupportEmail: settings.profile.publicSupportEmail || undefined,
                  publicSupportPhone: settings.profile.publicSupportPhone || undefined,
                  publicLegalAddress: settings.profile.publicLegalAddress || undefined,
                  brandPrimaryColor: settings.profile.brandPrimaryColor || undefined,
                  brandAccentColor: settings.profile.brandAccentColor || undefined,
                }
              : {}),
            firstName: settings.profile.firstName,
            lastName: settings.profile.lastName,
            phone: settings.profile.phone,
            ...(canManageEmergency
              ? {
                  emergencyContactName:
                    settings.profile.emergencyContactName || undefined,
                  emergencyContactPhone:
                    settings.profile.emergencyContactPhone || undefined,
                }
              : {}),
            photoUrl: settings.profile.photoUrl || undefined,
          },
          offline: {
            queue: true,
            dedupeKey: "landlord-settings-profile",
            invalidatePaths: ["/landlord/settings", "/landlord/overview"],
          },
        },
      );

      if (!(response as { offline?: boolean }).offline) {
        const nextProfile = response.data;
        setSettings((current) =>
          current
            ? {
                ...current,
                profile: {
                  ...current.profile,
                  ...nextProfile,
                },
                enterpriseCollections: {
                  ...current.enterpriseCollections,
                  publicSupportEmail: nextProfile.publicSupportEmail ?? null,
                  publicSupportPhone: nextProfile.publicSupportPhone ?? null,
                  publicLegalAddress: nextProfile.publicLegalAddress ?? null,
                },
              }
            : current,
        );

        if (landlordSession) {
          saveLandlordSession({
            ...landlordSession,
            landlord: {
              ...landlordSession.landlord,
              companyName: nextProfile.companyName,
              workspaceMode: nextProfile.workspaceMode,
              workspaceSlug: nextProfile.workspaceSlug,
              firstName: nextProfile.firstName,
              lastName: nextProfile.lastName,
              fullName: nextProfile.fullName,
              phone: nextProfile.phone,
              branding: nextProfile.branding,
            },
          });
        }
      }
      refreshData();
      showToast(response.message || "Profile saved", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not save your profile.",
        "error",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!landlordSession?.token || !settings) {
      return;
    }

    setSavingPayout(true);

    try {
      const { data } = await apiRequest<PayoutUpdateResponse>(
        "/landlord/settings/payout",
        {
          method: "PATCH",
          token: landlordSession.token,
          body: {
            bankId: settings.payout.bankId,
            accountNumber: settings.payout.accountNumber,
            accountName: settings.payout.accountName,
            otpCode: payoutChangeRequiresOtp ? payoutOtpCode : undefined,
          },
        },
      );

      setSettings((current) =>
        current
          ? {
              ...current,
              payout: {
                ...current.payout,
                ...data.payout,
              },
            }
          : current,
      );
      setSavedPayoutSnapshot({
        bankName: data.payout.bankName ?? "",
        accountNumber: data.payout.accountNumber ?? "",
        accountName: data.payout.accountName ?? "",
        isConfigured: Boolean(data.payout.isConfigured),
      });
      setPayoutOtpCode("");
      setPayoutOtpExpiresAt("");
      setPayoutOtpPreview("");
      refreshData();
      showToast("Payout settings saved", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not save your payout settings.",
        "error",
      );
    } finally {
      setSavingPayout(false);
    }
  }

  async function submitEnterpriseCollections(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!landlordSession?.token || !settings) {
      return;
    }

    setSavingEnterpriseCollections(true);

    try {
      const { data, message } = await apiRequest<EnterpriseCollectionSettingsResponse>(
        "/landlord/settings/company-collections",
        {
          method: "PATCH",
          token: landlordSession.token,
          body: {
            enabled: enterpriseCollectionsEnabled,
            publicKey: enterprisePaystackPublicKey || undefined,
            secretKey: enterprisePaystackSecretKey || undefined,
          },
        },
      );

      setSettings((current) =>
        current
          ? {
              ...current,
              enterpriseCollections: data.enterpriseCollections,
            }
          : current,
      );
      setEnterprisePaystackPublicKey("");
      setEnterprisePaystackSecretKey("");
      refreshData();
      showToast(message || "Enterprise company collections updated", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not update the company collection settings.",
        "error",
      );
    } finally {
      setSavingEnterpriseCollections(false);
    }
  }

  async function toggleNotification(
    preferenceId: string,
    checked: boolean,
  ) {
    if (!landlordSession?.token || !settings) {
      return;
    }

    const nextNotifications = settings.notifications.map((item) =>
      item.id === preferenceId ? { ...item, enabled: checked } : item,
    );

    setSettings({
      ...settings,
      notifications: nextNotifications,
    });

    try {
      const response = await apiRequest<LandlordSettingsResponse["notifications"]>(
        "/landlord/settings/notifications",
        {
          method: "PATCH",
          token: landlordSession.token,
          body: {
            preferences: nextNotifications.map((item) => ({
              key: item.key,
              enabled: item.enabled,
            })),
          },
          offline: {
            queue: true,
            dedupeKey: "landlord-settings-notifications",
            invalidatePaths: ["/landlord/settings"],
          },
        },
      );

      if (!(response as { offline?: boolean }).offline) {
        setSettings((current) =>
          current
            ? {
                ...current,
                notifications: response.data,
              }
            : current,
        );
      }
      refreshData();
      showToast(response.message || "Preference saved", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not save this preference.",
        "error",
      );
    }
  }

  async function handleSubscriptionRenewal() {
    if (!landlordSession?.token || subscriptionAction) {
      return;
    }

    setSubscriptionAction("renew");

    try {
      const response = await apiRequest<{
        subscription: LandlordSettingsResponse["subscription"];
        checkout: {
          authorizationUrl: string;
          reference: string;
        };
      }>("/landlord/settings/subscription/renew", {
        method: "POST",
        token: landlordSession.token,
      });

      setSettings((current) =>
        current
          ? {
              ...current,
              subscription: response.data.subscription,
            }
          : current,
      );
      refreshData();
      showToast(response.message || "Renewal checkout ready", "success");
      window.location.href = response.data.checkout.authorizationUrl;
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not start your renewal checkout.",
        "error",
      );
    } finally {
      setSubscriptionAction(null);
    }
  }

  async function handlePlanUpgrade(targetPlan: "PRO" | "ENTERPRISE") {
    if (!landlordSession?.token || subscriptionAction) {
      return;
    }

    const upgradeValidationMessage = validateSubscriptionUpgradeTarget({
      targetPlan,
      currentPlanKey: settings?.subscription.planKey,
      availablePlanChanges: settings?.subscription.availablePlanChanges ?? [],
    });

    if (upgradeValidationMessage) {
      showToast(upgradeValidationMessage, "error");
      return;
    }

    setSubscriptionAction("upgrade");

    try {
      const response = await apiRequest<{
        subscription: LandlordSettingsResponse["subscription"];
        checkout: {
          authorizationUrl: string;
          reference: string;
        } | null;
      }>("/landlord/settings/subscription/upgrade", {
        method: "POST",
        token: landlordSession.token,
        body: {
          plan: targetPlan,
        },
      });

      setSettings((current) =>
        current
          ? {
              ...current,
              subscription: response.data.subscription,
            }
          : current,
      );
      refreshData();
      setShowPlanOptions(false);
      showToast(
        response.message ||
          (response.data.checkout
            ? "Upgrade checkout ready"
            : "Workspace plan updated successfully."),
        "success",
      );

      if (response.data.checkout?.authorizationUrl) {
        window.location.href = response.data.checkout.authorizationUrl;
      }
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not change your plan right now.",
        "error",
      );
    } finally {
      setSubscriptionAction(null);
    }
  }

  async function handleCancelSubscriptionAtPeriodEnd() {
    if (!landlordSession?.token || subscriptionAction) {
      return;
    }

    setSubscriptionAction("cancel");

    try {
      const response = await apiRequest<LandlordSettingsResponse["subscription"]>(
        "/landlord/settings/subscription/cancel",
        {
          method: "POST",
          token: landlordSession.token,
        },
      );

      setSettings((current) =>
        current
          ? {
              ...current,
              subscription: response.data,
            }
          : current,
      );
      refreshData();
      showToast(
        response.message ||
          "Your subscription will stay active until the end of the current billing period.",
        "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not schedule your cancellation.",
        "error",
      );
    } finally {
      setSubscriptionAction(null);
    }
  }

  async function handleResumeSubscription() {
    if (!landlordSession?.token || subscriptionAction) {
      return;
    }

    setSubscriptionAction("resume");

    try {
      const response = await apiRequest<LandlordSettingsResponse["subscription"]>(
        "/landlord/settings/subscription/resume",
        {
          method: "POST",
          token: landlordSession.token,
        },
      );

      setSettings((current) =>
        current
          ? {
              ...current,
              subscription: response.data,
            }
          : current,
      );
      refreshData();
      showToast(response.message || "Automatic renewal restored.", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not resume this subscription.",
        "error",
      );
    } finally {
      setSubscriptionAction(null);
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!landlordSession?.token) {
      return;
    }

    setInvitingMember(true);

    try {
      const { data } = await apiRequest<LandlordSettingsResponse["teamMembers"][number]>(
        "/landlord/settings/team-members/invite",
        {
          method: "POST",
          token: landlordSession.token,
          body: teamInviteForm,
        },
      );

      setSettings((current) =>
        current
          ? {
              ...current,
              teamMembers: [...current.teamMembers, data],
            }
          : current,
      );
      setTeamInviteForm({
        ...initialTeamInviteForm,
        roleKey: settings?.teamRoleOptions[0]?.key ?? "",
      });
      refreshData();
      showToast("Invite sent", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not invite this team member.",
        "error",
      );
    } finally {
      setInvitingMember(false);
    }
  }

  async function deleteAccount() {
    if (!landlordSession?.token || deletingAccount) {
      return;
    }

    setDeletingAccount(true);

    try {
      await apiRequest("/landlord/account", {
        method: "DELETE",
        token: landlordSession.token,
      });
      setShowDeleteModal(false);
      await router.replace("/account-deletion");
      clearLandlordSession();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not delete this account.",
        "error",
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <>
      <PageMeta title="DoorRent — Settings" />
      <LandlordPortalShell topbarTitle="Settings" breadcrumb="Dashboard → Settings">
        <PageHeader
          title="Settings"
          description={
            loading
              ? "Loading your account preferences..."
              : error || "Manage your account and preferences"
          }
        />

        <div className="grid-2">
          <div>
            <form className="card" style={{ marginBottom: 16 }} onSubmit={submitProfile}>
              <div className="card-header">
                <div className="card-title">{workspaceModeCopy.profileTitle}</div>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div className="user-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
                    {settings?.profile.initials ?? "DR"}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {settings?.profile.fullName ?? "Loading..."}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                      {settings?.profile.email ?? "Loading..."}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{workspaceModeCopy.nameLabel}</label>
                  <input
                    className="form-input"
                    value={settings?.profile.companyName ?? ""}
                    onChange={(event) =>
                      updateProfileField("companyName", event.target.value)
                    }
                    placeholder={workspaceModeCopy.namePlaceholder}
                  />
                </div>

                {canManageBranding ? (
                  <div className="form-group">
                    <label className="form-label">Workspace Subdomain</label>
                    <input
                      className="form-input"
                      value={settings?.profile.workspaceSlug ?? ""}
                      onChange={(event) =>
                        updateProfileField("workspaceSlug", event.target.value.toLowerCase())
                      }
                      placeholder="blueoak"
                    />
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                      Your branded login page will use{" "}
                      <strong>
                        {(settings?.profile.workspaceOrigin ?? "https://usedoorrent.com")
                          .replace(/^https?:\/\//, "")
                          .replace(/^www\./, "")}
                      </strong>
                      .
                    </div>
                  </div>
                ) : null}

                <div className="form-group">
                  <label className="form-label">Workspace Mode</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                    {WORKSPACE_MODE_OPTIONS.map((option) => {
                      const isSelected = (settings?.profile.workspaceMode ?? "SOLO_LANDLORD") === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateProfileField("workspaceMode", option.value)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            padding: "14px 16px",
                            borderRadius: "var(--radius)",
                            border: isSelected ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                            background: isSelected ? "var(--accent-light, #e8f4ed)" : "var(--surface)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "border-color 0.15s, background 0.15s",
                          }}
                        >
                          <span style={{
                            flexShrink: 0,
                            marginTop: 2,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: isSelected ? "5px solid var(--accent)" : "2px solid var(--border2)",
                            background: isSelected ? "var(--accent-light)" : "var(--surface)",
                            display: "inline-block",
                            transition: "border 0.15s",
                          }} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? "var(--accent)" : "var(--ink)", marginBottom: 3 }}>
                              {option.label}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5 }}>
                              {option.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {canManageBranding ? (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">{workspaceModeCopy.displayLabel}</label>
                        <input
                          className="form-input"
                          value={settings?.profile.brandDisplayName ?? ""}
                          onChange={(event) =>
                            updateProfileField("brandDisplayName", event.target.value)
                          }
                          placeholder={workspaceModeCopy.displayPlaceholder}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Logo URL</label>
                        <input
                          className="form-input"
                          value={settings?.profile.brandLogoUrl ?? ""}
                          onChange={(event) =>
                            updateProfileField("brandLogoUrl", event.target.value)
                          }
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Login Background Image URL</label>
                      <input
                        className="form-input"
                        value={settings?.profile.brandLoginBackgroundUrl ?? ""}
                        onChange={(event) =>
                          updateProfileField("brandLoginBackgroundUrl", event.target.value)
                        }
                        placeholder="https://..."
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        This image will show on the left side of your branded landlord and tenant login
                        page.
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Public Support Email</label>
                        <input
                          className="form-input"
                          value={settings?.profile.publicSupportEmail ?? ""}
                          onChange={(event) =>
                            updateProfileField("publicSupportEmail", event.target.value)
                          }
                          placeholder="support@yourcompany.com"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Public Support Phone</label>
                        <input
                          className="form-input"
                          value={settings?.profile.publicSupportPhone ?? ""}
                          onChange={(event) =>
                            updateProfileField("publicSupportPhone", event.target.value)
                          }
                          placeholder="+234..."
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Public Business Address</label>
                      <textarea
                        className="form-input"
                        value={settings?.profile.publicLegalAddress ?? ""}
                        onChange={(event) =>
                          updateProfileField("publicLegalAddress", event.target.value)
                        }
                        placeholder="This will appear on your branded privacy, terms, and refund pages."
                        rows={3}
                        style={{ resize: "vertical" }}
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        Use the company support details that payment providers and customers should see
                        on your branded public policy pages.
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Primary Color</label>
                        <input
                          className="form-input"
                          value={settings?.profile.brandPrimaryColor ?? ""}
                          onChange={(event) =>
                            updateProfileField("brandPrimaryColor", event.target.value)
                          }
                          placeholder="#1A6B4A"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Accent Color</label>
                        <input
                          className="form-input"
                          value={settings?.profile.brandAccentColor ?? ""}
                          onChange={(event) =>
                            updateProfileField("brandAccentColor", event.target.value)
                          }
                          placeholder="#C8A96E"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16,
                        background: "var(--surface2)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                        Workspace Brand Preview
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {sanitizeRemoteAssetUrl(settings?.profile.brandLogoUrl) ? (
                          <img
                            src={sanitizeRemoteAssetUrl(settings?.profile.brandLogoUrl) || undefined}
                            alt={`${settings?.profile.brandDisplayName || settings?.profile.companyName || "Workspace"} logo`}
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 14,
                              objectFit: "cover",
                              border: "1px solid var(--border)",
                              background: "#fff",
                            }}
                          />
                        ) : (
                          <div
                            className="user-avatar"
                            style={{
                              width: 52,
                              height: 52,
                              background: settings?.profile.branding?.primaryColor ?? "var(--accent)",
                              color: "#fff",
                            }}
                          >
                            {settings?.profile.initials ?? "DR"}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>
                            {settings?.profile.brandDisplayName ??
                              settings?.profile.companyName ??
                              "DoorRent"}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                            This name, logo, and color theme will brand the active workspace.
                          </div>
                          {sanitizeRemoteAssetUrl(settings?.profile.brandLoginBackgroundUrl) ? (
                            <div
                              style={{
                                marginTop: 12,
                                width: 220,
                                height: 88,
                                borderRadius: 12,
                                border: "1px solid var(--border)",
                                backgroundImage: `linear-gradient(rgba(17, 19, 18, 0.4), rgba(17, 19, 18, 0.4)), url(${sanitizeRemoteAssetUrl(settings?.profile.brandLoginBackgroundUrl)})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                boxShadow: "var(--shadow)",
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      className="form-input"
                      value={settings?.profile.firstName ?? ""}
                      onChange={(event) =>
                        updateProfileField("firstName", event.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      className="form-input"
                      value={settings?.profile.lastName ?? ""}
                      onChange={(event) =>
                        updateProfileField("lastName", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={settings?.profile.phone ?? ""}
                    onChange={(event) => updateProfileField("phone", event.target.value)}
                  />
                </div>

                {canManageEmergency ? (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Emergency Contact Name</label>
                        <input
                          className="form-input"
                          value={settings?.profile.emergencyContactName ?? ""}
                          onChange={(event) =>
                            updateProfileField("emergencyContactName", event.target.value)
                          }
                          placeholder="Optional responder"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Emergency Contact Phone</label>
                        <input
                          className="form-input"
                          value={settings?.profile.emergencyContactPhone ?? ""}
                          onChange={(event) =>
                            updateProfileField("emergencyContactPhone", event.target.value)
                          }
                          placeholder="+234..."
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid rgba(26, 107, 74, 0.12)",
                        background: "var(--accent-light)",
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                        Emergency Access
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--ink2)",
                          lineHeight: 1.6,
                          marginBottom: 12,
                        }}
                      >
                        Emergency tools now live inside your profile settings so you can
                        launch an alert or review your response numbers from one place.
                      </div>
                      <Link href="/landlord/emergency" className="btn btn-secondary btn-sm">
                        Open Emergency
                      </Link>
                    </div>
                  </>
                ) : null}

                <button type="submit" className="btn btn-primary btn-sm" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Subscription</div>
              </div>
              <div className="card-body">
                <div
                  style={{
                    padding: 16,
                    background: "var(--accent-light)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
                        {settings?.subscription.plan ?? "Loading..."}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--accent)", opacity: 0.7 }}>
                        {settings?.subscription.planDescription ?? ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--accent)" }}>
                      {settings?.subscription.price ?? ""}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    color: "var(--ink2)",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span>Next billing: {settings?.subscription.nextBilling ?? "—"}</span>
                  {settings?.subscription.availablePlanChanges?.length ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setShowPlanOptions((current) => !current)}
                    >
                      {showPlanOptions ? "Hide Plan Options" : "Upgrade Plan"}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--ink3)" }}>
                      {settings?.subscription.planKey === "ENTERPRISE"
                        ? "You’re on the highest plan."
                        : "No upgrade options available."}
                    </span>
                  )}
                </div>
                {settings?.subscription.foundingBeta ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(26, 115, 232, 0.18)",
                      background: "rgba(26, 115, 232, 0.06)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <StatusBadge tone={betaBadgeTone(settings.subscription.foundingBeta)}>
                        {settings.subscription.foundingBeta.statusLabel}
                      </StatusBadge>
                      {settings.subscription.foundingBeta.isActive &&
                      settings.subscription.foundingBeta.daysRemaining !== null ? (
                        <div style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>
                          {settings.subscription.foundingBeta.daysRemaining} day(s) left
                        </div>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.7 }}>
                      {settings.subscription.foundingBeta.isActive
                        ? `Your founding beta started on ${formatSubscriptionDate(
                            settings.subscription.foundingBeta.startsAt,
                          )} and ends on ${formatSubscriptionDate(
                            settings.subscription.foundingBeta.endsAt,
                          )}.`
                        : settings.subscription.foundingBeta.isEnded
                          ? `Your founding beta ended on ${formatSubscriptionDate(
                              settings.subscription.foundingBeta.endedAt,
                            )}.`
                          : "DoorRent has not activated a founding beta window on this workspace."}
                    </div>
                    {settings.subscription.foundingBeta.billingResumesAt ? (
                      <div style={{ fontSize: 12, color: "var(--ink2)" }}>
                        Billing resumes on{" "}
                        <strong>
                          {formatSubscriptionDate(
                            settings.subscription.foundingBeta.billingResumesAt,
                          )}
                        </strong>
                        .
                      </div>
                    ) : null}
                    {settings.subscription.foundingBeta.note ? (
                      <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.7 }}>
                        {settings.subscription.foundingBeta.note}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {settings?.subscription.pendingPlanChange ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(26, 115, 232, 0.18)",
                      background: "rgba(26, 115, 232, 0.06)",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                      Pending plan change: {settings.subscription.pendingPlanChange.plan}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.7 }}>
                      {settings.subscription.pendingPlanChange.price}
                      {settings.subscription.pendingPlanChange.requestedAt
                        ? ` requested on ${formatSubscriptionDate(settings.subscription.pendingPlanChange.requestedAt)}`
                        : ""}
                    </div>
                    {settings.subscription.pendingPlanChange.checkoutUrl ? (
                      <a
                        href={settings.subscription.pendingPlanChange.checkoutUrl}
                        className="btn btn-secondary btn-xs"
                        style={{ width: "fit-content" }}
                      >
                        Continue Checkout
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {showPlanOptions && settings?.subscription.availablePlanChanges?.length ? (
                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    {settings.subscription.availablePlanChanges.map((option) => (
                      <div
                        key={option.planKey}
                        style={{
                          padding: 14,
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid rgba(23, 28, 24, 0.08)",
                          background: "#fff",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 16,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                              {option.plan}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.7 }}>
                              {option.description}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: option.requiresCheckout ? "var(--gold-dark)" : "var(--accent)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {option.price}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                          {option.requiresCheckout
                            ? "A Paystack checkout opens and the new plan activates after payment is verified."
                            : "No upfront payment. Your workspace switches immediately and DoorRent applies commission on rent collected."}
                        </div>
                        <div>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            disabled={subscriptionAction !== null}
                            onClick={() => void handlePlanUpgrade(option.planKey)}
                          >
                            {subscriptionAction === "upgrade"
                              ? "Starting..."
                              : option.ctaLabel}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {canManageSubscriptionLifecycle ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(23, 28, 24, 0.08)",
                      background: "rgba(23, 28, 24, 0.03)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.7 }}>
                      {settings?.subscription.autoRenewEnabled
                        ? `Auto-renew is active${settings.subscription.authorizationHint ? ` via ${settings.subscription.authorizationHint}` : ""}.`
                        : "Auto-renew is not active for this subscription yet."}
                    </div>
                    {settings?.subscription.cancelAtPeriodEnd ? (
                      <div style={{ fontSize: 12, color: "var(--amber)", lineHeight: 1.7 }}>
                        Cancellation is scheduled for{" "}
                        {settings.subscription.cancelEffectiveAt
                          ? formatSubscriptionDate(settings.subscription.cancelEffectiveAt)
                          : settings.subscription.nextBilling ?? "the end of this billing period"}
                        .
                      </div>
                    ) : null}
                    {settings?.subscription.renewalFailureMessage ? (
                      <div style={{ fontSize: 12, color: "var(--red)", lineHeight: 1.7 }}>
                        {settings.subscription.renewalFailureMessage}
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => void handleSubscriptionRenewal()}
                        disabled={subscriptionAction !== null}
                      >
                        {subscriptionAction === "renew" ? "Starting checkout..." : "Renew Subscription"}
                      </button>
                      {settings?.subscription.cancelAtPeriodEnd ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => void handleResumeSubscription()}
                          disabled={subscriptionAction !== null}
                        >
                          {subscriptionAction === "resume" ? "Resuming..." : "Resume Auto-Renew"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => void handleCancelSubscriptionAtPeriodEnd()}
                          disabled={subscriptionAction !== null}
                        >
                          {subscriptionAction === "cancel" ? "Scheduling..." : "Cancel At Period End"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
                {settings?.subscription.billingModel === "commission" ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(26, 115, 232, 0.08)",
                      border: "1px solid rgba(26, 115, 232, 0.18)",
                      fontSize: 12,
                      color: "var(--blue)",
                      lineHeight: 1.7,
                    }}
                  >
                    Pro workspaces can now log offline rent collections from the
                    Payments page so DoorRent still tracks the{" "}
                    {settings.subscription.commissionRatePercent ?? 3}% base commission per
                    rent year covered.
                  </div>
                ) : null}
              </div>
            </div>

            {canManageAccountUpdates ? (
              <form className="card" style={{ marginTop: 16 }} onSubmit={submitPayout}>
                <div className="card-header">
                  <div>
                    <div className="card-title">Payout Settings</div>
                    <div className="card-subtitle">
                      Tenant payments settle through Paystack, and DoorRent calculates
                      commission from the rent years covered by each collection. Multi-year
                      upfront rent therefore increases the total commission on that transaction.
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Search Bank</label>
                      <input
                        className="form-input"
                        placeholder="Search Nigerian bank"
                        value={bankSearch}
                        onChange={(event) => setBankSearch(event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bank</label>
                      <select
                        className="form-input"
                        value={settings?.payout.bankId ?? ""}
                        onChange={(event) => selectPayoutBank(event.target.value)}
                        disabled={loadingBanks}
                      >
                        <option value="">{loadingBanks ? "Loading banks..." : "Select bank"}</option>
                        {filteredBanks.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name}
                          </option>
                        ))}
                      </select>
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        {filteredBanks.length} bank{filteredBanks.length === 1 ? "" : "s"} found
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Account Number</label>
                      <input
                        className="form-input"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="Enter 10-digit account number"
                        value={settings?.payout.accountNumber ?? ""}
                        onChange={(event) => updatePayoutAccountNumber(event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Name</label>
                      <input
                        className="form-input"
                        value={settings?.payout.accountName ?? ""}
                        disabled
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        Account name is filled automatically after verification.
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      background: payoutResolutionError
                        ? "var(--red-light)"
                        : settings?.payout.accountName
                          ? "var(--green-light)"
                          : "var(--surface2)",
                      border: `1px solid ${
                        payoutResolutionError
                          ? "rgba(192,57,43,0.18)"
                          : settings?.payout.accountName
                            ? "rgba(26,107,74,0.18)"
                            : "var(--border)"
                      }`,
                      fontSize: 12,
                      color: payoutResolutionError
                        ? "var(--red)"
                        : settings?.payout.accountName
                          ? "var(--green)"
                          : "var(--ink2)",
                    }}
                  >
                    {resolvingAccount
                      ? "Verifying account number..."
                      : payoutResolutionError
                        ? payoutResolutionError
                        : settings?.payout.accountName
                          ? `Verified account name: ${settings.payout.accountName}`
                          : "Select a bank and enter a valid 10-digit account number to verify the account name."}
                  </div>

                  {payoutChangeRequiresOtp ? (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 14,
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                        Confirm bank-account change
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4 }}>
                        For security, DoorRent must email you a 6-digit code before you can
                        change an existing payout account.
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-end",
                          flexWrap: "wrap",
                          marginTop: 12,
                        }}
                      >
                        <div style={{ flex: "1 1 220px" }}>
                          <label className="form-label">Update OTP</label>
                          <input
                            className="form-input"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter 6-digit code"
                            value={payoutOtpCode}
                            onChange={(event) =>
                              setPayoutOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void requestPayoutUpdateOtp()}
                          disabled={requestingPayoutOtp}
                        >
                          {requestingPayoutOtp ? "Sending..." : payoutOtpExpiresAt ? "Resend OTP" : "Send OTP"}
                        </button>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink3)" }}>
                        {payoutOtpExpiresAt
                          ? `This code expires at ${new Date(payoutOtpExpiresAt).toLocaleTimeString("en-NG", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}.`
                          : "Request a code when you are ready to save the new account."}
                      </div>
                      {payoutOtpPreview ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--amber)" }}>
                          Preview code: <strong>{payoutOtpPreview}</strong>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    style={{
                      padding: 14,
                      background: settings?.payout.isVerified
                        ? "var(--green-light)"
                        : "var(--amber-light)",
                      border: `1px solid ${
                        settings?.payout.isVerified
                          ? "rgba(26,107,74,0.18)"
                          : "rgba(176,125,42,0.2)"
                      }`,
                      borderRadius: "var(--radius-sm)",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: settings?.payout.isVerified ? "var(--green)" : "var(--amber)",
                      }}
                    >
                      {settings?.payout.isVerified
                        ? "Paystack subaccount verified"
                        : "Paystack payout subaccount pending verification"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4 }}>
                      Subaccount: {settings?.payout.subaccountCode || "Not configured yet"}
                    </div>
                    {!settings?.payout.isVerified ? (
                      <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 6 }}>
                        DoorRent has created a Paystack payout subaccount for this workspace,
                        but Paystack has not confirmed it yet. Rent payouts may not settle to
                        this account until verification is complete.
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={
                      savingPayout ||
                      resolvingAccount ||
                      !settings?.payout.bankId ||
                      !settings?.payout.accountName ||
                      (payoutChangeRequiresOtp && payoutOtpCode.length !== 6) ||
                      (settings?.payout.accountNumber?.length ?? 0) !== 10
                    }
                  >
                    {savingPayout ? "Saving..." : "Save Payout Settings"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header">
                  <div className="card-title">Account Updates</div>
                </div>
                <div className="card-body">
                  <div className="td-muted">
                    Basic workspaces can update their company profile here. Payout setup and
                    advanced account controls unlock on Pro or Enterprise.
                  </div>
                </div>
              </div>
            )}

            {canUseEnterpriseCollections ? (
            <form className="card" style={{ marginTop: 16 }} onSubmit={submitEnterpriseCollections}>
              <div className="card-header">
                <div>
                  <div className="card-title">Enterprise Company Collections</div>
                  <div className="card-subtitle">
                    Enterprise property management companies can collect tenant rent into their
                    own Paystack account while DoorRent bills the workspace separately at
                    ₦200,000/month.
                  </div>
                </div>
              </div>
              <div className="card-body">
                {settings?.enterpriseCollections.eligible ? (
                  <>
                    <div
                      style={{
                        padding: 14,
                        borderRadius: "var(--radius-sm)",
                        border: `1px solid ${
                          enterpriseCollectionsEnabled
                            ? "rgba(26,107,74,0.18)"
                            : "rgba(176,125,42,0.2)"
                        }`,
                        background: enterpriseCollectionsEnabled
                          ? "var(--green-light)"
                          : "var(--amber-light)",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: enterpriseCollectionsEnabled ? "var(--green)" : "var(--amber)",
                        }}
                      >
                        {enterpriseCollectionsEnabled
                          ? "Company-owned Paystack collections are enabled"
                          : "Company-owned Paystack collections are disabled"}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>
                        When this is enabled, DoorRent initializes rent payments with your
                        company’s Paystack account. DoorRent does not hold the rent before
                        settlement.
                      </div>
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enterpriseCollectionsEnabled}
                        onChange={(event) =>
                          setEnterpriseCollectionsEnabled(event.target.checked)
                        }
                      />
                      Enable direct collections into this company’s Paystack account
                    </label>

                    <div className="form-group">
                      <label className="form-label">Paystack Public Key</label>
                      <input
                        className="form-input"
                        type="password"
                        value={enterprisePaystackPublicKey}
                        onChange={(event) =>
                          setEnterprisePaystackPublicKey(event.target.value)
                        }
                        placeholder={
                          settings?.enterpriseCollections.publicKeyHint
                            ? `Stored fingerprint: ${settings.enterpriseCollections.publicKeyHint}`
                            : "pk_live_..."
                        }
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        DoorRent only stores a masked fingerprint for the public key because
                        server-side checkout links do not need the raw value later.
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Paystack Secret Key</label>
                      <input
                        className="form-input"
                        type="password"
                        value={enterprisePaystackSecretKey}
                        onChange={(event) => setEnterprisePaystackSecretKey(event.target.value)}
                        placeholder={
                          settings?.enterpriseCollections.keyHint
                            ? `Currently connected: ${settings.enterpriseCollections.keyHint}`
                            : "sk_live_..."
                        }
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        Enter the company’s own Paystack secret key. DoorRent stores an encrypted
                        copy plus a non-reversible fingerprint, and this endpoint only accepts the
                        update over HTTPS in production.
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Workspace Webhook URL</label>
                      <input
                        className="form-input"
                        value={settings?.enterpriseCollections.webhookUrl ?? ""}
                        readOnly
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        Add this webhook URL inside the company’s Paystack dashboard so DoorRent
                        can mark payments as paid automatically.
                      </div>
                    </div>

                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        background: "var(--surface2)",
                        fontSize: 12,
                        color: "var(--ink2)",
                        lineHeight: 1.7,
                      }}
                    >
                      <div>
                        <strong>Stored public key:</strong>{" "}
                        {settings?.enterpriseCollections.publicKeyHint ?? "Not stored yet"}
                      </div>
                      <div>
                        <strong>Connected key:</strong>{" "}
                        {settings?.enterpriseCollections.keyHint ?? "Not connected yet"}
                      </div>
                      <div>
                        <strong>Connected at:</strong>{" "}
                        {settings?.enterpriseCollections.connectedAt
                          ? new Date(
                              settings.enterpriseCollections.connectedAt,
                            ).toLocaleString("en-NG")
                          : "Not connected yet"}
                      </div>
                      <div>
                        <strong>Public support email:</strong>{" "}
                        {settings?.enterpriseCollections.publicSupportEmail || "Not set"}
                      </div>
                      <div>
                        <strong>Public phone:</strong>{" "}
                        {settings?.enterpriseCollections.publicSupportPhone || "Not set"}
                      </div>
                      <div>
                        <strong>Public legal address:</strong>{" "}
                        {settings?.enterpriseCollections.publicLegalAddress || "Not set"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(26, 115, 232, 0.08)",
                        border: "1px solid rgba(26, 115, 232, 0.18)",
                        fontSize: 12,
                        color: "var(--blue)",
                        lineHeight: 1.7,
                      }}
                    >
                      If owner payout splits are configured per property, DoorRent will create the
                      owner payout subaccount inside the company’s Paystack account and leave the
                      management fee inside the company account automatically.
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={
                        savingEnterpriseCollections ||
                        (enterpriseCollectionsEnabled &&
                          !enterprisePaystackSecretKey.trim() &&
                          !settings?.enterpriseCollections.keyHint)
                      }
                    >
                      {savingEnterpriseCollections
                        ? "Saving..."
                        : "Save Enterprise Collection Settings"}
                    </button>
                  </>
                ) : (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(176,125,42,0.2)",
                      background: "var(--amber-light)",
                      fontSize: 12,
                      color: "var(--ink2)",
                      lineHeight: 1.7,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>
                      Enterprise only
                    </div>
                    <div>
                      {settings?.enterpriseCollections.reason ??
                        "This feature is only available to property management company workspaces on the Enterprise ₦200,000/month subscription."}
                    </div>
                  </div>
                )}
              </div>
            </form>
            ) : null}
          </div>

          <div>
            {canManageNotifications ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">Notification Preferences</div>
              </div>
              <div className="card-body">
                {(settings?.notifications ?? []).map((item, index, array) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom:
                        index === array.length - 1 ? "none" : "1px solid var(--border)",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--ink3)" }}>{item.channel}</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) =>
                          void toggleNotification(item.id, event.target.checked)
                        }
                      />
                      <div className="switch-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            ) : null}

            {canManageTeamMembers ? (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">{workspaceModeCopy.teamTitle}</div>
                </div>
                <div className="card-body">
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink3)",
                      marginBottom: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {workspaceModeCopy.teamDescription}
                  </div>
                  {(settings?.teamMembers ?? []).map((member) => (
                    <div
                      key={member.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div className="tenant-avatar">{member.initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{member.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink3)" }}>{member.email}</div>
                        {member.permissions.length ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              marginTop: 8,
                            }}
                          >
                            {member.permissions.map((permission) => (
                              <span
                                key={`${member.id}-${permission.key}`}
                                className="tag"
                                style={{ fontSize: 10 }}
                              >
                                {permission.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <span className="tag">{member.role}</span>
                    </div>
                  ))}

                  <form onSubmit={inviteMember} style={{ marginTop: 16 }}>
                    <div className="form-group">
                      <label className="form-label">{workspaceModeCopy.inviteNameLabel}</label>
                      <input
                        className="form-input"
                        value={teamInviteForm.name}
                        onChange={(event) =>
                          setTeamInviteForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        className="form-input"
                        type="email"
                        value={teamInviteForm.email}
                        onChange={(event) =>
                          setTeamInviteForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select
                        className="form-input"
                        value={teamInviteForm.roleKey}
                        onChange={(event) =>
                          setTeamInviteForm((current) => ({
                            ...current,
                            roleKey: event.target.value,
                          }))
                        }
                        required
                      >
                        {settings?.teamRoleOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {selectedTeamRole ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: 12,
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            background: "var(--surface2)",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600 }}>
                            {selectedTeamRole.label}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--ink3)",
                              marginTop: 4,
                              lineHeight: 1.6,
                            }}
                          >
                            {selectedTeamRole.description}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              marginTop: 10,
                            }}
                          >
                            {selectedTeamRole.permissions.map((permission) => (
                              <span key={permission.key} className="tag">
                                {permission.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <button type="submit" className="btn btn-primary btn-sm" disabled={invitingMember}>
                      {invitingMember ? "Sending..." : "+ Invite Member"}
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            {canDeleteAccount ? (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Google Calendar</div>
                      <div className="card-subtitle">Connect your Google account to generate Google Meet links directly from DoorRent.</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {googleStatus?.connected ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
                            <span style={{ fontSize: 14, fontWeight: 500 }}>Connected</span>
                          </div>
                          {googleStatus.email ? (
                            <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>{googleStatus.email}</div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={disconnectingGoogle}
                          onClick={async () => {
                            if (!landlordSession?.token) return;
                            setDisconnectingGoogle(true);
                            try {
                              await apiRequest("/landlord/google/connection", { method: "DELETE", token: landlordSession.token });
                              setGoogleStatus({ connected: false, email: null });
                              showToast("Google Calendar disconnected", "success");
                            } catch (err) {
                              showToast(err instanceof Error ? err.message : "Could not disconnect.", "error");
                            } finally {
                              setDisconnectingGoogle(false);
                            }
                          }}
                        >
                          {disconnectingGoogle ? "Disconnecting…" : "Disconnect"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 13, color: "var(--ink2)" }}>
                          Not connected. Connect once to generate Google Meet links with one click.
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={connectingGoogle}
                          onClick={async () => {
                            if (!landlordSession?.token) return;
                            setConnectingGoogle(true);
                            try {
                              const returnTo =
                                typeof window === "undefined" ? "" : encodeURIComponent(window.location.href);
                              const { data } = await apiRequest<{ url: string }>(
                                `/landlord/google/connect${returnTo ? `?returnTo=${returnTo}` : ""}`,
                                { token: landlordSession.token },
                              );
                              window.location.href = data.url;
                            } catch (err) {
                              setConnectingGoogle(false);
                              showToast(err instanceof Error ? err.message : "Could not start Google connection.", "error");
                            }
                          }}
                        >
                          {connectingGoogle ? "Connecting…" : "Connect Google Calendar"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-header">
                  <div>
                    <div className="card-title">Legal & Account Deletion</div>
                    <div className="card-subtitle">
                      Review DoorRent policies and permanently close this workspace account.
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      marginBottom: 18,
                    }}
                  >
                    <Link href="/terms" className="btn btn-secondary btn-xs">
                      Terms of Use
                    </Link>
                    <Link href="/privacy" className="btn btn-secondary btn-xs">
                      Privacy Policy
                    </Link>
                    <Link href="/refund-policy" className="btn btn-secondary btn-xs">
                      Refund Policy
                    </Link>
                    <Link href="/account-deletion" className="btn btn-secondary btn-xs">
                      Account Deletion
                    </Link>
                  </div>

                  <div
                    style={{
                      border: "1px solid rgba(220, 64, 64, 0.18)",
                      background: "rgba(220, 64, 64, 0.05)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                      Danger Zone
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink2)",
                        lineHeight: 1.6,
                        marginBottom: 14,
                      }}
                    >
                      Deleting this account revokes access for this workspace and removes
                      workspace-managed data tied to it. Review the account deletion policy before you
                      continue.
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={deletingAccount}
                    >
                      {deletingAccount ? "Deleting..." : "Delete Account"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {canDeleteAccount ? (
          <AccountDeletionConsentModal
            open={showDeleteModal}
            title="Delete workspace account?"
            description="Deleting this workspace account permanently closes the workspace tied to it."
            consequences={[
              "Workspace access and active sessions will be revoked immediately.",
              "Workspace-managed records will be removed from active product access.",
              "Some legal, payment, audit, and security records may still be retained where required.",
            ]}
            consentLabel="I understand that this workspace account deletion is permanent."
            busy={deletingAccount}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={deleteAccount}
          />
        ) : null}
      </LandlordPortalShell>
    </>
  );
}
