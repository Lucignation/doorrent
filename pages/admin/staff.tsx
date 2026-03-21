import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { adminNav, adminUser } from "../../data/admin";

export default function AdminStaffPage() {
  return (
    <>
      <PageMeta title="DoorRent — Staff & Roles" />
      <AppShell
        user={adminUser}
        topbarTitle="Staff & Roles"
        breadcrumb="Dashboard → Staff & Roles"
        navSections={adminNav}
      >
        <EmptyState title="Staff & Roles" />
      </AppShell>
    </>
  );
}
