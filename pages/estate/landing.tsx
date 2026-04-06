import { type FormEvent, useEffect, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface LandingSettings {
  welcomeTitle: string;
  welcomeMessage: string;
  contactEmail: string;
  contactPhone: string;
  brandLogoUrl: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandDisplayName: string;
  publicLegalAddress: string;
}

const initialForm: LandingSettings = {
  welcomeTitle: "",
  welcomeMessage: "",
  contactEmail: "",
  contactPhone: "",
  brandLogoUrl: "",
  brandPrimaryColor: "",
  brandAccentColor: "",
  brandDisplayName: "",
  publicLegalAddress: "",
};

export default function EstateLandingPage() {
  const { showToast } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const token = landlordSession?.token;

  const [form, setForm] = useState<LandingSettings>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ profile: Record<string, string | null> }>("/estate/settings", { token })
      .then(({ data }) => {
        const p = data.profile ?? {};
        setForm({
          welcomeTitle: (p.brandDisplayName ?? "") as string,
          welcomeMessage: "",
          contactEmail: (p.publicSupportEmail ?? "") as string,
          contactPhone: (p.publicSupportPhone ?? "") as string,
          brandLogoUrl: (p.brandLogoUrl ?? "") as string,
          brandPrimaryColor: (p.brandPrimaryColor ?? "") as string,
          brandAccentColor: (p.brandAccentColor ?? "") as string,
          brandDisplayName: (p.brandDisplayName ?? "") as string,
          publicLegalAddress: (p.publicLegalAddress ?? "") as string,
        });
      })
      .catch((err: unknown) => {
        showToast(err instanceof Error ? err.message : "Failed to load landing settings.", "error");
      })
      .finally(() => { setLoading(false); });
  }, [token]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await apiRequest("/estate/settings", {
        method: "PATCH",
        token,
        body: {
          brandDisplayName: form.brandDisplayName || undefined,
          brandLogoUrl: form.brandLogoUrl || undefined,
          brandPrimaryColor: form.brandPrimaryColor || undefined,
          brandAccentColor: form.brandAccentColor || undefined,
          publicSupportEmail: form.contactEmail || undefined,
          publicSupportPhone: form.contactPhone || undefined,
          publicLegalAddress: form.publicLegalAddress || undefined,
        },
      });
      showToast("Landing page settings saved.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof LandingSettings) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <EstatePortalShell topbarTitle="Landing Page" breadcrumb="Landing Page">
      <PageMeta title="Landing Page — Estate" />
      <PageHeader
        title="Landing Page"
        description="Configure the public-facing branding and contact details for your estate portal."
      />

      {loading ? (
        <div className="empty-state"><p>Loading settings…</p></div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Branding */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><strong>Branding</strong></div>
            <div className="card-body">
              <div className="estate-form-grid">
                <label>
                  Display name
                  <input className="form-input" placeholder="e.g. Greenfield Estate" {...field("brandDisplayName")} />
                </label>
                <label>
                  Logo URL
                  <input className="form-input" placeholder="https://..." {...field("brandLogoUrl")} />
                </label>
                <label>
                  Primary colour
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={form.brandPrimaryColor || "#1a6ef5"} onChange={(e) => setForm((f) => ({ ...f, brandPrimaryColor: e.target.value }))} style={{ width: 40, height: 36, padding: 2, cursor: "pointer" }} />
                    <input className="form-input" placeholder="#1a6ef5" {...field("brandPrimaryColor")} style={{ flex: 1 }} />
                  </div>
                </label>
                <label>
                  Accent colour
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={form.brandAccentColor || "#0ea5e9"} onChange={(e) => setForm((f) => ({ ...f, brandAccentColor: e.target.value }))} style={{ width: 40, height: 36, padding: 2, cursor: "pointer" }} />
                    <input className="form-input" placeholder="#0ea5e9" {...field("brandAccentColor")} style={{ flex: 1 }} />
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><strong>Contact Details</strong></div>
            <div className="card-body">
              <div className="estate-form-grid">
                <label>Support email <input className="form-input" type="email" placeholder="info@greenfieldestates.com" {...field("contactEmail")} /></label>
                <label>Support phone <input className="form-input" type="tel" placeholder="+234 ..." {...field("contactPhone")} /></label>
                <label className="estate-form-wide">
                  Legal / postal address
                  <textarea className="form-input" rows={2} placeholder="Estate address…" {...field("publicLegalAddress")} />
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {(form.brandDisplayName || form.brandLogoUrl) && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header"><strong>Preview</strong></div>
              <div className="card-body" style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {form.brandLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.brandLogoUrl} alt="Logo" style={{ height: 48, width: 48, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)" }} />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: form.brandPrimaryColor || "var(--ink)" }}>{form.brandDisplayName || "Your Estate"}</div>
                  {form.contactEmail && <div style={{ fontSize: 13, color: "var(--ink3)" }}>{form.contactEmail}</div>}
                  {form.contactPhone && <div style={{ fontSize: 13, color: "var(--ink3)" }}>{form.contactPhone}</div>}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Settings"}</button>
          </div>
        </form>
      )}
    </EstatePortalShell>
  );
}
