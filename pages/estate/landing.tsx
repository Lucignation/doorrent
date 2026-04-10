import { useEffect, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import LandingPageBuilder from "../../components/landing/LandingPageBuilder";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { LandingBuilderDraft } from "../../lib/landing-builder";
import type { EstateAdminCapabilities } from "../../lib/estate-admin-access";
import {
  fetchPublishedLandingDraft,
  publishLandingDraft,
} from "../../lib/public-landing-client";

interface EstateLandingSettingsResponse {
  capabilities: EstateAdminCapabilities;
  profile: {
    companyName: string;
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

export default function EstateLandingPage() {
  const { showToast } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;
  const [settings, setSettings] = useState<EstateLandingSettingsResponse | null>(null);
  const [publishedDraft, setPublishedDraft] = useState<Partial<LandingBuilderDraft> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setPublishedDraft(null);

    void (async () => {
      try {
        const { data } = await apiRequest<EstateLandingSettingsResponse>("/estate/settings", {
          token,
        });
        const workspaceSlug = data.profile.workspaceSlug?.trim();
        let nextPublishedDraft: Partial<LandingBuilderDraft> | null = null;

        if (workspaceSlug) {
          try {
            nextPublishedDraft =
              (await fetchPublishedLandingDraft(workspaceSlug))?.draft ?? null;
          } catch {
            nextPublishedDraft = null;
          }
        }

        if (!cancelled) {
          setSettings(data);
          setPublishedDraft(nextPublishedDraft);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load landing builder.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function publishBranding(draft: LandingBuilderDraft) {
    if (!token || !settings) {
      return;
    }

    const workspaceSlug = settings.profile.workspaceSlug?.trim();

    if (!workspaceSlug) {
      showToast(
        "Add a branded workspace slug before publishing this landing page.",
        "error",
      );
      return;
    }

    try {
      const record = await publishLandingDraft({
        token,
        workspaceSlug,
        workspaceType: "estate",
        draft,
      });

      setPublishedDraft(record.draft);

      try {
        await apiRequest("/estate/settings/profile", {
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
      } catch {
        showToast(
          `Landing page published to ${formatPublishDomain(
            settings.profile.workspaceOrigin,
            workspaceSlug,
          )}. Profile settings will sync on the next successful save.`,
          "success",
        );
        return;
      }

      showToast(
        `Landing page published to ${formatPublishDomain(
          settings.profile.workspaceOrigin,
          workspaceSlug,
        )}.`,
        "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Failed to publish landing page.",
        "error",
      );
    }
  }

  return (
    <EstatePortalShell topbarTitle="Landing Page Builder" breadcrumb="Landing Page Builder">
      <PageMeta title="Landing Page Builder — Estate" />
      <PageHeader
        title="Landing Page Builder"
        description="Choose Controlled, Puck, or Craft.js, edit approved estate templates and content blocks, and preview the public page before publishing."
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
          workspace="estate"
          workspaceLabel={settings.profile.brandDisplayName || settings.profile.companyName || "Estate"}
          profile={settings.profile}
          storageKey={`doorrent.landing.builder.estate.${settings.profile.workspaceSlug ?? "default"}`}
          publishDomain={formatPublishDomain(
            settings.profile.workspaceOrigin,
            settings.profile.workspaceSlug,
          )}
          canPublishBranding={
            settings.capabilities.canManageBranding &&
            settings.capabilities.canUseBrandedSubdomain
          }
          enterpriseEnabled={settings.capabilities.isEnterprisePlan}
          publishedDraft={publishedDraft}
          onPublishBranding={publishBranding}
        />
      )}
    </EstatePortalShell>
  );
}
