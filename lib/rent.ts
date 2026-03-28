export type BillingFrequency = "daily" | "monthly" | "yearly";

export function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function normalizeBillingFrequency(
  frequency?: string | null,
): BillingFrequency {
  const normalized = frequency?.trim().toLowerCase();

  if (normalized === "daily" || normalized === "monthly" || normalized === "yearly") {
    return normalized;
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

export function billingCyclePriceFromAnnualEquivalent(
  annualAmount: number,
  frequency?: string | null,
) {
  const billingFrequency = normalizeBillingFrequency(frequency);

  if (!Number.isFinite(annualAmount) || annualAmount <= 0) {
    return 0;
  }

  const convertedAmount =
    billingFrequency === "daily"
      ? annualAmount / 365
      : billingFrequency === "monthly"
        ? annualAmount / 12
        : annualAmount;

  // The API persists rent values in whole naira, so derived billing prices
  // must stay integer-safe across web and mobile flows.
  return Math.round(convertedAmount);
}

export function formatBillingCyclePriceInput(
  annualAmount: number,
  frequency?: string | null,
) {
  const convertedAmount = billingCyclePriceFromAnnualEquivalent(annualAmount, frequency);

  if (!convertedAmount) {
    return "";
  }

  return Number.isInteger(convertedAmount)
    ? `${convertedAmount}`
    : `${convertedAmount}`;
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

export function calculateCommissionPreview(input: {
  amount: number;
  annualRent?: number;
  billingCyclePrice?: number;
  frequency?: string | null;
  baseCommissionPercent?: number;
}) {
  const annualRentEquivalent =
    Number.isFinite(input.annualRent) && Number(input.annualRent) > 0
      ? Math.round(Number(input.annualRent))
      : annualEquivalentFromBilling(input.billingCyclePrice ?? 0, input.frequency);
  const amount = Number.isFinite(input.amount) ? Math.max(Math.round(input.amount), 0) : 0;
  const baseCommissionPercent = input.baseCommissionPercent ?? 3;
  const commissionYearCount =
    amount <= 0
      ? 0
      : annualRentEquivalent > 0
        ? Math.max(1, Math.ceil(amount / annualRentEquivalent - 1e-9))
        : 1;
  const commissionRatePercent =
    commissionYearCount > 0 ? baseCommissionPercent * commissionYearCount : 0;
  const commissionAmount =
    commissionRatePercent > 0 ? Math.round((amount * commissionRatePercent) / 100) : 0;

  return {
    annualRentEquivalent,
    yearsCovered:
      annualRentEquivalent > 0 && amount > 0 ? amount / annualRentEquivalent : 0,
    commissionYearCount,
    commissionRatePercent,
    commissionAmount,
    landlordSettlementAmount: Math.max(amount - commissionAmount, 0),
    commissionFormulaLabel:
      commissionYearCount > 0
        ? `${baseCommissionPercent}% × ${commissionYearCount} rent year${
            commissionYearCount === 1 ? "" : "s"
          }`
        : `${baseCommissionPercent}% base commission`,
  };
}

export function billingAmountLabel(frequency?: string | null) {
  return `${billingLabel(frequency)} rent`;
}
