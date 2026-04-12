import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import { sanitizeExternalRedirectUrl } from "../../lib/frontend-security";
import { formatEstateCurrency, type EstateDashboardData } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

type ChargeRow = EstateDashboardData["charges"][number];

interface ResidentPaymentRow {
  id: string;
  reference: string | null;
  amount: number;
  status: string;
  method: string;
  periodLabel: string;
  createdAt: string;
  paidAt: string | null;
}

interface ResidentDuesData {
  charges: ChargeRow[];
  balance: number;
  payments: ResidentPaymentRow[];
  paymentSupport?: {
    email?: string | null;
    phone?: string | null;
  };
}

interface InitializeResidentPaymentResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  provider: "paystack";
  amount: string;
  platformFee: string;
  landlordSettlement: string;
  callbackUrl: string;
}

interface VerifyResidentPaymentResponse {
  payment: {
    id: string;
    reference: string;
    amount: string;
    status: string;
    date: string;
    method?: string;
    property?: string;
    unit?: string;
    periodLabel?: string;
    receiptNumber?: string | null;
  };
}

export default function ResidentDuesPage() {
  const router = useRouter();
  const { residentSession } = useResidentPortalSession();
  const { refreshData, showToast } = usePrototypeUI();
  const token = residentSession?.token;
  const paymentReference =
    typeof router.query.reference === "string"
      ? router.query.reference
      : typeof router.query.trxref === "string"
        ? router.query.trxref
        : null;

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [payments, setPayments] = useState<ResidentPaymentRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [initializing, setInitializing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [paymentSupport, setPaymentSupport] = useState<
    ResidentDuesData["paymentSupport"] | undefined
  >(undefined);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    setLoading(true);

    apiRequest<ResidentDuesData>("/resident/dues", { token })
      .then(({ data }) => {
        if (!active) {
          return;
        }

        setCharges(data.charges ?? []);
        setPayments(data.payments ?? []);
        setBalance(data.balance ?? 0);
        setPaymentSupport(data.paymentSupport ?? undefined);
        setAmount((current) =>
          current || (data.balance ?? 0) <= 0 ? current : `${data.balance ?? 0}`,
        );
      })
      .catch(() => null)
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!paymentReference || !token) {
      return;
    }

    let active = true;

    async function verifyPayment() {
      setVerifying(true);
      setVerificationMessage("Confirming your Paystack payment...");

      try {
        const { data } = await apiRequest<VerifyResidentPaymentResponse>(
          "/resident/payments/verify",
          {
            method: "POST",
            token,
            body: { reference: paymentReference },
          },
        );

        if (!active) {
          return;
        }

        setVerificationMessage(
          data.payment.receiptNumber
            ? `Payment confirmed. Receipt ${data.payment.receiptNumber} is ready.`
            : "Payment confirmed successfully.",
        );
        refreshData();
        showToast("Estate dues payment verified successfully", "success");
        void router.replace("/resident/dues", undefined, { shallow: true });
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
          setVerifying(false);
        }
      }
    }

    void verifyPayment();

    return () => {
      active = false;
    };
  }, [paymentReference, refreshData, router, showToast, token]);

  async function handlePayNow() {
    if (!token) {
      return;
    }

    const checkoutAmount = Number(amount || 0);

    if (checkoutAmount <= 0) {
      showToast("Enter a valid payment amount.", "error");
      return;
    }

    setInitializing(true);
    setVerificationMessage("");

    try {
      const { data } = await apiRequest<InitializeResidentPaymentResponse>(
        "/resident/payments/initialize",
        {
          method: "POST",
          token,
          body: {
            amount: checkoutAmount,
            periodLabel: "Estate dues payment",
          },
        },
      );

      const safeAuthorizationUrl = sanitizeExternalRedirectUrl(
        data.authorizationUrl,
        "payment",
      );

      if (!safeAuthorizationUrl) {
        throw new Error("We could not verify the Paystack checkout destination.");
      }

      showToast("Redirecting to Paystack checkout...", "info");
      window.location.href = safeAuthorizationUrl;
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "We could not initialize this dues payment.",
        "error",
      );
    } finally {
      setInitializing(false);
    }
  }

  const chargeColumns = useMemo<TableColumn<ChargeRow>[]>(
    () => [
      {
        key: "title",
        label: "Charge",
        render: (row) => <strong>{row.title}</strong>,
      },
      {
        key: "frequency",
        label: "Frequency",
        render: (row) => <StatusBadge tone="blue">{row.frequency}</StatusBadge>,
      },
      {
        key: "billingBasis",
        label: "Basis",
        render: (row) => (
          <span className="td-muted">
            {row.billingBasis === "UNIT_BASED" ? "Per house" : "Per resident"}
          </span>
        ),
      },
      {
        key: "amount",
        label: "Amount",
        render: (row) => <strong>{formatEstateCurrency(row.amount)}</strong>,
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge tone={row.status === "ACTIVE" ? "green" : "gray"}>
            {row.status}
          </StatusBadge>
        ),
      },
    ],
    [],
  );

  const paymentColumns = useMemo<TableColumn<ResidentPaymentRow>[]>(
    () => [
      {
        key: "reference",
        label: "Reference",
        render: (row) => (
          <div>
            <strong>{row.reference ?? "—"}</strong>
            <div className="td-muted" style={{ fontSize: 12 }}>
              {row.periodLabel}
            </div>
          </div>
        ),
      },
      {
        key: "amount",
        label: "Amount",
        render: (row) => <strong>{formatEstateCurrency(row.amount)}</strong>,
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge
            tone={
              row.status === "PAID"
                ? "green"
                : row.status === "FAILED"
                  ? "red"
                  : "amber"
            }
          >
            {row.status}
          </StatusBadge>
        ),
      },
      {
        key: "paidAt",
        label: "Date",
        render: (row) => (
          <span className="td-muted">
            {new Date(row.paidAt ?? row.createdAt).toLocaleString("en-NG")}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <ResidentPortalShell topbarTitle="My Dues" breadcrumb="My Dues">
      <PageMeta title="My Dues — Resident Portal" />
      <PageHeader
        title="My Dues"
        description="Your estate charges, outstanding balance, and online payment history."
      />

      <div
        className="stats-grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginBottom: 24,
        }}
      >
        <div className="stat-card">
          <div className="stat-label">Outstanding Balance</div>
          <div className="stat-value">{formatEstateCurrency(balance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Charges</div>
          <div className="stat-value">
            {charges.filter((charge) => charge.status === "ACTIVE").length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Online Payments</div>
          <div className="stat-value">{payments.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 520 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                Pay estate dues online
              </h3>
              <p className="td-muted" style={{ fontSize: 13, margin: 0 }}>
                Paystack checkout is now available for your estate dues. You can
                pay the full balance or enter a smaller amount up to your current
                due.
              </p>
              {paymentSupport?.email || paymentSupport?.phone ? (
                <p className="td-muted" style={{ fontSize: 12, marginTop: 10 }}>
                  Need help?{" "}
                  {paymentSupport.email ? `Email ${paymentSupport.email}` : ""}
                  {paymentSupport.email && paymentSupport.phone ? " or " : ""}
                  {paymentSupport.phone ? `call ${paymentSupport.phone}` : ""}
                  .
                </p>
              ) : null}
            </div>

            <div
              style={{
                minWidth: 280,
                display: "grid",
                gap: 12,
              }}
            >
              <label>
                Payment amount
                <input
                  className="form-input"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                />
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setAmount(balance > 0 ? `${balance}` : "")}
                >
                  Use full balance
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handlePayNow()}
                  disabled={initializing || balance <= 0}
                >
                  {initializing ? "Opening Paystack..." : "Pay Online"}
                </button>
              </div>
            </div>
          </div>

          {verifying || verificationMessage ? (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--bg)",
                fontSize: 13,
                color: "var(--ink3)",
              }}
            >
              {verificationMessage || "Confirming your Paystack payment..."}
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <strong>Your Estate Charges</strong>
        </div>
        <DataTable
          columns={chargeColumns}
          rows={charges}
          loading={loading}
          emptyMessage="No charges configured for your estate."
        />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <strong>Recent Dues Payments</strong>
        </div>
        <DataTable
          columns={paymentColumns}
          rows={payments}
          loading={loading}
          emptyMessage="No dues payments recorded yet."
        />
      </div>
    </ResidentPortalShell>
  );
}
