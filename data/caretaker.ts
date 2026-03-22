import type { NavSection } from "../types/app";

export const caretakerNav: NavSection[] = [
  {
    section: "Workspace",
    items: [
      { label: "Overview", href: "/caretaker", icon: "grid" },
      { label: "Properties", href: "/caretaker/properties", icon: "building" },
      { label: "Notices", href: "/caretaker/notices", icon: "doc" },
      { label: "Reports", href: "/caretaker/reports", icon: "chart" },
      { label: "Notifications", href: "/caretaker/notifications", icon: "bell" },
    ],
  },
];
