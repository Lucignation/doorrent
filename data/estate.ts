import type { NavSection } from "../types/app";
import {
  resolveLandlordCapabilities,
  type LandlordCapabilities,
} from "../lib/landlord-access";

const estateNavSections: NavSection[] = [
  {
    section: "Estate",
    items: [
      { label: "Overview", href: "/estate", icon: "grid" },
      { label: "Houses & Residents", href: "/estate/houses", icon: "home" },
      { label: "Estate Dues", href: "/estate/dues", icon: "card" },
      { label: "Treasury", href: "/estate/treasury", icon: "receipt" },
      { label: "Contributions", href: "/estate/contributions", icon: "chart" },
      { label: "Workers", href: "/estate/workforce", icon: "users" },
      { label: "Pass Centre", href: "/estate/passes", icon: "doc" },
      { label: "Governance", href: "/estate/governance", icon: "log" },
      { label: "Landing Page", href: "/estate/landing", icon: "settings" },
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
  capabilities?: Partial<LandlordCapabilities> | null,
) {
  const resolved = resolveLandlordCapabilities({ capabilities });

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
