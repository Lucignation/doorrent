import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";

export default function TenantRentPage() {
  return (
    <>
      <PageMeta title="DoorRent — My Rent" />
      <TenantPortalShell topbarTitle="My Rent" breadcrumb="Dashboard → My Rent">
        <EmptyState title="My Rent" />
      </TenantPortalShell>
    </>
  );
}
