import { useEffect, useMemo, useState } from "react";
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
  };
  summary: {
    collectedThisMonthFormatted: string;
    outstandingBalanceFormatted: string;
    annualDueThisYearFormatted: string;
    ytdRevenueFormatted: string;
    arrearsCount: number;
    paidCount: number;
  };
  filters: {
    properties: Array<{
      id: string;
      name: string;
    }>;
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
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion, openModal, showToast } = usePrototypeUI();
  const [paymentData, setPaymentData] = useState<LandlordPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

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
  }, [dataRefreshVersion, landlordSession?.token]);

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
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => openReceipt(row)}
          disabled={!row.receiptNumber}
        >
          {row.receiptNumber ? "Print" : "Pending"}
        </button>
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
            <div className="stat-sub">Live rent inflow</div>
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
            <div className="stat-label">Active Rent Book</div>
            <div className="stat-value">
              {paymentData?.summary.annualDueThisYearFormatted ?? "—"}
            </div>
            <div className="stat-sub">Across active tenancies</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">YTD Revenue</div>
            <div className="stat-value">{paymentData?.summary.ytdRevenueFormatted ?? "—"}</div>
            <div className="stat-sub">Payments confirmed this year</div>
          </div>
        </div>

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
              rows={filteredPayments}
              emptyMessage={loading ? "Loading payments..." : "No payments found."}
            />
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
