import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { adminNav, adminUser } from "../../data/admin";

export default function AdminPropertiesPage() {
  return (
    <>
      <PageMeta title="DoorRent — All Properties" />
      <AppShell
        user={adminUser}
        topbarTitle="All Properties"
        breadcrumb="Dashboard → All Properties"
        navSections={adminNav}
      >
        <EmptyState title="All Properties" />
      </AppShell>
    </>
  );
}
