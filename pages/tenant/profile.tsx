import Link from "next/link";
import { useRouter } from "next/router";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import AccountDeletionConsentModal from "../../components/ui/AccountDeletionConsentModal";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import { resolveLandlordCapabilities } from "../../lib/landlord-access";

interface TenantProfileResponse {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    residentialAddress: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    idType: string;
    idNumber: string;
    propertyName: string;
    unitNumber: string;
    landlordName: string;
    landlordEmail: string;
    leaseStartLabel: string;
    leaseEndLabel: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingSchedule: string;
    annualRentFormatted: string;
  };
  guarantor: {
    fullName: string;
    email: string;
    phone: string;
    occupation: string;
    companyName: string;
    relationship: string;
  } | null;
}

type ProfileFormState = {
  phone: string;
  residentialAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  idType: string;
  idNumber: string;
  guarantor: {
    fullName: string;
    email: string;
    phone: string;
    occupation: string;
    companyName: string;
    relationship: string;
  };
};

const initialFormState: ProfileFormState = {
  phone: "",
  residentialAddress: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  idType: "",
  idNumber: "",
  guarantor: {
    fullName: "",
    email: "",
    phone: "",
    occupation: "",
    companyName: "",
    relationship: "",
  },
};

export default function TenantProfilePage() {
  const router = useRouter();
  const { tenantSession, clearTenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [profileData, setProfileData] = useState<TenantProfileResponse | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const tenantCapabilities = resolveLandlordCapabilities({
    capabilities: tenantSession?.tenant.capabilities,
    subscriptionModel: tenantSession?.tenant.subscriptionModel,
    plan: tenantSession?.tenant.planKey ?? tenantSession?.tenant.plan,
  });

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantProfileResponse>("/tenant/profile", {
          token: tenantToken,
        });

        if (!cancelled) {
          setProfileData(data);
          setFormState({
            phone: data.profile.phone ?? "",
            residentialAddress: data.profile.residentialAddress ?? "",
            emergencyContactName: data.profile.emergencyContactName ?? "",
            emergencyContactPhone: data.profile.emergencyContactPhone ?? "",
            emergencyContactRelationship: data.profile.emergencyContactRelationship ?? "",
            idType: data.profile.idType ?? "",
            idNumber: data.profile.idNumber ?? "",
            guarantor: {
              fullName: data.guarantor?.fullName ?? "",
              email: data.guarantor?.email ?? "",
              phone: data.guarantor?.phone ?? "",
              occupation: data.guarantor?.occupation ?? "",
              companyName: data.guarantor?.companyName ?? "",
              relationship: data.guarantor?.relationship ?? "",
            },
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, tenantSession?.token]);

  function updateField<Key extends keyof ProfileFormState>(key: Key, value: ProfileFormState[Key]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateGuarantorField(
    key: keyof ProfileFormState["guarantor"],
    value: string,
  ) {
    setFormState((current) => ({
      ...current,
      guarantor: {
        ...current.guarantor,
        [key]: value,
      },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantSession?.token) {
      showToast("Tenant session missing. Please sign in again.", "error");
      return;
    }

    setSaving(true);

    const guarantorCompleted = Object.values(formState.guarantor).every((value) =>
      value.trim(),
    );

    try {
      const response = await apiRequest<TenantProfileResponse>("/tenant/profile", {
        method: "PATCH",
        token: tenantSession.token,
        body: {
          phone: formState.phone,
          residentialAddress: formState.residentialAddress,
          emergencyContactName: formState.emergencyContactName || undefined,
          emergencyContactPhone: formState.emergencyContactPhone || undefined,
          emergencyContactRelationship:
            formState.emergencyContactRelationship || undefined,
          idType: formState.idType || undefined,
          idNumber: formState.idNumber || undefined,
          guarantor: guarantorCompleted ? formState.guarantor : undefined,
        },
        offline: {
          queue: true,
          dedupeKey: "tenant-profile",
          invalidatePaths: ["/tenant/profile"],
        },
      });

      if ((response as { offline?: boolean }).offline) {
        setProfileData((current) =>
          current
            ? {
                ...current,
                profile: {
                  ...current.profile,
                  phone: formState.phone,
                  residentialAddress: formState.residentialAddress,
                  emergencyContactName: formState.emergencyContactName,
                  emergencyContactPhone: formState.emergencyContactPhone,
                  emergencyContactRelationship:
                    formState.emergencyContactRelationship,
                  idType: formState.idType,
                  idNumber: formState.idNumber,
                },
                guarantor: guarantorCompleted ? { ...formState.guarantor } : current.guarantor,
              }
            : current,
        );
      } else {
        setProfileData(response.data);
      }

      showToast(response.message || "Profile saved successfully", "success");
      refreshData();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Profile could not be saved.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    if (!tenantSession?.token || deletingAccount) {
      return;
    }

    setDeletingAccount(true);

    try {
      await apiRequest("/tenant/account", {
        method: "DELETE",
        token: tenantSession.token,
      });
      setShowDeleteModal(false);
      await router.replace("/account-deletion");
      clearTenantSession();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not delete your tenant account.",
        "error",
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  const description = profileData
    ? `${profileData.profile.propertyName} · Unit ${profileData.profile.unitNumber} · ${profileData.profile.billingSchedule}`
    : loading
      ? "Loading your tenant profile..."
      : error || "Your profile is unavailable.";

  return (
    <>
      <PageMeta title="DoorRent — Profile" urlPath="/tenant/profile" />
      <TenantPortalShell topbarTitle="Profile" breadcrumb="Dashboard → Profile">
        <PageHeader title="Profile" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Tenancy Snapshot</div>
                <div className="card-subtitle">Live details from your active lease.</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.fullName ?? "—"}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.email ?? "—"}
                    disabled
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Property</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.propertyName ?? "—"}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.unitNumber ?? "—"}
                    disabled
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Landlord</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.landlordName ?? "—"}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Landlord Email</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.landlordEmail ?? "—"}
                    disabled
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Billing Schedule</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.billingSchedule ?? "—"}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Annual Equivalent</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.annualRentFormatted ?? "—"}
                    disabled
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lease Start</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.leaseStartLabel ?? "—"}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lease End</label>
                  <input
                    className="form-input"
                    value={profileData?.profile.leaseEndLabel ?? "—"}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          <form className="card" onSubmit={handleSubmit}>
            <div className="card-header">
              <div>
                <div className="card-title">Contact & Guarantor</div>
                <div className="card-subtitle">Keep your records up to date.</div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={formState.phone}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("phone", event.target.value)
                    }
                    placeholder="+234..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Residential Address</label>
                  <input
                    className="form-input"
                    value={formState.residentialAddress}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("residentialAddress", event.target.value)
                    }
                    placeholder="Current residential address"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Emergency Contact Name</label>
                  <input
                    className="form-input"
                    value={formState.emergencyContactName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("emergencyContactName", event.target.value)
                    }
                    placeholder="Optional responder"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact Phone</label>
                  <input
                    className="form-input"
                    value={formState.emergencyContactPhone}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("emergencyContactPhone", event.target.value)
                    }
                    placeholder="+234..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Emergency Contact Relationship</label>
                  <input
                    className="form-input"
                    value={formState.emergencyContactRelationship}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("emergencyContactRelationship", event.target.value)
                    }
                    placeholder="Sibling, Parent, Friend..."
                  />
                </div>
                <div className="form-group" />
              </div>

              <div
                style={{
                  border: "1px solid rgba(26, 107, 74, 0.12)",
                  background: "var(--accent-light)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  Emergency Access
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink2)",
                    lineHeight: 1.6,
                    marginBottom: 12,
                  }}
                >
                  Need urgent help? Open your emergency page here to call the right line
                  and alert the contacts linked to this tenancy.
                </div>
                <Link href="/tenant/emergency" className="btn btn-secondary btn-sm">
                  Open Emergency
                </Link>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ID Type</label>
                  <input
                    className="form-input"
                    value={formState.idType}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("idType", event.target.value)
                    }
                    placeholder="National ID, Driver's License..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ID Number</label>
                  <input
                    className="form-input"
                    value={formState.idNumber}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateField("idNumber", event.target.value)
                    }
                    placeholder="Enter ID number"
                  />
                </div>
              </div>

              <div className="form-divider" />

              <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                Guarantor Details
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    value={formState.guarantor.fullName}
                    onChange={(event) => updateGuarantorField("fullName", event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    value={formState.guarantor.email}
                    onChange={(event) => updateGuarantorField("email", event.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={formState.guarantor.phone}
                    onChange={(event) => updateGuarantorField("phone", event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Relationship</label>
                  <input
                    className="form-input"
                    value={formState.guarantor.relationship}
                    onChange={(event) =>
                      updateGuarantorField("relationship", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  <input
                    className="form-input"
                    value={formState.guarantor.occupation}
                    onChange={(event) =>
                      updateGuarantorField("occupation", event.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    className="form-input"
                    value={formState.guarantor.companyName}
                    onChange={(event) =>
                      updateGuarantorField("companyName", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Legal & Account Deletion</div>
              <div className="card-subtitle">
                Review DoorRent policies and permanently close this tenant account.
              </div>
            </div>
          </div>
          <div className="card-body">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <Link href="/terms" className="btn btn-secondary btn-xs">
                Terms of Use
              </Link>
              <Link href="/privacy" className="btn btn-secondary btn-xs">
                Privacy Policy
              </Link>
              <Link href="/refund-policy" className="btn btn-secondary btn-xs">
                Refund Policy
              </Link>
              <Link href="/account-deletion" className="btn btn-secondary btn-xs">
                Account Deletion
              </Link>
            </div>

            {tenantCapabilities.canDeleteAccount ? (
              <div
                style={{
                  border: "1px solid rgba(220, 64, 64, 0.18)",
                  background: "rgba(220, 64, 64, 0.05)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  Danger Zone
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink2)",
                    lineHeight: 1.6,
                    marginBottom: 14,
                  }}
                >
                  Deleting your account removes your tenant portal access. Some billing, legal, or
                  audit records may be retained where required by law or platform security needs.
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {tenantCapabilities.canDeleteAccount ? (
          <AccountDeletionConsentModal
            open={showDeleteModal}
            title="Delete tenant account?"
            description="This permanently removes your tenant portal access from DoorRent."
            consequences={[
              "Your tenant portal session and sign-in access will be revoked.",
              "Tenant-specific portal records may be deleted or detached from active access.",
              "Some billing, legal, audit, or security records may still be retained where required.",
            ]}
            consentLabel="I understand that deleting my tenant account is permanent."
            busy={deletingAccount}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={deleteAccount}
          />
        ) : null}
      </TenantPortalShell>
    </>
  );
}
