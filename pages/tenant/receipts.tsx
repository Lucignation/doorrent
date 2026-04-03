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
import { matchesSearchFields } from "../../lib/search";
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
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRow | null>(null);
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
          setSelectedReceipt((current) =>
            current ? data.receipts.find((receipt) => receipt.id === current.id) ?? data.receipts[0] ?? null : data.receipts[0] ?? null,
          );
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
    return (receiptData?.receipts ?? []).filter((receipt) => {
      if (!query.trim()) {
        return true;
      }

      return matchesSearchFields(
        [
          receipt.receiptNumber,
          receipt.reference,
          receipt.propertyUnit,
          receipt.periodLabel,
        ],
        query,
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setSelectedReceipt(row)}
          >
            View
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => printTenantReceipt(row)}
          >
            Download PDF
          </button>
        </div>
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

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={columns}
                rows={filteredReceipts}
                loading={loading}
                loadingMessage="Refreshing receipts..."
                emptyMessage={loading ? "Loading receipts..." : "No receipts found."}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Receipt Preview</div>
                <div className="card-subtitle">
                  Review a receipt before downloading it.
                </div>
              </div>
            </div>
            <div className="card-body">
              {selectedReceipt ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius)",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="td-muted">Receipt Number</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
                      {selectedReceipt.receiptNumber}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6 }}>
                      Reference {selectedReceipt.reference}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Property / Unit</label>
                      <input className="form-input" value={selectedReceipt.propertyUnit} disabled />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Period</label>
                      <input className="form-input" value={selectedReceipt.periodLabel} disabled />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Amount Received</label>
                      <input className="form-input" value={selectedReceipt.amount} disabled />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Issued</label>
                      <input className="form-input" value={selectedReceipt.issuedAt} disabled />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <input className="form-input" value={selectedReceipt.method} disabled />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Settlement</label>
                      <input
                        className="form-input"
                        value={selectedReceipt.landlordSettlement}
                        disabled
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={() => printTenantReceipt(selectedReceipt)}
                  >
                    Download PDF
                  </button>
                </div>
              ) : (
                <div style={{ color: "var(--ink2)" }}>
                  {loading ? "Loading receipt preview..." : "Select a receipt to view it here."}
                </div>
              )}
            </div>
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
