import Link from "next/link";
import { useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone, TableColumn } from "../../types/app";

interface RentHistoryRow {
  id: string;
  reference: string;
  receiptNumber: string | null;
  amount: string;
  date: string;
  method: string;
  status: string;
  statusLabel: string;
  periodLabel: string;
}

interface TenantRentResponse {
  tenant: {
    id: string;
    name: string;
    email: string;
  };
  landlord: {
    name: string;
    companyName: string;
    email: string;
  };
  property: {
    id: string;
    name: string;
    unitNumber: string;
    unitType: string;
  };
  rent: {
    annualRent: number;
    annualRentFormatted: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePrice: number;
    billingCyclePriceFormatted: string;
    billingSchedule: string;
    leaseTotalFormatted: string;
    monthlyEquivalentFormatted: string;
    currentDueFormatted: string;
    totalPaidThisLeaseFormatted: string;
    depositAmountFormatted: string;
    leaseStartLabel: string;
    leaseEndLabel: string;
    paymentStatus: "paid" | "part_paid" | "unpaid";
    progressPercent: number;
    lastPaymentDate: string;
    lastPaymentAmount: string;
  };
  agreement: {
    id: string;
    title: string;
    status: string;
    sentAt: string;
  } | null;
  paymentHistory: RentHistoryRow[];
}

function paymentTone(status: TenantRentResponse["rent"]["paymentStatus"]): BadgeTone {
  if (status === "paid") {
    return "green";
  }

  if (status === "part_paid") {
    return "amber";
  }

  return "red";
}

export default function TenantRentPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const [rentData, setRentData] = useState<TenantRentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadRent() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantRentResponse>("/tenant/rent", {
          token: tenantToken,
        });

        if (!cancelled) {
          setRentData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your rent details.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRent();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, tenantSession?.token]);

  const historyColumns: TableColumn<RentHistoryRow>[] = [
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink3)" }}>
          {row.reference}
        </span>
      ),
    },
    { key: "periodLabel", label: "Period" },
    { key: "amount", label: "Amount" },
    { key: "date", label: "Date" },
    { key: "method", label: "Method" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={row.status === "paid" ? "green" : "amber"}>
          {row.statusLabel}
        </StatusBadge>
      ),
    },
    {
      key: "receiptNumber",
      label: "Receipt",
      render: (row) =>
        row.receiptNumber ? (
          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{row.receiptNumber}</span>
        ) : (
          <span className="td-muted">Pending</span>
        ),
    },
  ];

  const paymentStatus = rentData?.rent.paymentStatus ?? "unpaid";
  const description = rentData
    ? `${rentData.property.name} · Unit ${rentData.property.unitNumber} · ${rentData.rent.billingSchedule}`
    : loading
      ? "Loading your live rent details..."
      : error || "Your rent details are not available right now.";

  return (
    <>
      <PageMeta title="DoorRent — My Rent" />
      <TenantPortalShell topbarTitle="My Rent" breadcrumb="Dashboard → My Rent">
        <PageHeader title="My Rent" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card accent-green">
            <div className="stat-label">Billing Cycle</div>
            <div className="stat-value">{rentData?.rent.billingCyclePriceFormatted ?? "—"}</div>
            <div className="stat-sub">{rentData?.rent.billingSchedule ?? "Set by your landlord"}</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Current Due</div>
            <div className="stat-value">{rentData?.rent.currentDueFormatted ?? "—"}</div>
            <div className="stat-sub">Outstanding on this lease</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Paid This Lease</div>
            <div className="stat-value">
              {rentData?.rent.totalPaidThisLeaseFormatted ?? "—"}
            </div>
            <div className="stat-sub">Last payment {rentData?.rent.lastPaymentDate ?? "—"}</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Lease Total</div>
            <div className="stat-value">{rentData?.rent.leaseTotalFormatted ?? "—"}</div>
            <div className="stat-sub">Across the active lease term</div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Rent Overview</div>
                <div className="card-subtitle">
                  Track your live rent balance and payment progress at a glance.
                </div>
              </div>
              <StatusBadge tone={paymentTone(paymentStatus)}>
                {paymentStatus === "part_paid"
                  ? "Part Paid"
                  : paymentStatus === "paid"
                    ? "Up to Date"
                    : "Outstanding"}
              </StatusBadge>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    padding: 14,
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "var(--surface2)",
                  }}
                >
                  <div className="td-muted">Property</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {rentData?.property.name ?? "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 4 }}>
                    Unit {rentData?.property.unitNumber ?? "—"} ·{" "}
                    {rentData?.property.unitType ?? "—"}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: "var(--ink2)" }}>Lease payment progress</span>
                    <strong>{rentData?.rent.progressPercent ?? 0}%</strong>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${rentData?.rent.progressPercent ?? 0}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, var(--accent), var(--gold))",
                      }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Billing Schedule</label>
                    <input
                      className="form-input"
                      value={rentData?.rent.billingSchedule ?? "—"}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Payment</label>
                    <input
                      className="form-input"
                      value={rentData?.rent.lastPaymentAmount ?? "—"}
                      disabled
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Monthly Equivalent</label>
                    <input
                      className="form-input"
                      value={rentData?.rent.monthlyEquivalentFormatted ?? "—"}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Annual Equivalent</label>
                    <input
                      className="form-input"
                      value={rentData?.rent.annualRentFormatted ?? "—"}
                      disabled
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Lease Start</label>
                    <input
                      className="form-input"
                      value={rentData?.rent.leaseStartLabel ?? "—"}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lease End</label>
                    <input
                      className="form-input"
                      value={rentData?.rent.leaseEndLabel ?? "—"}
                      disabled
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href="/tenant/pay" className="btn btn-primary btn-sm">
                    Pay Rent
                  </Link>
                  <Link href="/tenant/receipts" className="btn btn-secondary btn-sm">
                    View Receipts
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Agreement & Landlord</div>
                <div className="card-subtitle">
                  Quick reference for your current tenancy.
                </div>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    padding: 14,
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "var(--surface2)",
                  }}
                >
                  <div className="td-muted">Landlord</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {rentData?.landlord.name ?? "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 4 }}>
                    {rentData?.landlord.companyName ?? "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 4 }}>
                    {rentData?.landlord.email ?? "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 8 }}>
                    Deposit held: {rentData?.rent.depositAmountFormatted ?? "—"}
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="td-muted">Current Agreement</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                    {rentData?.agreement?.title ?? "No agreement uploaded yet"}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {rentData?.agreement ? (
                      <StatusBadge
                        tone={
                          rentData.agreement.status === "signed"
                            ? "green"
                            : rentData.agreement.status === "sent"
                              ? "amber"
                              : "gray"
                        }
                      >
                        {rentData.agreement.status}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="gray">Unavailable</StatusBadge>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 8 }}>
                    {rentData?.agreement
                      ? `Last shared ${rentData.agreement.sentAt}`
                      : "Your landlord will share the agreement here when ready."}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    showToast(
                      "Your rent details refresh automatically whenever your landlord updates them.",
                      "info",
                    )
                  }
                >
                  How rent updates work
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Payment History</div>
              <div className="card-subtitle">
                Every payment recorded against this tenancy.
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={historyColumns}
              rows={rentData?.paymentHistory ?? []}
              emptyMessage={loading ? "Loading payments..." : "No rent payments yet."}
            />
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
