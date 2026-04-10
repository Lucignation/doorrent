import {
  canAccessLandlordPath,
  resolveLandlordCapabilities,
  type LandlordCapabilities,
} from "./landlord-access";

export type EstateAdminCapabilities = LandlordCapabilities;

export function resolveEstateAdminCapabilities(input?: {
  capabilities?: Partial<EstateAdminCapabilities> | null;
  subscriptionModel?: string | null;
  plan?: string | null;
}) {
  return resolveLandlordCapabilities(input);
}

export function canAccessEstateAdminPath(
  path: string | undefined,
  capabilities: EstateAdminCapabilities,
) {
  return canAccessLandlordPath(path, capabilities);
}
