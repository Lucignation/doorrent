import { useRouter } from "next/router";
import { useEffect } from "react";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import AppShell from "../layout/AppShell";
import type { NavSection } from "../../types/app";

const residentNav: NavSection[] = [
  {
    section: "Resident",
    items: [
      { label: "Overview", href: "/resident", icon: "grid" },
      { label: "My Dues", href: "/resident/dues", icon: "card" },
      { label: "Contributions", href: "/resident/contributions", icon: "chart" },
      { label: "My Pass", href: "/resident/pass", icon: "doc" },
      { label: "Notifications", href: "/resident/notifications", icon: "log" },
    ],
  },
];

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface ResidentPortalShellProps {
  topbarTitle: string;
  breadcrumb: string;
  children: React.ReactNode;
}

export default function ResidentPortalShell({ topbarTitle, breadcrumb, children }: ResidentPortalShellProps) {
  const router = useRouter();
  const { isHydrated, residentSession } = useResidentPortalSession();

  useEffect(() => {
    if (isHydrated && !residentSession) {
      void router.replace("/resident/login");
    }
  }, [isHydrated, residentSession, router]);

  if (!isHydrated) {
    return (
      <div className="empty-state" style={{ minHeight: "100vh" }}>
        <h3>Loading your resident portal.</h3>
        <p>Checking your session.</p>
      </div>
    );
  }

  if (!residentSession) {
    return null;
  }

  return (
    <AppShell
      user={{
        name: residentSession.resident.fullName,
        role: `House ${residentSession.resident.houseNumber}`,
        initials: initialsFromName(residentSession.resident.fullName),
      }}
      topbarTitle={topbarTitle}
      breadcrumb={breadcrumb}
      navSections={residentNav}
      branding={residentSession.resident.branding}
    >
      {children}
    </AppShell>
  );
}
