import { useRouter } from "next/router";
import { useEffect } from "react";
import { buildLandlordNav } from "../../data/landlord";
import {
  useLandlordPortalSession,
} from "../../context/TenantSessionContext";
import AppShell from "../layout/AppShell";
import { resolveLandlordCapabilities } from "../../lib/landlord-access";

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

  useEffect(() => {
    if (isHydrated && !landlordSession) {
      void router.replace("/portal");
    }
  }, [isHydrated, landlordSession, router]);

  if (!isHydrated) {
    return (
      <div className="empty-state" style={{ minHeight: "100vh" }}>
        <h3>Loading your landlord workspace.</h3>
        <p>Checking your DoorRent session.</p>
      </div>
    );
  }

  if (!landlordSession) {
    return null;
  }

  const landlordCapabilities = resolveLandlordCapabilities({
    capabilities: landlordSession.landlord.capabilities,
    subscriptionModel: landlordSession.landlord.subscriptionModel,
  });

  return (
    <AppShell
      user={{
        name: landlordSession.landlord.fullName,
        role: "Landlord",
        initials: initialsFromName(landlordSession.landlord.fullName),
      }}
      topbarTitle={topbarTitle}
      breadcrumb={breadcrumb}
      navSections={buildLandlordNav(landlordCapabilities)}
    >
      {children}
    </AppShell>
  );
}
