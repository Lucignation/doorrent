import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";

export default function TenantProfilePage() {
  return (
    <>
      <PageMeta title="DoorRent — Profile" />
      <TenantPortalShell topbarTitle="Profile" breadcrumb="Dashboard → Profile">
        <EmptyState title="Profile" />
      </TenantPortalShell>
    </>
  );
}
