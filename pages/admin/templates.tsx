import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import { adminNav, adminUser } from "../../data/admin";

export default function AdminTemplatesPage() {
  return (
    <>
      <PageMeta title="DoorRent — Templates" />
      <AppShell
        user={adminUser}
        topbarTitle="Templates"
        breadcrumb="Dashboard → Templates"
        navSections={adminNav}
      >
        <EmptyState title="Templates" />
      </AppShell>
    </>
  );
}
