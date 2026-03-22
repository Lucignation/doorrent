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
    annualRent: string;
    monthlyEquivalent: string;
    depositAmount: string;
  };
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
  });
  const [idDocument, setIdDocument] = useState<UploadedDocument | null>(null);
  const [tenantSignatureData, setTenantSignatureData] = useState("");
  const [guarantorSignatureData, setGuarantorSignatureData] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const canSubmit =
    Boolean(form.firstName.trim()) &&
    Boolean(form.lastName.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.phone.trim()) &&
    Boolean(form.residentialAddress.trim()) &&
    Boolean(form.idType.trim()) &&
    Boolean(form.idNumber.trim()) &&
    Boolean(idDocument?.content) &&
    Boolean(form.guarantorFullName.trim()) &&
    Boolean(form.guarantorRelationship.trim()) &&
    Boolean(form.guarantorEmail.trim()) &&
    Boolean(form.guarantorPhone.trim()) &&
    Boolean(form.guarantorOccupation.trim()) &&
    Boolean(form.guarantorCompanyName.trim()) &&
    Boolean(tenantSignatureData) &&
    Boolean(guarantorSignatureData);

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

    if (!token || !idDocument) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest(`/tenant-onboarding/${token}/submit`, {
        method: "POST",
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          residentialAddress: form.residentialAddress,
          idType: form.idType,
          idNumber: form.idNumber,
          idDocumentName: idDocument.name,
          idDocumentMimeType: idDocument.mimeType,
          idDocumentContent: idDocument.content,
          tenantSignatureData,
          guarantor: {
            fullName: form.guarantorFullName,
            email: form.guarantorEmail,
            phone: form.guarantorPhone,
            occupation: form.guarantorOccupation,
            companyName: form.guarantorCompanyName,
            relationship: form.guarantorRelationship,
            signatureData: guarantorSignatureData,
          },
        },
      });

      showToast(
        "Tenant onboarding submitted. Use the same email in the portal to receive your sign-in code.",
        "success",
      );
      await router.push("/tenant/login");
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
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      className="form-input"
                      value={form.lastName}
                      onChange={(event) => updateField("lastName", event.target.value)}
                      required
                    />
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
                      required
                    />
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
                  <label className="form-label">Residential Address *</label>
                  <textarea
                    className="form-input"
                    value={form.residentialAddress}
                    onChange={(event) =>
                      updateField("residentialAddress", event.target.value)
                    }
                    required
                  />
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
                    <label className="form-label">ID Number *</label>
                    <input
                      className="form-input"
                      value={form.idNumber}
                      onChange={(event) => updateField("idNumber", event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Your ID *</label>
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
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Signatures</div>
              </div>
              <div className="card-body">
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Tenant Signature *</label>
                  <SignaturePad onChange={setTenantSignatureData} />
                </div>

                <div className="form-group">
                  <label className="form-label">Guarantor Signature *</label>
                  <SignaturePad onChange={setGuarantorSignatureData} />
                </div>

                <div className="checkbox-wrap" style={{ marginTop: 12, marginBottom: 16 }}>
                  <input type="checkbox" id="tenant-confirm" defaultChecked />
                  <label htmlFor="tenant-confirm">
                    I confirm that the information provided is correct and the guarantor has approved this submission.
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
                      <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Annual Rent</div>
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
                  <div>4. Capture your signature and your guarantor&apos;s signature before submitting.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
