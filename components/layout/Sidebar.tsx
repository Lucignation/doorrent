import { MenuIcon } from "../ui/Icons";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { LOGO_PATH } from "../../lib/site";
import type { WorkspaceBranding } from "../../lib/branding";
import { resolveBrandDisplayName, resolveBrandLogoUrl } from "../../lib/branding";
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
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
}

export default function Sidebar({
  user,
  navSections,
  branding,
  mobileOpen,
  collapsed,
  onToggleCollapse,
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
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const signOutHref = isTenantRoute
    ? "/tenant/login"
    : isAdminRoute
      ? "/admin/login"
      : isCaretakerRoute
        ? "/caretaker/login"
        : "/portal";
  const brandName = resolveBrandDisplayName(branding, "DoorRent");
  const customBrandLogoUrl = resolveBrandLogoUrl(branding, "");
  const hasCustomLogo = Boolean(customBrandLogoUrl) && !logoLoadFailed;
  const brandLogoUrl = hasCustomLogo ? customBrandLogoUrl : LOGO_PATH;
  const brandInitials = brandName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [customBrandLogoUrl]);

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
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}${collapsed ? " is-collapsed" : ""}`}>
      <div className="sidebar-header">
        <Link
          href={homeHref}
          className="sidebar-logo"
          onClick={onNavigate}
          title={brandName}
          aria-label={brandName}
        >
          <span className="sidebar-logo-frame">
            {hasCustomLogo ? (
              <img
                src={brandLogoUrl}
                alt={`${brandName} logo`}
                className="logo-image"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : (
              <span className="logo-mark" aria-hidden="true">
                {brandInitials || "DR"}
              </span>
            )}
          </span>
          <span className="logo-name">
            {brandName}
          </span>
        </Link>
        <button
          type="button"
          className="sidebar-collapse"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
        >
          <MenuIcon />
        </button>
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
                title={item.label}
                aria-label={item.label}
                className={`nav-item ${
                  isActivePath(router.pathname, item.href) ? "active" : ""
                }`}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} />
                </span>
                <span className="nav-item-label">{item.label}</span>
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
        <Link
          href={signOutHref}
          className="sidebar-signout"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <span className="sidebar-signout-label">{collapsed ? "Out" : "Sign out"}</span>
        </Link>
      </div>
    </aside>
  );
}
