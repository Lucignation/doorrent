import { useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { printReceipt } from "../../lib/receipt-print";
import type { TableColumn } from "../../types/app";

interface ReceiptRow {
  id: string;
  reference: string;
  receiptNumber: string | null;
  tenant: string;
  tenantEmail: string;
  propertyUnit: string;
  amount: string;
  dateIso: string;
  method: string;
  periodLabel: string;
  issuedAt: string;
  platformFee: string;
  landlordSettlement: string;
}

interface LandlordReceiptsResponse {
  landlord: {
    id: string;
    companyName: string;
  };
  summary: {
    totalReceipts: number;
    totalValueFormatted: string;
  };
  filters: {
    properties: Array<{
      id: string;
      name: string;
    }>;
  };
  receipts: ReceiptRow[];
}

export default function LandlordReceiptsPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const [receiptData, setReceiptData] = useState<LandlordReceiptsResponse | null>(null);
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

    async function loadReceipts() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordReceiptsResponse>(
          "/landlord/receipts",
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setReceiptData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load receipts.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReceipts();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token]);

  const filteredReceipts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    return (receiptData?.receipts ?? []).filter((receipt) => {
      const matchesQuery =
        !normalizedQuery ||
        (receipt.receiptNumber ?? "").toLowerCase().includes(normalizedQuery) ||
        receipt.reference.toLowerCase().includes(normalizedQuery) ||
        receipt.tenant.toLowerCase().includes(normalizedQuery) ||
        receipt.propertyUnit.toLowerCase().includes(normalizedQuery) ||
        receipt.periodLabel.toLowerCase().includes(normalizedQuery);
      const matchesProperty =
        propertyFilter === "all" ||
        receipt.propertyUnit.toLowerCase().includes(
          (
            receiptData?.filters.properties.find((property) => property.id === propertyFilter)
              ?.name ?? ""
          ).toLowerCase(),
        );
      const receiptDate = new Date(receipt.dateIso);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "month" && receiptDate >= monthStart) ||
        (dateFilter === "year" && receiptDate >= yearStart);

      return matchesQuery && matchesProperty && matchesDate;
    });
  }, [dateFilter, propertyFilter, query, receiptData]);

  function openReceipt(receipt: ReceiptRow) {
    if (!receipt.receiptNumber || !receiptData?.landlord.companyName) {
      showToast("Receipt details are incomplete.", "error");
      return;
    }

    try {
      printReceipt({
        companyName: receiptData.landlord.companyName,
        receiptNumber: receipt.receiptNumber,
        issuedAt: receipt.issuedAt,
        amount: receipt.amount,
        tenant: receipt.tenant,
        tenantEmail: receipt.tenantEmail,
        propertyUnit: receipt.propertyUnit,
        periodLabel: receipt.periodLabel,
        reference: receipt.reference,
        method: receipt.method,
        platformFee: receipt.platformFee,
        landlordSettlement: receipt.landlordSettlement,
      });
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Receipt could not be opened.",
        "error",
      );
    }
  }

  const receiptColumns: TableColumn<ReceiptRow>[] = [
    {
      key: "receiptNumber",
      label: "Receipt #",
      render: (row) => (
        <span style={{ fontSize: 11, color: "var(--ink3)", fontFamily: "monospace" }}>
          {row.receiptNumber ?? "Pending"}
        </span>
      ),
    },
    {
      key: "tenant",
      label: "Tenant",
      render: (row) => <IdentityCell primary={row.tenant} secondary={row.tenantEmail} />,
    },
    { key: "propertyUnit", label: "Property / Unit" },
    { key: "amount", label: "Amount" },
    { key: "periodLabel", label: "For Period" },
    { key: "issuedAt", label: "Issued" },
    {
      key: "download",
      label: "Action",
      render: (row) => (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => openReceipt(row)}
        >
          Print Receipt
        </button>
      ),
    },
  ];

  const description = receiptData
    ? `${receiptData.summary.totalReceipts} receipt(s) issued worth ${receiptData.summary.totalValueFormatted}`
    : loading
      ? "Loading live receipt records..."
      : error || "Receipt data is unavailable.";

  return (
    <>
      <PageMeta title="DoorRent — Receipts" />
      <LandlordPortalShell topbarTitle="Receipts" breadcrumb="Dashboard → Receipts">
        <PageHeader title="Receipts" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", marginBottom: 16 }}>
          <div className="stat-card accent-green">
            <div className="stat-label">Total Receipts</div>
            <div className="stat-value">{receiptData?.summary.totalReceipts ?? 0}</div>
            <div className="stat-sub">Successful rent payments</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Receipt Value</div>
            <div className="stat-value">{receiptData?.summary.totalValueFormatted ?? "—"}</div>
            <div className="stat-sub">Across all issued receipts</div>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search receipt, tenant, property, or period..."
            />
          </div>
          <select
            className="filter-select"
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
          >
            <option value="all">All Properties</option>
            {(receiptData?.filters.properties ?? []).map((property) => (
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

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={receiptColumns}
              rows={filteredReceipts}
              emptyMessage={loading ? "Loading receipts..." : "No receipts found."}
            />
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
