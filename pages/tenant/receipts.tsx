import { useEffect, useMemo, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { SearchIcon } from "../../components/ui/Icons";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import { printReceipt } from "../../lib/receipt-print";
import type { TableColumn } from "../../types/app";

interface ReceiptRow {
  id: string;
  reference: string;
  receiptNumber: string;
  propertyUnit: string;
  periodLabel: string;
  amount: string;
  issuedAt: string;
  issuedAtIso: string;
  method: string;
  platformFee: string;
  landlordSettlement: string;
}

interface TenantReceiptsResponse {
  tenant: {
    id: string;
    name: string;
    propertyName: string;
    unitNumber: string;
  };
  summary: {
    count: number;
    totalValue: string;
  };
  receipts: ReceiptRow[];
}

export default function TenantReceiptsPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const [receiptData, setReceiptData] = useState<TenantReceiptsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadReceipts() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantReceiptsResponse>("/tenant/receipts", {
          token: tenantToken,
        });

        if (!cancelled) {
          setReceiptData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your receipts.",
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
  }, [dataRefreshVersion, tenantSession?.token]);

  const filteredReceipts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (receiptData?.receipts ?? []).filter((receipt) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        receipt.receiptNumber.toLowerCase().includes(normalizedQuery) ||
        receipt.reference.toLowerCase().includes(normalizedQuery) ||
        receipt.propertyUnit.toLowerCase().includes(normalizedQuery) ||
        receipt.periodLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, receiptData?.receipts]);

  function printTenantReceipt(receipt: ReceiptRow) {
    if (!tenantSession) {
      showToast("Tenant session missing. Please sign in again.", "error");
      return;
    }

    try {
      printReceipt({
        companyName: tenantSession.tenant.landlordCompany,
        receiptNumber: receipt.receiptNumber,
        issuedAt: receipt.issuedAt,
        amount: receipt.amount,
        tenant: receiptData?.tenant.name ?? tenantSession.tenant.fullName,
        tenantEmail: tenantSession.tenant.email,
        propertyUnit: receipt.propertyUnit,
        periodLabel: receipt.periodLabel,
        reference: receipt.reference,
        method: receipt.method,
        platformFee: receipt.platformFee,
        landlordSettlement: receipt.landlordSettlement,
      });
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Receipt could not be opened.",
        "error",
      );
    }
  }

  const columns: TableColumn<ReceiptRow>[] = [
    {
      key: "receiptNumber",
      label: "Receipt #",
      render: (row) => (
        <span style={{ fontFamily: "monospace", fontSize: 11 }}>{row.receiptNumber}</span>
      ),
    },
    { key: "propertyUnit", label: "Property / Unit" },
    { key: "periodLabel", label: "Period" },
    { key: "amount", label: "Amount" },
    { key: "issuedAt", label: "Issued" },
    { key: "method", label: "Method" },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={() => printTenantReceipt(row)}
        >
          Print Receipt
        </button>
      ),
    },
  ];

  const description = receiptData
    ? `${receiptData.summary.count} receipt(s) issued for ${receiptData.tenant.propertyName}`
    : loading
      ? "Loading your rent receipts..."
      : error || "No receipt data is available.";

  return (
    <>
      <PageMeta title="DoorRent — Receipts" urlPath="/tenant/receipts" />
      <TenantPortalShell topbarTitle="Receipts" breadcrumb="Dashboard → Receipts">
        <PageHeader title="Receipts" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div
          className="stats-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          <div className="stat-card accent-green">
            <div className="stat-label">Receipts Issued</div>
            <div className="stat-value">{receiptData?.summary.count ?? 0}</div>
            <div className="stat-sub">Confirmed rent payments</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Receipt Value</div>
            <div className="stat-value">{receiptData?.summary.totalValue ?? "—"}</div>
            <div className="stat-sub">Across this tenancy</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Current Home</div>
            <div className="stat-value">{receiptData?.tenant.unitNumber ?? "—"}</div>
            <div className="stat-sub">{receiptData?.tenant.propertyName ?? "Loading..."}</div>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search receipt number, reference, or period..."
            />
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={columns}
              rows={filteredReceipts}
              emptyMessage={loading ? "Loading receipts..." : "No receipts found."}
            />
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
