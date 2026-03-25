import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../../components/auth/LandlordPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useLandlordPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import { printAgreementDocument } from "../../../lib/agreement-print";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import type { BadgeTone } from "../../../types/app";

interface AgreementDetail {
  id: string;
  title: string;
  status: string;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    idType: string | null;
    idNumber: string | null;
    residentialAddress: string | null;
  };
  property: { id: string; name: string; address: string };
  unit: { id: string; unitNumber: string } | null;
  template: string;
  rent: {
    annualRent: number;
    annualRentFormatted: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePrice: number;
    billingCyclePriceFormatted: string;
    billingSchedule: string;
  };
  depositAmount: number | null;
  depositFormatted: string | null;
  serviceCharge: number | null;
  serviceChargeFormatted: string | null;
  leaseStart: string;
  leaseEnd: string;
  leaseStartIso: string | null;
  leaseEndIso: string | null;
  sentAt: string | null;
  lastActivity: string | null;
  createdAt: string;
  guarantor: {
    name: string | null;
    phone: string | null;
    email: string | null;
    relationship: string | null;
    occupation: string | null;
    company: string | null;
  } | null;
  conditions: {
    noticePeriodDays: number | null;
    utilities: string | null;
    permittedUse: string | null;
    specialConditions: string | null;
  } | null;
  landlordCompanyName: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string | null;
}

function statusTone(status: string): BadgeTone {
  if (status === "signed") return "green";
  if (status === "sent") return "amber";
  if (status === "draft") return "gray";
  return "red";
}

