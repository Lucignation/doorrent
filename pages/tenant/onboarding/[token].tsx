import Link from "next/link";
import { useRouter } from "next/router";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import PageMeta from "../../../components/layout/PageMeta";
import SignaturePad from "../../../components/ui/SignaturePad";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { apiRequest } from "../../../lib/api";

interface OnboardingInvitationResponse {
  invitation: {
    id: string;
    email: string;
    inviteeName?: string | null;
    status: string;
    expiresAt: string;
    message?: string | null;
  };
  landlord: {
    companyName: string;
    name: string;
    email: string;
  };
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
  unit: {
    id: string;
    unitNumber: string;
    type: string;
  } | null;
  lease: {
    leaseStart: string;
    leaseEnd: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingSchedule: string;
    annualRent: string;
    monthlyEquivalent: string;
    depositAmount: string;
  };
  duplicateLeaseWarning?: {
    title: string;
    body: string;
    leasePeriod: string;
    leaseState: string;
  } | null;
  agreementTemplate: {
    id: string;
    name: string;
  } | null;
}

interface UploadedDocument {
  name: string;
  mimeType: string;
  content: string;
}

interface OnboardingForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  residentialAddress: string;
  idType: string;
  idNumber: string;
  guarantorFullName: string;
  guarantorRelationship: string;
  guarantorEmail: string;
  guarantorPhone: string;
  guarantorOccupation: string;
  guarantorCompanyName: string;
  guarantorAddress: string;
}

const NIGERIAN_STATES = [
  "abia","adamawa","akwa ibom","anambra","bauchi","bayelsa","benue","borno",
  "cross river","delta","ebonyi","edo","ekiti","enugu","fct","abuja","gombe",
  "imo","jigawa","kaduna","kano","katsina","kebbi","kogi","kwara","lagos",
  "nasarawa","niger","ogun","ondo","osun","oyo","plateau","rivers","sokoto",
  "taraba","yobe","zamfara","nigeria",
];

function isNigerianAddress(address: string): boolean {
  const lower = address.toLowerCase();
  return NIGERIAN_STATES.some((state) => lower.includes(state));
}

function splitInviteeName(name?: string | null) {
  if (!name) {
    return { firstName: "", lastName: "" };
  }

  const [firstName = "", ...rest] = name.trim().split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("We could not read your ID document."));
    };
    reader.onerror = () => reject(new Error("We could not read your ID document."));
    reader.readAsDataURL(file);
  });
}

