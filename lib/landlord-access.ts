export interface LandlordCapabilities {
  isBasicPlan: boolean;
  isProPlan: boolean;
  isEnterprisePlan: boolean;
  unitLimit: number | null;
  canManageProperties: boolean;
  canManageUnits: boolean;
  canManageTenants: boolean;
  canManageLeaseDates: boolean;
  canViewBasicOccupancy: boolean;
  canManageMeetings: boolean;
  canManageNotices: boolean;
  canViewNotifications: boolean;
  canManageAgreements: boolean;
  canManageAgreementTemplates: boolean;
  canResendAgreements: boolean;
  canExportAgreementPdfs: boolean;
  canViewWitnessSignatureDetails: boolean;
  canManagePayments: boolean;
  canRecordOfflinePayments: boolean;
  canAcceptOnlinePayments: boolean;
  canViewReceipts: boolean;
  canManageReminders: boolean;
  canManageRiskWorkflows: boolean;
  canManagePushNotifications: boolean;
  canViewReports: boolean;
  canManageCaretakers: boolean;
  canManageEmergency: boolean;
  canManageAccountUpdates: boolean;
  canDeleteAccount: boolean;
  canUseBiometricUnlock: boolean;
  canManageTeamMembers: boolean;
  canManageBranding: boolean;
  canUseBrandedSubdomain: boolean;
  canUseEnterpriseCollections: boolean;
}

function enterpriseCapabilities(): LandlordCapabilities {
  return {
    isBasicPlan: false,
    isProPlan: false,
    isEnterprisePlan: true,
    unitLimit: null,
    canManageProperties: true,
    canManageUnits: true,
    canManageTenants: true,
    canManageLeaseDates: true,
    canViewBasicOccupancy: true,
    canManageMeetings: true,
    canManageNotices: true,
    canViewNotifications: true,
    canManageAgreements: true,
    canManageAgreementTemplates: true,
    canResendAgreements: true,
    canExportAgreementPdfs: true,
    canViewWitnessSignatureDetails: true,
    canManagePayments: true,
    canRecordOfflinePayments: true,
    canAcceptOnlinePayments: true,
    canViewReceipts: true,
    canManageReminders: true,
    canManageRiskWorkflows: true,
    canManagePushNotifications: true,
    canViewReports: true,
    canManageCaretakers: true,
    canManageEmergency: true,
    canManageAccountUpdates: true,
    canDeleteAccount: true,
    canUseBiometricUnlock: true,
    canManageTeamMembers: true,
    canManageBranding: true,
    canUseBrandedSubdomain: true,
    canUseEnterpriseCollections: true,
  };
}

function proCapabilities(): LandlordCapabilities {
  return {
    ...enterpriseCapabilities(),
    isProPlan: true,
    isEnterprisePlan: false,
    canManageTeamMembers: false,
    canUseEnterpriseCollections: false,
  };
}

function basicCapabilities(): LandlordCapabilities {
  return {
    ...proCapabilities(),
    isBasicPlan: true,
    isProPlan: false,
    unitLimit: 5,
    canManageMeetings: false,
    canManageNotices: false,
    canManageAgreementTemplates: false,
    canViewWitnessSignatureDetails: false,
    canManageRiskWorkflows: false,
    canManagePushNotifications: false,
    canViewReports: false,
    canManageCaretakers: false,
    canManageEmergency: false,
    canDeleteAccount: true,
    canUseBiometricUnlock: true,
    canManageTeamMembers: false,
    canManageBranding: false,
    canUseBrandedSubdomain: false,
    canUseEnterpriseCollections: false,
  };
}

export function buildLandlordCapabilitiesFromPlan(input?: {
  subscriptionModel?: string | null;
  plan?: string | null;
}): LandlordCapabilities {
  if (input?.plan?.toUpperCase() === "ENTERPRISE") {
    return enterpriseCapabilities();
  }

  if (input?.subscriptionModel === "commission") {
    return proCapabilities();
  }

  return basicCapabilities();
}

export function resolveLandlordCapabilities(input?: {
  capabilities?: Partial<LandlordCapabilities> | null;
  subscriptionModel?: string | null;
  plan?: string | null;
}): LandlordCapabilities {
  return {
    ...buildLandlordCapabilitiesFromPlan({
      subscriptionModel: input?.subscriptionModel,
      plan: input?.plan,
    }),
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

  if (path.startsWith("/landlord/properties")) {
    return capabilities.canManageProperties;
  }

  if (path.startsWith("/landlord/units")) {
    return capabilities.canManageUnits;
  }

  if (path.startsWith("/landlord/tenants")) {
    return capabilities.canManageTenants;
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

  if (path.startsWith("/landlord/rent-defaults")) {
    return capabilities.canManageRiskWorkflows;
  }

  if (path.startsWith("/landlord/meetings")) {
    return capabilities.canManageMeetings;
  }

  if (path.startsWith("/landlord/notifications")) {
    return capabilities.canViewNotifications;
  }

  if (path.startsWith("/landlord/reports")) {
    return capabilities.canViewReports;
  }

  if (path.startsWith("/landlord/caretakers")) {
    return capabilities.canManageCaretakers;
  }

  if (path.startsWith("/landlord/notices")) {
    return capabilities.canManageNotices;
  }

  if (path.startsWith("/landlord/emergency")) {
    return capabilities.canManageEmergency;
  }

  if (path.startsWith("/landlord/settings")) {
    return (
      capabilities.canManageAccountUpdates ||
      capabilities.canManageTeamMembers ||
      capabilities.canManageBranding ||
      capabilities.canManageCaretakers ||
      capabilities.canManageEmergency ||
      capabilities.canDeleteAccount ||
      capabilities.canUseBiometricUnlock
    );
  }

  return true;
}
