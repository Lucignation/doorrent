import { useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import SignaturePad from "../../components/ui/SignaturePad";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

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
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePriceFormatted: string;
    billingSchedule: string;
    annualRentFormatted: string;
    depositFormatted: string;
    landlordName: string;
    landlordCompany: string;
    templateName: string;
    templateFileUrl: string | null;
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
    const templateFileUrl = agreementData?.agreement?.templateFileUrl;

    if (templateFileUrl) {
      window.open(templateFileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    showToast("No PDF file is attached yet. Review the agreement summary below.", "info");
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
                <div
                  style={{
                    padding: 20,
                    background: "var(--bg)",
                    borderBottom: "1px solid var(--border)",
                    maxHeight: 360,
                    overflowY: "auto",
                    fontSize: 13,
                    lineHeight: 1.8,
                    color: "var(--ink2)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      textAlign: "center",
                      color: "var(--ink)",
                      marginBottom: 16,
                    }}
                  >
                    TENANCY AGREEMENT
                  </div>
                  <p>
                    <strong>Landlord:</strong> {agreement.landlordName}
                  </p>
                  <p>
                    <strong>Tenant:</strong> {agreementData?.tenant.name ?? "Tenant"}
                  </p>
                  <p>
                    <strong>Property:</strong> {agreement.propertyName} · Unit {agreement.unitNumber}
                  </p>
                  <p>
                    <strong>Lease:</strong> {agreement.leaseStartLabel} to {agreement.leaseEndLabel}
                  </p>
                  <p>
                    <strong>Billing:</strong> {agreement.billingSchedule}
                  </p>
                  <p>
                    <strong>Annual equivalent:</strong> {agreement.annualRentFormatted}
                  </p>
                  <p>
                    <strong>Deposit:</strong> {agreement.depositFormatted}
                  </p>
                  <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                    {agreement.contentSections.map((section) => (
                      <p key={section}>{section}</p>
                    ))}
                  </div>
                </div>
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
                    <div
                      style={{
                        padding: 14,
                        borderRadius: "var(--radius)",
                        background: "var(--green-light)",
                        border: "1px solid rgba(26,107,74,0.18)",
                        color: "var(--green)",
                        fontSize: 13,
                      }}
                    >
                      This agreement has been fully signed and is active in your workspace.
                    </div>
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
