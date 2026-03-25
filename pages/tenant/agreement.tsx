import { useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import SignaturePad from "../../components/ui/SignaturePad";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import { buildAgreementHtml, printAgreementDocument } from "../../lib/agreement-print";

interface AgreementTimelineRow {
  label: string;
  description: string;
  time: string;
  done: boolean;
}

interface TenantAgreementResponse {
  tenant: {
    id: string;
    name: string;
  };
  agreement: {
    id: string;
    title: string;
    status: string;
    statusLabel: string;
    propertyName: string;
    unitNumber: string;
    leaseStartLabel: string;
    leaseEndLabel: string;
    leaseStartIso: string;
    leaseEndIso: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePrice: number;
    billingCyclePriceFormatted: string;
    billingSchedule: string;
    annualRent: number;
    annualRentFormatted: string;
    depositAmount: number;
    depositFormatted: string;
    serviceCharge?: number | null;
    landlordName: string;
    landlordCompany: string;
    landlordEmail: string;
    landlordPhone?: string | null;
    tenantEmail: string;
    tenantPhone?: string | null;
    tenantResidentialAddress?: string | null;
    tenantIdType?: string | null;
    tenantIdNumber?: string | null;
    propertyAddress: string;
    templateName: string;
    templateFileUrl: string | null;
    conditions?: {
      noticePeriodDays?: number | null;
      utilities?: string | null;
      permittedUse?: string | null;
      specialConditions?: string | null;
    } | null;
    guarantor?: {
      name?: string | null;
      phone?: string | null;
      email?: string | null;
      relationship?: string | null;
      occupation?: string | null;
      company?: string | null;
      address?: string | null;
    } | null;
    notes?: string | null;
    contentSections: string[];
    canSign: boolean;
  } | null;
  timeline: AgreementTimelineRow[];
}

interface AgreementMutationResponse {
  agreement: {
    id: string;
    status: string;
    statusLabel: string;
    lastActivity: string | null;
  };
}

export default function TenantAgreementPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [agreementData, setAgreementData] = useState<TenantAgreementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [signing, setSigning] = useState(false);
  const [savedSignature, setSavedSignature] = useState("");
  const [guarantorLinkCopied, setGuarantorLinkCopied] = useState(false);

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadAgreement() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantAgreementResponse>("/tenant/agreement", {
          token: tenantToken,
        });

        if (!cancelled) {
          setAgreementData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your agreement.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAgreement();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, tenantSession?.token]);

  async function handleSignAgreement() {
    if (!tenantSession?.token) {
      showToast("Tenant session missing. Please sign in again.", "error");
      return;
    }

    if (!signatureData) {
      showToast("Please add your signature before signing.", "error");
      return;
    }

    setSigning(true);

    try {
      await apiRequest<AgreementMutationResponse>("/tenant/agreement/sign", {
        method: "POST",
        token: tenantSession.token,
        body: {
          signatureData,
        },
      });
      showToast("Agreement signed successfully", "success");
      setSavedSignature(signatureData);
      setSignatureData("");
      refreshData();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Agreement could not be signed.",
        "error",
      );
    } finally {
      setSigning(false);
    }
  }

  function handleDownload() {
    const a = agreementData?.agreement;
    const t = agreementData?.tenant;
    if (!a || !t) return;

    printAgreementDocument({
      agreementRef: a.id,
      generatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      landlord: {
        companyName: a.landlordCompany,
        name: a.landlordName,
        email: a.landlordEmail,
        phone: a.landlordPhone,
      },
      tenant: {
        name: t.name,
        email: a.tenantEmail,
        phone: a.tenantPhone,
        residentialAddress: a.tenantResidentialAddress,
        idType: a.tenantIdType,
        idNumber: a.tenantIdNumber,
      },
      premises: {
        propertyName: a.propertyName,
        address: a.propertyAddress,
        unitNumber: a.unitNumber,
      },
      lease: {
        title: a.title,
        startDate: a.leaseStartIso,
        endDate: a.leaseEndIso,
      },
      financial: {
        annualRent: a.annualRent,
        billingFrequency: a.billingFrequency,
        billingFrequencyLabel: a.billingFrequencyLabel,
        billingCyclePrice: a.billingCyclePrice,
        billingSchedule: a.billingSchedule,
        depositAmount: a.depositAmount,
        serviceCharge: a.serviceCharge,
      },
      conditions: a.conditions,
      guarantor: a.guarantor,
      notes: a.notes,
      templateName: a.templateName,
    });
  }

  const agreement = agreementData?.agreement;
  const description = agreement
    ? `${agreement.propertyName} · Unit ${agreement.unitNumber} · ${agreement.statusLabel}`
    : loading
      ? "Loading your agreement..."
      : error || "No agreement is available yet.";

  return (
    <>
      <PageMeta title="DoorRent — My Agreement" urlPath="/tenant/agreement" />
      <TenantPortalShell topbarTitle="My Agreement" breadcrumb="Dashboard → My Agreement">
        <PageHeader title="My Agreement" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        {!agreement ? (
          <div className="card">
            <div className="card-body" style={{ color: "var(--ink2)" }}>
              {loading
                ? "Loading agreement..."
                : "Your landlord has not issued an agreement yet."}
            </div>
          </div>
        ) : (
          <div className="grid-2">
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">{agreement.title}</div>
                    <div className="card-subtitle">
                      {agreement.templateName} · {agreement.landlordCompany}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      agreement.status === "signed" ? "badge-green" : "badge-amber"
                    }`}
                  >
                    {agreement.statusLabel}
                  </span>
                </div>
                {(() => {
                  const htmlSrc = buildAgreementHtml({
                    agreementRef: agreement.id,
                    generatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
                    landlord: { companyName: agreement.landlordCompany, name: agreement.landlordName, email: agreement.landlordEmail, phone: agreement.landlordPhone },
                    tenant: { name: agreementData?.tenant.name ?? "", email: agreement.tenantEmail, phone: agreement.tenantPhone, residentialAddress: agreement.tenantResidentialAddress, idType: agreement.tenantIdType, idNumber: agreement.tenantIdNumber, signatureDataUrl: savedSignature || undefined },
                    premises: { propertyName: agreement.propertyName, address: agreement.propertyAddress, unitNumber: agreement.unitNumber },
                    lease: { title: agreement.title, startDate: agreement.leaseStartIso, endDate: agreement.leaseEndIso },
                    financial: { annualRent: agreement.annualRent, billingFrequency: agreement.billingFrequency, billingFrequencyLabel: agreement.billingFrequencyLabel, billingCyclePrice: agreement.billingCyclePrice, billingSchedule: agreement.billingSchedule, depositAmount: agreement.depositAmount, serviceCharge: agreement.serviceCharge },
                    conditions: agreement.conditions,
                    guarantor: agreement.guarantor,
                    notes: agreement.notes,
                    templateName: agreement.templateName,
                  });
                  return (
                    <iframe
                      srcDoc={htmlSrc}
                      style={{ width: "100%", height: 520, border: "none", borderBottom: "1px solid var(--border)" }}
                      title="Agreement Document"
                    />
                  );
                })()}
                <div className="card-body">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleDownload}
                    >
                      Download PDF
                    </button>
                  </div>

                  {agreement.canSign ? (
                    <div>
                      <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600 }}>
                        Add your signature
                      </div>
                      <SignaturePad onChange={setSignatureData} />
                      <button
                        type="button"
                        className="btn btn-primary btn-full"
                        style={{ marginTop: 12 }}
                        onClick={handleSignAgreement}
                        disabled={signing || !signatureData}
                      >
                        {signing ? "Signing..." : "Sign Agreement"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          padding: 14,
                          borderRadius: "var(--radius)",
                          background: "var(--green-light)",
                          border: "1px solid rgba(26,107,74,0.18)",
                          color: "var(--green)",
                          fontSize: 13,
                          marginBottom: 16,
                        }}
                      >
                        You have signed this agreement. Share the link below with your guarantor so they can sign their copy.
                      </div>
                      {agreement.guarantor?.name ? (
                        <div
                          style={{
                            padding: 14,
                            borderRadius: "var(--radius)",
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 8 }}>
                            Guarantor link — {agreement.guarantor.name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 10 }}>
                            Send this link to your guarantor. They can view the agreement, sign it, and save their copy — without needing a DoorRent account.
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              readOnly
                              className="form-input"
                              style={{ fontSize: 12, flex: 1 }}
                              value={`${typeof window !== "undefined" ? window.location.origin : ""}/agreement/guarantor/${agreement.id}`}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                void navigator.clipboard.writeText(`${window.location.origin}/agreement/guarantor/${agreement.id}`);
                                setGuarantorLinkCopied(true);
                                setTimeout(() => setGuarantorLinkCopied(false), 2000);
                              }}
                            >
                              {guarantorLinkCopied ? "Copied!" : "Copy link"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Agreement Timeline</div>
                </div>
                <div className="card-body">
                  <div className="timeline">
                    {agreementData?.timeline.map((item) => (
                      <div key={`${item.label}-${item.time}`} className="timeline-item">
                        <div
                          className="timeline-dot"
                          style={{
                            background: item.done ? "var(--green)" : "var(--border2)",
                          }}
                        />
                        <div className="timeline-content">
                          <div
                            className="timeline-title"
                            style={item.done ? undefined : { color: "var(--ink3)" }}
                          >
                            {item.label}
                          </div>
                          <div className="timeline-desc">{item.description}</div>
                        </div>
                        <div className="timeline-time">{item.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </TenantPortalShell>
    </>
  );
}
