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
      </div>
    </header>
  );
}
