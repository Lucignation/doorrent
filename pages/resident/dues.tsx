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
import { formatEstateCurrency } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

interface ChargeRow {
  id: string;
  title: string;
  amount: number;
  unitAmount: number;
  frequency: string;
  billingBasis: "UNIT_BASED" | "RESIDENT_BASED";
  status: "DUE" | "CLEAR";
  dueNow: boolean;
  periodsDue: number;
  dueFrom: string | null;
  dueTo: string | null;
  nextDueDate: string | null;
  overdueSince: string | null;
  note?: string | null;
}

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
  ledger: {
    duesStartDate: string | null;
    lastPaidAt: string | null;
    nextDueDate: string | null;
    totalPaid: number;
    outstandingBalance: number;
  };
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
  const [ledger, setLedger] = useState<ResidentDuesData["ledger"] | null>(null);
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
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
        setLedger(data.ledger ?? null);
        setPaymentSupport(data.paymentSupport ?? undefined);
        setSelectedChargeIds(
          (data.charges ?? [])
            .filter((charge) => charge.dueNow && charge.amount > 0)
            .map((charge) => charge.id),
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

    const selectedCharges = charges.filter(
      (charge) => charge.dueNow && selectedChargeIds.includes(charge.id),
    );
    const checkoutAmount = selectedCharges.reduce(
      (sum, charge) => sum + charge.amount,
      0,
    );

    if (selectedCharges.length <= 0 || checkoutAmount <= 0) {
      showToast("Choose at least one outstanding dues item to pay.", "error");
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
            chargeIds: selectedCharges.map((charge) => charge.id),
            periodLabel: `Estate dues payment · ${selectedCharges
              .map((charge) => charge.title)
              .join(", ")}`,
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

  const dueCharges = useMemo(
    () => charges.filter((charge) => charge.dueNow && charge.amount > 0),
    [charges],
  );

  const selectedTotal = useMemo(
    () =>
      dueCharges
        .filter((charge) => selectedChargeIds.includes(charge.id))
        .reduce((sum, charge) => sum + charge.amount, 0),
    [dueCharges, selectedChargeIds],
  );

  function toggleChargeSelection(chargeId: string) {
    setSelectedChargeIds((current) =>
      current.includes(chargeId)
        ? current.filter((id) => id !== chargeId)
        : [...current, chargeId],
    );
  }

  const chargeColumns = useMemo<TableColumn<ChargeRow>[]>(
    () => [
      {
        key: "title",
        label: "Charge",
        render: (row) => (
          <div>
            <strong>{row.title}</strong>
            {row.note ? (
              <div className="td-muted" style={{ fontSize: 12 }}>
                {row.note}
              </div>
            ) : null}
          </div>
        ),
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
        render: (row) => (
          <div>
            <strong>{formatEstateCurrency(row.amount)}</strong>
            {row.periodsDue > 1 ? (
              <div className="td-muted" style={{ fontSize: 12 }}>
                {formatEstateCurrency(row.unitAmount)} x {row.periodsDue}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "dueWindow",
        label: "Coverage",
        render: (row) => (
          <span className="td-muted">
            {row.dueFrom
              ? `${new Date(row.dueFrom).toLocaleDateString("en-NG")} ${
                  row.dueTo
                    ? `to ${new Date(row.dueTo).toLocaleDateString("en-NG")}`
                    : ""
                }`
              : "—"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge tone={row.status === "DUE" ? "amber" : "green"}>
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
          <div className="stat-label">Due Items</div>
          <div className="stat-value">{dueCharges.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Paid</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {ledger?.lastPaidAt
              ? new Date(ledger.lastPaidAt).toLocaleDateString("en-NG")
              : "Not set"}
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
                Select the exact dues items you want to clear. Annual charges
                follow your own dues timeline, so your total is based on your
                resident ledger and previous payments.
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
                minWidth: 320,
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 14,
                  borderRadius: 14,
                  background: "var(--bg)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <strong style={{ fontSize: 14 }}>Selected dues</strong>
                  <strong>{formatEstateCurrency(selectedTotal)}</strong>
                </div>
                <div className="td-muted" style={{ fontSize: 12 }}>
                  {selectedChargeIds.length} item(s) selected
                </div>
                {dueCharges.length > 0 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {dueCharges.map((charge) => {
                      const selected = selectedChargeIds.includes(charge.id);

                      return (
                        <label
                          key={charge.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: selected
                              ? "1px solid rgba(34, 139, 94, 0.28)"
                              : "1px solid var(--border)",
                            background: selected
                              ? "rgba(34, 139, 94, 0.06)"
                              : "var(--surface)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleChargeSelection(charge.id)}
                            style={{ marginTop: 4 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                flexWrap: "wrap",
                              }}
                            >
                              <strong>{charge.title}</strong>
                              <strong>{formatEstateCurrency(charge.amount)}</strong>
                            </div>
                            <div className="td-muted" style={{ fontSize: 12, marginTop: 4 }}>
                              {charge.periodsDue > 1
                                ? `${charge.periodsDue} ${charge.frequency.toLowerCase()} periods are due`
                                : `${charge.frequency} charge`}
                              {charge.overdueSince
                                ? ` · overdue since ${new Date(
                                    charge.overdueSince,
                                  ).toLocaleDateString("en-NG")}`
                                : ""}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="td-muted" style={{ fontSize: 12 }}>
                    You do not have any outstanding dues right now.
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    setSelectedChargeIds(dueCharges.map((charge) => charge.id))
                  }
                  disabled={dueCharges.length <= 0}
                >
                  Select all due items
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedChargeIds([])}
                  disabled={selectedChargeIds.length <= 0}
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handlePayNow()}
                  disabled={initializing || selectedTotal <= 0}
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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <strong>Dues Ledger</strong>
        </div>
        <div
          className="card-body"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <div className="td-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Dues started
            </div>
            <strong>
              {ledger?.duesStartDate
                ? new Date(ledger.duesStartDate).toLocaleDateString("en-NG")
                : "Not set"}
            </strong>
          </div>
          <div>
            <div className="td-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Last paid
            </div>
            <strong>
              {ledger?.lastPaidAt
                ? new Date(ledger.lastPaidAt).toLocaleDateString("en-NG")
                : "Not set"}
            </strong>
          </div>
          <div>
            <div className="td-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Next due
            </div>
            <strong>
              {ledger?.nextDueDate
                ? new Date(ledger.nextDueDate).toLocaleDateString("en-NG")
                : "Pending clearance"}
            </strong>
          </div>
          <div>
            <div className="td-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Total paid
            </div>
            <strong>{formatEstateCurrency(ledger?.totalPaid ?? 0)}</strong>
          </div>
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
