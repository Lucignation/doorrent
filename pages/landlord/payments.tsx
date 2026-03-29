import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { printReceipt } from "../../lib/receipt-print";
import type { BadgeTone, TableColumn } from "../../types/app";

interface PaymentRow {
  id: string;
  reference: string;
  receiptNumber: string | null;
  tenant: string;
  tenantEmail: string;
  property: string;
  unit: string;
  propertyUnit: string;
  amount: string;
  amountRaw: number;
  date: string;
  dateIso: string;
  method: string;
  collectionSource?: string;
  status: string;
  statusLabel: string;
  platformFee: string;
  landlordSettlement: string;
  periodLabel: string;
  issuedAt: string;
}

interface ArrearsRow {
  id: string;
  tenant: string;
  tenantEmail: string;
  unit: string;
  amount: string;
  amountRaw: number;
  status: string;
  statusLabel: string;
  reminder: string;
}

interface LandlordPaymentsResponse {
  landlord: {
    id: string;
    companyName: string;
    billingModel: string;
    commissionRatePercent: number;
  };
  summary: {
    collectedThisMonthFormatted: string;
    outstandingBalanceFormatted: string;
    annualDueThisYearFormatted: string;
    ytdRevenueFormatted: string;
    arrearsCount: number;
    paidCount: number;
    offlineCollectionsThisYearFormatted: string;
    platformCollectionsThisYearFormatted: string;
    commissionTrackedThisYearFormatted: string;
  };
  filters: {
    properties: Array<{
      id: string;
      name: string;
    }>;
  };
  formOptions: {
    offlineCollectionTenants: Array<{
      id: string;
      label: string;
      currentDue: number;
      currentDueFormatted: string;
      status: string;
      hasOutstandingBalance: boolean;
    }>;
  };
  collectionTracking: {
    billingModel: string;
    billingModelLabel: string;
    commissionRatePercent: number;
    commissionPolicyLabel?: string;
    referralPolicyLabel?: string | null;
    canRecordOfflineCollection: boolean;
    canAcceptOnlinePayments: boolean;
    platformCollectionsCount: number;
    platformCollectionsValueFormatted: string;
    offlineCollectionsCount: number;
    offlineCollectionsValueFormatted: string;
    commissionTrackedThisYearFormatted: string;
    reviewFlag?: string | null;
  };
  arrears: ArrearsRow[];
  payments: PaymentRow[];
}

function paymentTone(status: string): BadgeTone {
  if (status === "paid") {
    return "green";
  }

  if (status === "pending") {
    return "amber";
  }

  if (status === "failed") {
    return "red";
  }

  return "blue";
}

