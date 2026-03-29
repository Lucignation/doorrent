import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.QA_MOCK_API_PORT || 4100);

const marketingOverview = {
  authStats: [
    { label: 'Properties managed', value: '12,000+' },
    { label: 'Rent collected', value: '₦4.2B+' },
    { label: 'Platform uptime', value: '98.3%' },
    { label: 'Active landlords', value: '5,200+' },
  ],
  authActivity: [
    {
      title: 'Rent received',
      subtitle: 'Chidinma Eze · ₦320,000',
      time: '2m ago',
      tone: 'success',
    },
    {
      title: 'Agreement signed',
      subtitle: 'Kelechi Dike · Unit B2, Lekki',
      time: '18m ago',
      tone: 'gold',
    },
  ],
};

const workspaces = {
  'lekki.localhost': {
    id: 'ws_lekki',
    companyName: 'Lekki Property Holdings Ltd',
    workspaceMode: 'PROPERTY_MANAGER_COMPANY',
    workspaceSlug: 'lekki',
    publicSupportEmail: 'ops@lekki.io',
    publicSupportPhone: '+2348012345678',
    publicLegalAddress: 'Lekki Phase 1, Lagos',
    branding: {
      displayName: 'Lekki Property Holdings Ltd',
      logoUrl: 'https://example.com/assets/lekki-logo.png',
      loginBackgroundUrl: 'https://example.com/assets/lekki-login-bg.jpg',
      primaryColor: '#8A1538',
      accentColor: '#C8A45A',
    },
  },
  'abuja.localhost': {
    id: 'ws_abuja',
    companyName: 'Abuja Prime Estates',
    workspaceMode: 'PROPERTY_MANAGER_COMPANY',
    workspaceSlug: 'abuja',
    publicSupportEmail: 'hello@abujaprime.com',
    publicSupportPhone: '+2348099999999',
    publicLegalAddress: 'Wuse II, Abuja',
    branding: {
      displayName: 'Abuja Prime Estates',
      logoUrl: 'https://example.com/assets/abuja-logo.png',
      loginBackgroundUrl: 'https://example.com/assets/abuja-login-bg.jpg',
      primaryColor: '#0E5A8A',
      accentColor: '#D7A63C',
    },
  },
};
const landlordPlanByToken = new Map();

const tenantOnboardingInvitations = {
  'demo-tenant-onboarding-token': {
    invitation: {
      id: 'inv_demo_onboarding',
      email: 'tenant@lekki.io',
      inviteeName: 'Amaka Nnaji',
      status: 'PENDING',
      expiresAt: '2099-04-30T00:00:00.000Z',
      message: 'Please complete your onboarding so we can finalize your agreement.',
    },
    landlord: {
      companyName: 'Lekki Property Holdings Ltd',
      name: 'Babatunde Adeyemi',
      email: 'ops@lekki.io',
    },
    property: {
      id: 'prop_lekki_1',
      name: 'Lekki Gardens',
      address: '14 Admiralty Way, Lekki Phase 1, Lagos',
      city: 'Lagos',
      state: 'Lagos',
    },
    unit: {
      id: 'unit_lekki_a2',
      unitNumber: 'A2',
      type: '2 Bedroom Flat',
    },
    lease: {
      leaseStart: 'Mar 22, 2026',
      leaseEnd: 'Mar 21, 2027',
      billingFrequency: 'YEARLY',
      billingFrequencyLabel: 'Yearly',
      billingSchedule: '₦3,400,000/year',
      annualRent: '₦3,400,000',
      monthlyEquivalent: '₦283,333',
      depositAmount: '₦300,000',
    },
    duplicateLeaseWarning: null,
    agreementTemplate: {
      id: 'tpl_lease_standard',
      name: 'Residential Lease Agreement',
    },
  },
};

const fallbackTeamRoleOptions = [
  {
    key: 'COMPANY_ADMIN',
    label: 'Company Admin',
    description: 'Full internal workspace access for trusted operations leaders.',
    permissions: [
      { key: 'properties', label: 'Properties' },
      { key: 'units', label: 'Units' },
      { key: 'tenants', label: 'Tenants' },
      { key: 'agreements', label: 'Agreements' },
      { key: 'payments', label: 'Payments' },
    ],
  },
  {
    key: 'SUPPORT_STAFF',
    label: 'Support Staff',
    description: 'Tenant support, updates, and emergency coordination.',
    permissions: [
      { key: 'tenants', label: 'Tenants' },
      { key: 'notices', label: 'Notices' },
      { key: 'meetings', label: 'Meetings' },
    ],
  },
];

