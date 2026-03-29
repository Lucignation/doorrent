import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import PageMeta from "../../../components/layout/PageMeta";
import SignaturePad from "../../../components/ui/SignaturePad";
import { apiRequest } from "../../../lib/api";
import {
  buildAgreementHtml,
  printAgreementDocument,
} from "../../../lib/agreement-print";
import {
  buildBrandShellStyle,
  resolveBrandDisplayName,
  resolveBrandLoginBackgroundUrl,
  resolveBrandLogoUrl,
  type WorkspaceBranding,
} from "../../../lib/branding";
import { LOGO_PATH } from "../../../lib/site";
import { fetchWorkspaceContextByHost } from "../../../lib/workspace-context";

interface LandlordWitnessAgreementResponse {
  agreement: {
    id: string;
    title: string;
    landlordName: string;
    landlordCompany: string;
    landlordEmail: string;
    landlordPhone?: string | null;
    tenantName: string;
    tenantEmail: string;
    tenantPhone?: string | null;
    tenantResidentialAddress?: string | null;
    tenantIdType?: string | null;
    tenantIdNumber?: string | null;
    tenantSignatureDataUrl?: string | null;
    tenantSignedDate?: string | null;
    landlordSignatureDataUrl?: string | null;
    landlordSignedDate?: string | null;
    landlordWitnessName?: string | null;
    landlordWitnessAddress?: string | null;
    landlordWitnessSignatureDataUrl?: string | null;
    landlordWitnessDate?: string | null;
    propertyName: string;
    propertyAddress: string;
    unitNumber: string;
    leaseStartIso: string;
    leaseEndIso: string;
    leaseStartLabel: string;
    leaseEndLabel: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePrice: number;
    billingSchedule: string;
    annualRent: number;
    depositAmount: number;
    serviceCharge?: number | null;
    templateName: string;
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
    status?: string;
    statusLabel?: string;
    witnessName?: string | null;
    witnessDate?: string | null;
    witnessSignatureDataUrl?: string | null;
    witnessAddress?: string | null;
  };
}

export const getServerSideProps: GetServerSideProps<{
  workspaceBranding: WorkspaceBranding | null;
}> = async (context: GetServerSidePropsContext) => {
  const hostHeader =
    (Array.isArray(context.req.headers["x-forwarded-host"])
      ? context.req.headers["x-forwarded-host"][0]
      : context.req.headers["x-forwarded-host"]) ??
    context.req.headers.host ??
    null;
  const workspaceContext = await fetchWorkspaceContextByHost(hostHeader);

  return {
    props: {
      workspaceBranding: workspaceContext?.workspace?.branding ?? null,
    },
  };
};