export default function LandlordPaymentsPage() {
  const router = useRouter();
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion, openModal, showToast } = usePrototypeUI();
  const [paymentData, setPaymentData] = useState<LandlordPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [offlineForm, setOfflineForm] = useState({
    tenantId: "",
    amount: "",
    paidAt: new Date().toISOString().slice(0, 10),
    periodLabel: "",
    notes: "",
  });
  const [offlineError, setOfflineError] = useState("");
  const [savingOffline, setSavingOffline] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);

  const PAYMENT_HISTORY_PAGE_SIZE = 10;

  useEffect(() => {
    const landlordToken = landlordSession?.token;

    if (!landlordToken) {
      return;
    }

    let cancelled = false;

    async function loadPayments() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordPaymentsResponse>(
          "/landlord/payments",
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setPaymentData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load landlord payments.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token, refreshNonce]);

  useEffect(() => {
    if (
      offlineForm.tenantId ||
      (paymentData?.formOptions.offlineCollectionTenants.length ?? 0) === 0
    ) {
      return;
    }

    setOfflineForm((current) => ({
      ...current,
      tenantId: paymentData?.formOptions.offlineCollectionTenants[0]?.id ?? "",
    }));
  }, [offlineForm.tenantId, paymentData?.formOptions.offlineCollectionTenants]);

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    return (paymentData?.payments ?? []).filter((payment) => {
      const matchesQuery =
        !normalizedQuery ||
        payment.reference.toLowerCase().includes(normalizedQuery) ||
        payment.tenant.toLowerCase().includes(normalizedQuery) ||
        payment.propertyUnit.toLowerCase().includes(normalizedQuery) ||
        payment.periodLabel.toLowerCase().includes(normalizedQuery);
      const matchesProperty =
        propertyFilter === "all" ||
        paymentData?.filters.properties.find((property) => property.id === propertyFilter)
          ?.name === payment.property;
      const paymentDate = new Date(payment.dateIso);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "month" && paymentDate >= monthStart) ||
        (dateFilter === "year" && paymentDate >= yearStart);

      return matchesQuery && matchesProperty && matchesDate;
    });
  }, [dateFilter, paymentData, propertyFilter, query]);

  useEffect(() => {
    setPaymentsPage(1);
  }, [query, propertyFilter, dateFilter]);

  const filteredArrears = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (paymentData?.arrears ?? []).filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.tenant.toLowerCase().includes(normalizedQuery) ||
        row.tenantEmail.toLowerCase().includes(normalizedQuery) ||
        row.unit.toLowerCase().includes(normalizedQuery);
      const matchesProperty =
        propertyFilter === "all" ||
        row.unit.toLowerCase().includes(
          (
            paymentData?.filters.properties.find((property) => property.id === propertyFilter)
              ?.name ?? ""
          ).toLowerCase(),
        );

      return matchesQuery && matchesProperty;
    });
  }, [paymentData, propertyFilter, query]);

  const selectedOfflineTenant = useMemo(
    () =>
      (paymentData?.formOptions.offlineCollectionTenants ?? []).find(
        (tenant) => tenant.id === offlineForm.tenantId,
      ) ?? null,
    [offlineForm.tenantId, paymentData?.formOptions.offlineCollectionTenants],
  );

  const paymentHistoryTotalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAYMENT_HISTORY_PAGE_SIZE),
  );
  const safePaymentsPage = Math.min(paymentsPage, paymentHistoryTotalPages);
  const paginatedPayments = useMemo(() => {
    const startIndex = (safePaymentsPage - 1) * PAYMENT_HISTORY_PAGE_SIZE;
    return filteredPayments.slice(startIndex, startIndex + PAYMENT_HISTORY_PAGE_SIZE);
  }, [filteredPayments, safePaymentsPage]);

  async function recordOfflineCollection() {
    if (!landlordSession?.token) {
      return;
    }

    if (!offlineForm.tenantId) {
      setOfflineError("Select the tenant whose offline rent collection you want to record.");
      return;
    }

    if (!offlineForm.amount || Number(offlineForm.amount) <= 0) {
      setOfflineError("Enter a valid offline collection amount.");
      return;
    }

    if (selectedOfflineTenant && selectedOfflineTenant.currentDue <= 0) {
      setOfflineError(
        "This tenancy does not have any outstanding rent right now. DoorRent does not support recording offline overpayments on this screen yet.",
      );
      return;
    }

    if (
      selectedOfflineTenant &&
      Number(offlineForm.amount) > selectedOfflineTenant.currentDue
    ) {
      setOfflineError(
        `You can only record up to ${selectedOfflineTenant.currentDueFormatted} for this tenancy right now.`,
      );
      return;
    }

    setSavingOffline(true);
    setOfflineError("");

    try {
      await apiRequest("/landlord/payments/offline", {
        method: "POST",
        token: landlordSession.token,
        body: {
          tenantId: offlineForm.tenantId,
          amount: Number(offlineForm.amount),
          paidAt: offlineForm.paidAt || undefined,
          periodLabel: offlineForm.periodLabel || undefined,
          notes: offlineForm.notes || undefined,
        },
      });

      showToast("Offline full-service collection recorded", "success");
      setOfflineForm((current) => ({
        ...current,
        amount: "",
        periodLabel: "",
        notes: "",
      }));
      setRefreshNonce((current) => current + 1);
    } catch (requestError) {
      setOfflineError(
        requestError instanceof Error
          ? requestError.message
          : "We could not record this offline collection.",
      );
    } finally {
      setSavingOffline(false);
    }
  }

  function openReceipt(payment: PaymentRow) {
    if (!payment.receiptNumber || !paymentData?.landlord.companyName) {
      showToast("This payment does not have a receipt yet.", "info");
      return;
    }

    try {
      printReceipt({
        companyName: paymentData.landlord.companyName,
        receiptNumber: payment.receiptNumber,
        issuedAt: payment.issuedAt,
        amount: payment.amount,
        tenant: payment.tenant,
        tenantEmail: payment.tenantEmail,
        propertyUnit: payment.propertyUnit,
        periodLabel: payment.periodLabel,
        reference: payment.reference,
        method: payment.method,
        platformFee: payment.platformFee,
        landlordSettlement: payment.landlordSettlement,
      });
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Receipt could not be opened.",
        "error",
      );
    }
  }

  const arrearsColumns: TableColumn<ArrearsRow>[] = [
    {
      key: "tenant",
      label: "Tenant",
      render: (row) => <IdentityCell primary={row.tenant} secondary={row.tenantEmail} />,
    },
    { key: "unit", label: "Property / Unit" },
    {
      key: "amount",
      label: "Outstanding",
      render: (row) => (
        <span style={{ color: "var(--red)", fontWeight: 700 }}>{row.amount}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={row.status === "overdue" ? "red" : "amber"}>
          {row.statusLabel}
        </StatusBadge>
      ),
    },
    { key: "reminder", label: "Last Reminder" },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <button
          type="button"
          className="btn btn-danger btn-xs"
          onClick={() => openModal("send-notice")}
        >
          Send Reminder
        </button>
      ),
    },
  ];

  const paymentColumns: TableColumn<PaymentRow>[] = [
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink3)" }}>
          {row.reference}
        </span>
      ),
    },
    {
      key: "tenant",
      label: "Tenant",
      render: (row) => <IdentityCell primary={row.tenant} secondary={row.tenantEmail} />,
    },
    { key: "propertyUnit", label: "Property / Unit" },
    { key: "periodLabel", label: "Period" },
    { key: "amount", label: "Amount" },
    { key: "date", label: "Date" },
    { key: "method", label: "Method" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={paymentTone(row.status)}>{row.statusLabel}</StatusBadge>
      ),
    },
    {
      key: "receipt",
      label: "Receipt",
      render: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push(`/landlord/payments/${row.id}`)}
          >
            View
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => openReceipt(row)}
            disabled={!row.receiptNumber}
          >
            {row.receiptNumber ? "Print" : "Pending"}
          </button>
        </div>
      ),
    },
  ];

  const description = paymentData
    ? `${paymentData.summary.paidCount} payments recorded · ${paymentData.summary.arrearsCount} tenant(s) still outstanding`
    : loading
      ? "Loading live payment activity..."
      : error || "Payment data is unavailable.";

  return (
    <>
      <PageMeta title="DoorRent — Payments" />
      <LandlordPortalShell topbarTitle="Payments" breadcrumb="Dashboard → Payments">
        <PageHeader title="Payments" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          <div className="stat-card accent-green">
            <div className="stat-label">Collected This Month</div>
            <div className="stat-value">
              {paymentData?.summary.collectedThisMonthFormatted ?? "—"}
            </div>
            <div className="stat-sub">Recorded rent inflow</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Outstanding</div>
            <div className="stat-value">
              {paymentData?.summary.outstandingBalanceFormatted ?? "—"}
            </div>
            <div className="stat-sub">
              {paymentData?.summary.arrearsCount ?? 0} tenant(s) in arrears
            </div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Active Lease Value</div>
            <div className="stat-value">
              {paymentData?.summary.annualDueThisYearFormatted ?? "—"}
            </div>
            <div className="stat-sub">Across active billing schedules</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">YTD Revenue</div>
            <div className="stat-value">{paymentData?.summary.ytdRevenueFormatted ?? "—"}</div>
            <div className="stat-sub">Online and offline rent logged this year</div>
          </div>
        </div>

        {paymentData?.collectionTracking ? (
          <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
            {paymentData.collectionTracking.canRecordOfflineCollection ? (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Record Offline Collection</div>
                    <div className="card-subtitle">
                      Log cash or transfer payments that happened outside DoorRent so the
                      workspace still keeps complete rent records and receipt history.
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {offlineError ? (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 12,
                        borderRadius: "var(--radius-sm)",
                        background: "var(--red-light)",
                        border: "1px solid rgba(192,57,43,0.18)",
                        color: "var(--red)",
                        fontSize: 12,
                      }}
                    >
                      {offlineError}
                    </div>
                  ) : null}
                  <div className="form-group">
                    <label className="form-label">Tenant</label>
                    <select
                      className="form-input"
                      value={offlineForm.tenantId}
                      onChange={(event) =>
                        setOfflineForm((current) => ({
                          ...current,
                          tenantId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select tenant</option>
                      {(paymentData.formOptions.offlineCollectionTenants ?? []).map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.label}
                          {tenant.hasOutstandingBalance
                            ? ` · Due ${tenant.currentDueFormatted}`
                            : " · No outstanding balance"}
                        </option>
                      ))}
                    </select>
                    <div className="td-muted" style={{ marginTop: 6 }}>
                      {selectedOfflineTenant
                        ? selectedOfflineTenant.currentDue > 0
                          ? `Current due: ${selectedOfflineTenant.currentDueFormatted}`
                          : "This tenancy has no outstanding balance right now. Offline overpayments are not supported on this form yet."
                        : "Choose the tenancy that received the offline payment."}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Amount (₦)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={offlineForm.amount}
                        max={selectedOfflineTenant?.currentDue || undefined}
                        onChange={(event) =>
                          setOfflineForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Collection Date</label>
                      <input
                        className="form-input"
                        type="date"
                        value={offlineForm.paidAt}
                        onChange={(event) =>
                          setOfflineForm((current) => ({
                            ...current,
                            paidAt: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Period Label</label>
                      <input
                        className="form-input"
                        placeholder="March 2026 Rent"
                        value={offlineForm.periodLabel}
                        onChange={(event) =>
                          setOfflineForm((current) => ({
                            ...current,
                            periodLabel: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <input
                        className="form-input"
                        placeholder="Bank transfer received offline"
                        value={offlineForm.notes}
                        onChange={(event) =>
                          setOfflineForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void recordOfflineCollection()}
                    disabled={
                      savingOffline ||
                      Boolean(selectedOfflineTenant && selectedOfflineTenant.currentDue <= 0)
                    }
                  >
                    {savingOffline ? "Recording..." : "Record Offline Collection"}
                  </button>
                  <div className="td-muted" style={{ marginTop: 8 }}>
                    Offline collections on this form must be less than or equal to the tenant&apos;s
                    current outstanding balance. Overpayments and rent credits need a separate
                    prepayment flow.
                  </div>
                </div>
              </div>
            ) : null}

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Collection Tracking</div>
                  <div className="card-subtitle">
                    {paymentData.collectionTracking.billingModelLabel} billing model
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 12 }}>
                  <div className="stat-card accent-blue">
                    <div className="stat-label">Platform Logged</div>
                    <div className="stat-value">
                      {paymentData.collectionTracking.platformCollectionsValueFormatted}
                    </div>
                    <div className="stat-sub">
                      {paymentData.collectionTracking.platformCollectionsCount} payments
                    </div>
                  </div>
                  <div className="stat-card accent-amber">
                    <div className="stat-label">Offline Logged</div>
                    <div className="stat-value">
                      {paymentData.collectionTracking.offlineCollectionsValueFormatted}
                    </div>
                    <div className="stat-sub">
                      {paymentData.collectionTracking.offlineCollectionsCount} payments
                    </div>
                  </div>
                  <div className="stat-card accent-gold">
                    <div className="stat-label">Commission Tracked</div>
                    <div className="stat-value">
                      {paymentData.collectionTracking.commissionTrackedThisYearFormatted}
                    </div>
                    <div className="stat-sub">
                      {paymentData.collectionTracking.canAcceptOnlinePayments
                        ? paymentData.collectionTracking.commissionPolicyLabel ??
                          `${paymentData.collectionTracking.commissionRatePercent}% base commission per rent year covered`
                        : "Not applicable on Basic"}
                    </div>
                  </div>
                </div>
                {paymentData.collectionTracking.canAcceptOnlinePayments &&
                paymentData.collectionTracking.referralPolicyLabel ? (
                  <div className="td-muted" style={{ marginBottom: 12 }}>
                    {paymentData.collectionTracking.referralPolicyLabel}
                  </div>
                ) : null}
                {paymentData.collectionTracking.reviewFlag ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(241, 196, 15, 0.28)",
                      background: "rgba(241, 196, 15, 0.12)",
                      color: "var(--amber)",
                      fontSize: 12,
                      lineHeight: 1.7,
                    }}
                  >
                    {paymentData.collectionTracking.reviewFlag}{" "}
                    {paymentData.collectionTracking.canAcceptOnlinePayments
                      ? "Keep logging offline collections or move rent through DoorRent so your Pro or Enterprise activity stays visible."
                      : "Move rent through DoorRent so your lease activity stays visible on the platform."}
                  </div>
                ) : (
                  <div className="td-muted">
                    {paymentData.collectionTracking.canAcceptOnlinePayments
                      ? "DoorRent tracks both platform collections and offline collections for your payment reporting, including multi-year commission logic."
                      : "Basic keeps a clean record of manual collections and receipts, but online collection automation unlocks on Pro or Enterprise."}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tenant, reference, property, or period..."
            />
          </div>
          <select
            className="filter-select"
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
          >
            <option value="all">All Properties</option>
            {(paymentData?.filters.properties ?? []).map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        <div
          style={{
            marginBottom: 16,
            padding: "16px 20px",
            background: "var(--red-light)",
            border: "1px solid rgba(192,57,43,0.2)",
            borderRadius: "var(--radius)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 12 }}>
            Arrears Watchlist
          </div>
          <DataTable
            columns={arrearsColumns}
            rows={filteredArrears}
            emptyMessage={loading ? "Loading arrears..." : "No outstanding balances."}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Payment History</div>
              <div className="card-subtitle">
                Real-time tenant payments and settlement records.
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={paymentColumns}
              rows={paginatedPayments}
              emptyMessage={loading ? "Loading payments..." : "No payments found."}
            />
            {filteredPayments.length > PAYMENT_HISTORY_PAGE_SIZE ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 20px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div className="td-muted">
                  Showing {(safePaymentsPage - 1) * PAYMENT_HISTORY_PAGE_SIZE + 1}
                  {" "}to{" "}
                  {Math.min(
                    safePaymentsPage * PAYMENT_HISTORY_PAGE_SIZE,
                    filteredPayments.length,
                  )}{" "}
                  of {filteredPayments.length} payments
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPaymentsPage((current) => Math.max(1, current - 1))}
                    disabled={safePaymentsPage <= 1}
                  >
                    Previous
                  </button>
                  <div
                    style={{
                      minWidth: 88,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      color: "var(--ink2)",
                    }}
                  >
                    Page {safePaymentsPage} of {paymentHistoryTotalPages}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setPaymentsPage((current) =>
                        Math.min(paymentHistoryTotalPages, current + 1),
                      )
                    }
                    disabled={safePaymentsPage >= paymentHistoryTotalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
