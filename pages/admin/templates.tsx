import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";

export default function AdminTemplatesPage() {
  return (
    <>
      <PageMeta title="DoorRent — Templates" />
      <AdminPortalShell topbarTitle="Templates" breadcrumb="Dashboard → Templates">
        <EmptyState title="Templates" />
      </AdminPortalShell>
    </>
  );
}
