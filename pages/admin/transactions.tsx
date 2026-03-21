import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { adminNav, adminUser } from "../../data/admin";

export default function AdminTransactionsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Transactions" />
      <AppShell
        user={adminUser}
        topbarTitle="Transactions"
        breadcrumb="Dashboard → Transactions"
        navSections={adminNav}
      >
        <EmptyState title="Transactions" />
      </AppShell>
    </>
  );
}