export default function AgreementDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { landlordSession } = useLandlordPortalSession();
  const { showToast } = usePrototypeUI();
  const [detail, setDetail] = useState<AgreementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = landlordSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest<AgreementDetail>(`/landlord/agreements/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load agreement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, landlordSession?.token]);

  function handleViewPdf() {
    if (!detail) return;
    printAgreementDocument({
      agreementRef: detail.id,
      generatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      landlord: {
        companyName: detail.landlordCompanyName,
        name: detail.landlordName,
        email: detail.landlordEmail,
        phone: detail.landlordPhone,
      },
      tenant: {
        name: detail.tenant.name,
        email: detail.tenant.email,
        phone: detail.tenant.phone,
        residentialAddress: detail.tenant.residentialAddress,
        idType: detail.tenant.idType,
        idNumber: detail.tenant.idNumber,
      },
      premises: {
        propertyName: detail.property.name,
        address: detail.property.address,
        unitNumber: detail.unit?.unitNumber,
      },
      lease: {
        title: detail.title,
        startDate: detail.leaseStartIso ?? "",
        endDate: detail.leaseEndIso ?? "",
      },
      financial: {
        annualRent: detail.rent.annualRent,
        billingFrequency: detail.rent.billingFrequency,
        billingFrequencyLabel: detail.rent.billingFrequencyLabel,
        billingCyclePrice: detail.rent.billingCyclePrice,
        billingSchedule: detail.rent.billingSchedule,
        depositAmount: detail.depositAmount,
        serviceCharge: detail.serviceCharge,
      },
      conditions: detail.conditions,
      guarantor: detail.guarantor,
      notes: null,
      templateName: detail.template,
    });
  }

  async function handleResend() {
    if (!landlordSession?.token || !detail || resending) return;
    setResending(true);
    try {
      await apiRequest(`/landlord/agreements/${detail.id}/resend`, {
        method: "POST",
        token: landlordSession.token,
      });
      showToast(`Agreement resent to ${detail.tenant.name}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not resend agreement.", "error");
    } finally {
      setResending(false);
    }
  }

  if (loading) {
    return (
      <LandlordPortalShell topbarTitle="Agreements" breadcrumb="Dashboard → Agreements → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading agreement...</div>
      </LandlordPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <LandlordPortalShell topbarTitle="Agreements" breadcrumb="Dashboard → Agreements → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Agreement not found."}</div>
      </LandlordPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent — ${detail.title}`} urlPath={`/landlord/agreements/${detail.id}`} />
      <LandlordPortalShell topbarTitle="Agreements" breadcrumb="Dashboard → Agreements → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/landlord/agreements")}
          >
            ← Back to Agreements
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{detail.title}</h1>
            <div style={{ color: "var(--ink2)", fontSize: 14, marginTop: 4 }}>
              {detail.template} · Created {detail.createdAt}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={statusTone(detail.status)}>{detail.status}</StatusBadge>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleViewPdf}>
              View PDF
            </button>
            {detail.status === "sent" ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void handleResend()}
                disabled={resending}
              >
                {resending ? "Resending..." : "Resend"}
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleViewPdf}>
              Download
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Tenant</div>
            </div>
            <div className="card-body">
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{detail.tenant.name}</div>
              <div className="td-muted">{detail.tenant.email}</div>
              {detail.tenant.phone ? (
                <div className="td-muted">{detail.tenant.phone}</div>
              ) : null}
              {detail.tenant.residentialAddress ? (
                <div style={{ marginTop: 8 }}>
                  <div className="td-muted" style={{ fontSize: 12 }}>Address</div>
                  <div style={{ fontWeight: 500 }}>{detail.tenant.residentialAddress}</div>
                </div>
              ) : null}
              {detail.tenant.idType ? (
                <div style={{ marginTop: 8 }}>
                  <div className="td-muted" style={{ fontSize: 12 }}>ID</div>
                  <div style={{ fontWeight: 500 }}>{detail.tenant.idType}: {detail.tenant.idNumber}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Property & Unit</div>
            </div>
            <div className="card-body">
              <div style={{ fontWeight: 600 }}>{detail.property.name}</div>
              <div className="td-muted">{detail.property.address}</div>
              {detail.unit ? (
                <div style={{ marginTop: 8 }}>
                  <div className="td-muted" style={{ fontSize: 12 }}>Unit</div>
                  <div style={{ fontWeight: 500 }}>Unit {detail.unit.unitNumber}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Financial Terms</div>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Billing Schedule</div>
                <div style={{ fontWeight: 600 }}>{detail.rent.billingSchedule}</div>
              </div>
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Annual Rent</div>
                <div style={{ fontWeight: 600 }}>{detail.rent.annualRentFormatted}</div>
              </div>
              {detail.depositFormatted ? (
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Deposit</div>
                  <div style={{ fontWeight: 500 }}>{detail.depositFormatted}</div>
                </div>
              ) : null}
              {detail.serviceChargeFormatted ? (
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Service Charge</div>
                  <div style={{ fontWeight: 500 }}>{detail.serviceChargeFormatted}</div>
                </div>
              ) : null}
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
              {detail.sentAt ? (
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Sent At</div>
                  <div style={{ fontWeight: 500 }}>{detail.sentAt}</div>
                </div>
              ) : null}
            </div>
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
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.name ?? "—"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Phone</div>
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.phone ?? "—"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Email</div>
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.email ?? "—"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Relationship</div>
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.relationship ?? "—"}</div>
                </div>
              </div>
              {detail.guarantor.company ? (
                <div style={{ marginTop: 8 }}>
                  <div className="td-muted" style={{ fontSize: 12 }}>Company</div>
                  <div style={{ fontWeight: 500 }}>{detail.guarantor.company}</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {detail.conditions?.specialConditions ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Special Conditions</div>
            </div>
            <div className="card-body">
              {detail.conditions.noticePeriodDays ? (
                <div style={{ marginBottom: 8 }}>
                  <span className="td-muted">Notice period: </span>
                  <span style={{ fontWeight: 500 }}>{detail.conditions.noticePeriodDays} days</span>
                </div>
              ) : null}
              {detail.conditions.utilities ? (
                <div style={{ marginBottom: 8 }}>
                  <span className="td-muted">Utilities: </span>
                  <span style={{ fontWeight: 500 }}>{detail.conditions.utilities}</span>
                </div>
              ) : null}
              {detail.conditions.permittedUse ? (
                <div style={{ marginBottom: 8 }}>
                  <span className="td-muted">Permitted use: </span>
                  <span style={{ fontWeight: 500 }}>{detail.conditions.permittedUse}</span>
                </div>
              ) : null}
              <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>
                {detail.conditions.specialConditions}
              </div>
            </div>
          </div>
        ) : null}
      </LandlordPortalShell>
    </>
  );
}