function buildLandlordSettingsResponse(planKey = 'STARTER') {
  const isEnterprise = planKey === 'ENTERPRISE';
  const isPro = planKey === 'PRO';

  return {
    capabilities: {
      isBasicPlan: !isPro && !isEnterprise,
      isProPlan: isPro,
      isEnterprisePlan: isEnterprise,
      unitLimit: !isPro && !isEnterprise ? 5 : null,
      canManageProperties: true,
      canManageUnits: true,
      canManageTenants: true,
      canManageLeaseDates: true,
      canViewBasicOccupancy: true,
      canManageMeetings: isPro || isEnterprise,
      canManageNotices: isPro || isEnterprise,
      canViewNotifications: true,
      canManageAgreements: true,
      canManageAgreementTemplates: isPro || isEnterprise,
      canResendAgreements: true,
      canExportAgreementPdfs: true,
      canViewWitnessSignatureDetails: isPro || isEnterprise,
      canManagePayments: true,
      canRecordOfflinePayments: true,
      canAcceptOnlinePayments: true,
      canViewReceipts: true,
      canManageReminders: true,
      canManageRiskWorkflows: isPro || isEnterprise,
      canManagePushNotifications: isPro || isEnterprise,
      canViewReports: isPro || isEnterprise,
      canManageCaretakers: isPro || isEnterprise,
      canManageEmergency: isPro || isEnterprise,
      canManageAccountUpdates: true,
      canDeleteAccount: true,
      canUseBiometricUnlock: true,
      canManageTeamMembers: isEnterprise,
      canManageBranding: isPro || isEnterprise,
      canUseBrandedSubdomain: isPro || isEnterprise,
      canUseEnterpriseCollections: isEnterprise,
    },
    profile: {
      id: 'll_lekki',
      companyName: 'Lekki Property Holdings Ltd',
      workspaceMode: 'PROPERTY_MANAGER_COMPANY',
      workspaceSlug: 'lekki',
      workspaceOrigin: isPro || isEnterprise ? 'https://lekki.usedoorrent.com' : 'https://usedoorrent.com',
      brandDisplayName: 'Lekki Property Holdings Ltd',
      brandLogoUrl: 'https://example.com/assets/lekki-logo.png',
      brandLoginBackgroundUrl: 'https://example.com/assets/lekki-login-bg.jpg',
      publicSupportEmail: 'ops@lekki.io',
      publicSupportPhone: '+2348012345678',
      publicLegalAddress: 'Lekki Phase 1, Lagos',
      brandPrimaryColor: '#8A1538',
      brandAccentColor: '#C8A45A',
      branding: workspaces['lekki.localhost'].branding,
      firstName: 'Babatunde',
      lastName: 'Adeyemi',
      fullName: 'Babatunde Adeyemi',
      email: 'ops@lekki.io',
      phone: '+2348012345678',
      emergencyContactName: 'Estate Control',
      emergencyContactPhone: '+2348090000000',
      photoUrl: null,
      initials: 'BA',
    },
    subscription: {
      plan: isEnterprise ? 'Enterprise' : isPro ? 'Pro' : 'Basic',
      planKey,
      planDescription: isEnterprise
        ? 'Enterprise flat subscription'
        : isPro
          ? 'Commission-based Pro plan'
          : 'Entry-level monthly plan',
      price: isEnterprise ? '₦200,000/month' : isPro ? '3% of rent collected' : '₦8,500/month',
      nextBilling: '30 Apr 2026',
      nextBillingAt: '2026-04-30T00:00:00.000Z',
      status: 'ACTIVE',
      billingModel: isPro ? 'commission' : 'subscription',
      canManageLifecycle: !isPro,
      renewalStatus: isPro ? 'commission' : 'active',
      autoRenewEnabled: !isPro,
      cancelAtPeriodEnd: false,
      cancelEffectiveAt: null,
      renewalCheckoutUrl: null,
      renewalFailureMessage: null,
      authorizationHint: !isPro ? 'saved Paystack authorization' : null,
      commissionRatePercent: isPro ? 3 : undefined,
      availablePlanChanges: isEnterprise
        ? []
        : isPro
          ? [
              {
                planKey: 'ENTERPRISE',
                plan: 'Enterprise',
                description: 'White-label, staff access, and company-owned collections.',
                price: '₦200,000/month',
                billingModel: 'subscription',
                billingInterval: 'monthly',
                requiresCheckout: true,
                ctaLabel: 'Upgrade to Enterprise',
              },
            ]
          : [
              {
                planKey: 'PRO',
                plan: 'Pro',
                description: 'Branding, automation, SMS, meetings, and caretaker tools.',
                price: '3% of rent collected',
                billingModel: 'commission',
                billingInterval: 'per_payment',
                requiresCheckout: false,
                ctaLabel: 'Switch to Pro',
              },
              {
                planKey: 'ENTERPRISE',
                plan: 'Enterprise',
                description: 'White-label, staff access, and company-owned collections.',
                price: '₦200,000/month',
                billingModel: 'subscription',
                billingInterval: 'monthly',
                requiresCheckout: true,
                ctaLabel: 'Upgrade to Enterprise',
              },
            ],
      pendingPlanChange: null,
    },
    payout: {
      bankId: '044',
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '0123456789',
      accountName: 'Lekki Property Holdings Ltd',
      subaccountCode: 'SUB_lekki',
      isConfigured: true,
      isVerified: true,
      platformFeePercent: 3,
    },
    enterpriseCollections: {
      eligible: isEnterprise,
      enabled: false,
      requiresEnterprise: true,
      requiredPriceAmount: 200000,
      provider: 'paystack',
      publicKeyHint: null,
      keyHint: null,
      connectedAt: null,
      webhookUrl: 'https://doorrent-api.onrender.com/api/v1/payments/paystack/webhook/workspace/lekki',
      publicSupportEmail: 'ops@lekki.io',
      publicSupportPhone: '+2348012345678',
      publicLegalAddress: 'Lekki Phase 1, Lagos',
      reason: isEnterprise ? null : 'Upgrade to Enterprise to enable company-owned collections.',
    },
    notifications: [
      {
        id: 'notif_payment',
        key: 'payment_success',
        label: 'Payment success alerts',
        channel: 'IN_APP',
        enabled: true,
      },
    ],
    teamMembers: [],
    teamRoleOptions: fallbackTeamRoleOptions,
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    request.setEncoding('utf8');

    request.on('data', (chunk) => {
      rawBody += chunk;
    });

    request.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-workspace-host',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || '';

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${PORT}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-workspace-host',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    response.end();
    return;
  }

  if (url.pathname === '/healthz') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/marketplace/public-overview') {
    sendJson(response, 200, {
      success: true,
      data: marketingOverview,
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/auth/workspace') {
    const host = (url.searchParams.get('host') || '').toLowerCase();
    const workspace = workspaces[host] ?? null;

    sendJson(response, 200, {
      success: true,
      data: {
        workspace,
      },
    });
    return;
  }

  if (
    request.method === 'GET' &&
    url.pathname === '/api/v1/tenant-onboarding/demo-tenant-onboarding-token'
  ) {
    sendJson(response, 200, {
      success: true,
      data: tenantOnboardingInvitations['demo-tenant-onboarding-token'],
    });
    return;
  }

  if (
    request.method === 'POST' &&
    url.pathname === '/api/v1/tenant-onboarding/demo-tenant-onboarding-token/submit'
  ) {
    let parsedBody = {};

    try {
      parsedBody = await readJsonBody(request);
    } catch {
      sendJson(response, 400, {
        success: false,
        message: 'Invalid JSON payload.',
      });
      return;
    }

    if (!parsedBody.phone) {
      sendJson(response, 422, {
        success: false,
        message: 'Phone number is required.',
      });
      return;
    }

    sendJson(response, 200, {
      success: true,
      message: 'Onboarding submitted successfully.',
      data: {
        agreement: {
          id: 'agr_demo_1',
          guarantorAccessToken: 'guarantor_demo_token',
        },
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/landlord/settings/payout/banks') {
    sendJson(response, 200, {
      success: true,
      data: {
        banks: [
          { id: '044', name: 'Access Bank' },
          { id: '058', name: 'GTBank' },
        ],
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/landlord/settings') {
    const token = getBearerToken(request) || 'default_landlord';
    const currentPlan = landlordPlanByToken.get(token) || 'STARTER';

    sendJson(response, 200, {
      success: true,
      data: buildLandlordSettingsResponse(currentPlan),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/landlord/settings/subscription/upgrade') {
    let parsedBody = {};

    try {
      parsedBody = await readJsonBody(request);
    } catch {
      sendJson(response, 400, {
        success: false,
        message: 'Invalid JSON payload.',
      });
      return;
    }

    const nextPlan = typeof parsedBody.plan === 'string' ? parsedBody.plan.toUpperCase() : '';

    if (nextPlan !== 'PRO' && nextPlan !== 'ENTERPRISE') {
      sendJson(response, 400, {
        success: false,
        message: 'Select a valid upgrade plan.',
      });
      return;
    }

    const token = getBearerToken(request) || 'default_landlord';
    landlordPlanByToken.set(token, nextPlan);

    sendJson(response, 200, {
      success: true,
      message:
        nextPlan === 'ENTERPRISE'
          ? 'Enterprise checkout ready.'
          : 'Workspace plan updated successfully.',
      data: {
        subscription: buildLandlordSettingsResponse(nextPlan).subscription,
        checkout:
          nextPlan === 'ENTERPRISE'
            ? {
                authorizationUrl: 'https://paystack.example.com/enterprise-checkout',
                reference: 'txn_enterprise_upgrade_demo',
              }
            : null,
      },
    });
    return;
  }

  if (
    request.method === 'POST' &&
    url.pathname === '/api/v1/marketplace/enterprise-onboarding-request'
  ) {
    let parsedBody = {};

    try {
      parsedBody = await readJsonBody(request);
    } catch {
      sendJson(response, 400, {
        success: false,
        message: 'Invalid JSON payload.',
      });
      return;
    }

    sendJson(response, 200, {
      success: true,
      message: `Enterprise onboarding request sent successfully for ${
        parsedBody.companyName || 'your company'
      }.`,
      data: {
        requestId: 'req_enterprise_local',
      },
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: `Mock QA API route not found: ${request.method} ${url.pathname}`,
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock QA API listening on http://127.0.0.1:${PORT}`);
});
