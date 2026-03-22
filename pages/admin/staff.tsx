import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";

export default function AdminStaffPage() {
  return (
    <>
      <PageMeta title="DoorRent — Staff & Roles" />
      <AdminPortalShell topbarTitle="Staff & Roles" breadcrumb="Dashboard → Staff & Roles">
        <EmptyState title="Staff & Roles" />
      </AdminPortalShell>
    </>
  );
}
