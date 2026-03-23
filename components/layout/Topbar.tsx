import Link from "next/link";
import { useRouter } from "next/router";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { BellIcon, MenuIcon, MessageIcon } from "../ui/Icons";

interface TopbarProps {
  title: string;
  breadcrumb: string;
  initials: string;
  onToggleSidebar: () => void;
}

export default function Topbar({
  title,
  breadcrumb,
  initials,
  onToggleSidebar,
}: TopbarProps) {
  const { openModal, showToast } = usePrototypeUI();
  const router = useRouter();
  const {
    clearAdminSession,
    clearCaretakerSession,
    clearLandlordSession,
    clearTenantSession,
  } = useTenantPortalSession();

  const isTenantRoute = router.pathname.startsWith("/tenant");
  const isAdminRoute = router.pathname.startsWith("/admin");
  const isCaretakerRoute = router.pathname.startsWith("/caretaker");
  const signOutHref = isTenantRoute
    ? "/tenant/login"
    : isAdminRoute
      ? "/admin/login"
      : isCaretakerRoute
        ? "/caretaker/login"
      : "/portal";
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn sidebar-toggle" onClick={onToggleSidebar} type="button">
          <MenuIcon />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-breadcrumb">{breadcrumb}</div>
        </div>
      </div>

      <div className="topbar-right">
        <button type="button" className="icon-btn" onClick={() => showToast("No new messages", "info")}>
          <MessageIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            openModal("notifications");
          }}
        >
          <BellIcon />
          <div className="dot" />
        </button>
        <div
          className="user-avatar"
          style={{ cursor: "pointer" }}
          onClick={() => showToast("Profile settings coming soon", "info")}
        >
          {initials}
        </div>
        <Link
          href={signOutHref}
          className="btn btn-ghost btn-sm"
          onClick={() => {
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

            clearLandlordSession();
          }}
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}
