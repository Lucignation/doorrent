import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { tenantNav, tenantUser } from "../../data/tenant";

export default function TenantReceiptsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Receipts" />
      <AppShell
        user={tenantUser}
        topbarTitle="Receipts"
        breadcrumb="Dashboard → Receipts"
        navSections={tenantNav}
      >
        <EmptyState title="Receipts" />
      </AppShell>
    </>
  );
}
