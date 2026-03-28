// @ts-nocheck
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV ??= "test";
process.env.PORT ??= "4000";
process.env.CORS_ORIGIN ??= "https://usedoorrent.com";
process.env.APP_BASE_URL ??= "https://usedoorrent.com";
process.env.API_BASE_URL ??= "https://doorrent-api.onrender.com";
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/resuply_tenant?schema=public";
process.env.DOORRENT_PLATFORM_FEE_PERCENT ??= "3";
process.env.TERMII_SMS_CHANNEL ??= "dnd";
process.env.TERMII_SMS_TYPE ??= "plain";
process.env.ENABLE_API_DOCS ??= "false";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");

async function main() {
  const [
    apiLandlordAccess,
    apiLandlordNotificationAccess,
    apiSubscriptions,
    apiTeamMembers,
    apiWorkspaceHosts,
    webRent,
    webLandlordAccess,
    tenantAccess,
  ] = await Promise.all([
    import("../api/dist/lib/landlord-access.js"),
    import("../api/dist/lib/landlord-notification-access.js"),
    import("../api/dist/lib/subscriptions.js"),
    import("../api/dist/lib/team-members.js"),
    import("../api/dist/lib/workspace-hosts.js"),
    import("../lib/rent"),
    import("../lib/landlord-access"),
    import("../mobile/tenant-app/lib/access"),
  ]);

  type Check = {
    name: string;
    run: () => Promise<void> | void;
  };

  const checks: Check[] = [
  {
    name: "Billing math stays consistent for yearly, monthly, daily, and commission previews",
    run() {
      assert.equal(webRent.annualEquivalentFromBilling(24, "yearly"), 24);
      assert.equal(webRent.annualEquivalentFromBilling(2, "monthly"), 24);
      assert.equal(webRent.annualEquivalentFromBilling(10, "daily"), 3650);

      assert.equal(webRent.billingCyclePriceFromAnnualEquivalent(24, "yearly"), 24);
      assert.equal(webRent.billingCyclePriceFromAnnualEquivalent(24, "monthly"), 2);
      assert.equal(webRent.billingCyclePriceFromAnnualEquivalent(3650, "daily"), 10);
      assert.equal(
        webRent.billingCyclePriceFromAnnualEquivalent(2200000, "daily"),
        Math.round(2200000 / 365),
      );
      assert.equal(
        webRent.formatBillingCyclePriceInput(3400000, "yearly"),
        "3400000",
      );
      assert.equal(
        webRent.formatBillingCyclePriceInput(2200000, "daily"),
        `${Math.round(2200000 / 365)}`,
      );

      const commission = webRent.calculateCommissionPreview({
        amount: 6800000,
        annualRent: 3400000,
        baseCommissionPercent: 3,
      });

      assert.equal(commission.annualRentEquivalent, 3400000);
      assert.equal(commission.commissionYearCount, 2);
      assert.equal(commission.commissionRatePercent, 6);
      assert.equal(commission.commissionAmount, 408000);
      assert.equal(commission.landlordSettlementAmount, 6392000);
    },
  },
  {
    name: "API landlord plan capabilities match Basic, Pro, and Enterprise rules",
    run() {
      const basic = apiLandlordAccess.buildLandlordCapabilities({
        subscriptionModel: "SUBSCRIPTION",
        plan: "STARTER",
      });
      const pro = apiLandlordAccess.buildLandlordCapabilities({
        subscriptionModel: "COMMISSION",
        plan: "PRO",
      });
      const enterprise = apiLandlordAccess.buildLandlordCapabilities({
        subscriptionModel: "SUBSCRIPTION",
        plan: "ENTERPRISE",
      });

      assert.equal(basic.unitLimit, 5);
      assert.equal(basic.canManageMeetings, false);
      assert.equal(basic.canManageNotices, false);
      assert.equal(basic.canManageAgreementTemplates, false);
      assert.equal(basic.canAcceptOnlinePayments, true);
      assert.equal(basic.canDeleteAccount, true);
      assert.equal(basic.canUseBiometricUnlock, true);
      assert.equal(basic.canManageBranding, false);
      assert.equal(basic.canUseBrandedSubdomain, false);
      assert.equal(basic.canManageTeamMembers, false);
      assert.equal(basic.canUseEnterpriseCollections, false);

      assert.equal(pro.canManageBranding, true);
      assert.equal(pro.canUseBrandedSubdomain, true);
      assert.equal(pro.canManageMeetings, true);
      assert.equal(pro.canManageTeamMembers, false);
      assert.equal(pro.canUseEnterpriseCollections, false);

      assert.equal(enterprise.canManageBranding, true);
      assert.equal(enterprise.canUseBrandedSubdomain, true);
      assert.equal(enterprise.canManageTeamMembers, true);
      assert.equal(enterprise.canUseEnterpriseCollections, true);

      assert.throws(
        () => apiLandlordAccess.assertLandlordFeatureAccess("branding", basic),
        /Upgrade to Pro or Enterprise/,
      );
      assert.throws(
        () =>
          apiLandlordAccess.assertLandlordFeatureAccess("team_members", pro),
        /Upgrade to Enterprise/,
      );
      assert.doesNotThrow(() =>
        apiLandlordAccess.assertLandlordFeatureAccess("notices", pro),
      );
    },
  },
  {
    name: "Web landlord capability resolver matches current plan policy",
    run() {
      const basic = webLandlordAccess.buildLandlordCapabilitiesFromPlan({
        subscriptionModel: "subscription",
        plan: "STARTER",
      });
      const pro = webLandlordAccess.buildLandlordCapabilitiesFromPlan({
        subscriptionModel: "commission",
        plan: "PRO",
      });
      const enterprise = webLandlordAccess.buildLandlordCapabilitiesFromPlan({
        subscriptionModel: "subscription",
        plan: "ENTERPRISE",
      });

      assert.equal(basic.canUseBiometricUnlock, true);
      assert.equal(basic.canDeleteAccount, true);
      assert.equal(basic.canManageBranding, false);
      assert.equal(pro.canManageBranding, true);
      assert.equal(pro.canManageTeamMembers, false);
      assert.equal(enterprise.canManageTeamMembers, true);
      assert.equal(enterprise.canUseEnterpriseCollections, true);
    },
  },
  {
    name: "Tenant mobile capability defaults keep biometrics and account deletion on every plan",
    run() {
      const basic = tenantAccess.resolveTenantCapabilities({
        plan: "basic",
        subscriptionModel: "subscription",
      });
      const pro = tenantAccess.resolveTenantCapabilities({
        plan: "pro",
        subscriptionModel: "commission",
      });
      const enterprise = tenantAccess.resolveTenantCapabilities({
        planKey: "ENTERPRISE",
        plan: "enterprise",
      });

      assert.equal(basic.canDeleteAccount, true);
      assert.equal(basic.canUseBiometricUnlock, true);
      assert.equal(basic.canManageMeetings, false);
      assert.equal(basic.canManageEmergency, false);

      assert.equal(pro.canDeleteAccount, true);
      assert.equal(pro.canUseBiometricUnlock, true);
      assert.equal(pro.canManageMeetings, true);
      assert.equal(pro.canManageEmergency, true);

      assert.equal(enterprise.canDeleteAccount, true);
      assert.equal(enterprise.canUseBiometricUnlock, true);
      assert.equal(enterprise.canManageMeetings, true);
    },
  },
  {
    name: "Workspace slug and host rules keep users bound to the correct organization",
    run() {
      assert.equal(
        apiWorkspaceHosts.normalizeWorkspaceSlug("Lekki Property Holdings Ltd"),
        "lekki-property-holdings-ltd",
      );
      assert.equal(
        apiWorkspaceHosts.extractWorkspaceSlugFromHost("https://lekki.usedoorrent.com/portal"),
        "lekki",
      );
      assert.equal(
        apiWorkspaceHosts.extractWorkspaceSlugFromHost("lekki.usedoorrent.com:3000"),
        "lekki",
      );
      assert.equal(
        apiWorkspaceHosts.extractWorkspaceSlugFromHost("usedoorrent.com"),
        null,
      );
      assert.equal(
        apiWorkspaceHosts.doesWorkspaceHostMatchSlug(
          "lekki.usedoorrent.com",
          "lekki",
        ),
        true,
      );
      assert.equal(
        apiWorkspaceHosts.doesWorkspaceHostMatchSlug(
          "lekki.usedoorrent.com",
          "abuja",
        ),
        false,
      );

      const basicLandlord = {
        workspaceSlug: "lekki",
        subscriptionModel: "SUBSCRIPTION",
        plan: "STARTER",
      };
      const proLandlord = {
        workspaceSlug: "lekki",
        subscriptionModel: "COMMISSION",
        plan: "PRO",
      };
      const enterpriseLandlord = {
        workspaceSlug: "lekki",
        subscriptionModel: "SUBSCRIPTION",
        plan: "ENTERPRISE",
      };

      assert.equal(
        apiWorkspaceHosts.canUseWorkspaceSubdomainForLandlord(basicLandlord),
        false,
      );
      assert.equal(
        apiWorkspaceHosts.canUseWorkspaceSubdomainForLandlord(proLandlord),
        true,
      );
      assert.equal(
        apiWorkspaceHosts.canUseWorkspaceSubdomainForLandlord(enterpriseLandlord),
        true,
      );
      assert.equal(
        apiWorkspaceHosts.buildWorkspaceOriginForLandlord(basicLandlord),
        "https://usedoorrent.com",
      );
      assert.equal(
        apiWorkspaceHosts.buildWorkspaceOriginForLandlord(proLandlord),
        "https://lekki.usedoorrent.com",
      );
      assert.equal(
        apiWorkspaceHosts.doesWorkspaceHostMatchLandlord(
          "lekki.usedoorrent.com",
          proLandlord,
        ),
        true,
      );
      assert.equal(
        apiWorkspaceHosts.doesWorkspaceHostMatchLandlord(
          "lekki.usedoorrent.com",
          { ...proLandlord, workspaceSlug: "abuja" },
        ),
        false,
      );
      assert.equal(
        apiWorkspaceHosts.doesWorkspaceHostMatchLandlord(
          "lekki.usedoorrent.com",
          basicLandlord,
        ),
        false,
      );
    },
  },
  {
    name: "Team member permissions only grant the modules their role allows",
    run() {
      const enterpriseBase = apiLandlordAccess.buildLandlordCapabilities({
        subscriptionModel: "SUBSCRIPTION",
        plan: "ENTERPRISE",
      });
      const proBase = apiLandlordAccess.buildLandlordCapabilities({
        subscriptionModel: "COMMISSION",
        plan: "PRO",
      });
      const financeRole = apiTeamMembers.getTeamMemberRoleTemplate("FINANCE_OFFICER");
      const adminRole = apiTeamMembers.getTeamMemberRoleTemplate("COMPANY_ADMIN");

      assert.ok(financeRole);
      assert.ok(adminRole);

      const financeCapabilities = apiTeamMembers.buildTeamMemberCapabilities(
        enterpriseBase,
        financeRole?.permissions,
      );
      const adminCapabilities = apiTeamMembers.buildTeamMemberCapabilities(
        enterpriseBase,
        adminRole?.permissions,
      );
      const proAdminCapabilities = apiTeamMembers.buildTeamMemberCapabilities(
        proBase,
        adminRole?.permissions,
      );

      assert.equal(financeCapabilities.canManagePayments, true);
      assert.equal(financeCapabilities.canViewReceipts, true);
      assert.equal(financeCapabilities.canManageEmergency, false);
      assert.equal(financeCapabilities.canManageBranding, false);
      assert.equal(financeCapabilities.canDeleteAccount, false);
      assert.equal(financeCapabilities.canUseBiometricUnlock, false);

      assert.equal(adminCapabilities.canManageTeamMembers, true);
      assert.equal(adminCapabilities.canManageBranding, true);
      assert.equal(adminCapabilities.canUseEnterpriseCollections, true);

      assert.equal(proAdminCapabilities.canManageTeamMembers, false);
      assert.equal(proAdminCapabilities.canUseEnterpriseCollections, false);
    },
  },
  {
    name: "Plan pricing and catalog metadata still match Basic, Pro, and Enterprise",
    run() {
      const basic = apiSubscriptions.buildLandlordSubscriptionSelection({
        plan: "STARTER",
      });
      const pro = apiSubscriptions.buildLandlordSubscriptionSelection({
        plan: "PRO",
      });
      const enterprise = apiSubscriptions.buildLandlordSubscriptionSelection({
        plan: "ENTERPRISE",
      });
      const catalog = apiSubscriptions.getSubscriptionCatalog();

      assert.equal(basic.plan, "STARTER");
      assert.equal(basic.subscriptionPrice, apiSubscriptions.BASIC_MONTHLY_PRICE);
      assert.equal(pro.plan, "PRO");
      assert.equal(pro.subscriptionModel, "COMMISSION");
      assert.equal(
        pro.commissionRatePercent,
        apiSubscriptions.FULL_SERVICE_COMMISSION_PERCENT,
      );
      assert.equal(enterprise.plan, "ENTERPRISE");
      assert.equal(
        enterprise.subscriptionPrice,
        apiSubscriptions.ENTERPRISE_MONTHLY_PRICE,
      );

      assert.deepEqual(
        catalog.options.map((option) => option.name),
        ["Basic", "Pro", "Enterprise"],
      );
      assert.equal(catalog.options.length, 3);
    },
  },
  {
    name: "SMS policy keeps Basic limited to payment-success SMS while Pro and Enterprise can use more",
    run() {
      assert.equal(
        apiLandlordNotificationAccess.canSendLandlordSmsNotification({
          subscriptionModel: "SUBSCRIPTION",
          plan: "STARTER",
          preferenceKey: "smsOnPayment",
          preferenceEnabled: true,
        }),
        true,
      );
      assert.equal(
        apiLandlordNotificationAccess.canSendLandlordSmsNotification({
          subscriptionModel: "SUBSCRIPTION",
          plan: "STARTER",
          preferenceKey: "smsOnDefault",
          preferenceEnabled: true,
        }),
        false,
      );
      assert.equal(
        apiLandlordNotificationAccess.canSendLandlordSmsNotification({
          subscriptionModel: "COMMISSION",
          plan: "PRO",
          preferenceKey: "smsOnDefault",
          preferenceEnabled: true,
        }),
        true,
      );
      assert.equal(
        apiLandlordNotificationAccess.canSendLandlordSmsNotification({
          subscriptionModel: "SUBSCRIPTION",
          plan: "ENTERPRISE",
          preferenceKey: "smsOnDefault",
          preferenceEnabled: true,
        }),
        true,
      );
      assert.equal(
        apiLandlordNotificationAccess.canSendLandlordSmsNotification({
          subscriptionModel: "COMMISSION",
          plan: "PRO",
          preferenceKey: "smsOnPayment",
          preferenceEnabled: false,
        }),
        false,
      );
    },
  },
  {
    name: "Critical invite-flow and workspace guards are present in source code",
    async run() {
      const [
        webInviteSource,
        mobileInviteSource,
        webApiSource,
        tenantMobileApiSource,
        tenantAuthSource,
        caretakerAuthSource,
        landlordAuthSource,
      ] = await Promise.all([
        readFile(path.join(rootDir, "components/ui/AppOverlays.tsx"), "utf8"),
        readFile(
          path.join(
            rootDir,
            "mobile/landlord-app/app/(main)/(tabs)/tenants/invite.tsx",
          ),
          "utf8",
        ),
        readFile(path.join(rootDir, "lib/api.ts"), "utf8"),
        readFile(
          path.join(rootDir, "mobile/tenant-app/lib/api.ts"),
          "utf8",
        ),
        readFile(
          path.join(rootDir, "api/src/services/tenant-auth.service.ts"),
          "utf8",
        ),
        readFile(
          path.join(rootDir, "api/src/services/caretaker-auth.service.ts"),
          "utf8",
        ),
        readFile(
          path.join(rootDir, "api/src/services/auth.service.ts"),
          "utf8",
        ),
      ]);

      assert.match(
        webInviteSource,
        /if \(!invitationForm\.propertyId\)\s*\{\s*return \[\];\s*\}/,
      );
      assert.match(
        webInviteSource,
        /disabled=\{!invitationForm\.propertyId\}/,
      );
      assert.match(
        webInviteSource,
        /value=\{invitationForm\.billingCyclePrice\}[\s\S]*disabled/,
      );
      assert.match(mobileInviteSource, /Boolean\(propertyId\)/);
      assert.match(mobileInviteSource, /editable=\{false\}/);
      assert.match(webApiSource, /x-workspace-host/);
      assert.match(tenantMobileApiSource, /x-workspace-host/);
      assert.match(tenantAuthSource, /assertRequestedWorkspaceMatchesTenant/);
      assert.match(caretakerAuthSource, /assertRequestedWorkspaceMatchesCaretaker/);
      assert.match(landlordAuthSource, /assertRequestedWorkspaceMatchesLandlord/);
    },
  },
  ];

  const failures: Array<{ name: string; error: unknown }> = [];

  for (const check of checks) {
    try {
      await check.run();
      console.log(`✓ ${check.name}`);
    } catch (error) {
      failures.push({ name: check.name, error });
      console.error(`✗ ${check.name}`);
      console.error(error);
    }
  }

  if (failures.length) {
    console.error(`\n${failures.length} critical QA check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${checks.length} critical QA checks passed.`);
}

void main();