export default function TenantOnboardingPage() {
  const router = useRouter();
  const { showToast } = usePrototypeUI();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const [invitationData, setInvitationData] = useState<OnboardingInvitationResponse | null>(
    null,
  );
  const [form, setForm] = useState<OnboardingForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    residentialAddress: "",
    idType: "National ID",
    idNumber: "",
    guarantorFullName: "",
    guarantorRelationship: "",
    guarantorEmail: "",
    guarantorPhone: "",
    guarantorOccupation: "",
    guarantorCompanyName: "",
    guarantorAddress: "",
  });
  const [idDocument, setIdDocument] = useState<UploadedDocument | null>(null);
  const [tenantSignatureData, setTenantSignatureData] = useState("");
  const [guarantorSignatureData, setGuarantorSignatureData] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedAgreementId, setSubmittedAgreementId] = useState<string | null>(null);
  const [guarantorLinkCopied, setGuarantorLinkCopied] = useState(false);
  const lockedNameParts = useMemo(
    () => splitInviteeName(invitationData?.invitation.inviteeName),
    [invitationData?.invitation.inviteeName],
  );
  const lockedFields = useMemo(
    () => ({
      firstName: Boolean(lockedNameParts.firstName),
      lastName: Boolean(lockedNameParts.lastName),
      email: Boolean(invitationData?.invitation.email),
    }),
    [invitationData?.invitation.email, lockedNameParts.firstName, lockedNameParts.lastName],
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadInvitation() {
      setIsLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<OnboardingInvitationResponse>(
          `/tenant-onboarding/${token}`,
        );

        if (cancelled) {
          return;
        }

        const nameParts = splitInviteeName(data.invitation.inviteeName);

        setInvitationData(data);
        setForm((current) => ({
          ...current,
          firstName: current.firstName || nameParts.firstName,
          lastName: current.lastName || nameParts.lastName,
          email: data.invitation.email,
        }));
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load this onboarding invite.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const inviteTag = token || "Loading...";

  const tenantAddressValid = !form.residentialAddress.trim() || isNigerianAddress(form.residentialAddress);
  const guarantorAddressValid = !form.guarantorAddress.trim() || isNigerianAddress(form.guarantorAddress);

  const canSubmit =
    !invitationData?.duplicateLeaseWarning &&
    Boolean(form.firstName.trim()) &&
    Boolean(form.lastName.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.phone.trim()) &&
    Boolean(form.residentialAddress.trim()) &&
    tenantAddressValid &&
    guarantorAddressValid &&
    Boolean(form.idType.trim()) &&
    Boolean(form.guarantorFullName.trim()) &&
    Boolean(form.guarantorRelationship.trim()) &&
    Boolean(form.guarantorEmail.trim()) &&
    Boolean(form.guarantorPhone.trim()) &&
    Boolean(form.guarantorOccupation.trim()) &&
    Boolean(form.guarantorCompanyName.trim()) &&
    Boolean(form.guarantorAddress.trim()) &&
    Boolean(tenantSignatureData);

  async function handleIdUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await readFileAsDataUrl(file);
      setIdDocument({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        content,
      });
      showToast("ID document attached", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not read that file.",
        "error",
      );
    }
  }

  function updateField(field: keyof OnboardingForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await apiRequest<{ agreementId?: string }>(`/tenant-onboarding/${token}/submit`, {
        method: "POST",
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          residentialAddress: form.residentialAddress,
          idType: form.idType,
          ...(form.idNumber.trim() ? { idNumber: form.idNumber } : {}),
          ...(idDocument
            ? {
                idDocumentName: idDocument.name,
                idDocumentMimeType: idDocument.mimeType,
                idDocumentContent: idDocument.content,
              }
            : {}),
          tenantSignatureData,
          guarantor: {
            fullName: form.guarantorFullName,
            email: form.guarantorEmail,
            phone: form.guarantorPhone,
            occupation: form.guarantorOccupation,
            companyName: form.guarantorCompanyName,
            relationship: form.guarantorRelationship,
            address: form.guarantorAddress,
          },
        },
      });

      showToast(
        "Onboarding submitted. Share the guarantor link below, then use your email to sign into the portal.",
        "success",
      );
      setSubmittedAgreementId(data?.agreementId ?? "pending");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not submit your onboarding details.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageMeta
        title="DoorRent — Tenant Onboarding"
        description="Complete your DoorRent onboarding with ID upload, guarantor information, and signatures."
      />

      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <div
          className="grid-2"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "32px 20px 56px",
            gap: 24,
          }}
        >
          <form onSubmit={submitOnboarding}>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">DoorRent Tenant Onboarding</div>
                  <div className="card-subtitle">
                    {isLoading
                      ? "Loading your unit details..."
                      : invitationData
                        ? `Complete your onboarding for ${invitationData.unit?.unitNumber ?? "your assigned unit"}, ${invitationData.property.name}.`
                        : error}
                  </div>
                </div>
                <span className="tag">Invite Token: {inviteTag}</span>
              </div>
              <div className="card-body">
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                  What you&apos;ll submit here
                </div>
                <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.8 }}>
                  Your landlord has already assigned the property, unit, lease dates, and rent terms. You need to complete your personal details, upload your ID, add your guarantor&apos;s work and company information, describe your relationship, and capture both signatures. After submission, you&apos;ll use this same email to sign in to the tenant portal with a one-time code or magic link.
                </div>
                {invitationData?.invitation.message ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      color: "var(--ink2)",
                    }}
                  >
                    Message from landlord: {invitationData.invitation.message}
                  </div>
                ) : null}
                {invitationData?.duplicateLeaseWarning ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(241, 196, 15, 0.12)",
                      border: "1px solid rgba(241, 196, 15, 0.28)",
                      fontSize: 12,
                      color: "var(--amber)",
                      lineHeight: 1.7,
                    }}
                  >
                    <strong>{invitationData.duplicateLeaseWarning.title}.</strong>{" "}
                    {invitationData.duplicateLeaseWarning.body}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div className="card-title">Your Details</div>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      className="form-input"
                      value={form.firstName}
                      onChange={(event) => updateField("firstName", event.target.value)}
                      disabled={lockedFields.firstName}
                      required
                    />
                    {lockedFields.firstName ? (
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        This first name was supplied by your landlord and cannot be edited here.
                      </div>
                    ) : null}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      className="form-input"
                      value={form.lastName}
                      onChange={(event) => updateField("lastName", event.target.value)}
                      disabled={lockedFields.lastName}
                      required
                    />
                    {lockedFields.lastName ? (
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        This last name was supplied by your landlord and cannot be edited here.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      disabled={lockedFields.email}
                      required
                    />
                    {lockedFields.email ? (
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink3)" }}>
                        This onboarding link is locked to the invited email address.
                      </div>
                    ) : null}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input
                      className="form-input"
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Residential Address * <span style={{ fontWeight: 400, color: "var(--ink3)" }}>(must be a Nigerian address)</span></label>
                  <textarea
                    className="form-input"
                    value={form.residentialAddress}
                    placeholder="e.g. 14 Broad Street, Lagos Island, Lagos State"
                    onChange={(event) =>
                      updateField("residentialAddress", event.target.value)
                    }
                    required
                  />
                  {form.residentialAddress.trim() && !tenantAddressValid ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--red)" }}>
                      Address must be within Nigeria. Include a Nigerian state or city.
                    </div>
                  ) : null}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ID Type *</label>
                    <select
                      className="form-input"
                      value={form.idType}
                      onChange={(event) => updateField("idType", event.target.value)}
                    >
                      <option>National ID</option>
                      <option>International Passport</option>
                      <option>Driver&apos;s License</option>
                      <option>Voter&apos;s Card</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ID Number <span style={{ fontWeight: 400, color: "var(--ink3)" }}>(optional)</span></label>
                    <input
                      className="form-input"
                      placeholder="Leave blank if not available"
                      value={form.idNumber}
                      onChange={(event) => updateField("idNumber", event.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Your ID <span style={{ fontWeight: 400, color: "var(--ink3)" }}>(optional)</span></label>
                  <input className="form-input" type="file" onChange={handleIdUpload} />
                  {idDocument ? (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink2)" }}>
                      Attached: {idDocument.name}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div className="card-title">Guarantor Information</div>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Guarantor Full Name *</label>
                    <input
                      className="form-input"
                      value={form.guarantorFullName}
                      onChange={(event) =>
                        updateField("guarantorFullName", event.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relationship *</label>
                    <input
                      className="form-input"
                      value={form.guarantorRelationship}
                      onChange={(event) =>
                        updateField("guarantorRelationship", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Guarantor Email *</label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.guarantorEmail}
                      onChange={(event) =>
                        updateField("guarantorEmail", event.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Guarantor Phone *</label>
                    <input
                      className="form-input"
                      value={form.guarantorPhone}
                      onChange={(event) =>
                        updateField("guarantorPhone", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">What work does your guarantor do? *</label>
                    <input
                      className="form-input"
                      value={form.guarantorOccupation}
                      onChange={(event) =>
                        updateField("guarantorOccupation", event.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Where do they work? *</label>
                    <input
                      className="form-input"
                      value={form.guarantorCompanyName}
                      onChange={(event) =>
                        updateField("guarantorCompanyName", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Guarantor Residential Address * <span style={{ fontWeight: 400, color: "var(--ink3)" }}>(must be a Nigerian address)</span>
                  </label>
                  <textarea
                    className="form-input"
                    placeholder="e.g. 5 Adeola Odeku Street, Victoria Island, Lagos State"
                    value={form.guarantorAddress}
                    onChange={(event) => updateField("guarantorAddress", event.target.value)}
                    required
                  />
                  {form.guarantorAddress.trim() && !guarantorAddressValid ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--red)" }}>
                      Guarantor address must be within Nigeria. Include a Nigerian state or city.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Your Signature</div>
              </div>
              <div className="card-body">
                {submittedAgreementId ? (
                  <>
                    <div
                      style={{
                        padding: 16,
                        borderRadius: "var(--radius)",
                        background: "var(--green-light)",
                        border: "1px solid rgba(26,107,74,0.18)",
                        color: "var(--green)",
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 16,
                      }}
                    >
                      Onboarding submitted successfully.
                    </div>

                    {submittedAgreementId !== "pending" ? (
                      <div
                        style={{
                          padding: 14,
                          borderRadius: "var(--radius)",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          fontSize: 13,
                          marginBottom: 16,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                          Share with your guarantor — {form.guarantorFullName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 10, lineHeight: 1.6 }}>
                          Send this link to your guarantor. They can review the agreement and sign their own copy without needing a DoorRent account.
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            readOnly
                            className="form-input"
                            style={{ fontSize: 12, flex: 1 }}
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/agreement/guarantor/${submittedAgreementId}`}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                `${window.location.origin}/agreement/guarantor/${submittedAgreementId}`,
                              );
                              setGuarantorLinkCopied(true);
                              setTimeout(() => setGuarantorLinkCopied(false), 2000);
                            }}
                          >
                            {guarantorLinkCopied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <Link href="/tenant/login" className="btn btn-primary">
                      Sign in to the Tenant Portal
                    </Link>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <label className="form-label" style={{ marginBottom: 8, display: "block" }}>Tenant Signature *</label>
                      <SignaturePad onChange={setTenantSignatureData} />
                    </div>

                    <div
                      style={{
                        marginBottom: 14,
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        color: "var(--ink2)",
                        lineHeight: 1.6,
                      }}
                    >
                      After submitting, you will receive a link to share with your guarantor ({form.guarantorFullName || "your guarantor"}). They can sign their copy independently — no DoorRent account needed.
                    </div>

                    <div className="checkbox-wrap" style={{ marginBottom: 16 }}>
                      <input type="checkbox" id="tenant-confirm" defaultChecked />
                      <label htmlFor="tenant-confirm">
                        I confirm that the information provided is correct and I am based in Nigeria.
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || !canSubmit}
                      >
                        {isSubmitting ? "Submitting..." : "Submit Onboarding"}
                      </button>
                      <Link href="/tenant/login" className="btn btn-secondary">
                        Return to Portal
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </form>

          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div className="card-title">Lease Summary</div>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Landlord</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {invitationData?.landlord.companyName ?? "Loading..."}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                      {invitationData?.landlord.name ?? ""}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Property</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {invitationData?.property.name ?? "Loading..."}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                      {invitationData?.unit
                        ? `Unit ${invitationData.unit.unitNumber} · ${invitationData.property.city}, ${invitationData.property.state}`
                        : `${invitationData?.property.city ?? ""}, ${invitationData?.property.state ?? ""}`}
                    </div>
                  </div>
                  <div className="form-divider" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Lease Start</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {invitationData?.lease.leaseStart ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Lease End</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {invitationData?.lease.leaseEnd ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Billing Schedule</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {invitationData?.lease.billingSchedule ?? "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                        {invitationData?.lease.billingFrequencyLabel ?? "Rent"} billing
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Annual Equivalent</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {invitationData?.lease.annualRent ?? "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                        Monthly equivalent: {invitationData?.lease.monthlyEquivalent ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Deposit</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {invitationData?.lease.depositAmount ?? "—"}
                      </div>
                    </div>
                  </div>
                  {invitationData?.agreementTemplate ? (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Agreement Template</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {invitationData.agreementTemplate.name}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Submission Checklist</div>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
                  <div>1. Complete your personal contact and address details.</div>
                  <div>2. Upload your government-issued ID for the landlord to review and download.</div>
                  <div>3. Add your guarantor&apos;s occupation, company, and relationship to you.</div>
                  <div>4. Capture your signature and submit. A guarantor signing link will be provided after submission.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
