import { useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import SignaturePad from "../../components/ui/SignaturePad";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

interface GraceTimelineItem {
  id: string;
  label: string;
  description: string;
  time: string;
  done: boolean;
}

interface GracePeriodPayload {
  defaultId: string;
  status: "GRACE_PERIOD";
  workflowStatus:
    | "AWAITING_TENANT_SIGNATURE"
    | "AWAITING_LANDLORD_APPROVAL"
    | "GRANTED";
  workflowLabel: string;
  title: string;
  propertyName: string;
  propertyAddress: string;
  unitNumber: string;
  landlordName: string;
  landlordCompany: string;
  landlordEmail: string;
  landlordPhone?: string | null;
  outstandingAmount: number;
  agreedAmount: number;
  currency: string;
  newDeadline: string;
  newDeadlineLabel: string;
  initiatedAt: string;
  initiatedAtLabel: string;
  tenantSignedAt?: string | null;
  landlordApprovedAt?: string | null;
  tenantSignatureDataUrl?: string | null;
  notes?: string | null;
  canSign: boolean;
  contentSections: string[];
}

interface TenantGracePeriodResponse {
  tenant: {
    id: string;
    name: string;
    email: string;
  };
  gracePeriod: GracePeriodPayload | null;
  timeline: GraceTimelineItem[];
}

interface GraceMutationResponse {
  defaultId: string;
  workflowStatus: GracePeriodPayload["workflowStatus"];
  workflowLabel: string;
}

function money(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TenantGracePeriodPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [pageData, setPageData] = useState<TenantGracePeriodResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [savedSignature, setSavedSignature] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadGraceAgreement() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantGracePeriodResponse>("/tenant/grace-period", {
          token: tenantToken,
        });

        if (!cancelled) {
          setPageData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your grace agreement.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGraceAgreement();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, tenantSession?.token]);

  async function handleSignGraceAgreement() {
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
      await apiRequest<GraceMutationResponse>("/tenant/grace-period/sign", {
        method: "POST",
        token: tenantSession.token,
        body: {
          signatureData,
        },
      });
      showToast("Grace agreement signed and submitted for landlord approval.", "success");
      setSavedSignature(signatureData);
      setSignatureData("");
      refreshData();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Grace agreement could not be signed.",
        "error",
      );
    } finally {
      setSigning(false);
    }
  }

  const gracePeriod = pageData?.gracePeriod;
  const description = gracePeriod
    ? `${gracePeriod.propertyName} · Unit ${gracePeriod.unitNumber} · ${gracePeriod.workflowLabel}`
    : loading
      ? "Loading your grace agreement..."
      : error || "No grace agreement is currently awaiting your action.";

  return (
    <>
      <PageMeta title="DoorRent — Grace Period" urlPath="/tenant/grace-period" />
      <TenantPortalShell topbarTitle="Grace Period" breadcrumb="Dashboard → Grace Period">
        <PageHeader title="Grace Period Agreement" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        {!gracePeriod ? (
          <div className="card">
            <div className="card-body" style={{ color: "var(--ink2)" }}>
              {loading
                ? "Loading grace agreement..."
                : "Your landlord has not issued a grace agreement that needs action right now."}
            </div>
          </div>
        ) : (
          <div className="grid-2">
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">{gracePeriod.title}</div>
                    <div className="card-subtitle">
                      {gracePeriod.propertyName} · Unit {gracePeriod.unitNumber}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      gracePeriod.workflowStatus === "GRANTED"
                        ? "badge-green"
                        : gracePeriod.workflowStatus === "AWAITING_LANDLORD_APPROVAL"
                          ? "badge-blue"
                          : "badge-amber"
                    }`}
                  >
                    {gracePeriod.workflowLabel}
                  </span>
                </div>
                <div className="card-body">
                  <div className="form-row">
                    <div>
                      <div className="td-muted" style={{ fontSize: 12 }}>Outstanding Amount</div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        {money(gracePeriod.outstandingAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 12 }}>Agreed Payment</div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        {money(gracePeriod.agreedAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginTop: 16 }}>
                    <div>
                      <div className="td-muted" style={{ fontSize: 12 }}>New Deadline</div>
                      <div style={{ fontWeight: 600 }}>{gracePeriod.newDeadlineLabel}</div>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 12 }}>Landlord</div>
                      <div style={{ fontWeight: 600 }}>{gracePeriod.landlordCompany}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="td-muted" style={{ fontSize: 12 }}>Property Address</div>
                    <div style={{ fontWeight: 500 }}>{gracePeriod.propertyAddress}</div>
                  </div>

                  {gracePeriod.notes ? (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 14,
                        borderRadius: "var(--radius)",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      <strong>Landlord note</strong>
                      <div style={{ marginTop: 6 }}>{gracePeriod.notes}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div className="card-title">Terms of Acceptance</div>
                </div>
                <div className="card-body" style={{ display: "grid", gap: 12 }}>
                  {gracePeriod.contentSections.map((item) => (
                    <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--green)", fontSize: 10, marginTop: 7 }}>●</span>
                      <span style={{ fontSize: 13, lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {gracePeriod.canSign ? (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Accept and Sign</div>
                  </div>
                  <div className="card-body">
                    <div
                      style={{
                        padding: 14,
                        borderRadius: "var(--radius)",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        color: "var(--ink2)",
                        fontSize: 13,
                        lineHeight: 1.6,
                        marginBottom: 16,
                      }}
                    >
                      Signing this agreement confirms that you accept the grace arrangement and are submitting it to your landlord for approval.
                    </div>
                    <SignaturePad onChange={setSignatureData} />
                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      style={{ marginTop: 12 }}
                      onClick={handleSignGraceAgreement}
                      disabled={signing || !signatureData}
                    >
                      {signing ? "Signing..." : "Sign and Submit"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Signature Status</div>
                  </div>
                  <div className="card-body">
                    <div
                      style={{
                        padding: 14,
                        borderRadius: "var(--radius)",
                        background:
                          gracePeriod.workflowStatus === "GRANTED"
                            ? "var(--green-light)"
                            : "rgba(11,98,176,0.08)",
                        border:
                          gracePeriod.workflowStatus === "GRANTED"
                            ? "1px solid rgba(26,107,74,0.18)"
                            : "1px solid rgba(11,98,176,0.16)",
                        fontSize: 13,
                        lineHeight: 1.6,
                        marginBottom: 16,
                      }}
                    >
                      {gracePeriod.workflowStatus === "AWAITING_LANDLORD_APPROVAL"
                        ? "Your signed grace agreement has been sent to the landlord and is waiting for approval."
                        : "This grace period has been approved and is now effective."}
                    </div>

                    {gracePeriod.tenantSignatureDataUrl || savedSignature ? (
                      <div style={{ marginTop: 10 }}>
                        <div className="td-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                          Your submitted signature
                        </div>
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius)",
                            background: "#fff",
                            padding: 12,
                          }}
                        >
                          <img
                            src={savedSignature || gracePeriod.tenantSignatureDataUrl || ""}
                            alt="Tenant signature"
                            style={{ width: "100%", maxHeight: 120, objectFit: "contain" }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Approval Timeline</div>
                </div>
                <div className="card-body" style={{ display: "grid", gap: 14 }}>
                  {pageData?.timeline.map((item) => (
                    <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          marginTop: 5,
                          background: item.done ? "var(--green)" : "var(--border)",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{item.label}</div>
                        <div style={{ color: "var(--ink2)", fontSize: 13, marginTop: 2 }}>
                          {item.description}
                        </div>
                        <div style={{ color: "var(--ink3)", fontSize: 12, marginTop: 4 }}>
                          {item.time ? fmtDateTime(item.time) : "Pending"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </TenantPortalShell>
    </>
  );
}
