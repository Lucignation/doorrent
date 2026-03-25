import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../../components/auth/LandlordPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { useLandlordPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import type { BadgeTone, TableColumn } from "../../../types/app";

interface PaymentHistoryRow {
  id: string;
  reference: string;
  amount: string;
  status: string;
  paidAt: string;
  method: string;
  periodLabel: string;
}

interface TenantDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  residentialAddress: string | null;
  idType: string | null;
  idNumber: string | null;
  status: string;
  leaseStart: string;
  leaseEnd: string;
  balanceAmount: number;
  balanceFormatted: string;
  property: { id: string; name: string; address: string };
  unit: { id: string; unitNumber: string; type: string } | null;
  rent: {
    annualRent: number;
    annualRentFormatted: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePrice: number;
    billingCyclePriceFormatted: string;
    billingSchedule: string;
  };
  payments: PaymentHistoryRow[];
  totalPaid: string;
  agreement: { id: string; status: string } | null;
  guarantor: {
    fullName: string;
    email: string;
    phone: string;
    relationship: string | null;
    occupation: string | null;
  } | null;
}

function statusTone(status: string): BadgeTone {
  if (status === "current") return "green";
  if (status === "expiring") return "amber";
  return "red";
}

function paymentTone(status: string): BadgeTone {
  if (status === "paid") return "green";
  if (status === "pending") return "amber";
  return "red";
}

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { landlordSession } = useLandlordPortalSession();
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = landlordSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest<TenantDetail>(`/landlord/tenants/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load tenant.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, landlordSession?.token]);

  const paymentColumns: TableColumn<PaymentHistoryRow>[] = [
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink3)" }}>
          {row.reference}
        </span>
      ),
    },
    { key: "periodLabel", label: "Period" },
    { key: "amount", label: "Amount" },
    { key: "method", label: "Method" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={paymentTone(row.status)}>{row.status}</StatusBadge>
      ),
    },
    { key: "paidAt", label: "Date" },
  ];

  if (loading) {
    return (
      <LandlordPortalShell topbarTitle="Tenants" breadcrumb="Dashboard → Tenants → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading tenant...</div>
      </LandlordPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <LandlordPortalShell topbarTitle="Tenants" breadcrumb="Dashboard → Tenants → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Tenant not found."}</div>
      </LandlordPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent — ${detail.name}`} urlPath={`/landlord/tenants/${detail.id}`} />
      <LandlordPortalShell topbarTitle="Tenants" breadcrumb="Dashboard → Tenants → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/landlord/tenants")}
          >
            ← Back to Tenants
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{detail.name}</h1>
            <div style={{ color: "var(--ink2)", fontSize: 14, marginTop: 4 }}>{detail.email}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={statusTone(detail.status)}>{detail.status}</StatusBadge>
            <button type="button" className="btn btn-secondary btn-sm">
              Send Notice
            </button>
            <button type="button" className="btn btn-secondary btn-sm">
              Send Reminder
            </button>
            {detail.agreement ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void router.push(`/landlord/agreements/${detail.agreement!.id}`)}
              >
                View Agreement
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Tenant Info</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Phone</div>
                  <div style={{ fontWeight: 500 }}>{detail.phone}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Residential Address</div>
                  <div style={{ fontWeight: 500 }}>{detail.residentialAddress ?? "—"}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>ID Type</div>
                  <div style={{ fontWeight: 500 }}>{detail.idType ?? "—"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>ID Number</div>
                  <div style={{ fontWeight: 500 }}>{detail.idNumber ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Lease Details</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Property</div>
                  <div style={{ fontWeight: 500 }}>{detail.property.name}</div>
                  <div className="td-muted" style={{ fontSize: 12 }}>{detail.property.address}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Unit</div>
                  <div style={{ fontWeight: 500 }}>{detail.unit?.unitNumber ?? "—"}</div>
                  {detail.unit ? (
                    <div className="td-muted" style={{ fontSize: 12 }}>{detail.unit.type}</div>
                  ) : null}
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Lease Start</div>
                  <div style={{ fontWeight: 500 }}>{detail.leaseStart}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Lease End</div>
                  <div style={{ fontWeight: 500 }}>{detail.leaseEnd}</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="td-muted" style={{ fontSize: 12 }}>Billing Schedule</div>
                <div style={{ fontWeight: 500 }}>{detail.rent.billingSchedule}</div>
                <div className="td-muted" style={{ fontSize: 12 }}>
                  Annual equivalent: {detail.rent.annualRentFormatted}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
          <div className="stat-card accent-red">
            <div className="stat-label">Outstanding Balance</div>
            <div className="stat-value">{detail.balanceFormatted}</div>
            <div className="stat-sub">Current arrears</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Total Paid</div>
            <div className="stat-value">{detail.totalPaid}</div>
            <div className="stat-sub">Lifetime payments</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Annual Rent</div>
            <div className="stat-value">{detail.rent.annualRentFormatted}</div>
            <div className="stat-sub">{detail.rent.billingFrequencyLabel} billing</div>
          </div>
        </div>

        {detail.guarantor ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Guarantor</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Name</div>
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.fullName}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Phone</div>
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.phone}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Email</div>
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.email}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Relationship</div>
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.relationship ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="card">
          <div className="card-header">
            <div className="card-title">Payment History</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={paymentColumns}
              rows={detail.payments}
              emptyMessage="No payments recorded."
            />
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
