export interface LandlordCapabilities {
  isBasicPlan: boolean;
  isFullServicePlan: boolean;
  canManageProperties: boolean;
  canManageUnits: boolean;
  canManageTenants: boolean;
  canManageMeetings: boolean;
  canManageNotices: boolean;
  canViewNotifications: boolean;
  canManageAgreements: boolean;
  canManagePayments: boolean;
  canViewReceipts: boolean;
  canManageReminders: boolean;
  canViewReports: boolean;
  canManageCaretakers: boolean;
  canManageAccountUpdates: boolean;
  canManageTeamMembers: boolean;
}

function fullServiceCapabilities(): LandlordCapabilities {
  return {
    isBasicPlan: false,
    isFullServicePlan: true,
    canManageProperties: true,
    canManageUnits: true,
    canManageTenants: true,
    canManageMeetings: true,
    canManageNotices: true,
    canViewNotifications: true,
    canManageAgreements: true,
    canManagePayments: true,
    canViewReceipts: true,
    canManageReminders: true,
    canViewReports: true,
    canManageCaretakers: true,
    canManageAccountUpdates: true,
    canManageTeamMembers: true,
  };
}

export function buildLandlordCapabilitiesFromSubscriptionModel(
  subscriptionModel?: string | null,
): LandlordCapabilities {
  if (subscriptionModel === "subscription") {
    return {
      ...fullServiceCapabilities(),
      isBasicPlan: true,
      isFullServicePlan: false,
      canManageAgreements: false,
      canManagePayments: false,
      canViewReceipts: false,
      canManageReminders: false,
      canViewReports: false,
      canManageCaretakers: false,
      canManageAccountUpdates: false,
      canManageTeamMembers: false,
    };
  }

  return fullServiceCapabilities();
}

export function resolveLandlordCapabilities(input?: {
  capabilities?: Partial<LandlordCapabilities> | null;
  subscriptionModel?: string | null;
}): LandlordCapabilities {
  return {
    ...buildLandlordCapabilitiesFromSubscriptionModel(input?.subscriptionModel),
    ...(input?.capabilities ?? {}),
  };
}

export function canAccessLandlordPath(
  path: string | undefined,
  capabilities: LandlordCapabilities,
) {
  if (!path) {
    return true;
  }

  if (path.startsWith("/landlord/agreements")) {
    return capabilities.canManageAgreements;
  }

  if (path.startsWith("/landlord/payments")) {
    return capabilities.canManagePayments;
  }

  if (path.startsWith("/landlord/receipts")) {
    return capabilities.canViewReceipts;
  }

  if (path.startsWith("/landlord/reminders")) {
    return capabilities.canManageReminders;
  }

  if (path.startsWith("/landlord/reports")) {
    return capabilities.canViewReports;
  }

  if (path.startsWith("/landlord/caretakers")) {
    return capabilities.canManageCaretakers;
  }

  return true;
}
