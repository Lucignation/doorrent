import type { ReactNode } from "react";
import { useState } from "react";
import type { AppUser, NavSection } from "../../types/app";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AppShellProps {
  user: AppUser;
  topbarTitle: string;
  breadcrumb: string;
  navSections: NavSection[];
  children: ReactNode;
}

export default function AppShell({
  user,
  topbarTitle,
  breadcrumb,
  navSections,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-page">
      <div className="app-layout">
        <Sidebar
          user={user}
          navSections={navSections}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />
        <div className="main-area">
          <Topbar
            title={topbarTitle}
            breadcrumb={breadcrumb}
            initials={user.initials}
            onToggleSidebar={() => setMobileOpen((open) => !open)}
          />
          <main className="content-area">{children}</main>
        </div>
      </div>
    </div>
  );
}
