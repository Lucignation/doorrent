import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../../components/auth/LandlordPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useLandlordPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import { printReceipt } from "../../../lib/receipt-print";
import type { BadgeTone } from "../../../types/app";

interface PaymentDetail {
  id: string;
  reference: string;
  amount: string;
  amountRaw: number;
  platformFee: string;
  landlordSettlement: string;
  date: string;
  dateIso: string;
  method: string;
  status: string;
  statusLabel: string;
  periodLabel: string;
  issuedAt: string;
  tenant: { id: string; name: string; email: string; phone: string } | null;
  property: { id: string; name: string; address: string } | null;
  unit: { id: string; unitNumber: string } | null;
  landlordCompanyName: string;
}

function statusTone(status: string): BadgeTone {
  if (status === "paid") return "green";
  if (status === "pending") return "amber";
  if (status === "failed") return "red";
  return "blue";
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { landlordSession } = useLandlordPortalSession();
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
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
        const res = await apiRequest<PaymentDetail>(`/landlord/payments/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load payment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, landlordSession?.token]);

  function openReceipt() {
    if (!detail || !detail.tenant) return;
    printReceipt({
      companyName: detail.landlordCompanyName,
      receiptNumber: detail.reference,
      issuedAt: detail.issuedAt,
      amount: detail.amount,
      tenant: detail.tenant.name,
      tenantEmail: detail.tenant.email,
      propertyUnit: `${detail.property?.name ?? "—"} · ${detail.unit?.unitNumber ?? "—"}`,
      periodLabel: detail.periodLabel,
      reference: detail.reference,
      method: detail.method,
      platformFee: detail.platformFee,
      landlordSettlement: detail.landlordSettlement,
    });
  }

  if (loading) {
    return (
      <LandlordPortalShell topbarTitle="Payments" breadcrumb="Dashboard → Payments → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading payment...</div>
      </LandlordPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <LandlordPortalShell topbarTitle="Payments" breadcrumb="Dashboard → Payments → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Payment not found."}</div>
      </LandlordPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent — Payment ${detail.reference}`} urlPath={`/landlord/payments/${detail.id}`} />
      <LandlordPortalShell topbarTitle="Payments" breadcrumb="Dashboard → Payments → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/landlord/payments")}
          >
            ← Back to Payments
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Payment Detail</h1>
            <div style={{ color: "var(--ink2)", fontSize: 14, fontFamily: "monospace", marginTop: 4 }}>
              {detail.reference}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={statusTone(detail.status)}>{detail.statusLabel}</StatusBadge>
            {detail.status === "paid" ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={openReceipt}>
                Download Receipt
              </button>
            ) : null}
            {detail.tenant ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void router.push(`/landlord/tenants/${detail.tenant!.id}`)}
              >
                View Tenant
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Payment Details</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Amount</div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{detail.amount}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Date</div>
                  <div style={{ fontWeight: 500 }}>{detail.date}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Method</div>
                  <div style={{ fontWeight: 500 }}>{detail.method}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Period</div>
                  <div style={{ fontWeight: 500 }}>{detail.periodLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Settlement Breakdown</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Platform Fee</div>
                  <div style={{ fontWeight: 500, color: "var(--red)" }}>{detail.platformFee}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Landlord Settlement</div>
                  <div style={{ fontWeight: 700, color: "var(--green)" }}>{detail.landlordSettlement}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {detail.tenant ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Tenant</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div style={{ fontWeight: 600 }}>{detail.tenant.name}</div>
                  <div className="td-muted">{detail.tenant.email}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Phone</div>
                  <div style={{ fontWeight: 500 }}>{detail.tenant.phone}</div>
                </div>
                {detail.property ? (
                  <div>
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
          </div>
        ) : null}
      </LandlordPortalShell>
    </>
  );
}
