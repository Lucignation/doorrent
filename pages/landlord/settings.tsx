import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import AccountDeletionConsentModal from "../../components/ui/AccountDeletionConsentModal";
import PageHeader from "../../components/ui/PageHeader";
import type { LandlordCapabilities } from "../../lib/landlord-access";

interface LandlordSettingsResponse {
  capabilities: LandlordCapabilities;
  profile: {
    id: string;
    companyName: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    photoUrl?: string | null;
    initials: string;
  };
  subscription: {
    plan: string;
    planDescription: string;
    price: string;
    nextBilling: string;
    billingModel?: string;
    commissionRatePercent?: number;
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
    role: string;
    initials: string;
    status: string;
  }>;
}

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

interface TeamInviteForm {
  name: string;
  email: string;
  role: string;
}

const initialTeamInviteForm: TeamInviteForm = {
  name: "",
  email: "",
  role: "",
};

function normalizePayoutValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export default function LandlordSettingsPage() {
  const router = useRouter();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const { landlordSession, clearLandlordSession } = useLandlordPortalSession();
  const [settings, setSettings] = useState<LandlordSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
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
  const [teamInviteForm, setTeamInviteForm] = useState<TeamInviteForm>(
    initialTeamInviteForm,
  );

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
          setSettings(data);
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
    if (settings?.payout.bankName) {
      setBankSearch(settings.payout.bankName);
    }
  }, [settings?.payout.bankName]);

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
            firstName: settings.profile.firstName,
            lastName: settings.profile.lastName,
            phone: settings.profile.phone,
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
        setSettings((current) =>
          current
            ? {
                ...current,
                profile: {
                  ...current.profile,
                  ...response.data,
                },
              }
            : current,
        );
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
      setTeamInviteForm(initialTeamInviteForm);
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
                <div className="card-title">Company Profile</div>
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
                  <label className="form-label">Company Name</label>
                  <input
                    className="form-input"
                    value={settings?.profile.companyName ?? ""}
                    onChange={(event) =>
                      updateProfileField("companyName", event.target.value)
                    }
                  />
                </div>

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
                  }}
                >
                  <span>Next billing: {settings?.subscription.nextBilling ?? "—"}</span>
                  <button type="button" className="btn btn-secondary btn-xs">
                    Upgrade Plan
                  </button>
                </div>
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
                    Full Service landlords can now log offline rent collections from the
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
                        : "Awaiting Paystack verification"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4 }}>
                      Subaccount: {settings?.payout.subaccountCode || "Not configured yet"}
                    </div>
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
                    Basic landlords can update their company profile and notification preferences
                    here. Payout setup and other account-update controls unlock on Full Service.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
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

            {canManageTeamMembers ? (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Team Members</div>
                </div>
                <div className="card-body">
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
                      </div>
                      <span className="tag">{member.role}</span>
                    </div>
                  ))}

                  <form onSubmit={inviteMember} style={{ marginTop: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Team Member Name</label>
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
                      <input
                        className="form-input"
                        value={teamInviteForm.role}
                        onChange={(event) =>
                          setTeamInviteForm((current) => ({
                            ...current,
                            role: event.target.value,
                          }))
                        }
                        placeholder="Operations Manager"
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-secondary btn-sm" disabled={invitingMember}>
                      {invitingMember ? "Sending..." : "+ Invite Member"}
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Legal & Account Deletion</div>
                  <div className="card-subtitle">
                    Review DoorRent policies and permanently close this landlord account.
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
                    Deleting this account revokes access for this landlord workspace and removes
                    landlord-managed data tied to it. Review the account deletion policy before you
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
          </div>
        </div>

        <AccountDeletionConsentModal
          open={showDeleteModal}
          title="Delete landlord account?"
          description="Deleting this landlord account permanently closes the landlord workspace tied to it."
          consequences={[
            "Landlord access and active sessions will be revoked immediately.",
            "Landlord-managed workspace records will be removed from active product access.",
            "Some legal, payment, audit, and security records may still be retained where required.",
          ]}
          consentLabel="I understand that this landlord account deletion is permanent."
          busy={deletingAccount}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={deleteAccount}
        />
      </LandlordPortalShell>
    </>
  );
}
