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
      { label: "Houses & Residents", href: "/estate?module=dues", icon: "home" },
      { label: "Estate Dues", href: "/estate?module=dues", icon: "card" },
      { label: "Treasury", href: "/estate?module=treasury", icon: "receipt" },
      { label: "Contributions", href: "/estate?module=contributions", icon: "chart" },
      { label: "Workers", href: "/estate?module=workforce", icon: "users" },
      { label: "Pass Centre", href: "/estate?module=passes", icon: "doc" },
      { label: "Governance", href: "/estate?module=governance", icon: "log" },
      { label: "Landing Page", href: "/estate?module=landing", icon: "settings" },
    ],
  },
  {
    section: "Account",
    items: [
      { label: "Audit Log", href: "/landlord/audit", icon: "log" },
      { label: "Settings", href: "/landlord/settings", icon: "settings" },
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
        if (item.href === "/landlord/audit") {
          return (
            resolved.canManageTeamMembers === true ||
            (
              resolved.canDeleteAccount === true &&
              resolved.canManageAccountUpdates === true
            )
          );
        }

        if (item.href === "/landlord/settings") {
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
