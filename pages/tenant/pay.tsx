import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { CardIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

interface InitializePaymentResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  amount: string;
  platformFee: string;
  landlordSettlement: string;
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
    property: string;
    unit: string;
  };
}

export default function TenantPayPage() {
  const router = useRouter();
  const { showToast } = usePrototypeUI();
  const { tenantSession } = useTenantPortalSession();
  const [amount, setAmount] = useState("150000");
  const [paymentMode, setPaymentMode] = useState<"full" | "partial">("full");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verifiedPayment, setVerifiedPayment] =
    useState<VerifiedPaymentResponse["payment"] | null>(null);

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
  }, [router, router.query.reference, showToast, tenantSession?.token]);

  async function initializePayment() {
    if (!tenantSession?.token) {
      showToast("Tenant session missing. Please sign in again.", "error");
      return;
    }

    setIsInitializing(true);
    setVerificationMessage("");

    try {
      const { data } = await apiRequest<InitializePaymentResponse>(
        "/tenant/payments/initialize",
        {
          method: "POST",
          token: tenantSession.token,
          body: {
            amount: Number(amount),
            periodLabel: "April 2026 Rent",
          },
        },
      );

      showToast("Redirecting to Paystack checkout...", "info");
      window.location.href = data.authorizationUrl;
    } catch (error) {
      setVerificationMessage(
        error instanceof Error
          ? error.message
          : "We could not initialize Paystack checkout.",
      );
      showToast("Payment could not be started", "error");
    } finally {
      setIsInitializing(false);
    }
  }

  return (
    <>
      <PageMeta title="DoorRent — Pay Rent" />
      <TenantPortalShell topbarTitle="Pay Rent" breadcrumb="Dashboard → Pay Rent">
        <PageHeader title="Pay Rent" description="Secure payment powered by Paystack" />

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
                {isVerifying ? "Verifying payment" : verifiedPayment ? "Payment received" : "Payment update"}
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
                    <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Amount
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{verifiedPayment.amount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      DoorRent fee
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{verifiedPayment.platformFee}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Landlord share
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{verifiedPayment.landlordSettlement}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Payment Summary</div>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>Property</span>
                <span style={{ fontWeight: 500 }}>Lekki Gardens Estate</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>Unit</span>
                <span style={{ fontWeight: 500 }}>A3 — 2 Bedroom</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>Period</span>
                <span style={{ fontWeight: 500 }}>April 2026</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>Due Date</span>
                <span style={{ fontWeight: 500 }}>April 1, 2026</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>DoorRent platform fee</span>
                <span style={{ fontWeight: 500 }}>3%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", marginTop: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Total Due</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                  ₦150,000
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Payment Amount</div>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode("full");
                    setAmount("150000");
                  }}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: paymentMode === "full" ? "2px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    textAlign: "center",
                    cursor: "pointer",
                    background: paymentMode === "full" ? "var(--accent-light)" : "transparent",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: paymentMode === "full" ? "var(--accent)" : "var(--ink2)" }}>
                    Full Payment
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: paymentMode === "full" ? "var(--accent)" : "var(--ink2)" }}>
                    ₦150,000
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("partial")}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: paymentMode === "partial" ? "2px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    textAlign: "center",
                    cursor: "pointer",
                    background: paymentMode === "partial" ? "var(--accent-light)" : "transparent",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: paymentMode === "partial" ? "var(--accent)" : "var(--ink2)" }}>
                    Partial Payment
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: paymentMode === "partial" ? "var(--accent)" : "var(--ink2)" }}>
                    Custom
                  </div>
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₦)</label>
                <input
                  className="form-input"
                  type="number"
                  min={1000}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-full"
            style={{ padding: 14, fontSize: 15 }}
            onClick={() => void initializePayment()}
            disabled={isInitializing || !amount}
          >
            <CardIcon />
            {isInitializing ? "Connecting to Paystack..." : `Pay ₦${Number(amount || 0).toLocaleString("en-NG")} via Paystack`}
          </button>
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--ink3)" }}>
            🔒 Secured by Paystack · DoorRent keeps 3% and the landlord settlement is tracked automatically
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
