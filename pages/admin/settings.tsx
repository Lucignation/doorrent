import { type FormEvent, useEffect, useState } from "react";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";

interface AdminSettingsResponse {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  platform: {
    supportEmail: string;
    billingEmail: string;
    alertsEmail: string;
    maintenanceMode: boolean;
    allowLandlordRegistration: boolean;
    defaultTrialDays: number;
  };
}

export default function AdminSettingsPage() {
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const { adminSession } = useAdminPortalSession();
  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminSession?.token) {
      return;
    }

    const adminToken = adminSession.token;
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<AdminSettingsResponse>("/admin/settings", {
          token: adminToken,
        });

        if (!cancelled) {
          setSettings(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load super admin settings.",
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
  }, [adminSession?.token, dataRefreshVersion]);

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!adminSession?.token || !settings) {
      return;
    }

    setSaving(true);

    try {
      const { data } = await apiRequest<AdminSettingsResponse>("/admin/settings", {
        method: "PATCH",
        token: adminSession.token,
        body: {
          firstName: settings.profile.firstName,
          lastName: settings.profile.lastName,
          phone: settings.profile.phone || undefined,
          supportEmail: settings.platform.supportEmail,
          billingEmail: settings.platform.billingEmail,
          alertsEmail: settings.platform.alertsEmail,
          maintenanceMode: settings.platform.maintenanceMode,
          allowLandlordRegistration: settings.platform.allowLandlordRegistration,
          defaultTrialDays: settings.platform.defaultTrialDays,
        },
      });

      setSettings(data);
      refreshData();
      showToast("System settings saved", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not save system settings.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageMeta title="DoorRent — System Settings" />
      <AdminPortalShell
        topbarTitle="System Settings"
        breadcrumb="Dashboard → System Settings"
      >
        <PageHeader
          title="System Settings"
          description={
            loading
              ? "Loading your super admin settings..."
              : error ||
                "Manage super admin profile, registration controls, and system notification addresses"
          }
        />

        <form onSubmit={submitSettings}>
          <div className="grid-2">
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div className="card-title">Super Admin Profile</div>
                </div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        className="form-input"
                        value={settings?.profile.firstName ?? ""}
                        onChange={(event) =>
                          setSettings((current) =>
                            current
                              ? {
                                  ...current,
                                  profile: {
                                    ...current.profile,
                                    firstName: event.target.value,
                                  },
                                }
                              : current,
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        className="form-input"
                        value={settings?.profile.lastName ?? ""}
                        onChange={(event) =>
                          setSettings((current) =>
                            current
                              ? {
                                  ...current,
                                  profile: {
                                    ...current.profile,
                                    lastName: event.target.value,
                                  },
                                }
                              : current,
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" value={settings?.profile.email ?? ""} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      className="form-input"
                      value={settings?.profile.phone ?? ""}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                profile: {
                                  ...current.profile,
                                  phone: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Platform Controls</div>
                </div>
                <div className="card-body">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Maintenance Mode</div>
                      <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                        Pause onboarding and landlord self-serve registration.
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings?.platform.maintenanceMode ?? false}
                        onChange={(event) =>
                          setSettings((current) =>
                            current
                              ? {
                                  ...current,
                                  platform: {
                                    ...current.platform,
                                    maintenanceMode: event.target.checked,
                                  },
                                }
                              : current,
                          )
                        }
                      />
                      <div className="switch-slider" />
                    </label>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        Allow Landlord Registration
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                        Control whether new landlords can sign up without manual approval.
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings?.platform.allowLandlordRegistration ?? false}
                        onChange={(event) =>
                          setSettings((current) =>
                            current
                              ? {
                                  ...current,
                                  platform: {
                                    ...current.platform,
                                    allowLandlordRegistration: event.target.checked,
                                  },
                                }
                              : current,
                          )
                        }
                      />
                      <div className="switch-slider" />
                    </label>
                  </div>

                  <div className="form-group" style={{ marginTop: 8 }}>
                    <label className="form-label">Default Trial Length (Days)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={settings?.platform.defaultTrialDays ?? 14}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                platform: {
                                  ...current.platform,
                                  defaultTrialDays: Number(event.target.value),
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div className="card-title">System Notification Emails</div>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Support Inbox</label>
                    <input
                      className="form-input"
                      value={settings?.platform.supportEmail ?? ""}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                platform: {
                                  ...current.platform,
                                  supportEmail: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Inbox</label>
                    <input
                      className="form-input"
                      value={settings?.platform.billingEmail ?? ""}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                platform: {
                                  ...current.platform,
                                  billingEmail: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Alerts Inbox</label>
                    <input
                      className="form-input"
                      value={settings?.platform.alertsEmail ?? ""}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                platform: {
                                  ...current.platform,
                                  alertsEmail: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Operational Notes</div>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.8, marginBottom: 16 }}>
                    Super admins can review landlord portfolios, inspect the full property footprint, manage system-wide onboarding rules, and maintain the email destinations used for support, billing, and alerts.
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </AdminPortalShell>
    </>
  );
}
