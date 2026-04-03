import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../../components/auth/LandlordPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import SignaturePad from "../../../components/ui/SignaturePad";
import { useLandlordPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import { printAgreementDocument } from "../../../lib/agreement-print";
import {
  canRenderSignaturePreview,
  resolveSignatureDisplayUrl,
} from "../../../lib/signature-data";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import type { BadgeTone } from "../../../types/app";
import { resolveBrandDisplayName } from "../../../lib/branding";

interface AgreementDetail {
  id: string;
  title: string;
  status: string;
  statusLabel?: string;
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
  cautionFee?: {
    status: "HELD" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FORFEITED";
    statusLabel: string;
    depositAmount: number;
    refundAmount: number;
    deductionAmount: number;
    heldAmount: number;
    notes: string | null;
    settledAtIso: string | null;
    settledAt: string | null;
    summary: string;
  } | null;
  serviceCharge: number | null;
  serviceChargeFormatted: string | null;
  leaseStart: string;
  leaseEnd: string;
  leaseStartIso: string | null;
  leaseEndIso: string | null;
  sentAt: string | null;
  lastActivity: string | null;
  createdAt: string;
  tenantSignatureDataUrl: string | null;
  tenantSignedDate: string | null;
  landlordSignatureDataUrl: string | null;
  landlordSignedDate: string | null;
  canLandlordSign: boolean;
  canLandlordWitnessSign: boolean;
  landlordWitnessAccessToken?: string | null;
  landlordWitnessSigningUrl?: string | null;
  signing: {
    tenantSigned: boolean;
    landlordSigned: boolean;
    tenantWitnessSigned: boolean;
    landlordWitnessSigned: boolean;
    fullySigned: boolean;
  };
  guarantor: {
    name: string | null;
    phone: string | null;
    email: string | null;
    relationship: string | null;
    occupation: string | null;
    company: string | null;
    address?: string | null;
    signatureDataUrl?: string | null;
  } | null;
  witnessName?: string | null;
  witnessAddress?: string | null;
  witnessSignatureDataUrl?: string | null;
  witnessDate?: string | null;
  landlordWitnessName?: string | null;
  landlordWitnessAddress?: string | null;
  landlordWitnessSignatureDataUrl?: string | null;
  landlordWitnessDate?: string | null;
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

type CautionFeeStatus =
  | "HELD"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "FORFEITED";

function statusTone(status: string): BadgeTone {
  if (status === "fully_signed") return "green";
  if (status === "awaiting_witness_signatures") return "amber";
  if (status === "awaiting_landlord_signature") return "accent";
  if (status === "sent") return "amber";
  if (status === "draft") return "gray";
  return "red";
}

function cautionFeeTone(status: CautionFeeStatus): BadgeTone {
  if (status === "REFUNDED") return "green";
  if (status === "PARTIALLY_REFUNDED") return "amber";
  if (status === "HELD") return "accent";
  return "red";
}

function isRenderableSignatureUrl(value?: string | null) {
  return canRenderSignaturePreview(value);
}

function renderStoredSignaturePanel(
  label: string,
  signatureDataUrl?: string | null,
  alt?: string,
) {
  if (!signatureDataUrl) {
    return null;
  }

  return (
    <>
      <div className="td-muted" style={{ fontSize: 12, marginBottom: 8 }}>
        {label}
      </div>
      {isRenderableSignatureUrl(signatureDataUrl) ? (
        <img
          src={resolveSignatureDisplayUrl(signatureDataUrl) ?? ""}
          alt={alt ?? label}
          style={{ maxWidth: 220, height: 80, objectFit: "contain", display: "block" }}
        />
      ) : (
        <div className="td-muted">Signed electronically via DoorRent</div>
      )}
    </>
  );
}

export default function AgreementDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { landlordSession } = useLandlordPortalSession();
  const { showToast } = usePrototypeUI();
  const brandDisplayName = resolveBrandDisplayName(
    landlordSession?.landlord.branding,
    "DoorRent",
  );
  const [detail, setDetail] = useState<AgreementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [landlordSignatureData, setLandlordSignatureData] = useState("");
  const [landlordWitnessSignatureData, setLandlordWitnessSignatureData] =
    useState("");
  const [landlordWitnessName, setLandlordWitnessName] = useState("");
  const [landlordWitnessAddress, setLandlordWitnessAddress] = useState("");
  const [signingAgreement, setSigningAgreement] = useState(false);
  const [signingWitness, setSigningWitness] = useState(false);
  const [savingCautionFee, setSavingCautionFee] = useState(false);
  const [cautionFeeStatus, setCautionFeeStatus] = useState<CautionFeeStatus>("HELD");
  const [cautionFeeRefundAmount, setCautionFeeRefundAmount] = useState("");
  const [cautionFeeNotes, setCautionFeeNotes] = useState("");

  const syncCautionFeeForm = useCallback((nextDetail: AgreementDetail) => {
    const cautionFee = nextDetail.cautionFee;
    setCautionFeeStatus(cautionFee?.status ?? "HELD");
    setCautionFeeRefundAmount(
      cautionFee?.status === "PARTIALLY_REFUNDED" && cautionFee.refundAmount > 0
        ? String(cautionFee.refundAmount)
        : "",
    );
    setCautionFeeNotes(cautionFee?.notes ?? "");
  }, []);

  const loadAgreement = useCallback(async () => {
    const token = landlordSession?.token;
    if (!token || !id || Array.isArray(id)) return;

    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<AgreementDetail>(`/landlord/agreements/${id}`, {
        token,
      });
      setDetail(res.data);
      setLandlordWitnessName(res.data.landlordWitnessName ?? "");
      setLandlordWitnessAddress(res.data.landlordWitnessAddress ?? "");
      syncCautionFeeForm(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load agreement.");
    } finally {
      setLoading(false);
    }
  }, [id, landlordSession?.token, syncCautionFeeForm]);

  useEffect(() => {
    void loadAgreement();
  }, [loadAgreement]);

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
        signatureDataUrl: detail.landlordSignatureDataUrl,
        signedDate: detail.landlordSignedDate,
      },
      tenant: {
        name: detail.tenant.name,
        email: detail.tenant.email,
        phone: detail.tenant.phone,
        residentialAddress: detail.tenant.residentialAddress,
        idType: detail.tenant.idType,
        idNumber: detail.tenant.idNumber,
        signatureDataUrl: detail.tenantSignatureDataUrl,
        signedDate: detail.tenantSignedDate,
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
      guarantor: detail.guarantor
        ? {
            ...detail.guarantor,
            address: detail.witnessAddress ?? detail.guarantor.address ?? null,
            signatureDataUrl:
              detail.witnessSignatureDataUrl ??
              detail.guarantor.signatureDataUrl ??
              null,
            witnessDate: detail.witnessDate ?? null,
          }
        : null,
      landlordWitness: {
        name: detail.landlordWitnessName,
        address: detail.landlordWitnessAddress,
        signatureDataUrl: detail.landlordWitnessSignatureDataUrl,
        witnessDate: detail.landlordWitnessDate,
      },
      notes: null,
      templateName: detail.template,
      brand: landlordSession?.landlord.branding ?? undefined,
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

  async function handleLandlordSign() {
    if (!landlordSession?.token || !detail || !detail.canLandlordSign) return;
    if (!landlordSignatureData) {
      showToast("Add the landlord signature before signing.", "error");
      return;
    }

    setSigningAgreement(true);
    try {
      await apiRequest(`/landlord/agreements/${detail.id}/sign`, {
        method: "POST",
        token: landlordSession.token,
        body: {
          signatureData: landlordSignatureData,
        },
      });
      showToast("Agreement signed successfully.", "success");
      setLandlordSignatureData("");
      await loadAgreement();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not sign agreement.",
        "error",
      );
    } finally {
      setSigningAgreement(false);
    }
  }

  async function handleLandlordWitnessSign() {
    if (!landlordSession?.token || !detail || !detail.canLandlordWitnessSign) return;
    if (!landlordWitnessSignatureData || !landlordWitnessName.trim()) {
      showToast("Add the witness name and signature before continuing.", "error");
      return;
    }

    setSigningWitness(true);
    try {
      await apiRequest(`/landlord/agreements/${detail.id}/witness-sign`, {
        method: "POST",
        token: landlordSession.token,
        body: {
          signatureData: landlordWitnessSignatureData,
          witnessName: landlordWitnessName.trim(),
          witnessAddress: landlordWitnessAddress.trim() || undefined,
        },
      });
      showToast("Landlord witness signed successfully.", "success");
      setLandlordWitnessSignatureData("");
      await loadAgreement();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not record witness signature.",
        "error",
      );
    } finally {
      setSigningWitness(false);
    }
  }

  async function handleSaveCautionFee() {
    if (!landlordSession?.token || !detail) {
      return;
    }

    const payload: {
      status: CautionFeeStatus;
      refundAmount?: number;
      notes?: string;
    } = {
      status: cautionFeeStatus,
      notes: cautionFeeNotes.trim() || undefined,
    };

    if (cautionFeeStatus === "PARTIALLY_REFUNDED") {
      const refundAmount = Number(cautionFeeRefundAmount);

      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        showToast("Enter the amount returned to the tenant.", "error");
        return;
      }

      payload.refundAmount = Math.round(refundAmount);
    }

    setSavingCautionFee(true);
    try {
      const res = await apiRequest<AgreementDetail>(
        `/landlord/agreements/${detail.id}/caution-fee`,
        {
          method: "PATCH",
          token: landlordSession.token,
          body: payload,
        },
      );
      setDetail(res.data);
      syncCautionFeeForm(res.data);
      showToast("Caution fee updated successfully.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not update caution fee.",
        "error",
      );
    } finally {
      setSavingCautionFee(false);
    }
  }

  async function handleCopyLandlordWitnessLink() {
    if (!detail?.landlordWitnessSigningUrl) {
      showToast("Landlord witness link is not available yet.", "error");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(detail.landlordWitnessSigningUrl);
        showToast("Landlord witness link copied.", "success");
      } else {
        showToast(detail.landlordWitnessSigningUrl, "info");
      }
    } catch {
      showToast("Could not copy the landlord witness link.", "error");
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

  const tenantWitnessSignatureDataUrl =
    detail.witnessSignatureDataUrl ?? detail.guarantor?.signatureDataUrl ?? null;
  const tenantWitnessSignedDate = detail.witnessDate ?? null;

  return (
    <>
      <PageMeta title={`${brandDisplayName} — ${detail.title}`} urlPath={`/landlord/agreements/${detail.id}`} />
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
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {detail.canLandlordSign ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const node = document.getElementById("landlord-sign-panel");
                  node?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Sign as Landlord
              </button>
            ) : null}
            {detail.landlordWitnessSigningUrl &&
            !detail.signing.landlordWitnessSigned ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void handleCopyLandlordWitnessLink()}
              >
                Copy Witness Link
              </button>
            ) : null}
            <StatusBadge tone={statusTone(detail.status)}>
              {detail.statusLabel ?? detail.status}
            </StatusBadge>
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
            <div className="card-title">Execution</div>
          </div>
          <div className="card-body">
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Tenant</div>
                <div style={{ fontWeight: 600 }}>
                  {detail.signing.tenantSigned
                    ? `Signed${detail.tenantSignedDate ? ` · ${detail.tenantSignedDate}` : ""}`
                    : "Pending"}
                </div>
              </div>
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Tenant witness</div>
                <div style={{ fontWeight: 600 }}>
                  {detail.signing.tenantWitnessSigned
                    ? `Signed${tenantWitnessSignedDate ? ` · ${tenantWitnessSignedDate}` : ""}`
                    : detail.signing.tenantSigned
                      ? "Awaiting witness signature"
                      : "Locked"}
                </div>
              </div>
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Landlord</div>
                <div style={{ fontWeight: 600 }}>
                  {detail.signing.landlordSigned
                    ? `Signed${detail.landlordSignedDate ? ` · ${detail.landlordSignedDate}` : ""}`
                    : detail.signing.tenantSigned
                      ? "Awaiting landlord signature"
                      : "Waiting for tenant"}
                </div>
              </div>
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Landlord witness</div>
                <div style={{ fontWeight: 600 }}>
                  {detail.signing.landlordWitnessSigned
                    ? `Signed${detail.landlordWitnessDate ? ` · ${detail.landlordWitnessDate}` : ""}`
                    : detail.signing.landlordSigned
                      ? "Optional"
                      : "Locked"}
                </div>
              </div>
            </div>

            {detail.tenantSignatureDataUrl ? (
              <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--surface2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                {renderStoredSignaturePanel(
                  `Tenant signature on file${detail.tenantSignedDate ? ` · ${detail.tenantSignedDate}` : ""}`,
                  detail.tenantSignatureDataUrl,
                  "Tenant signature",
                )}
              </div>
            ) : null}

            {tenantWitnessSignatureDataUrl ? (
              <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--surface2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                {renderStoredSignaturePanel(
                  `Tenant witness signature on file${tenantWitnessSignedDate ? ` · ${tenantWitnessSignedDate}` : ""}`,
                  tenantWitnessSignatureDataUrl,
                  "Tenant witness signature",
                )}
              </div>
            ) : null}

            {detail.landlordSignatureDataUrl ? (
              <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--surface2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                {renderStoredSignaturePanel(
                  `Landlord signature on file${detail.landlordSignedDate ? ` · ${detail.landlordSignedDate}` : ""}`,
                  detail.landlordSignatureDataUrl,
                  "Landlord signature",
                )}
              </div>
            ) : null}

            {detail.canLandlordSign ? (
              <div
                id="landlord-sign-panel"
                style={{
                  padding: 16,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 10 }}>
                  Add landlord signature
                </div>
                <SignaturePad onChange={setLandlordSignatureData} />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={() => void handleLandlordSign()}
                  disabled={signingAgreement || !landlordSignatureData}
                >
                  {signingAgreement ? "Signing..." : "Sign as Landlord"}
                </button>
              </div>
            ) : null}

            {detail.landlordWitnessSigningUrl &&
            !detail.signing.landlordWitnessSigned ? (
              <div
                style={{
                  padding: 16,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  marginBottom: 16,
                  background: "var(--surface2)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Landlord witness remote signing link
                </div>
                <div className="td-muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  Share this link if the landlord&apos;s witness is in a different location.
                </div>
                <div className="form-row" style={{ gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={detail.landlordWitnessSigningUrl}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void handleCopyLandlordWitnessLink()}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            ) : null}

            {detail.landlordWitnessSignatureDataUrl ? (
              <div style={{ marginBottom: 16 }}>
                {renderStoredSignaturePanel(
                  `Landlord witness signature on file${detail.landlordWitnessDate ? ` · ${detail.landlordWitnessDate}` : ""}`,
                  detail.landlordWitnessSignatureDataUrl,
                  "Landlord witness signature",
                )}
              </div>
            ) : null}

            {detail.canLandlordWitnessSign ? (
              <div
                style={{
                  padding: 16,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 10 }}>
                  Add landlord witness
                </div>
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div>
                    <label className="form-label">Witness Name</label>
                    <input
                      className="form-input"
                      value={landlordWitnessName}
                      onChange={(event) => setLandlordWitnessName(event.target.value)}
                      placeholder="Enter witness name"
                    />
                  </div>
                  <div>
                    <label className="form-label">Witness Address</label>
                    <input
                      className="form-input"
                      value={landlordWitnessAddress}
                      onChange={(event) => setLandlordWitnessAddress(event.target.value)}
                      placeholder="Enter witness address"
                    />
                  </div>
                </div>
                <SignaturePad onChange={setLandlordWitnessSignatureData} />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => void handleLandlordWitnessSign()}
                  disabled={
                    signingWitness ||
                    !landlordWitnessName.trim() ||
                    !landlordWitnessSignatureData
                  }
                >
                  {signingWitness ? "Saving..." : "Sign as Witness"}
                </button>
              </div>
            ) : null}
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
                  <div className="td-muted" style={{ fontSize: 12 }}>Caution Fee</div>
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

        {detail.depositAmount && detail.depositAmount > 0 ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Caution Fee</div>
                <div className="card-subtitle">
                  Record how the refundable unit caution fee ended after move-out inspection.
                </div>
              </div>
              <StatusBadge
                tone={cautionFeeTone(detail.cautionFee?.status ?? "HELD")}
              >
                {detail.cautionFee?.statusLabel ?? "Held"}
              </StatusBadge>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Collected</div>
                  <div style={{ fontWeight: 600 }}>{detail.depositFormatted ?? "—"}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Refunded</div>
                  <div style={{ fontWeight: 600 }}>
                    {detail.cautionFee
                      ? `₦${detail.cautionFee.refundAmount.toLocaleString("en-NG")}`
                      : "₦0"}
                  </div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Deducted</div>
                  <div style={{ fontWeight: 600 }}>
                    {detail.cautionFee
                      ? `₦${detail.cautionFee.deductionAmount.toLocaleString("en-NG")}`
                      : "₦0"}
                  </div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Updated</div>
                  <div style={{ fontWeight: 600 }}>
                    {detail.cautionFee?.settledAt ?? "Still held"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  color: "var(--ink2)",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                {detail.cautionFee?.summary ??
                  "Held as refundable caution fee pending move-out inspection."}
                {detail.cautionFee?.notes ? (
                  <div style={{ marginTop: 8 }}>
                    <strong style={{ color: "var(--ink)" }}>Inspection note:</strong>{" "}
                    {detail.cautionFee.notes}
                  </div>
                ) : null}
              </div>

              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Settlement Status</label>
                  <select
                    className="form-input"
                    value={cautionFeeStatus}
                    onChange={(event) => {
                      const nextStatus = event.target.value as CautionFeeStatus;
                      setCautionFeeStatus(nextStatus);
                      if (nextStatus === "REFUNDED" && detail.depositAmount) {
                        setCautionFeeRefundAmount(String(detail.depositAmount));
                      } else if (nextStatus === "FORFEITED") {
                        setCautionFeeRefundAmount("0");
                      } else if (nextStatus === "HELD") {
                        setCautionFeeRefundAmount("");
                      }
                    }}
                  >
                    <option value="HELD">Held</option>
                    <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                    <option value="REFUNDED">Refunded in Full</option>
                    <option value="FORFEITED">Forfeited</option>
                  </select>
                </div>
                {cautionFeeStatus === "PARTIALLY_REFUNDED" ? (
                  <div className="form-group">
                    <label className="form-label">Amount Returned To Tenant (₦)</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="Enter refund amount"
                      value={cautionFeeRefundAmount}
                      onChange={(event) => setCautionFeeRefundAmount(event.target.value)}
                    />
                    <div className="td-muted" style={{ marginTop: 4, fontSize: 11 }}>
                      DoorRent will treat the remaining balance as the deduction amount.
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Recorded Outcome</label>
                    <input
                      className="form-input"
                      value={
                        cautionFeeStatus === "REFUNDED"
                          ? "Full caution fee will be marked as refunded."
                          : cautionFeeStatus === "FORFEITED"
                            ? "Full caution fee will be marked as deducted."
                            : "Caution fee remains held until inspection is complete."
                      }
                      readOnly
                    />
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Inspection / Deduction Note</label>
                <textarea
                  className="form-input"
                  value={cautionFeeNotes}
                  onChange={(event) => setCautionFeeNotes(event.target.value)}
                  placeholder="Optional. Record damage, cleaning, keys returned, or refund context."
                  style={{ minHeight: 92, resize: "vertical" }}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 12 }}
                onClick={() => void handleSaveCautionFee()}
                disabled={savingCautionFee}
              >
                {savingCautionFee ? "Saving..." : "Save Caution Fee Update"}
              </button>
            </div>
          </div>
        ) : null}

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
