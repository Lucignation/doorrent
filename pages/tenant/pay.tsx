import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { CardIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import type { TenantPortalIdentity } from "../../context/TenantSessionContext";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import {
  billingLabel,
  calculateCommissionPreview,
  formatBillingSchedule,
  formatNaira,
} from "../../lib/rent";

interface InitializePaymentResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  provider: "paystack";
  amount: string;
  platformFee: string;
  landlordSettlement: string;
  commissionRatePercent?: number;
  commissionFormulaLabel?: string;
  callbackUrl: string;
}

interface VerifiedPaymentResponse {
  payment: {
    id: string;
    reference: string;
    amount: string;
    status: string;
    date: string;
    method?: string;
    platformFee: string;
    landlordSettlement: string;
    commissionRatePercent?: number;
    commissionFormulaLabel?: string;
    property: string;
    unit: string;
  };
}

interface TenantMeResponse {
  tenant: TenantPortalIdentity;
}

type PaymentPreset = "due" | "cycle";

export default function TenantPayPage() {
  const router = useRouter();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const { saveTenantSession, tenantSession } = useTenantPortalSession();
  const [tenantProfile, setTenantProfile] = useState<TenantPortalIdentity | null>(
    tenantSession?.tenant ?? null,
  );
  const [amount, setAmount] = useState("");
  const [paymentPreset, setPaymentPreset] = useState<PaymentPreset>("due");
  const [initializingAction, setInitializingAction] = useState<"open" | "share" | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verifiedPayment, setVerifiedPayment] =
    useState<VerifiedPaymentResponse["payment"] | null>(null);

  const annualRentAmount = tenantProfile?.annualRent ?? 0;
  const monthlyEquivalentAmount = tenantProfile?.monthlyEquivalent ?? 0;
  const currentDueAmount = tenantProfile?.currentDue ?? 0;
  const billingCycleAmount = tenantProfile?.billingCyclePrice ?? 0;
  const propertyName = tenantProfile?.propertyName ?? "Assigned property";
  const unitLabel = tenantProfile?.unitNumber
    ? `${tenantProfile.unitNumber}${tenantProfile.unitType ? ` — ${tenantProfile.unitType}` : ""}`
    : "Assigned unit";
  const billingSchedule =
    tenantProfile?.billingSchedule ??
    (billingCycleAmount
      ? formatBillingSchedule(billingCycleAmount, tenantProfile?.billingFrequency)
      : "—");
  const cycleCheckoutAmount =
    currentDueAmount > 0
      ? Math.min(billingCycleAmount || currentDueAmount, currentDueAmount)
      : 0;
  const showCyclePreset =
    cycleCheckoutAmount > 0 && cycleCheckoutAmount !== currentDueAmount;
  const paymentPeriodLabel =
    paymentPreset === "cycle"
      ? `${billingLabel(tenantProfile?.billingFrequency)} rent payment`
      : currentDueAmount > cycleCheckoutAmount && showCyclePreset
        ? "Outstanding rent balance"
        : `${billingLabel(tenantProfile?.billingFrequency)} rent payment`;
  const checkoutAmount = Number(amount || 0);
  const commissionPreview = useMemo(
    () =>
      calculateCommissionPreview({
        amount: checkoutAmount,
        annualRent: annualRentAmount,
        billingCyclePrice: billingCycleAmount,
        frequency: tenantProfile?.billingFrequency,
        baseCommissionPercent: 3,
      }),
    [annualRentAmount, billingCycleAmount, checkoutAmount, tenantProfile?.billingFrequency],
  );

  const pageDescription = useMemo(() => {
    if (isLoadingProfile) {
      return "Loading your live rent balance...";
    }

    if (!tenantProfile) {
      return "Secure rent payment powered by Paystack.";
    }

    if (currentDueAmount <= 0) {
      return `Your lease is fully up to date at ${propertyName}.`;
    }

    return `Pay your live outstanding balance for ${propertyName}.`;
  }, [currentDueAmount, isLoadingProfile, propertyName, tenantProfile]);

  useEffect(() => {
    const tenantToken = tenantSession?.token;
    const tenantSessionExpiry = tenantSession?.expiresAt;

    if (!tenantToken || !tenantSessionExpiry) {
      return;
    }

    const activeTenantToken = tenantToken;
    const activeTenantSessionExpiry = tenantSessionExpiry;
    let active = true;

    async function loadTenantProfile() {
      setIsLoadingProfile(true);

      try {
        const { data } = await apiRequest<TenantMeResponse>("/tenant/auth/me", {
          token: activeTenantToken,
        });

        if (!active) {
          return;
        }

        const dueAmount = data.tenant.currentDue ?? 0;

        setTenantProfile(data.tenant);
        saveTenantSession({
          token: activeTenantToken,
          expiresAt: activeTenantSessionExpiry,
          tenant: data.tenant,
        });
        setPaymentPreset("due");
        setAmount(dueAmount ? `${dueAmount}` : "");
      } catch (error) {
        if (!active) {
          return;
        }

        showToast(
          error instanceof Error
            ? error.message
            : "We could not load your current rent details.",
          "error",
        );
      } finally {
        if (active) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadTenantProfile();

    return () => {
      active = false;
    };
  }, [
    dataRefreshVersion,
    saveTenantSession,
    showToast,
    tenantSession?.expiresAt,
    tenantSession?.token,
  ]);

  useEffect(() => {
    const reference =
      typeof router.query.reference === "string" ? router.query.reference : null;
    const tenantToken = tenantSession?.token;

    if (!reference || !tenantToken) {
      return;
    }

    let active = true;

    async function verifyPayment() {
      setIsVerifying(true);
      setVerificationMessage("Confirming your Paystack payment...");

      try {
        const { data } = await apiRequest<VerifiedPaymentResponse>(
          "/tenant/payments/verify",
          {
            method: "POST",
            token: tenantToken,
            body: { reference },
          },
        );

        if (!active) {
          return;
        }

        setVerifiedPayment(data.payment);
        setVerificationMessage(
          `Payment confirmed. Receipt ${data.payment.reference} was recorded successfully.`,
        );
        refreshData();
        showToast("Payment verified successfully", "success");
        void router.replace("/tenant/pay", undefined, { shallow: true });
      } catch (error) {
        if (!active) {
          return;
        }

        setVerificationMessage(
          error instanceof Error
            ? error.message
            : "We could not verify this payment yet.",
        );
      } finally {
        if (active) {
          setIsVerifying(false);
        }
      }
    }

    void verifyPayment();

    return () => {
      active = false;
    };
  }, [refreshData, router, router.query.reference, showToast, tenantSession?.token]);

  async function initializePayment(action: "open" | "share") {
    if (!tenantSession?.token) {
      showToast("Tenant session missing. Please sign in again.", "error");
      return;
    }

    if (currentDueAmount <= 0 || checkoutAmount <= 0) {
      showToast("There is no outstanding balance to pay right now.", "info");
      return;
    }

    setInitializingAction(action);
    setVerificationMessage("");

    try {
      const { data } = await apiRequest<InitializePaymentResponse>(
        "/tenant/payments/initialize",
        {
          method: "POST",
          token: tenantSession.token,
          body: {
            amount: checkoutAmount,
            periodLabel: paymentPeriodLabel,
          },
        },
      );

      if (action === "share") {
        const shareMessage = `Help me complete my DoorRent rent payment for ${propertyName}, ${unitLabel}. Pay securely via Paystack: ${data.authorizationUrl}`;

        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({
            title: "DoorRent rent payment link",
            text: shareMessage,
            url: data.authorizationUrl,
          });
        } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(data.authorizationUrl);
        } else {
          setVerificationMessage(`Share this Paystack payment link with your helper: ${data.authorizationUrl}`);
        }

        showToast("Paystack payment link is ready to share.", "success");
        return;
      }

      showToast("Redirecting to Paystack checkout...", "info");
      window.location.href = data.authorizationUrl;
    } catch (error) {
      setVerificationMessage(
        error instanceof Error
          ? error.message
          : "We could not initialize Paystack checkout.",
      );
      showToast(
        action === "share" ? "Payment link could not be created" : "Payment could not be started",
        "error",
      );
    } finally {
      setInitializingAction(null);
    }
  }

  return (
    <>
      <PageMeta title="DoorRent — Pay Rent" />
      <TenantPortalShell topbarTitle="Pay Rent" breadcrumb="Dashboard → Pay Rent">
        <PageHeader title="Pay Rent" description={pageDescription} />

        {verificationMessage ? (
          <div
            className="card"
            style={{
              marginBottom: 16,
              borderColor: verifiedPayment ? "rgba(26,107,74,0.18)" : undefined,
              background: verifiedPayment ? "var(--green-light)" : undefined,
            }}
          >
            <div className="card-body" style={{ padding: 16 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: verifiedPayment ? "var(--green)" : "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {isVerifying
                  ? "Verifying payment"
                  : verifiedPayment
                    ? "Payment received"
                    : "Payment update"}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>
                {verificationMessage}
              </div>
              {verifiedPayment ? (
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--ink3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Amount
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {verifiedPayment.amount}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--ink3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                  >
                      DoorRent fee
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {verifiedPayment.platformFee}
                    </div>
                    {verifiedPayment.commissionFormulaLabel ? (
                      <div className="td-muted" style={{ marginTop: 4 }}>
                        {verifiedPayment.commissionFormulaLabel}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--ink3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Landlord share
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {verifiedPayment.landlordSettlement}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Payment Summary</div>
            </div>
            <div className="card-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Property</span>
                <span style={{ fontWeight: 500 }}>{propertyName}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Unit</span>
                <span style={{ fontWeight: 500 }}>{unitLabel}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Billing schedule</span>
                <span style={{ fontWeight: 500 }}>{billingSchedule}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Current due</span>
                <span style={{ fontWeight: 600, color: currentDueAmount ? "var(--red)" : "var(--green)" }}>
                  {tenantProfile?.currentDueFormatted ?? "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Paid this lease</span>
                <span style={{ fontWeight: 500 }}>
                  {tenantProfile?.totalPaidThisLeaseFormatted ?? "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Lease total</span>
                <span style={{ fontWeight: 500 }}>
                  {tenantProfile?.leaseTotalFormatted ?? "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Annual equivalent</span>
                <span style={{ fontWeight: 500 }}>
                  {tenantProfile?.annualRentFormatted ?? "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Monthly equivalent</span>
                <span style={{ fontWeight: 500 }}>
                  {tenantProfile?.monthlyEquivalentFormatted ?? "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Lease term</span>
                <span style={{ fontWeight: 500 }}>
                  {tenantProfile?.leaseStart ?? "—"} → {tenantProfile?.leaseEnd ?? "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Checkout type</span>
                <span style={{ fontWeight: 500 }}>{paymentPeriodLabel}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Commission rule</span>
                <span style={{ fontWeight: 500 }}>
                  {checkoutAmount > 0 ? commissionPreview.commissionFormulaLabel : "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Estimated DoorRent commission</span>
                <span style={{ fontWeight: 500 }}>
                  {checkoutAmount > 0 ? formatNaira(commissionPreview.commissionAmount) : "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--ink2)" }}>Estimated landlord settlement</span>
                <span style={{ fontWeight: 500 }}>
                  {checkoutAmount > 0
                    ? formatNaira(commissionPreview.landlordSettlementAmount)
                    : "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  marginTop: 4,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>Current checkout</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                  {checkoutAmount ? formatNaira(checkoutAmount) : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Payment Amount</div>
            </div>
            <div className="card-body">
              {currentDueAmount > 0 ? (
                <>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentPreset("due");
                        setAmount(`${currentDueAmount}`);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 220,
                        padding: 12,
                        border:
                          paymentPreset === "due"
                            ? "2px solid var(--accent)"
                            : "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        textAlign: "center",
                        cursor: "pointer",
                        background:
                          paymentPreset === "due" ? "var(--accent-light)" : "transparent",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            paymentPreset === "due" ? "var(--accent)" : "var(--ink2)",
                        }}
                      >
                        Outstanding balance
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color:
                            paymentPreset === "due" ? "var(--accent)" : "var(--ink2)",
                        }}
                      >
                        {formatNaira(currentDueAmount)}
                      </div>
                      <div className="td-muted" style={{ marginTop: 6 }}>
                        Pay everything still owed on this lease.
                      </div>
                    </button>

                    {showCyclePreset ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentPreset("cycle");
                          setAmount(`${cycleCheckoutAmount}`);
                        }}
                        style={{
                          flex: 1,
                          minWidth: 220,
                          padding: 12,
                          border:
                            paymentPreset === "cycle"
                              ? "2px solid var(--accent)"
                              : "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          textAlign: "center",
                          cursor: "pointer",
                          background:
                            paymentPreset === "cycle"
                              ? "var(--accent-light)"
                              : "transparent",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color:
                              paymentPreset === "cycle"
                                ? "var(--accent)"
                                : "var(--ink2)",
                          }}
                        >
                          Current billing cycle
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color:
                              paymentPreset === "cycle"
                                ? "var(--accent)"
                                : "var(--ink2)",
                          }}
                        >
                          {formatNaira(cycleCheckoutAmount)}
                        </div>
                        <div className="td-muted" style={{ marginTop: 6 }}>
                          Equivalent to {billingSchedule}.
                        </div>
                      </button>
                    ) : null}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Amount (₦)</label>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      value={amount}
                      readOnly
                      disabled
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.6 }}>
                    {isLoadingProfile
                      ? "Loading your live rent details..."
                      : `This checkout is locked to the live balance from your lease. If you have paid part of your rent already, DoorRent only shows what remains, such as ${formatNaira(currentDueAmount)} instead of the full ${tenantProfile?.leaseTotalFormatted ?? tenantProfile?.annualRentFormatted ?? "rent amount"}.`}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: 16,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--green-light)",
                    border: "1px solid rgba(26,107,74,0.18)",
                    color: "var(--green)",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Your account is currently fully paid up. When your landlord updates the rent or
                  a new billing cycle becomes due, the live amount will appear here automatically.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary btn-full"
              style={{ padding: 14, fontSize: 15 }}
              onClick={() => void initializePayment("open")}
              disabled={Boolean(initializingAction) || !amount || currentDueAmount <= 0}
            >
              <CardIcon />
              {initializingAction === "open"
                ? "Connecting to Paystack..."
                : currentDueAmount <= 0
                  ? "No balance due"
                  : `Pay ${checkoutAmount ? formatNaira(checkoutAmount) : "₦0"} via Paystack`}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              style={{ padding: 14, fontSize: 15 }}
              onClick={() => void initializePayment("share")}
              disabled={Boolean(initializingAction) || !amount || currentDueAmount <= 0}
            >
              {initializingAction === "share"
                ? "Creating share link..."
                : "Share Paystack link with a helper"}
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--ink3)" }}>
            Secured by Paystack. DoorRent applies a 3% base commission per rent year covered,
            so multi-year upfront rent can carry a higher total commission in the same
            collection.
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
