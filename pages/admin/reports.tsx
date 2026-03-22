import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";

export default function AdminReportsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Reports & Analytics" />
      <AdminPortalShell
        topbarTitle="Reports & Analytics"
        breadcrumb="Dashboard → Reports & Analytics"
      >
        <EmptyState title="Reports & Analytics" />
      </AdminPortalShell>
    </>
  );
}
