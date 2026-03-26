import Link from "next/link";
import { useRouter } from "next/router";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { LOGO_PATH } from "../../lib/site";
import type { WorkspaceBranding } from "../../lib/branding";
import { resolveBrandDisplayName } from "../../lib/branding";
import type { AppUser, NavSection } from "../../types/app";
import { NavIcon } from "../ui/Icons";

function isActivePath(currentPath: string, href: string): boolean {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

interface SidebarProps {
  user: AppUser;
  navSections: NavSection[];
  branding?: WorkspaceBranding | null;
  mobileOpen: boolean;
  onNavigate: () => void;
}

export default function Sidebar({
  user,
  navSections,
  branding,
  mobileOpen,
  onNavigate,
}: SidebarProps) {
  const router = useRouter();
  const {
    clearAdminSession,
    clearCaretakerSession,
    clearLandlordSession,
    clearTenantSession,
  } = useTenantPortalSession();
  const homeHref = navSections[0]?.items[0]?.href ?? "/";
  const isTenantRoute = router.pathname.startsWith("/tenant");
  const isLandlordRoute = router.pathname.startsWith("/landlord");
  const isAdminRoute = router.pathname.startsWith("/admin");
  const isCaretakerRoute = router.pathname.startsWith("/caretaker");
  const signOutHref = isTenantRoute
    ? "/tenant/login"
    : isAdminRoute
      ? "/admin/login"
      : isCaretakerRoute
        ? "/caretaker/login"
        : "/portal";

  function handleSignOut() {
    onNavigate();

    if (isTenantRoute) {
      clearTenantSession();
      return;
    }

    if (isAdminRoute) {
      clearAdminSession();
      return;
    }

    if (isCaretakerRoute) {
      clearCaretakerSession();
      return;
    }

    if (isLandlordRoute) {
      clearLandlordSession();
      return;
    }

    clearLandlordSession();
  }

  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-header">
        <Link href={homeHref} className="sidebar-logo" onClick={onNavigate}>
          <img
            src={branding?.logoUrl || LOGO_PATH}
            alt={`${resolveBrandDisplayName(branding, "DoorRent")} logo`}
            className="logo-image"
          />
          <span className="logo-name">
            {resolveBrandDisplayName(branding, "DoorRent")}
          </span>
        </Link>
        <button
          type="button"
          className="sidebar-close"
          aria-label="Close sidebar"
          onClick={onNavigate}
        >
          ×
        </button>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`nav-item ${
                  isActivePath(router.pathname, item.href) ? "active" : ""
                }`}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
                {item.badge ? (
                  <span className={`nav-badge ${item.badgeClass || ""}`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{user.initials}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
        <Link href={signOutHref} className="sidebar-signout" onClick={handleSignOut}>
          Sign out
        </Link>
      </div>
    </aside>
  );
}
