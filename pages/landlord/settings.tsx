import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";

interface LandlordSettingsResponse {
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
  };
  payout: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    subaccountCode?: string | null;
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

export default function LandlordSettingsPage() {
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [settings, setSettings] = useState<LandlordSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [teamInviteForm, setTeamInviteForm] = useState<TeamInviteForm>(
    initialTeamInviteForm,
  );

  useEffect(() => {
    if (!landlordSession?.token) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

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
  }, [dataRefreshVersion, landlordSession?.token]);

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

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!landlordSession?.token || !settings) {
      return;
    }

    setSavingProfile(true);

    try {
      const { data } = await apiRequest<LandlordSettingsResponse["profile"]>(
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
        },
      );

      setSettings((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                ...data,
              },
            }
          : current,
      );
      refreshData();
      showToast("Profile saved", "success");
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
            bankName: settings.payout.bankName,
            bankCode: settings.payout.bankCode,
            accountNumber: settings.payout.accountNumber,
            accountName: settings.payout.accountName,
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
      const { data } = await apiRequest<LandlordSettingsResponse["notifications"]>(
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
        },
      );

      setSettings((current) =>
        current
          ? {
              ...current,
              notifications: data,
            }
          : current,
      );
      refreshData();
      showToast("Preference saved", "success");
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
              </div>
            </div>

            <form className="card" style={{ marginTop: 16 }} onSubmit={submitPayout}>
              <div className="card-header">
                <div>
                  <div className="card-title">Payout Settings</div>
                  <div className="card-subtitle">
                    Tenant payments settle through Paystack, and DoorRent keeps {settings?.payout.platformFeePercent ?? 3}% as the platform fee.
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      className="form-input"
                      value={settings?.payout.bankName ?? ""}
                      onChange={(event) => updatePayoutField("bankName", event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank Code</label>
                    <input
                      className="form-input"
                      value={settings?.payout.bankCode ?? ""}
                      onChange={(event) => updatePayoutField("bankCode", event.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input
                      className="form-input"
                      value={settings?.payout.accountNumber ?? ""}
                      onChange={(event) =>
                        updatePayoutField("accountNumber", event.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Name</label>
                    <input
                      className="form-input"
                      value={settings?.payout.accountName ?? ""}
                      onChange={(event) =>
                        updatePayoutField("accountName", event.target.value)
                      }
                    />
                  </div>
                </div>

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

                <button type="submit" className="btn btn-primary btn-sm" disabled={savingPayout}>
                  {savingPayout ? "Saving..." : "Save Payout Settings"}
                </button>
              </div>
            </form>
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
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
