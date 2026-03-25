import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone, TableColumn } from "../../types/app";

interface TransactionRow {
  id: string;
  reference: string;
  tenant: string;
  landlord: string;
  property: string;
  amount: string;
  channel: string;
  status: string;
  date: string;
}

interface TransactionsResponse {
  count: number;
  totalVolume: string;
  transactions: TransactionRow[];
}

function statusTone(status: string): BadgeTone {
  if (status === "paid" || status === "success") return "green";
  if (status === "pending") return "amber";
  return "red";
}

export default function AdminTransactionsPage() {
  const router = useRouter();
  const { adminSession } = useAdminPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminSession?.token) return;
    const token = adminSession.token;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: result } = await apiRequest<TransactionsResponse>("/admin/transactions", { token });
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load transactions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [dataRefreshVersion, adminSession?.token]);

  const columns: TableColumn<TransactionRow>[] = [
    { key: "reference", label: "Reference", render: (row) => <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--ink3)" }}>{row.reference}</span> },
    { key: "tenant", label: "Tenant", render: (row) => <IdentityCell primary={row.tenant} /> },
    { key: "landlord", label: "Landlord", render: (row) => <span className="td-muted">{row.landlord}</span> },
    { key: "property", label: "Property", render: (row) => <span className="td-muted">{row.property}</span> },
    { key: "amount", label: "Amount" },
    { key: "channel", label: "Channel", render: (row) => <span className="td-muted">{row.channel}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge> },
    { key: "date", label: "Date", render: (row) => <span className="td-muted">{row.date}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => void router.push(`/admin/transactions/${row.id}`)}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Transactions" />
      <AdminPortalShell topbarTitle="Transactions" breadcrumb="Dashboard → Transactions">
        <PageHeader
          title="Transactions"
          description={data ? `${data.count} transactions · ${data.totalVolume} total volume` : loading ? "Loading..." : error || "No transactions yet."}
        />

        {error ? (
          <div className="card">
            <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
          </div>
        ) : (
          <div className="card">
            <DataTable
              columns={columns}
              rows={data?.transactions ?? []}
              emptyMessage={loading ? "Loading transactions..." : "No transactions found."}
            />
          </div>
        )}
      </AdminPortalShell>
    </>
  );
}
