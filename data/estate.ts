import type { NavSection } from "../types/app";
import {
  resolveEstateAdminCapabilities,
  type EstateAdminCapabilities,
} from "../lib/estate-admin-access";

const estateNavSections: NavSection[] = [
  {
    section: "Estate",
    items: [
      { label: "Overview", href: "/estate", icon: "grid" },
      { label: "Houses & Residents", href: "/estate/houses", icon: "home" },
      { label: "Estate Dues", href: "/estate/dues", icon: "card" },
      { label: "Meetings", href: "/estate/meetings", icon: "clock" },
      { label: "Treasury", href: "/estate/treasury", icon: "receipt" },
      { label: "Contributions", href: "/estate/contributions", icon: "chart" },
      { label: "Workers", href: "/estate/workforce", icon: "users" },
      { label: "Gate Console", href: "/estate/gate", icon: "shield" },
      { label: "Pass Centre", href: "/estate/passes", icon: "doc" },
      { label: "Governance", href: "/estate/governance", icon: "log" },
      { label: "ExCo & Elections", href: "/estate/exco", icon: "users" },
      { label: "Landing Page Builder", href: "/estate/landing", icon: "settings" },
    ],
  },
  {
    section: "Account",
    items: [
      { label: "Audit Log", href: "/estate/audit", icon: "log" },
      { label: "Settings", href: "/estate/settings", icon: "settings" },
    ],
  },
];

export function buildEstateNav(
  capabilities?: Partial<EstateAdminCapabilities> | null,
) {
  const resolved = resolveEstateAdminCapabilities({ capabilities });

  return estateNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.href === "/estate/audit") {
          return (
            resolved.canManageTeamMembers === true ||
            (
              resolved.canDeleteAccount === true &&
              resolved.canManageAccountUpdates === true
            )
          );
        }

        if (item.href === "/estate/settings") {
          return (
            resolved.canManageAccountUpdates ||
            resolved.canManageTeamMembers ||
            resolved.canManageBranding ||
            resolved.canManageEmergency ||
            resolved.canDeleteAccount ||
            resolved.canUseBiometricUnlock
          );
        }

        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export const estateNav = buildEstateNav();
