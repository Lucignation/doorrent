import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../../components/auth/LandlordPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import type { BadgeTone, TableColumn } from "../../../types/app";

interface RecentPaymentRow {
  id: string;
  reference: string;
  amount: string;
  status: string;
  paidAt: string;
  method: string;
}

interface UnitDetail {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  statusLabel: string;
  meterNumber?: string | null;
  property: { id: string; name: string; address: string };
  rent: {
    annualRent: number;
    annualRentFormatted: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePrice: number;
    billingCyclePriceFormatted: string;
    billingSchedule: string;
  };
  leaseEnd: string;
  leaseEndIso: string | null;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    balanceAmount: number;
    balanceFormatted: string;
    leaseEnd: string;
  } | null;
  agreement: { id: string; status: string; title: string } | null;
  recentPayments: RecentPaymentRow[];
}

function statusTone(status: string): BadgeTone {
  if (status === "occupied") return "green";
  if (status === "vacant") return "gray";
  if (status === "maintenance") return "blue";
  if (status === "expiring") return "amber";
  return "red";
}

function paymentTone(status: string): BadgeTone {
  if (status === "paid") return "green";
  if (status === "pending") return "amber";
  return "red";
}

export default function UnitDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { landlordSession } = useLandlordPortalSession();
  const { openModal } = usePrototypeUI();
  const [detail, setDetail] = useState<UnitDetail | null>(null);
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
        const res = await apiRequest<UnitDetail>(`/landlord/units/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load unit.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, landlordSession?.token]);

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
      <LandlordPortalShell topbarTitle="Units" breadcrumb="Dashboard → Units → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading unit...</div>
      </LandlordPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <LandlordPortalShell topbarTitle="Units" breadcrumb="Dashboard → Units → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Unit not found."}</div>
      </LandlordPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent — Unit ${detail.unitNumber}`} urlPath={`/landlord/units/${detail.id}`} />
      <LandlordPortalShell topbarTitle="Units" breadcrumb="Dashboard → Units → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/landlord/units")}
          >
            ← Back to Units
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              Unit {detail.unitNumber}
            </h1>
            <div style={{ color: "var(--ink2)", fontSize: 14, marginTop: 4 }}>
              {detail.property.name} · {detail.type}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={statusTone(detail.status)}>{detail.statusLabel}</StatusBadge>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openModal("add-unit")}
            >
              Edit Unit
            </button>
            {detail.status === "vacant" ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openModal("add-tenant")}
              >
                Invite Tenant
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Unit Details</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Property</div>
                  <div style={{ fontWeight: 500 }}>{detail.property.name}</div>
                  <div className="td-muted" style={{ fontSize: 12 }}>{detail.property.address}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Type</div>
                  <div style={{ fontWeight: 500 }}>{detail.type}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Billing Schedule</div>
                  <div style={{ fontWeight: 500 }}>{detail.rent.billingSchedule}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Annual Rent</div>
                  <div style={{ fontWeight: 600 }}>{detail.rent.annualRentFormatted}</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="td-muted" style={{ fontSize: 12 }}>Lease End</div>
                <div style={{ fontWeight: 500 }}>{detail.leaseEnd || "—"}</div>
              </div>
              {detail.meterNumber ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="td-muted" style={{ fontSize: 12 }}>Electricity Meter Number</div>
                  <div style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 15, marginTop: 2 }}>
                    {detail.meterNumber}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                    Visible to the current tenant in their portal.
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <div className="td-muted" style={{ fontSize: 12 }}>Electricity Meter Number</div>
                  <div style={{ fontWeight: 500, color: "var(--ink3)" }}>Not set — edit the unit to add one.</div>
                </div>
              )}
            </div>
          </div>

          {detail.tenant ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Current Tenant</div>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{detail.tenant.name}</div>
                  <div className="td-muted">{detail.tenant.email}</div>
                </div>
                <div className="form-row">
                  <div>
                    <div className="td-muted" style={{ fontSize: 12 }}>Status</div>
                    <StatusBadge
                      tone={
                        detail.tenant.status === "current"
                          ? "green"
                          : detail.tenant.status === "expiring"
                            ? "amber"
                            : "red"
                      }
                    >
                      {detail.tenant.status}
                    </StatusBadge>
                  </div>
                  <div>
                    <div className="td-muted" style={{ fontSize: 12 }}>Lease End</div>
                    <div style={{ fontWeight: 500 }}>{detail.tenant.leaseEnd}</div>
                  </div>
                </div>
                {detail.tenant.balanceAmount > 0 ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "8px 12px",
                      background: "var(--red-light)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(192,57,43,0.18)",
                    }}
                  >
                    <span style={{ color: "var(--red)", fontWeight: 700 }}>
                      Outstanding: {detail.tenant.balanceFormatted}
                    </span>
                  </div>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => void router.push(`/landlord/tenants/${detail.tenant!.id}`)}
                  >
                    View Tenant Profile →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Occupancy</div>
              </div>
              <div className="card-body">
                <div style={{ color: "var(--ink2)", textAlign: "center", padding: "24px 0" }}>
                  This unit is currently vacant.
                </div>
                <div style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openModal("add-tenant")}
                  >
                    Invite Tenant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {detail.agreement ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div style={{ flex: 1 }}>
                <div className="card-title">Agreement</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => void router.push(`/landlord/agreements/${detail.agreement!.id}`)}
              >
                View Agreement
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontWeight: 500 }}>{detail.agreement.title}</div>
                <StatusBadge
                  tone={
                    detail.agreement.status === "signed"
                      ? "green"
                      : detail.agreement.status === "sent"
                        ? "amber"
                        : detail.agreement.status === "draft"
                          ? "gray"
                          : "red"
                  }
                >
                  {detail.agreement.status}
                </StatusBadge>
              </div>
            </div>
          </div>
        ) : null}

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Payments</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={paymentColumns}
              rows={detail.recentPayments}
              emptyMessage="No payments recorded for this unit."
            />
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
