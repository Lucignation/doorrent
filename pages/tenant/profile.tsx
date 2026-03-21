import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { tenantNav, tenantUser } from "../../data/tenant";

export default function TenantProfilePage() {
  return (
    <>
      <PageMeta title="DoorRent — Profile" />
      <AppShell
        user={tenantUser}
        topbarTitle="Profile"
        breadcrumb="Dashboard → Profile"
        navSections={tenantNav}
      >
        <EmptyState title="Profile" />
      </AppShell>
    </>
  );
}
