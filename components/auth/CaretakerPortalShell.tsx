import { useRouter } from "next/router";
import { useEffect } from "react";
import { useCaretakerPortalSession } from "../../context/TenantSessionContext";
import { caretakerNav } from "../../data/caretaker";
import AppShell from "../layout/AppShell";

interface CaretakerPortalShellProps {
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

export default function CaretakerPortalShell({
  topbarTitle,
  breadcrumb,
  children,
}: CaretakerPortalShellProps) {
  const router = useRouter();
  const { isHydrated, caretakerSession } = useCaretakerPortalSession();

  useEffect(() => {
    if (isHydrated && !caretakerSession) {
      void router.replace("/caretaker/login");
    }
  }, [caretakerSession, isHydrated, router]);

  if (!isHydrated) {
    return (
      <div className="tenant-access-state">
        <div className="tenant-access-card">
          <h2>Checking your caretaker session</h2>
          <p>Loading your DoorRent caretaker workspace.</p>
        </div>
      </div>
    );
  }

  if (!caretakerSession) {
    return null;
  }

  return (
    <AppShell
      user={{
        name: caretakerSession.caretaker.contactName,
        role: caretakerSession.caretaker.organizationName,
        initials: initialsFromName(caretakerSession.caretaker.contactName),
      }}
      topbarTitle={topbarTitle}
      breadcrumb={breadcrumb}
      navSections={caretakerNav}
    >
      {children}
    </AppShell>
  );
}
