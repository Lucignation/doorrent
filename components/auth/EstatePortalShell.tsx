import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { buildEstateNav } from "../../data/estate";
import {
  useEstateAdminPortalSession,
} from "../../context/TenantSessionContext";
import type { WorkspaceBranding } from "../../lib/branding";
import AppShell from "../layout/AppShell";
import { resolveEstateAdminCapabilities } from "../../lib/estate-admin-access";
import {
  getSafeWorkspaceHostFromWindow,
  isWorkspaceSubdomainHost,
} from "../../lib/frontend-security";
import { fetchWorkspaceContextByHost } from "../../lib/workspace-context";

interface EstatePortalShellProps {
  topbarTitle: string;
  breadcrumb: string;
  children: React.ReactNode;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function EstatePortalShell({
  topbarTitle,
  breadcrumb,
  children,
}: EstatePortalShellProps) {
  const router = useRouter();
  const { isHydrated, estateAdminSession } = useEstateAdminPortalSession();
  const [resolvedBranding, setResolvedBranding] = useState<WorkspaceBranding | null>(
    estateAdminSession?.landlord.branding ?? null,
  );

  useEffect(() => {
    if (isHydrated && !estateAdminSession) {
      void router.replace("/portal");
    }
  }, [estateAdminSession, isHydrated, router]);

  useEffect(() => {
    if (
      isHydrated &&
      estateAdminSession &&
      estateAdminSession.landlord.workspaceMode !== "ESTATE_ADMIN"
    ) {
      void router.replace("/landlord");
    }
  }, [estateAdminSession, isHydrated, router]);

  useEffect(() => {
    setResolvedBranding(estateAdminSession?.landlord.branding ?? null);
  }, [estateAdminSession?.landlord.branding]);

  useEffect(() => {
    if (!isHydrated || !estateAdminSession || typeof window === "undefined") {
      return;
    }

    const workspaceHost = getSafeWorkspaceHostFromWindow();

    if (!workspaceHost || !isWorkspaceSubdomainHost(workspaceHost)) {
      return;
    }

    let cancelled = false;

    async function syncWorkspaceBranding() {
      const workspaceContext = await fetchWorkspaceContextByHost(workspaceHost);

      if (!cancelled && workspaceContext?.workspace?.branding) {
        setResolvedBranding(workspaceContext.workspace.branding);
      }
    }

    void syncWorkspaceBranding();

    return () => {
      cancelled = true;
    };
  }, [estateAdminSession, isHydrated]);

  if (!isHydrated) {
    return (
      <div className="empty-state" style={{ minHeight: "100vh" }}>
        <h3>Loading your estate workspace.</h3>
        <p>Checking your DoorRent session.</p>
      </div>
    );
  }

  if (!estateAdminSession || estateAdminSession.landlord.workspaceMode !== "ESTATE_ADMIN") {
    return null;
  }

  const capabilities = resolveEstateAdminCapabilities({
    capabilities: estateAdminSession.landlord.capabilities,
    subscriptionModel: estateAdminSession.landlord.subscriptionModel,
    plan: estateAdminSession.landlord.planKey ?? estateAdminSession.landlord.plan,
  });

  return (
    <AppShell
      user={{
        name: estateAdminSession.landlord.fullName,
        role:
          estateAdminSession.landlord.role === "team_member"
            ? (estateAdminSession.landlord.teamRole ?? "Estate staff")
            : "Estate admin",
        initials: initialsFromName(estateAdminSession.landlord.fullName),
      }}
      topbarTitle={topbarTitle}
      breadcrumb={breadcrumb}
      navSections={buildEstateNav(capabilities)}
      branding={resolvedBranding ?? estateAdminSession.landlord.branding}
    >
      {children}
    </AppShell>
  );
}
