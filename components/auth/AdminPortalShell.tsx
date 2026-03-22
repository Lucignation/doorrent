import { useRouter } from "next/router";
import { useEffect } from "react";
import { adminNav } from "../../data/admin";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import AppShell from "../layout/AppShell";

interface AdminPortalShellProps {
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

export default function AdminPortalShell({
  topbarTitle,
  breadcrumb,
  children,
}: AdminPortalShellProps) {
  const router = useRouter();
  const { adminSession, isHydrated } = useAdminPortalSession();

  useEffect(() => {
    if (isHydrated && !adminSession) {
      void router.replace("/admin/login");
    }
  }, [adminSession, isHydrated, router]);

  if (!isHydrated) {
    return (
      <div className="empty-state" style={{ minHeight: "100vh" }}>
        <h3>Loading your admin workspace.</h3>
        <p>Checking your DoorRent session.</p>
      </div>
    );
  }

  if (!adminSession) {
    return null;
  }

  return (
    <AppShell
      user={{
        name: adminSession.superAdmin.fullName,
        role: "Super Admin",
        initials: initialsFromName(adminSession.superAdmin.fullName),
      }}
      topbarTitle={topbarTitle}
      breadcrumb={breadcrumb}
      navSections={adminNav}
    >
      {children}
    </AppShell>
  );
}
