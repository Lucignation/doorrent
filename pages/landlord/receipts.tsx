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
import { matchesSearchFields } from "../../lib/search";
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

interface LandlordReceiptDetailResponse {
  landlord: {
    id: string;
    companyName: string;
  };
  receipt: ReceiptRow;
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
  const [selectedReceipt, setSelectedReceipt] =
    useState<LandlordReceiptDetailResponse["receipt"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
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
        const { data } = await apiRequest<LandlordReceiptsResponse>("/landlord/receipts", {
          token: landlordToken,
        });

        if (!cancelled) {
          setReceiptData(data);
          setSelectedReceipt((current) =>
            current
              ? data.receipts.find((receipt) => receipt.id === current.id) ?? data.receipts[0] ?? null
              : data.receipts[0] ?? null,
          );
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

  async function loadReceiptDetail(receiptId: string) {
    if (!landlordSession?.token) {
      showToast("Landlord session missing. Please sign in again.", "error");
      return;
    }

    setDetailLoading(true);

    try {
      const { data } = await apiRequest<LandlordReceiptDetailResponse>(
        `/landlord/receipts/${receiptId}`,
        {
          token: landlordSession.token,
        },
      );
      setSelectedReceipt(data.receipt);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Receipt details could not be loaded.",
        "error",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  const filteredReceipts = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const selectedPropertyName =
      receiptData?.filters.properties.find((property) => property.id === propertyFilter)?.name ?? "";

    return (receiptData?.receipts ?? []).filter((receipt) => {
      const matchesQuery =
        !query.trim() ||
        matchesSearchFields(
          [
            receipt.receiptNumber ?? "",
            receipt.reference,
            receipt.tenant,
            receipt.propertyUnit,
            receipt.periodLabel,
          ],
          query,
        );
      const matchesProperty =
        propertyFilter === "all" ||
        matchesSearchFields([receipt.propertyUnit], selectedPropertyName);
      const receiptDate = new Date(receipt.dateIso);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "month" && receiptDate >= monthStart) ||
        (dateFilter === "year" && receiptDate >= yearStart);

      return matchesQuery && matchesProperty && matchesDate;
    });
  }, [dateFilter, propertyFilter, query, receiptData]);

  function openReceipt(receipt: ReceiptRow) {
    const companyName = receiptData?.landlord.companyName;

    if (!receipt.receiptNumber || !companyName) {
      showToast("Receipt details are incomplete.", "error");
      return;
    }

    try {
      printReceipt({
        companyName,
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
      key: "action",
      label: "Action",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void loadReceiptDetail(row.id)}
          >
            View
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => openReceipt(row)}
          >
            Download PDF
          </button>
        </div>
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
      <PageMeta title="DoorRent — Receipts" urlPath="/landlord/receipts" />
      <LandlordPortalShell topbarTitle="Receipts" breadcrumb="Dashboard → Receipts">
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
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}
        >
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

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={receiptColumns}
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
                  Review a receipt before printing it.
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
                      {selectedReceipt.receiptNumber ?? "Pending"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6 }}>
                      Reference {selectedReceipt.reference}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tenant</label>
                      <input className="form-input" value={selectedReceipt.tenant} disabled />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-input" value={selectedReceipt.tenantEmail} disabled />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Property / Unit</label>
                      <input
                        className="form-input"
                        value={selectedReceipt.propertyUnit}
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <input className="form-input" value={selectedReceipt.method} disabled />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Period</label>
                      <input
                        className="form-input"
                        value={selectedReceipt.periodLabel}
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Issued</label>
                      <input className="form-input" value={selectedReceipt.issuedAt} disabled />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Amount Received</label>
                      <input className="form-input" value={selectedReceipt.amount} disabled />
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
                    onClick={() => openReceipt(selectedReceipt)}
                    disabled={detailLoading}
                  >
                    {detailLoading ? "Loading..." : "Download PDF"}
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
      </LandlordPortalShell>
    </>
  );
}
