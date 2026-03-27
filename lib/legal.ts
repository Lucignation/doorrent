import type { PublicWorkspaceContext } from "./workspace-context";

export const LEGAL_COMPANY_NAME = "ReSuply Technologies Limited";
export const LEGAL_PRODUCT_NAME = "DoorRent";
export const LEGAL_EFFECTIVE_DATE = "26 March 2026";

export const LEGAL_EMAILS = {
  legal: "legal@doorrent.com",
  privacy: "privacy@doorrent.com",
  billing: "billing@doorrent.com",
  security: "security@doorrent.com",
  support: "support@doorrent.com",
  general: "hello@doorrent.com",
} as const;

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/account-deletion", label: "Account Deletion" },
  { href: "/security", label: "Security" },
] as const;

export const POLICY_SUMMARY = {
  privacy:
    "How DoorRent collects, uses, stores, shares, and protects landlord, tenant, and caretaker data.",
  terms:
    "The contractual rules for using DoorRent's website, portals, APIs, and mobile applications.",
  refund:
    "How subscription, commission, duplicate-charge, and service-credit refund requests are handled.",
  accountDeletion:
    "How users can delete accounts in-app or through the web, what gets removed, and what may be retained.",
  security:
    "How DoorRent protects accounts, infrastructure, communications, and incident reporting workflows.",
} as const;

export function resolveLegalWorkspaceContext(
  workspace: PublicWorkspaceContext["workspace"] | null | undefined,
) {
  const supportEmail = workspace?.publicSupportEmail?.trim() || LEGAL_EMAILS.support;

  return {
    workspace,
    operatorName: workspace?.companyName?.trim() || LEGAL_COMPANY_NAME,
    productName: workspace?.branding?.displayName?.trim() || LEGAL_PRODUCT_NAME,
    supportEmail,
    privacyEmail: supportEmail,
    billingEmail: supportEmail,
    legalEmail: supportEmail,
    securityEmail: supportEmail,
    supportPhone: workspace?.publicSupportPhone?.trim() || null,
    legalAddress: workspace?.publicLegalAddress?.trim() || null,
  };
}
