import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { adminNav, adminUser } from "../../data/admin";

export default function AdminSubscriptionsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Subscriptions" />
      <AppShell
        user={adminUser}
        topbarTitle="Subscriptions"
        breadcrumb="Dashboard → Subscriptions"
        navSections={adminNav}
      >
        <EmptyState title="Subscriptions" />
      </AppShell>
    </>
  );
}
