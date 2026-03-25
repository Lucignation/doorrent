import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminPortalShell from "../../../components/auth/AdminPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { useAdminPortalSession } from "../../../context/TenantSessionContext";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { apiRequest } from "../../../lib/api";
import type { BadgeTone, TableColumn } from "../../../types/app";

interface RecentPaymentRow {
  id: string;
  reference: string;
  amount: string;
  status: string;
  paidAt: string;
  channel: string;
}

interface PropertySummaryRow {
  id: string;
  name: string;
  location: string;
  units: number;
  occupied: number;
}

interface LandlordDetail {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string | null;
  status: string;
  plan: string;
  planRaw: string;
  subscriptionModel: string;
  commissionRatePercent: number;
  joinedAt: string;
  emailVerifiedAt: string | null;
  propertiesCount: number;
  tenantsCount: number;
  totalUnits: number;
  occupiedUnits: number;
  mrr: string;
  mrrRaw: number;
  recentPayments: RecentPaymentRow[];
  properties: PropertySummaryRow[];
}

function statusTone(status: string): BadgeTone {
  if (status === "active") return "green";
  if (status === "trial") return "amber";
  return "red";
}

function planTone(plan: string): BadgeTone {
  if (plan === "Enterprise") return "gold";
  if (plan === "Pro") return "blue";
  return "gray";
}

function paymentTone(status: string): BadgeTone {
  if (status === "paid") return "green";
  if (status === "pending") return "amber";
  return "red";
}

export default function AdminLandlordDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { adminSession } = useAdminPortalSession();
  const { showToast } = usePrototypeUI();
  const [detail, setDetail] = useState<LandlordDetail | null>(null);
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
        const res = await apiRequest<LandlordDetail>(`/admin/landlords/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load landlord.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, adminSession?.token]);

  const paymentColumns: TableColumn<RecentPaymentRow>[] = [
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink3)" }}>
          {row.reference}
        </span>
      ),
    },
    { key: "amount", label: "Amount" },
    { key: "channel", label: "Channel" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={paymentTone(row.status)}>{row.status}</StatusBadge>,
    },
    { key: "paidAt", label: "Date" },
  ];

  const propertyColumns: TableColumn<PropertySummaryRow>[] = [
    { key: "name", label: "Property" },
    { key: "location", label: "Location" },
    { key: "units", label: "Units" },
    { key: "occupied", label: "Occupied" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => void router.push(`/admin/properties/${row.id}`)}
        >
          View
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminPortalShell topbarTitle="Landlords" breadcrumb="Dashboard → Landlords → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading landlord...</div>
      </AdminPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <AdminPortalShell topbarTitle="Landlords" breadcrumb="Dashboard → Landlords → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Landlord not found."}</div>
      </AdminPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent Admin — ${detail.companyName}`} urlPath={`/admin/landlords/${detail.id}`} />
      <AdminPortalShell topbarTitle="Landlords" breadcrumb="Dashboard → Landlords → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/admin/landlords")}
          >
            ← Back to Landlords
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{detail.companyName}</h1>
            <div style={{ color: "var(--ink2)", fontSize: 14, marginTop: 4 }}>{detail.name} · {detail.email}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={statusTone(detail.status)}>{detail.status}</StatusBadge>
            <StatusBadge tone={planTone(detail.plan)}>{detail.plan}</StatusBadge>
            <button
              type="button"
              className={`btn ${detail.status === "suspended" ? "btn-secondary" : "btn-danger"} btn-sm`}
              onClick={() =>
                showToast(
                  detail.status === "suspended"
                    ? "Landlord activation controls coming soon."
                    : "Landlord suspension controls coming soon.",
                  "info",
                )
              }
            >
              {detail.status === "suspended" ? "Activate Account" : "Suspend Account"}
            </button>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
          <div className="stat-card accent-blue">
            <div className="stat-label">Properties</div>
            <div className="stat-value">{detail.propertiesCount}</div>
            <div className="stat-sub">Active listings</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Tenants</div>
            <div className="stat-value">{detail.tenantsCount}</div>
            <div className="stat-sub">Active tenancies</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Units</div>
            <div className="stat-value">{detail.occupiedUnits}/{detail.totalUnits}</div>
            <div className="stat-sub">Occupied / Total</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">MRR (This Month)</div>
            <div className="stat-value">{detail.mrr}</div>
            <div className="stat-sub">
              {detail.subscriptionModel === "COMMISSION"
                ? `${detail.commissionRatePercent}% commission`
                : "Subscription plan"}
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Account Details</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Phone</div>
                  <div style={{ fontWeight: 500 }}>{detail.phone ?? "—"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Joined</div>
                  <div style={{ fontWeight: 500 }}>{detail.joinedAt}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Email Verified</div>
                  <div style={{ fontWeight: 500 }}>{detail.emailVerifiedAt ?? "Not verified"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Billing Model</div>
                  <div style={{ fontWeight: 500 }}>{detail.subscriptionModel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Properties</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={propertyColumns}
                rows={detail.properties}
                emptyMessage="No properties."
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Payments</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={paymentColumns}
              rows={detail.recentPayments}
              emptyMessage="No payments recorded."
            />
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
