export type BillingFrequency = "daily" | "monthly" | "yearly";

export function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function normalizeBillingFrequency(
  frequency?: string | null,
): BillingFrequency {
  if (frequency === "daily" || frequency === "monthly" || frequency === "yearly") {
    return frequency;
  }

  return "yearly";
}

export function billingUnitLabel(frequency?: string | null) {
  if (normalizeBillingFrequency(frequency) === "daily") {
    return "day";
  }

  if (normalizeBillingFrequency(frequency) === "monthly") {
    return "month";
  }

  return "year";
}

export function billingLabel(frequency?: string | null) {
  if (normalizeBillingFrequency(frequency) === "daily") {
    return "Daily";
  }

  if (normalizeBillingFrequency(frequency) === "monthly") {
    return "Monthly";
  }

  return "Yearly";
}

export function formatBillingSchedule(amount: number, frequency?: string | null) {
  return `${formatNaira(amount)}/${billingUnitLabel(frequency)}`;
}

export function annualEquivalentFromBilling(
  amount: number,
  frequency?: string | null,
) {
  const billingFrequency = normalizeBillingFrequency(frequency);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (billingFrequency === "daily") {
    return amount * 365;
  }

  if (billingFrequency === "monthly") {
    return amount * 12;
  }

  return amount;
}

export function monthlyEquivalentFromBilling(
  amount: number,
  frequency?: string | null,
) {
  const annualEquivalent = annualEquivalentFromBilling(amount, frequency);

  if (!annualEquivalent) {
    return 0;
  }

  return Math.round(annualEquivalent / 12);
}

export function billingAmountLabel(frequency?: string | null) {
  return `${billingLabel(frequency)} rent`;
}
