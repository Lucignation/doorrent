import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";

export default function AdminTransactionsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Transactions" />
      <AdminPortalShell topbarTitle="Transactions" breadcrumb="Dashboard → Transactions">
        <EmptyState title="Transactions" />
      </AdminPortalShell>
    </>
  );
}
