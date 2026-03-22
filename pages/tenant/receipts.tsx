import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";

export default function TenantReceiptsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Receipts" />
      <TenantPortalShell topbarTitle="Receipts" breadcrumb="Dashboard → Receipts">
        <EmptyState title="Receipts" />
      </TenantPortalShell>
    </>
  );
}
