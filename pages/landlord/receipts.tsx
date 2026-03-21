import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import { landlordNav, landlordReceipts, landlordUser } from "../../data/landlord";
import type { LandlordReceiptRow, TableColumn } from "../../types/app";

export default function LandlordReceiptsPage() {
  const { showToast } = usePrototypeUI();
  const receiptColumns: TableColumn<LandlordReceiptRow>[] = [
    {
      key: "receipt",
      label: "Receipt #",
      render: (row) => (
        <span style={{ fontSize: 11, color: "var(--ink3)", fontFamily: "monospace" }}>
          {row.receipt}
        </span>
      ),
    },
    {
      key: "tenant",
      label: "Tenant",
      render: (row) => <IdentityCell primary={row.tenant} />,
    },
    {
      key: "unit",
      label: "Property / Unit",
      render: (row) => <span className="td-muted">{row.unit}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => <span style={{ fontWeight: 600 }}>{row.amount}</span>,
    },
    {
      key: "period",
      label: "For Period",
      render: (row) => <span className="td-muted">{row.period}</span>,
    },
    {
      key: "issued",
      label: "Issued",
      render: (row) => <span className="td-muted">{row.issued}</span>,
    },
    {
      key: "download",
      label: "Download",
      render: () => (
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => showToast("Receipt downloaded", "success")}>
          ↓ PDF
        </button>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Receipts" />
      <AppShell
        user={landlordUser}
        topbarTitle="Receipts"
        breadcrumb="Dashboard → Receipts"
        navSections={landlordNav}
      >
        <PageHeader
          title="Receipts"
          description="All generated payment receipts"
          actions={[{ label: "Export All", variant: "secondary" }]}
        />

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input className="search-input" placeholder="Search receipts…" />
          </div>
          <select className="filter-select" defaultValue="All Properties">
            <option>All Properties</option>
          </select>
          <select className="filter-select" defaultValue="All time">
            <option>All time</option>
            <option>This month</option>
            <option>Last 3 months</option>
          </select>
        </div>

        <div className="card">
          <DataTable columns={receiptColumns} rows={landlordReceipts} />
          <div className="pagination">
            <span>Showing 6 of 42 receipts</span>
            <div className="pagination-pages">
              <div className="page-btn active">1</div>
              <div className="page-btn">2</div>
              <div className="page-btn">→</div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
