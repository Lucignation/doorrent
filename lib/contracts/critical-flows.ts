export type BillingFrequency = "daily" | "monthly" | "yearly";

export interface TenantOnboardingFormFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  residentialAddress: string;
  idType: string;
  idNumber: string;
  guarantorFullName: string;
  guarantorRelationship: string;
  guarantorEmail: string;
  guarantorPhone: string;
  guarantorOccupation: string;
  guarantorCompanyName: string;
  guarantorAddress: string;
}

export interface UploadedDocumentDraft {
  name: string;
  mimeType: string;
  content: string;
}

export interface TenantInvitationDraft {
  propertyId: string;
  unitId: string;
  email: string;
  inviteeName?: string;
  agreementTemplateId?: string;
  leaseStart: string;
  leaseEnd: string;
  billingFrequency: string;
  billingCyclePrice: string | number;
  depositAmount?: string | number;
  message?: string;
}

export interface TenantInvitationPayload {
  propertyId: string;
  unitId: string;
  email: string;
  inviteeName?: string;
  agreementTemplateId?: string;
  leaseStart: string;
  leaseEnd: string;
  billingFrequency: Uppercase<BillingFrequency>;
  billingCyclePrice: number;
  depositAmount?: number;
  message?: string;
}

export type SubscriptionUpgradePlan = "PRO" | "ENTERPRISE";

interface SubscriptionPlanChangeOption {
  planKey: SubscriptionUpgradePlan;
}

const NIGERIAN_ADDRESS_TOKENS = [
  "abia",
  "adamawa",
  "akwa ibom",
  "anambra",
  "bauchi",
  "bayelsa",
  "benue",
  "borno",
  "cross river",
  "delta",
  "ebonyi",
  "edo",
  "ekiti",
  "enugu",
  "fct",
  "abuja",
  "gombe",
  "imo",
  "jigawa",
  "kaduna",
  "kano",
  "katsina",
  "kebbi",
  "kogi",
  "kwara",
  "lagos",
  "nasarawa",
  "niger",
  "ogun",
  "ondo",
  "osun",
  "oyo",
  "plateau",
  "rivers",
  "sokoto",
  "taraba",
  "yobe",
  "zamfara",
  "nigeria",
];

function trimText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeContractBillingFrequency(frequency?: string | null): BillingFrequency {
  const normalized = trimText(frequency).toLowerCase();

  if (normalized === "daily" || normalized === "monthly" || normalized === "yearly") {
    return normalized;
  }

  return "yearly";
}

function parseDateValue(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimText(value));
}

export function isNigerianAddress(value: string) {
  const normalized = trimText(value).toLowerCase();

  if (!normalized) {
    return false;
  }

  return NIGERIAN_ADDRESS_TOKENS.some((token) => normalized.includes(token));
}

export function normalizeWholeNairaAmount(value: unknown) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return Math.round(numericValue);
}

export function normalizeOptionalWholeNairaAmount(value: unknown) {
  if (value === undefined || value === null || trimText(String(value)) === "") {
    return undefined;
  }

  return normalizeWholeNairaAmount(value);
}

export function validateTenantOnboardingDraft(input: {
  form: TenantOnboardingFormFields;
  tenantSignatureData: string;
  duplicateLeaseWarningBody?: string | null;
}) {
  const { form, tenantSignatureData, duplicateLeaseWarningBody } = input;

  if (duplicateLeaseWarningBody) {
    return duplicateLeaseWarningBody;
  }

  if (!trimText(form.firstName)) return "First name is required.";
  if (!trimText(form.lastName)) return "Last name is required.";
  if (!trimText(form.email)) return "Email is required.";
  if (!isEmailAddress(form.email)) return "Enter a valid email address.";
  if (!trimText(form.phone)) return "Phone number is required.";
  if (!trimText(form.residentialAddress)) return "Residential address is required.";
  if (!isNigerianAddress(form.residentialAddress)) {
    return "Residential address must be within Nigeria.";
  }
  if (!trimText(form.idType)) return "ID type is required.";
  if (!trimText(form.guarantorFullName)) return "Guarantor full name is required.";
  if (!trimText(form.guarantorRelationship)) return "Guarantor relationship is required.";
  if (!trimText(form.guarantorEmail)) return "Guarantor email is required.";
  if (!isEmailAddress(form.guarantorEmail)) {
    return "Enter a valid guarantor email address.";
  }
  if (!trimText(form.guarantorPhone)) return "Guarantor phone is required.";
  if (!trimText(form.guarantorOccupation)) return "Guarantor occupation is required.";
  if (!trimText(form.guarantorCompanyName)) return "Guarantor company name is required.";
  if (!trimText(form.guarantorAddress)) return "Guarantor address is required.";
  if (!isNigerianAddress(form.guarantorAddress)) {
    return "Guarantor address must be within Nigeria.";
  }
  if (!trimText(tenantSignatureData)) {
    return "Tenant signature is required before submission.";
  }

  return "";
}

