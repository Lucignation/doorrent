import { useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import { formatEstateCurrency, type EstateDashboardData } from "../../lib/estate-preview";
import type { TableColumn } from "../../types/app";

type ChargeRow = EstateDashboardData["charges"][number];

interface ResidentDuesData {
  charges: ChargeRow[];
  balance: number;
}

export default function ResidentDuesPage() {
  const { residentSession } = useResidentPortalSession();
  const token = residentSession?.token;

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<ResidentDuesData>("/resident/dues", { token })
      .then(({ data }) => {
        setCharges(data.charges ?? []);
        setBalance(data.balance ?? 0);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [token]);

  const columns = useMemo<TableColumn<ChargeRow>[]>(() => [
    { key: "title", label: "Charge", render: (r) => <strong>{r.title}</strong> },
    { key: "frequency", label: "Frequency", render: (r) => <StatusBadge tone="blue" label={r.frequency} /> },
    { key: "billingBasis", label: "Basis", render: (r) => <span className="td-muted">{r.billingBasis === "UNIT_BASED" ? "Per house" : "Per resident"}</span> },
    { key: "amount", label: "Amount", render: (r) => <strong>{formatEstateCurrency(r.amount)}</strong> },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "green" : "gray"} label={r.status} /> },
  ], []);

  return (
    <ResidentPortalShell topbarTitle="My Dues" breadcrumb="My Dues">
      <PageMeta title="My Dues — Resident Portal" />
      <PageHeader
        title="My Dues"
        description="Your estate charges and outstanding balance."
      />

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Outstanding Balance</div>
          <div className="stat-value">{formatEstateCurrency(balance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Charges</div>
          <div className="stat-value">{charges.filter((c) => c.status === "ACTIVE").length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><strong>Your Estate Charges</strong></div>
        <DataTable columns={columns} rows={charges} loading={loading} emptyMessage="No charges configured for your estate." />
      </div>

      <div className="card" style={{ marginTop: 20, padding: "16px 20px" }}>
        <div style={{ fontSize: 13, color: "var(--ink3)" }}>
          To make a payment, please contact your estate admin or pay at the estate office. Online payment is not available for estate dues.
        </div>
      </div>
    </ResidentPortalShell>
  );
}
