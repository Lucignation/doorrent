import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Integration {
  id: string | null;
  provider: string;
  name: string;
  description: string;
  category: string;
  authType: "oauth" | "webhook";
  iconSlug: string;
  connected: boolean;
  providerAccountEmail: string | null;
  providerAccountName: string | null;
  webhookUrl: string | null;
  config: Record<string, unknown> | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
}

interface IntegrationsResponse {
  integrations: Integration[];
}

type ProviderField = { key: string; label: string; placeholder: string; type?: string; hint?: string };

type ProviderFormConfig = {
  type: "webhook" | "apikey" | "oauth";
  fields?: ProviderField[];
  hint?: string;
};

const PROVIDER_FORM: Record<string, ProviderFormConfig> = {
  SLACK: {
    type: "webhook",
    fields: [{ key: "webhookUrl", label: "Incoming Webhook URL", placeholder: "https://hooks.slack.com/services/…" }],
    hint: "In your Slack workspace: Apps → Incoming Webhooks → Add New Webhook to Workspace.",
  },
  TEAMS: {
    type: "webhook",
    fields: [{ key: "webhookUrl", label: "Incoming Webhook URL", placeholder: "https://outlook.office.com/webhook/…" }],
    hint: "In Teams: open the channel → … → Connectors → Incoming Webhook → Configure.",
  },
  ZOOM: {
    type: "apikey",
    fields: [
      { key: "accountId", label: "Account ID", placeholder: "Your Zoom Account ID" },
      { key: "clientId", label: "Client ID", placeholder: "Your Zoom Client ID" },
      { key: "clientSecret", label: "Client Secret", placeholder: "Your Zoom Client Secret", type: "password" },
    ],
    hint: "Create a Server-to-Server OAuth app in the Zoom App Marketplace (marketplace.zoom.us). Copy the Account ID, Client ID and Client Secret.",
  },
  GOOGLE_DRIVE: {
    type: "oauth",
    hint: "You will be redirected to Google to authorise DoorRent to access your Google Drive.",
  },
  MAILCHIMP: {
    type: "apikey",
    fields: [{ key: "apiKey", label: "API Key", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1", type: "password" }],
    hint: "In Mailchimp: Account → Extras → API Keys → Create A Key.",
  },
  SENDGRID: {
    type: "apikey",
    fields: [{ key: "apiKey", label: "API Key", placeholder: "SG.xxxxxxxxxxxxxxxxxxxxxxxxxx", type: "password" }],
    hint: "In SendGrid: Settings → API Keys → Create API Key.",
  },
};

const CATEGORY_ORDER = ["Meetings", "Storage", "Notifications", "Email Marketing", "Email"];

const CATEGORY_ICON: Record<string, string> = {
  Meetings: "📹",
  Storage: "☁️",
  Notifications: "🔔",
  "Email Marketing": "📧",
  Email: "✉️",
};

const PROVIDER_ICON: Record<string, string> = {
  zoom: "🎥",
  "google-drive": "📂",
  slack: "💬",
  mailchimp: "🐵",
  teams: "👥",
  sendgrid: "📨",
};

function groupByCategory(integrations: Integration[]) {
  const map: Record<string, Integration[]> = {};
  for (const item of integrations) {
    if (!map[item.category]) map[item.category] = [];
    map[item.category].push(item);
  }
  return CATEGORY_ORDER
    .filter((cat) => map[cat]?.length > 0)
    .map((cat) => ({ category: cat, items: map[cat] }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandlordIntegrationsPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { showToast } = usePrototypeUI();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Connect modal
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Load integrations ──────────────────────────────────────────────────────

  const loadIntegrations = useCallback(async () => {
    const token = landlordSession?.token;
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await apiRequest<IntegrationsResponse>("/integrations", { token });
      setIntegrations(data.integrations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load integrations.");
    } finally {
      setLoading(false);
    }
  }, [landlordSession?.token]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  // Handle Google OAuth callback params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "1") {
      showToast("Google Drive connected successfully.", "success");
      window.history.replaceState({}, "", window.location.pathname);
      void loadIntegrations();
    } else if (params.get("google_error")) {
      showToast(decodeURIComponent(params.get("google_error") ?? "Google connection failed."), "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Close modal on outside click
  useEffect(() => {
    if (!activeIntegration) return;
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        if (!saving) setActiveIntegration(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeIntegration, saving]);

  // ── Open connect modal ─────────────────────────────────────────────────────

  async function openConnect(integration: Integration) {
    const config = PROVIDER_FORM[integration.provider];
    if (!config) return;

    if (config.type === "oauth") {
      // Google OAuth — redirect to backend OAuth URL
      const token = landlordSession?.token;
      if (!token) return;
      try {
        const returnTo = encodeURIComponent(window.location.href);
        const { data } = await apiRequest<{ url: string }>(
          `/landlord/google/connect?returnTo=${returnTo}`,
          { token },
        );
        window.location.href = data.url;
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Could not start Google authorisation.", "error");
      }
      return;
    }

    // Build initial values
    const initial: Record<string, string> = {};
    if (config.type === "webhook") {
      initial.webhookUrl = integration.webhookUrl ?? "";
    } else {
      for (const field of config.fields ?? []) {
        initial[field.key] = "";
      }
    }
    setFormValues(initial);
    setActiveIntegration(integration);
  }

  // ── Submit connect form ────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeIntegration || !landlordSession?.token) return;

    const config = PROVIDER_FORM[activeIntegration.provider];
    if (!config) return;

    // Validate
    for (const field of config.fields ?? []) {
      if (!formValues[field.key]?.trim()) {
        showToast(`Please enter your ${field.label}.`, "error");
        return;
      }
    }

    setSaving(true);
    try {
      if (config.type === "webhook") {
        await apiRequest(`/integrations/${activeIntegration.provider}/webhook`, {
          method: "POST",
          token: landlordSession.token,
          body: { webhookUrl: formValues.webhookUrl.trim() },
        });
      } else {
        const { accountId, clientId, clientSecret, apiKey } = formValues;
        const accessToken = apiKey ?? clientId ?? "";
        const extraConfig: Record<string, string> = {};
        if (accountId) extraConfig.accountId = accountId;
        if (clientSecret) extraConfig.clientSecret = clientSecret;

        await apiRequest(`/integrations/${activeIntegration.provider}/oauth`, {
          method: "POST",
          token: landlordSession.token,
          body: { accessToken, providerAccountName: activeIntegration.provider },
        });

        if (Object.keys(extraConfig).length > 0) {
          await apiRequest(`/integrations/${activeIntegration.provider}/config`, {
            method: "PATCH",
            token: landlordSession.token,
            body: { config: extraConfig },
          });
        }
      }

      showToast(`${activeIntegration.name} connected successfully.`, "success");
      setActiveIntegration(null);
      void loadIntegrations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not connect integration.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────

  async function handleDisconnect(integration: Integration) {
    if (!landlordSession?.token) return;
    if (!window.confirm(`Disconnect ${integration.name}? All saved credentials will be removed.`)) return;

    setDisconnectingProvider(integration.provider);
    try {
      await apiRequest(`/integrations/${integration.provider}`, {
        method: "DELETE",
        token: landlordSession.token,
      });
      showToast(`${integration.name} disconnected.`, "success");
      void loadIntegrations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not disconnect.", "error");
    } finally {
      setDisconnectingProvider(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const grouped = groupByCategory(integrations);
  const connectedCount = integrations.filter((i) => i.connected).length;
  const activeConfig = activeIntegration ? PROVIDER_FORM[activeIntegration.provider] : null;

  return (
    <LandlordPortalShell topbarTitle="Integrations" breadcrumb="Integrations">
      <PageMeta title="App Integrations — DoorRent" />

      <PageHeader
        title="App Integrations"
        description="Connect your external tools and manage everything from within DoorRent."
      />

      {loading && (
        <div className="empty-state">
          <p>Loading integrations…</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <p className="text-red">{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={() => void loadIntegrations()}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary bar */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 28 }}>🔌</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
                  {connectedCount > 0
                    ? `${connectedCount} app${connectedCount > 1 ? "s" : ""} connected`
                    : "No apps connected yet"}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--ink3)" }}>
                  {integrations.length} integrations available · Connect your tools to streamline your workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Integration groups */}
          {grouped.map(({ category, items }) => (
            <div key={category} style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                {CATEGORY_ICON[category] ?? "🔧"}&nbsp; {category}
              </h3>

              <div className="card" style={{ overflow: "hidden" }}>
                {items.map((integration, idx) => (
                  <div
                    key={integration.provider}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "18px 24px",
                      borderBottom: idx < items.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: "var(--surface2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}>
                      {PROVIDER_ICON[integration.iconSlug] ?? "🔧"}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{integration.name}</span>
                        {integration.connected && (
                          <span className="badge badge-green">Connected</span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--ink3)", lineHeight: 1.5 }}>
                        {integration.description}
                      </p>
                      {integration.connected && (integration.providerAccountEmail || integration.webhookUrl) && (
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {integration.providerAccountEmail ?? integration.webhookUrl}
                        </p>
                      )}
                      {integration.connected && integration.connectedAt && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink3)" }}>
                          Connected {new Date(integration.connectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div style={{ flexShrink: 0 }}>
                      {integration.connected ? (
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={disconnectingProvider === integration.provider}
                          onClick={() => void handleDisconnect(integration)}
                        >
                          {disconnectingProvider === integration.provider ? "Removing…" : "Disconnect"}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => void openConnect(integration)}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Connect modal ────────────────────────────────────────────────── */}
      <div className={`modal-overlay${activeIntegration ? " open" : ""}`}>
        {activeIntegration && activeConfig && (
          <div className="modal" ref={modalRef}>
            <div className="modal-header">
              <span className="modal-title">
                Connect {activeIntegration.name}
              </span>
              <button className="modal-close" onClick={() => { if (!saving) setActiveIntegration(null); }}>✕</button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)}>
              <div className="modal-body">
                {activeConfig.fields?.map((field) => (
                  <div key={field.key} className="form-group">
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {field.label}
                    </label>
                    <input
                      type={field.type ?? "text"}
                      className="form-input"
                      value={formValues[field.key] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      required
                    />
                  </div>
                ))}

                {activeConfig.hint && (
                  <div style={{
                    background: "var(--surface2)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    fontSize: 13,
                    color: "var(--ink2)",
                    lineHeight: 1.6,
                    marginTop: 4,
                  }}>
                    💡 {activeConfig.hint}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { if (!saving) setActiveIntegration(null); }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? "Connecting…" : `Connect ${activeIntegration.name}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </LandlordPortalShell>
  );
}
