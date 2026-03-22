import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";

export default function AdminSubscriptionsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Subscriptions" />
      <AdminPortalShell topbarTitle="Subscriptions" breadcrumb="Dashboard → Subscriptions">
        <EmptyState title="Subscriptions" />
      </AdminPortalShell>
    </>
  );
}
