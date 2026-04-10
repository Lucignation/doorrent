import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { buildLandlordNav } from "../../data/landlord";
import { canAccessLandlordPath } from "../../lib/landlord-access";
import {
  useLandlordPortalSession,
} from "../../context/TenantSessionContext";
import type { WorkspaceBranding } from "../../lib/branding";
import AppShell from "../layout/AppShell";
import { resolveLandlordCapabilities } from "../../lib/landlord-access";
import { getSafeWorkspaceHostFromWindow, isWorkspaceSubdomainHost } from "../../lib/frontend-security";
import { fetchWorkspaceContextByHost } from "../../lib/workspace-context";

interface LandlordPortalShellProps {
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

export default function LandlordPortalShell({
  topbarTitle,
  breadcrumb,
  children,
}: LandlordPortalShellProps) {
  const router = useRouter();
  const { isHydrated, landlordSession } = useLandlordPortalSession();
  const [resolvedBranding, setResolvedBranding] = useState<WorkspaceBranding | null>(
    landlordSession?.landlord.branding ?? null,
  );

  useEffect(() => {
    if (isHydrated && !landlordSession) {
      void router.replace("/portal");
    }
  }, [isHydrated, landlordSession, router]);

  useEffect(() => {
    setResolvedBranding(landlordSession?.landlord.branding ?? null);
  }, [landlordSession?.landlord.branding]);

  useEffect(() => {
    if (!isHydrated || !landlordSession || typeof window === "undefined") {
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
  }, [isHydrated, landlordSession]);

  if (!isHydrated) {
    return (
      <div className="empty-state" style={{ minHeight: "100vh" }}>
        <h3>Loading your workspace.</h3>
        <p>Checking your DoorRent session.</p>
      </div>
    );
  }

  if (!landlordSession) {
    return null;
  }

  const isEstateWorkspace = landlordSession.landlord.workspaceMode === "ESTATE_ADMIN";

  if (isEstateWorkspace) {
    void router.replace("/estate");
    return null;
  }

  const landlordCapabilities = resolveLandlordCapabilities({
    capabilities: landlordSession.landlord.capabilities,
    subscriptionModel: landlordSession.landlord.subscriptionModel,
    plan: landlordSession.landlord.planKey ?? landlordSession.landlord.plan,
  });

  if (!canAccessLandlordPath(router.pathname, landlordCapabilities)) {
    void router.replace("/landlord");
    return null;
  }

  return (
    <AppShell
      user={{
        name: landlordSession.landlord.fullName,
        role:
          landlordSession.landlord.role === "team_member"
            ? (landlordSession.landlord.teamRole ?? "Workspace staff")
            : landlordSession.landlord.workspaceMode === "ESTATE_ADMIN"
              ? "Estate admin"
            : landlordSession.landlord.workspaceMode === "PROPERTY_MANAGER_COMPANY"
              ? "Workspace admin"
              : "Workspace owner",
        initials: initialsFromName(landlordSession.landlord.fullName),
      }}
      topbarTitle={topbarTitle}
      breadcrumb={breadcrumb}
      navSections={buildLandlordNav(landlordCapabilities)}
      branding={resolvedBranding ?? landlordSession.landlord.branding}
    >
      {children}
    </AppShell>
  );
}
