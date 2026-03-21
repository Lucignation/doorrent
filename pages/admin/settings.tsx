import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { adminNav, adminUser } from "../../data/admin";

export default function AdminSettingsPage() {
  return (
    <>
      <PageMeta title="DoorRent — System Settings" />
      <AppShell
        user={adminUser}
        topbarTitle="System Settings"
        breadcrumb="Dashboard → System Settings"
        navSections={adminNav}
      >
        <EmptyState title="System Settings" />
      </AppShell>
    </>
  );
}
