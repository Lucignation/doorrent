import { type FormEvent, useEffect, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { LandlordCapabilities } from "../../lib/landlord-access";
import type { WorkspaceBranding } from "../../lib/branding";

interface EstateSettingsResponse {
  capabilities: LandlordCapabilities;
  profile: {
    id: string;
    companyName: string;
    workspaceSlug?: string | null;
    brandDisplayName?: string | null;
    brandLogoUrl?: string | null;
    brandPrimaryColor?: string | null;
    brandAccentColor?: string | null;
    publicSupportEmail?: string | null;
    publicSupportPhone?: string | null;
    publicLegalAddress?: string | null;
    branding?: WorkspaceBranding;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    initials: string;
  };
  teamMembers: Array<{
    id: string;
    name: string;
    email: string;
    roleKey?: string | null;
    role: string;
    initials: string;
    status: string;
    joinedAt?: string | null;
  }>;
  teamRoleOptions: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

export default function EstateSettingsPage() {
  const { showToast } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const token = landlordSession?.token;

  const [settings, setSettings] = useState<EstateSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [brandDisplayName, setBrandDisplayName] = useState("");
  const [publicSupportEmail, setPublicSupportEmail] = useState("");
  const [publicSupportPhone, setPublicSupportPhone] = useState("");
  const [publicLegalAddress, setPublicLegalAddress] = useState("");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Email update
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Team invite
  const [teamInviteName, setTeamInviteName] = useState("");
  const [teamInviteEmail, setTeamInviteEmail] = useState("");
  const [teamInviteRole, setTeamInviteRole] = useState("");
  const [savingInvite, setSavingInvite] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ data: EstateSettingsResponse }>("/landlord/settings", { token })
      .then(({ data }) => {
        setSettings(data.data);
        const p = data.data.profile;
        setFirstName(p.firstName);
        setLastName(p.lastName);
        setPhone(p.phone ?? "");
        setCompanyName(p.companyName ?? "");
        setBrandDisplayName(p.brandDisplayName ?? "");
        setPublicSupportEmail(p.publicSupportEmail ?? "");
        setPublicSupportPhone(p.publicSupportPhone ?? "");
        setPublicLegalAddress(p.publicLegalAddress ?? "");
        setBrandPrimaryColor(p.brandPrimaryColor ?? "");
        if (data.data.teamRoleOptions.length > 0) {
          setTeamInviteRole(data.data.teamRoleOptions[0].key);
        }
      })
      .catch(() => showToast("Failed to load settings", "error"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    try {
      await apiRequest("/landlord/settings/profile", {
        method: "PATCH",
        token,
        body: {
          firstName,
          lastName,
          phone: phone || undefined,
          companyName,
          brandDisplayName: brandDisplayName || undefined,
          publicSupportEmail: publicSupportEmail || undefined,
          publicSupportPhone: publicSupportPhone || undefined,
          publicLegalAddress: publicLegalAddress || undefined,
          brandPrimaryColor: brandPrimaryColor || undefined,
        },
      });
      showToast("Profile updated.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdateEmail(event: FormEvent) {
    event.preventDefault();
    if (!token || !newEmail.trim()) return;
    setSavingEmail(true);
    try {
      await apiRequest("/landlord/settings/email", {
        method: "PATCH",
        token,
        body: { email: newEmail.trim() },
      });
      showToast("Email updated. Check your inbox for a confirmation.", "success");
      setNewEmail("");
      // Reload settings to reflect new email
      const { data } = await apiRequest<{ data: EstateSettingsResponse }>("/landlord/settings", { token });
      setSettings(data.data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update email.", "error");
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleInviteTeamMember(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSavingInvite(true);
    try {
      await apiRequest("/landlord/team-members", {
        method: "POST",
        token,
        body: { name: teamInviteName, email: teamInviteEmail, roleKey: teamInviteRole },
      });
      showToast(`Invitation sent to ${teamInviteEmail}.`, "success");
      setTeamInviteName("");
      setTeamInviteEmail("");
      const { data } = await apiRequest<{ data: EstateSettingsResponse }>("/landlord/settings", { token });
      setSettings(data.data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to send invitation.", "error");
    } finally {
      setSavingInvite(false);
    }
  }

  async function handleRemoveTeamMember(memberId: string, memberName: string) {
    if (!token) return;
    if (!confirm(`Remove ${memberName} from the estate workspace?`)) return;
    try {
      await apiRequest(`/landlord/team-members/${memberId}`, { method: "DELETE", token });
      showToast(`${memberName} removed.`, "success");
      const { data } = await apiRequest<{ data: EstateSettingsResponse }>("/landlord/settings", { token });
      setSettings(data.data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to remove team member.", "error");
    }
  }

  return (
    <EstatePortalShell topbarTitle="Settings" breadcrumb="Settings">
      <PageMeta title="Settings — Estate" />
      <PageHeader title="Settings" subtitle="Manage your estate profile, branding, and team." />

      {loading ? (
        <div className="empty-state"><p>Loading settings…</p></div>
      ) : (
        <div className="settings-grid">

          {/* Account info */}
          <section className="settings-card">
            <h2 className="settings-card-title">Account</h2>
            <div className="settings-row">
              <span className="settings-label">Login email</span>
              <span className="settings-value">{settings?.profile.email}</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Workspace</span>
              <span className="settings-value">{settings?.profile.workspaceSlug ?? "—"}</span>
            </div>
          </section>

          {/* Update email */}
          <section className="settings-card">
            <h2 className="settings-card-title">Update Email Address</h2>
            <p className="settings-card-copy">Change the login email for this estate admin account.</p>
            <form onSubmit={handleUpdateEmail} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">New email address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="new@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <button type="submit" className="btn btn-primary" disabled={savingEmail || !newEmail.trim()}>
                  {savingEmail ? "Updating…" : "Update Email"}
                </button>
              </div>
            </form>
          </section>

          {/* Profile */}
          <section className="settings-card">
            <h2 className="settings-card-title">Profile</h2>
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">First name</label>
                  <input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Last name</label>
                  <input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Estate name</label>
                <input className="form-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save Profile"}
              </button>
            </form>
          </section>

          {/* Branding */}
          <section className="settings-card">
            <h2 className="settings-card-title">Branding & Public Info</h2>
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Display name</label>
                <input className="form-input" value={brandDisplayName} onChange={(e) => setBrandDisplayName(e.target.value)} placeholder="Estate public display name" />
              </div>
              <div className="form-group">
                <label className="form-label">Primary colour</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input className="form-input" style={{ flex: 1 }} value={brandPrimaryColor} onChange={(e) => setBrandPrimaryColor(e.target.value)} placeholder="#1A1A1A" />
                  {brandPrimaryColor ? (
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: brandPrimaryColor, border: "1px solid #E5E5E0" }} />
                  ) : null}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Public support email</label>
                <input className="form-input" type="email" value={publicSupportEmail} onChange={(e) => setPublicSupportEmail(e.target.value)} placeholder="support@yourestate.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Public support phone</label>
                <input className="form-input" type="tel" value={publicSupportPhone} onChange={(e) => setPublicSupportPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Public legal address</label>
                <textarea className="form-input" rows={2} value={publicLegalAddress} onChange={(e) => setPublicLegalAddress(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save Branding"}
              </button>
            </form>
          </section>

          {/* Team Members */}
          <section className="settings-card">
            <h2 className="settings-card-title">Team Members</h2>
            {settings?.teamMembers && settings.teamMembers.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {settings.teamMembers.map((member) => (
                  <div key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{member.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>{member.email}</div>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge tone="blue" label={member.role} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => void handleRemoveTeamMember(member.id, member.name)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "var(--ink3)", marginBottom: 20 }}>No team members yet.</p>
            )}

            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Invite a team member</h3>
            <form onSubmit={handleInviteTeamMember} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Name</label>
                <input className="form-input" value={teamInviteName} onChange={(e) => setTeamInviteName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={teamInviteEmail} onChange={(e) => setTeamInviteEmail(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Role</label>
                <select className="form-input" value={teamInviteRole} onChange={(e) => setTeamInviteRole(e.target.value)}>
                  {settings?.teamRoleOptions.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <button type="submit" className="btn btn-primary" disabled={savingInvite}>
                  {savingInvite ? "Sending…" : "Send Invitation"}
                </button>
              </div>
            </form>
          </section>

        </div>
      )}
    </EstatePortalShell>
  );
}
