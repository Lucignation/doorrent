import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import PageHeader from "../../components/ui/PageHeader";
import {
  landlordNav,
  landlordNotificationPreferences,
  landlordProfile,
  landlordTeamMembers,
  landlordUser,
} from "../../data/landlord";

export default function LandlordSettingsPage() {
  const { showToast } = usePrototypeUI();
  return (
    <>
      <PageMeta title="DoorRent — Settings" />
      <AppShell
        user={landlordUser}
        topbarTitle="Settings"
        breadcrumb="Dashboard → Settings"
        navSections={landlordNav}
      >
        <PageHeader
          title="Settings"
          description="Manage your account and preferences"
        />

        <div className="grid-2">
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">Company Profile</div>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div className="user-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
                    {landlordUser.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{landlordUser.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink3)" }}>{landlordProfile.email}</div>
                    <button type="button" className="btn btn-ghost btn-xs" style={{ marginTop: 6 }}>
                      Change photo
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="form-input" defaultValue={landlordProfile.companyName} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" defaultValue={landlordProfile.firstName} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" defaultValue={landlordProfile.lastName} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" defaultValue={landlordProfile.phone} />
                </div>

                <button type="button" className="btn btn-primary btn-sm" onClick={() => showToast("Profile saved", "success")}>
                  Save Changes
                </button>
              </div>
            </div>

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
                        {landlordProfile.plan}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--accent)", opacity: 0.7 }}>
                        {landlordProfile.planDescription}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--accent)" }}>
                      {landlordProfile.price}
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
                  <span>Next billing: {landlordProfile.nextBilling}</span>
                  <button type="button" className="btn btn-secondary btn-xs">
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">Notification Preferences</div>
              </div>
              <div className="card-body">
                {landlordNotificationPreferences.map((item, index) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom:
                        index === landlordNotificationPreferences.length - 1
                          ? "none"
                          : "1px solid var(--border)",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--ink3)" }}>{item.channel}</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked={item.enabled} onChange={() => showToast("Preference saved", "success")} />
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
                {landlordTeamMembers.map((member) => (
                  <div
                    key={member.email}
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

                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => showToast("Invite sent", "success")}>
                  + Invite Member
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
