import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import AppShell from "../layout/AppShell";
import type { NavItem, NavSection } from "../../types/app";

const residentBaseNav: NavSection[] = [
  {
    section: "Resident",
    items: [
      { label: "Overview", href: "/resident", icon: "grid" },
      { label: "My Dues", href: "/resident/dues", icon: "card" },
      { label: "Meetings", href: "/resident/meetings", icon: "clock" },
      { label: "Contributions", href: "/resident/contributions", icon: "chart" },
      { label: "My Pass", href: "/resident/pass", icon: "doc" },
      { label: "Governance", href: "/resident/governance", icon: "users" },
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

interface ResidentOfficeAccess {
  offices: Array<{
    id: string;
    position: string;
    tenureStartDate: string;
    tenureEndDate: string;
  }>;
  permissions: string[];
}

export default function ResidentPortalShell({ topbarTitle, breadcrumb, children }: ResidentPortalShellProps) {
  const router = useRouter();
  const { isHydrated, residentSession } = useResidentPortalSession();
  const [officeAccess, setOfficeAccess] = useState<ResidentOfficeAccess | null>(null);

  useEffect(() => {
    const token = residentSession?.token;

    if (!token) {
      setOfficeAccess(null);
      return;
    }

    let cancelled = false;

    apiRequest<ResidentOfficeAccess>("/resident/office-access", { token })
      .then(({ data }) => {
        if (!cancelled) {
          setOfficeAccess(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOfficeAccess(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [residentSession?.token]);

  useEffect(() => {
    if (isHydrated && !residentSession) {
      void router.replace("/resident/login");
    }
  }, [isHydrated, residentSession, router]);

  const navSections = useMemo(() => {
    const permissions = officeAccess?.permissions ?? [];
    const officeItems: NavItem[] = [];

    if (permissions.includes("finance_overview")) {
      officeItems.push({
        label: permissions.includes("finance_management")
          ? "Finance Office"
          : "Finance Overview",
        href: "/resident/office/finance",
        icon: "card",
      });
    }

    if (permissions.includes("treasury_overview")) {
      officeItems.push({
        label: "Treasury Overview",
        href: "/resident/office/treasury",
        icon: "receipt",
      });
    }

    if (permissions.includes("gate_coordination")) {
      officeItems.push({
        label: "Gate Console",
        href: "/resident/office/gate",
        icon: "shield",
      });
    }

    if (permissions.includes("meetings_overview")) {
      officeItems.push({
        label: permissions.includes("meetings_management")
          ? "Meetings Office"
          : "Meetings Overview",
        href: "/resident/office/meetings",
        icon: "clock",
      });
    }

    if (permissions.includes("governance_management")) {
      officeItems.push({
        label: "ExCo & Elections",
        href: "/resident/office/exco",
        icon: "users",
      });
    }

    if (permissions.includes("governance_overview")) {
      officeItems.push({
        label: "Governance Overview",
        href: "/resident/office/governance",
        icon: "users",
      });
    }

    if (!officeItems.length) {
      return residentBaseNav;
    }

    return [
      ...residentBaseNav,
      {
        section: "Office",
        items: officeItems,
      },
    ] satisfies NavSection[];
  }, [officeAccess]);

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
      navSections={navSections}
      branding={residentSession.resident.branding}
    >
      {children}
    </AppShell>
  );
}
