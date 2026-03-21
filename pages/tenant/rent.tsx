import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { tenantNav, tenantUser } from "../../data/tenant";

export default function TenantRentPage() {
  return (
    <>
      <PageMeta title="DoorRent — My Rent" />
      <AppShell
        user={tenantUser}
        topbarTitle="My Rent"
        breadcrumb="Dashboard → My Rent"
        navSections={tenantNav}
      >
        <EmptyState title="My Rent" />
      </AppShell>
    </>
  );
}
