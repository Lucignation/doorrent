import { useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import LandingPageBuilder from "../../components/landing/LandingPageBuilder";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { LandingBuilderDraft, LandingBuilderWorkspace } from "../../lib/landing-builder";
import type { LandlordCapabilities } from "../../lib/landlord-access";

interface LandlordLandingSettingsResponse {
  capabilities: LandlordCapabilities;
  profile: {
    companyName: string;
    workspaceMode?: "SOLO_LANDLORD" | "PROPERTY_MANAGER_COMPANY" | "ESTATE_ADMIN";
    workspaceSlug?: string | null;
    workspaceOrigin?: string | null;
    brandDisplayName?: string | null;
    brandLogoUrl?: string | null;
    brandPrimaryColor?: string | null;
    brandAccentColor?: string | null;
    publicSupportEmail?: string | null;
    publicSupportPhone?: string | null;
    publicLegalAddress?: string | null;
  };
}

function formatPublishDomain(origin?: string | null, workspaceSlug?: string | null) {
  const fallback = workspaceSlug ? `${workspaceSlug}.usedoorrent.com` : "workspace.usedoorrent.com";

  if (!origin) {
    return fallback;
  }

  return origin.replace(/^https?:\/\//, "").replace(/^www\./, "") || fallback;
}

export default function LandlordLandingPage() {
  const { showToast } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const token = landlordSession?.token;
  const [settings, setSettings] = useState<LandlordLandingSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<LandlordLandingSettingsResponse>("/landlord/settings", { token })
      .then(({ data }) => {
        if (!cancelled) {
          setSettings(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load landing builder.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const workspace = useMemo<LandingBuilderWorkspace>(() => {
    if (settings?.profile.workspaceMode === "ESTATE_ADMIN") {
      return "estate";
    }

    return "property";
  }, [settings?.profile.workspaceMode]);

  async function publishBranding(draft: LandingBuilderDraft) {
    if (!token || !settings) {
      return;
    }

    await apiRequest("/landlord/settings/profile", {
      method: "PATCH",
      token,
      body: {
        brandDisplayName: draft.brandDisplayName || undefined,
        brandLogoUrl: draft.brandLogoUrl || undefined,
        brandPrimaryColor: draft.brandPrimaryColor || undefined,
        brandAccentColor: draft.brandAccentColor || undefined,
        publicSupportEmail: draft.publicSupportEmail || undefined,
        publicSupportPhone: draft.publicSupportPhone || undefined,
        publicLegalAddress: draft.publicLegalAddress || undefined,
      },
    });

    setSettings((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              brandDisplayName: draft.brandDisplayName,
              brandLogoUrl: draft.brandLogoUrl,
              brandPrimaryColor: draft.brandPrimaryColor,
              brandAccentColor: draft.brandAccentColor,
              publicSupportEmail: draft.publicSupportEmail,
              publicSupportPhone: draft.publicSupportPhone,
              publicLegalAddress: draft.publicLegalAddress,
            },
          }
        : current,
    );

    showToast(
      "Brand shell published. Template arrangement and controlled content blocks stay in your local builder draft until the landing content API is connected.",
      "success",
    );
  }

  return (
    <LandlordPortalShell topbarTitle="Landing Page Builder" breadcrumb="Landing Page Builder">
      <PageMeta title="Landing Page Builder — Workspace" />
      <PageHeader
        title="Landing Page Builder"
        description="Preview approved landlord and property company templates, reorder sections with drag and drop, and publish the branded shell."
      />

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ color: "var(--red)" }}>
            {error}
          </div>
        </div>
      ) : null}

      {loading || !settings ? (
        <div className="empty-state">
          <p>Loading landing builder...</p>
        </div>
      ) : (
        <LandingPageBuilder
          workspace={workspace}
          workspaceLabel={
            settings.profile.brandDisplayName || settings.profile.companyName || "Workspace"
          }
          profile={settings.profile}
          storageKey={`doorrent.landing.builder.landlord.${settings.profile.workspaceSlug ?? "default"}`}
          publishDomain={formatPublishDomain(
            settings.profile.workspaceOrigin,
            settings.profile.workspaceSlug,
          )}
          canPublishBranding={
            settings.capabilities.canManageBranding &&
            settings.capabilities.canUseBrandedSubdomain
          }
          enterpriseEnabled={settings.capabilities.isEnterprisePlan}
          onPublishBranding={publishBranding}
        />
      )}
    </LandlordPortalShell>
  );
}
