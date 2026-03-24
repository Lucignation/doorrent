import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

interface TenantProfileResponse {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    residentialAddress: string;
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
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [profileData, setProfileData] = useState<TenantProfileResponse | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      const { data } = await apiRequest<TenantProfileResponse>("/tenant/profile", {
        method: "PATCH",
        token: tenantSession.token,
        body: {
          phone: formState.phone,
          residentialAddress: formState.residentialAddress,
          idType: formState.idType || undefined,
          idNumber: formState.idNumber || undefined,
          guarantor: guarantorCompleted ? formState.guarantor : undefined,
        },
      });
      setProfileData(data);
      showToast("Profile saved successfully", "success");
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
      </TenantPortalShell>
    </>
  );
}
