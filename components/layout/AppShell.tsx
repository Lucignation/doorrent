import type { ReactNode } from "react";
import { useState } from "react";
import type { WorkspaceBranding } from "../../lib/branding";
import { buildBrandShellStyle } from "../../lib/branding";
import type { AppUser, NavSection } from "../../types/app";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AppShellProps {
  user: AppUser;
  topbarTitle: string;
  breadcrumb: string;
  navSections: NavSection[];
  branding?: WorkspaceBranding | null;
  children: ReactNode;
}

export default function AppShell({
  user,
  topbarTitle,
  breadcrumb,
  navSections,
  branding,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-page" style={buildBrandShellStyle(branding)}>
      <div className="app-layout">
        <Sidebar
          user={user}
          navSections={navSections}
          branding={branding}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />
        {mobileOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
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
      <style jsx>{`
        .sidebar-backdrop {
          display: none;
        }
        @media (max-width: 768px) {
          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 49;
          }
        }
      `}</style>
    </div>
  );
}
