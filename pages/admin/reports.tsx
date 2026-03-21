import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { adminNav, adminUser } from "../../data/admin";

export default function AdminReportsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Reports & Analytics" />
      <AppShell
        user={adminUser}
        topbarTitle="Reports & Analytics"
        breadcrumb="Dashboard → Reports & Analytics"
        navSections={adminNav}
      >
        <EmptyState title="Reports & Analytics" />
      </AppShell>
    </>
  );
}