export function buildTenantOnboardingSubmission(input: {
  form: TenantOnboardingFormFields;
  idDocument: UploadedDocumentDraft | null;
  tenantSignatureData: string;
}) {
  const { form, idDocument, tenantSignatureData } = input;

  return {
    firstName: trimText(form.firstName),
    lastName: trimText(form.lastName),
    email: trimText(form.email).toLowerCase(),
    phone: trimText(form.phone),
    residentialAddress: trimText(form.residentialAddress),
    idType: trimText(form.idType),
    ...(trimText(form.idNumber) ? { idNumber: trimText(form.idNumber) } : {}),
    ...(idDocument
      ? {
          idDocumentName: idDocument.name,
          idDocumentMimeType: idDocument.mimeType,
          idDocumentContent: idDocument.content,
        }
      : {}),
    tenantSignatureData: trimText(tenantSignatureData),
    guarantor: {
      fullName: trimText(form.guarantorFullName),
      email: trimText(form.guarantorEmail).toLowerCase(),
      phone: trimText(form.guarantorPhone),
      occupation: trimText(form.guarantorOccupation),
      companyName: trimText(form.guarantorCompanyName),
      relationship: trimText(form.guarantorRelationship),
      address: trimText(form.guarantorAddress),
    },
  };
}

export function validateTenantInvitationDraft(input: TenantInvitationDraft) {
  if (!trimText(input.propertyId)) return "Select a property for this invitation.";
  if (!trimText(input.unitId)) return "Select a unit for this invitation.";
  if (!trimText(input.email)) return "Tenant email is required.";
  if (!isEmailAddress(input.email)) return "Enter a valid tenant email address.";
  if (!trimText(input.leaseStart)) return "Lease start date is required.";
  if (!trimText(input.leaseEnd)) return "Lease end date is required.";

  const leaseStart = parseDateValue(trimText(input.leaseStart));
  const leaseEnd = parseDateValue(trimText(input.leaseEnd));

  if (!leaseStart) return "Choose a valid lease start date.";
  if (!leaseEnd) return "Choose a valid lease end date.";
  if (leaseEnd < leaseStart) return "Lease end must be on or after the lease start date.";

  if (!normalizeWholeNairaAmount(input.billingCyclePrice)) {
    return "Enter the rent amount for this tenant invitation.";
  }

  if (
    normalizeOptionalWholeNairaAmount(input.depositAmount) === null
  ) {
    return "Deposit amount must be a whole naira value.";
  }

  return "";
}

export function buildTenantInvitationPayload(
  input: TenantInvitationDraft,
): { ok: true; payload: TenantInvitationPayload } | { ok: false; message: string } {
  const validationMessage = validateTenantInvitationDraft(input);

  if (validationMessage) {
    return {
      ok: false,
      message: validationMessage,
    };
  }

  const billingFrequency = normalizeContractBillingFrequency(input.billingFrequency).toUpperCase() as
    Uppercase<BillingFrequency>;
  const billingCyclePrice = normalizeWholeNairaAmount(input.billingCyclePrice);
  const normalizedDepositAmount = normalizeOptionalWholeNairaAmount(input.depositAmount);

  if (!billingCyclePrice) {
    return {
      ok: false,
      message: "Enter the rent amount for this tenant invitation.",
    };
  }

  return {
    ok: true,
    payload: {
      propertyId: trimText(input.propertyId),
      unitId: trimText(input.unitId),
      email: trimText(input.email).toLowerCase(),
      inviteeName: trimText(input.inviteeName) || undefined,
      agreementTemplateId: trimText(input.agreementTemplateId) || undefined,
      leaseStart: trimText(input.leaseStart),
      leaseEnd: trimText(input.leaseEnd),
      billingFrequency,
      billingCyclePrice,
      depositAmount:
        typeof normalizedDepositAmount === "number" ? normalizedDepositAmount : undefined,
      message: trimText(input.message) || undefined,
    },
  };
}

export function validateSubscriptionUpgradeTarget(input: {
  targetPlan: string;
  currentPlanKey?: string | null;
  availablePlanChanges?: SubscriptionPlanChangeOption[] | null;
}) {
  const targetPlan = trimText(input.targetPlan).toUpperCase();

  if (targetPlan !== "PRO" && targetPlan !== "ENTERPRISE") {
    return "Select a valid upgrade plan.";
  }

  if (trimText(input.currentPlanKey).toUpperCase() === targetPlan) {
    return "This workspace is already on that plan.";
  }

  const availablePlanChanges = input.availablePlanChanges ?? [];

  if (
    availablePlanChanges.length > 0 &&
    !availablePlanChanges.some((option) => option.planKey === targetPlan)
  ) {
    return "That upgrade option is not available for this workspace right now.";
  }

  return "";
}
