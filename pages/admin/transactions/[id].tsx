import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminPortalShell from "../../../components/auth/AdminPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useAdminPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import type { BadgeTone } from "../../../types/app";

interface TransactionDetail {
  id: string;
  reference: string;
  amount: string;
  amountRaw: number;
  platformFee: string;
  landlordSettlement: string;
  channel: string;
  status: string;
  date: string;
  dateIso: string;
  periodLabel: string;
  tenant: { id: string; name: string; email: string; phone: string } | null;
  landlord: { id: string; name: string; companyName: string; email: string } | null;
  property: { id: string; name: string; address: string } | null;
  unit: { id: string; unitNumber: string } | null;
}

function statusTone(status: string): BadgeTone {
  if (status === "paid") return "green";
  if (status === "pending") return "amber";
  return "red";
}

export default function AdminTransactionDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { adminSession } = useAdminPortalSession();
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = adminSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest<TransactionDetail>(`/admin/transactions/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load transaction.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, adminSession?.token]);

  if (loading) {
    return (
      <AdminPortalShell topbarTitle="Transactions" breadcrumb="Dashboard → Transactions → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading transaction...</div>
      </AdminPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <AdminPortalShell topbarTitle="Transactions" breadcrumb="Dashboard → Transactions → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Transaction not found."}</div>
      </AdminPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent Admin — Transaction ${detail.reference}`} urlPath={`/admin/transactions/${detail.id}`} />
      <AdminPortalShell topbarTitle="Transactions" breadcrumb="Dashboard → Transactions → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/admin/transactions")}
          >
            ← Back to Transactions
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Transaction Detail</h1>
            <div style={{ color: "var(--ink2)", fontSize: 14, fontFamily: "monospace", marginTop: 4 }}>
              {detail.reference}
            </div>
          </div>
          <StatusBadge tone={statusTone(detail.status)}>{detail.status}</StatusBadge>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
          <div className="stat-card accent-green">
            <div className="stat-label">Amount</div>
            <div className="stat-value">{detail.amount}</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Platform Fee</div>
            <div className="stat-value">{detail.platformFee}</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Landlord Settlement</div>
            <div className="stat-value">{detail.landlordSettlement}</div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Transaction Details</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Channel / Method</div>
                  <div style={{ fontWeight: 500 }}>{detail.channel}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Date</div>
                  <div style={{ fontWeight: 500 }}>{detail.date}</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="td-muted" style={{ fontSize: 12 }}>Period</div>
                <div style={{ fontWeight: 500 }}>{detail.periodLabel}</div>
              </div>
              {detail.property ? (
                <div style={{ marginTop: 16 }}>
                  <div className="td-muted" style={{ fontSize: 12 }}>Property / Unit</div>
                  <div style={{ fontWeight: 500 }}>
                    {detail.property.name}
                    {detail.unit ? ` · Unit ${detail.unit.unitNumber}` : ""}
                  </div>
                  <div className="td-muted" style={{ fontSize: 12 }}>{detail.property.address}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {detail.tenant ? (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Tenant</div>
                </div>
                <div className="card-body">
                  <div style={{ fontWeight: 600 }}>{detail.tenant.name}</div>
                  <div className="td-muted">{detail.tenant.email}</div>
                  <div className="td-muted">{detail.tenant.phone}</div>
                </div>
              </div>
            ) : null}

            {detail.landlord ? (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Landlord</div>
                </div>
                <div className="card-body">
                  <div style={{ fontWeight: 600 }}>{detail.landlord.companyName}</div>
                  <div className="td-muted">{detail.landlord.name}</div>
                  <div className="td-muted">{detail.landlord.email}</div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => void router.push(`/admin/landlords/${detail.landlord!.id}`)}
                    >
                      View Landlord →
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
