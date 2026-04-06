import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { buildEstateNav } from "../../data/estate";
import {
  useLandlordPortalSession,
} from "../../context/TenantSessionContext";
import type { WorkspaceBranding } from "../../lib/branding";
import AppShell from "../layout/AppShell";
import { resolveLandlordCapabilities } from "../../lib/landlord-access";
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
    if (
      isHydrated &&
      landlordSession &&
      landlordSession.landlord.workspaceMode !== "ESTATE_ADMIN"
    ) {
      void router.replace("/landlord");
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
        <h3>Loading your estate workspace.</h3>
        <p>Checking your DoorRent session.</p>
      </div>
    );
  }

  if (!landlordSession || landlordSession.landlord.workspaceMode !== "ESTATE_ADMIN") {
    return null;
  }

  const capabilities = resolveLandlordCapabilities({
    capabilities: landlordSession.landlord.capabilities,
    subscriptionModel: landlordSession.landlord.subscriptionModel,
    plan: landlordSession.landlord.planKey ?? landlordSession.landlord.plan,
  });

  return (
    <AppShell
      user={{
        name: landlordSession.landlord.fullName,
        role:
          landlordSession.landlord.role === "team_member"
            ? (landlordSession.landlord.teamRole ?? "Estate staff")
            : "Estate admin",
        initials: initialsFromName(landlordSession.landlord.fullName),
      }}
      topbarTitle={topbarTitle}
      breadcrumb={breadcrumb}
      navSections={buildEstateNav(capabilities)}
      branding={resolvedBranding ?? landlordSession.landlord.branding}
    >
      {children}
    </AppShell>
  );
}