export default function LandlordWitnessSigningPage({
  workspaceBranding,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const [data, setData] = useState<LandlordWitnessAgreementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [witnessAddress, setWitnessAddress] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [savedSignature, setSavedSignature] = useState("");
  const brandDisplayName = resolveBrandDisplayName(workspaceBranding, "DoorRent");
  const brandBackgroundUrl = resolveBrandLoginBackgroundUrl(workspaceBranding);
  const brandHeroStyle = brandBackgroundUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(15, 18, 16, 0.84), rgba(22, 55, 38, 0.76)), url(${brandBackgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: res } = await apiRequest<LandlordWitnessAgreementResponse>(
          `/agreements/landlord-witness-view/${id}`,
        );
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load this agreement.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSign() {
    if (!signatureData || !witnessName.trim() || !id) return;
    setSigning(true);
    try {
      await apiRequest(`/agreements/landlord-witness-sign/${id}`, {
        method: "POST",
        body: {
          signatureData,
          witnessName: witnessName.trim(),
          witnessAddress: witnessAddress.trim() || undefined,
        },
      });
      setSavedSignature(signatureData);
      setSigned(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit your signature.",
      );
    } finally {
      setSigning(false);
    }
  }

  function buildDoc() {
    const agreement = data?.agreement;
    if (!agreement) return null;

    return {
      agreementRef: agreement.id,
      generatedAt: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      landlord: {
        companyName: agreement.landlordCompany,
        name: agreement.landlordName,
        email: agreement.landlordEmail,
        phone: agreement.landlordPhone,
        signatureDataUrl: agreement.landlordSignatureDataUrl || undefined,
        signedDate: agreement.landlordSignedDate || undefined,
      },
      tenant: {
        name: agreement.tenantName,
        email: agreement.tenantEmail,
        phone: agreement.tenantPhone,
        residentialAddress: agreement.tenantResidentialAddress,
        idType: agreement.tenantIdType,
        idNumber: agreement.tenantIdNumber,
        signatureDataUrl: agreement.tenantSignatureDataUrl || undefined,
        signedDate: agreement.tenantSignedDate || undefined,
      },
      premises: {
        propertyName: agreement.propertyName,
        address: agreement.propertyAddress,
        unitNumber: agreement.unitNumber,
      },
      lease: {
        title: agreement.title,
        startDate: agreement.leaseStartIso,
        endDate: agreement.leaseEndIso,
      },
      financial: {
        annualRent: agreement.annualRent,
        billingFrequency: agreement.billingFrequency,
        billingFrequencyLabel: agreement.billingFrequencyLabel,
        billingCyclePrice: agreement.billingCyclePrice,
        billingSchedule: agreement.billingSchedule,
        depositAmount: agreement.depositAmount,
        serviceCharge: agreement.serviceCharge,
      },
      conditions: agreement.conditions,
      guarantor: agreement.guarantor
        ? {
            ...agreement.guarantor,
            signatureDataUrl: agreement.witnessSignatureDataUrl || undefined,
            name: agreement.witnessName || agreement.guarantor.name || undefined,
            address:
              agreement.witnessAddress ||
              agreement.guarantor.address ||
              undefined,
            witnessDate: agreement.witnessDate || undefined,
          }
        : null,
      landlordWitness: {
        name: witnessName.trim() || agreement.landlordWitnessName || undefined,
        address:
          witnessAddress.trim() || agreement.landlordWitnessAddress || undefined,
        signatureDataUrl:
          savedSignature || agreement.landlordWitnessSignatureDataUrl || undefined,
        witnessDate:
          agreement.landlordWitnessDate ||
          (savedSignature
            ? new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : undefined),
      },
      notes: agreement.notes,
      templateName: agreement.templateName,
    } as const;
  }

  function handleDownload() {
    const doc = buildDoc();
    if (!doc) return;
    printAgreementDocument(doc);
  }

  const agreement = data?.agreement;
  const doc = buildDoc();
  const iframeSrc = doc ? buildAgreementHtml(doc) : null;

  return (
    <>
      <PageMeta title={`${brandDisplayName} — Landlord Witness Signing`} />
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          ...buildBrandShellStyle(workspaceBranding),
        }}
      >
        <div
          style={{
            background: "var(--ink)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            ...brandHeroStyle,
          }}
        >
          <img
            src={resolveBrandLogoUrl(workspaceBranding, LOGO_PATH)}
            alt={`${brandDisplayName} logo`}
            style={{ width: 32, height: 32, objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            {brandDisplayName}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Landlord Witness Signing
          </span>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 56px" }}>
          {loading ? (
            <div className="card">
              <div className="card-body" style={{ color: "var(--ink3)" }}>
                Loading agreement...
              </div>
            </div>
          ) : error ? (
            <div className="card">
              <div className="card-body" style={{ color: "var(--red)" }}>
                {error}
              </div>
            </div>
          ) : !agreement ? (
            <div className="card">
              <div className="card-body" style={{ color: "var(--ink3)" }}>
                Agreement not found.
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <h1
                  style={{
                    fontSize: 24,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "-0.02em",
                    marginBottom: 6,
                  }}
                >
                  Landlord Witness Signing
                </h1>
                <p style={{ color: "var(--ink3)", fontSize: 14 }}>
                  You have been asked to sign as witness to the landlord&apos;s signature for{" "}
                  <strong>{agreement.tenantName}</strong>. Review the document carefully, then add your signature.
                </p>
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">{agreement.title}</div>
                    <div className="card-subtitle">
                      {agreement.landlordCompany} · {agreement.propertyName}, Unit{" "}
                      {agreement.unitNumber}
                    </div>
                  </div>
                  <span className="badge badge-amber">
                    Landlord witness signature required
                  </span>
                </div>
                <iframe
                  srcDoc={iframeSrc ?? ""}
                  style={{
                    width: "100%",
                    height: 560,
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                  }}
                  title="Agreement Document"
                />
                <div className="card-body">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownload}
                  >
                    Download / Print PDF
                  </button>
                </div>
              </div>

              {signed || Boolean(agreement.landlordWitnessDate) ? (
                <div className="card">
                  <div className="card-body">
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
                      You have signed this agreement as witness to the landlord&apos;s signature.
                      Click below to save your signed copy.
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleDownload}
                    >
                      Save signed copy (PDF)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      Sign as Witness to Landlord&apos;s Signature
                    </div>
                  </div>
                  <div className="card-body">
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--ink3)",
                        marginBottom: 16,
                        lineHeight: 1.6,
                      }}
                    >
                      By signing, you confirm that you were present when{" "}
                      <strong>{agreement.landlordName}</strong> signed this tenancy
                      agreement and that you are signing as witness to the
                      landlord&apos;s signature.
                    </div>
                    {error ? (
                      <div
                        style={{
                          color: "var(--red)",
                          fontSize: 13,
                          marginBottom: 12,
                        }}
                      >
                        {error}
                      </div>
                    ) : null}
                    <div style={{ marginBottom: 16 }}>
                      <label
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Your full name *
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Type your full name as witness"
                        value={witnessName}
                        onChange={(e) => setWitnessName(e.target.value)}
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Your address
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Your residential address"
                        value={witnessAddress}
                        onChange={(e) => setWitnessAddress(e.target.value)}
                      />
                    </div>
                    <div
                      style={{
                        marginBottom: 16,
                        fontSize: 12,
                        color: "var(--ink3)",
                      }}
                    >
                      Date:{" "}
                      <strong>
                        {new Date().toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </strong>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 8,
                        }}
                      >
                        Your signature *
                      </div>
                      <SignaturePad onChange={setSignatureData} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void handleSign()}
                        disabled={signing || !signatureData || !witnessName.trim()}
                      >
                        {signing ? "Submitting..." : "Sign as Witness"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
