import Link from "next/link";
import { useRouter } from "next/router";
import { LOGO_PATH } from "../../lib/site";
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
  mobileOpen: boolean;
  onNavigate: () => void;
}

export default function Sidebar({
  user,
  navSections,
  mobileOpen,
  onNavigate,
}: SidebarProps) {
  const router = useRouter();
  const homeHref = navSections[0]?.items[0]?.href ?? "/";

  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-header">
        <Link href={homeHref} className="sidebar-logo" onClick={onNavigate}>
          <img src={LOGO_PATH} alt="DoorRent logo" className="logo-image" />
          <span className="logo-name">DoorRent</span>
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

      <div className="sidebar-user">
        <div className="user-avatar">{user.initials}</div>
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role}</div>
        </div>
      </div>
    </aside>
  );
}
