import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { tenantNav } from "../../data/tenant";
import AppShell from "../layout/AppShell";

interface TenantPortalShellProps {
  topbarTitle: string;
  breadcrumb: string;
  children: ReactNode;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TenantPortalShell({
  topbarTitle,
  breadcrumb,
  children,
}: TenantPortalShellProps) {
  const router = useRouter();
  const { isHydrated, tenantSession } = useTenantPortalSession();

  useEffect(() => {
    if (isHydrated && !tenantSession) {
      void router.replace("/tenant/login");
    }
  }, [isHydrated, router, tenantSession]);

  if (!isHydrated) {
    return (
      <div className="tenant-access-state">
        <div className="tenant-access-card">
          <h2>Checking your tenant session</h2>
          <p>Loading your DoorRent portal access.</p>
        </div>
      </div>
    );
  }

  if (!tenantSession) {
    return (
      <div className="tenant-access-state">
        <div className="tenant-access-card">
          <h2>Tenant sign-in required</h2>
          <p>Use the one-time code or magic link your landlord sent to your email.</p>
          <Link href="/tenant/login" className="btn btn-primary">
            Go to tenant sign-in
          </Link>
        </div>
      </div>
    );
  }

  const user = {
    name: tenantSession.tenant.fullName,
    role: `Tenant${tenantSession.tenant.unitNumber ? ` · Unit ${tenantSession.tenant.unitNumber}` : ""}`,
    initials: initialsFromName(tenantSession.tenant.fullName),
  };

  return (
    <AppShell
      user={user}
      topbarTitle={topbarTitle}
      breadcrumb={breadcrumb}
      navSections={tenantNav}
    >
      {children}
    </AppShell>
  );
}
