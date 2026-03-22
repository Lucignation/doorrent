import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface CaretakerAssignmentRow {
  id: string;
  caretakerId: string;
  organizationName: string;
  contactName: string;
  email: string;
  phone: string | null;
  serviceType: string;
  scope: string;
  status: string;
  propertyCount: string;
  properties: Array<{
    id: string;
    name: string;
  }>;
  joinedAt: string;
  existingAccount: boolean;
  activeLandlordCount: number;
  otherLandlordCount: number;
}

interface LandlordCaretakersResponse {
  count: number;
  caretakers: CaretakerAssignmentRow[];
}

interface PropertyOption {
  id: string;
  name: string;
}

interface LandlordPropertiesLookupResponse {
  properties: Array<PropertyOption>;
}

const initialFormState = {
  organizationName: "",
  contactName: "",
  email: "",
  phone: "",
  serviceType: "",
  scope: "ALL_PROPERTIES",
  propertyIds: [] as string[],
};

export default function LandlordCaretakersPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [caretakerData, setCaretakerData] = useState<LandlordCaretakersResponse | null>(null);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [formState, setFormState] = useState(initialFormState);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editingAssignment = useMemo(
    () =>
      (caretakerData?.caretakers ?? []).find((item) => item.id === editingAssignmentId) ?? null,
    [caretakerData?.caretakers, editingAssignmentId],
  );

  useEffect(() => {
    const landlordToken = landlordSession?.token;

    if (!landlordToken) {
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [caretakersResult, propertiesResult] = await Promise.all([
          apiRequest<LandlordCaretakersResponse>("/landlord/caretakers", {
            token: landlordToken,
          }),
          apiRequest<LandlordPropertiesLookupResponse>("/landlord/properties", {
            token: landlordToken,
          }),
        ]);

        if (!cancelled) {
          setCaretakerData(caretakersResult.data);
          setProperties(propertiesResult.data.properties);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load caretaker data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token]);

  function resetForm() {
    setFormState(initialFormState);
    setEditingAssignmentId(null);
  }

  function toggleProperty(propertyId: string) {
    setFormState((current) => ({
      ...current,
      propertyIds: current.propertyIds.includes(propertyId)
        ? current.propertyIds.filter((item) => item !== propertyId)
        : [...current.propertyIds, propertyId],
    }));
  }

  function startEditing(caretaker: CaretakerAssignmentRow) {
    setEditingAssignmentId(caretaker.id);
    setFormState({
      organizationName: caretaker.organizationName,
      contactName: caretaker.contactName,
      email: caretaker.email,
      phone: caretaker.phone ?? "",
      serviceType: caretaker.serviceType,
      scope: caretaker.scope,
      propertyIds: caretaker.properties.map((property) => property.id),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!landlordSession?.token) {
      showToast("Landlord session missing. Please sign in again.", "error");
      return;
    }

    setSaving(true);

    try {
      if (editingAssignmentId) {
        await apiRequest(`/landlord/caretakers/${editingAssignmentId}`, {
          method: "PATCH",
          token: landlordSession.token,
          body: {
            serviceType: formState.serviceType,
            scope: formState.scope,
            propertyIds:
              formState.scope === "SELECTED_PROPERTIES" ? formState.propertyIds : undefined,
          },
        });
        showToast("Caretaker access updated successfully", "success");
      } else {
        const result = await apiRequest<{
          existingAccount?: boolean;
        }>("/landlord/caretakers", {
          method: "POST",
          token: landlordSession.token,
          body: {
            organizationName: formState.organizationName,
            contactName: formState.contactName,
            email: formState.email,
            phone: formState.phone || undefined,
            serviceType: formState.serviceType,
            scope: formState.scope,
            propertyIds:
              formState.scope === "SELECTED_PROPERTIES" ? formState.propertyIds : undefined,
          },
        });
        showToast(
          result.data?.existingAccount
            ? "Existing caretaker account linked to your portfolio"
            : "Caretaker invited successfully",
          "success",
        );
      }

      resetForm();
      refreshData();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : editingAssignmentId
            ? "Caretaker access could not be updated."
            : "Caretaker invite could not be sent.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function revokeAccess(assignmentId: string) {
    if (!landlordSession?.token) {
      showToast("Landlord session missing. Please sign in again.", "error");
      return;
    }

    const confirmed = window.confirm(
      "Revoke this caretaker's access to your properties? Their account will remain available for any other landlords they manage.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/landlord/caretakers/${assignmentId}`, {
        method: "DELETE",
        token: landlordSession.token,
      });
      showToast("Caretaker access revoked", "success");

      if (editingAssignmentId === assignmentId) {
        resetForm();
      }

      refreshData();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Caretaker access could not be revoked.",
        "error",
      );
    }
  }

  const description = caretakerData
    ? `${caretakerData.count} active caretaker assignment(s) across your properties`
    : loading
      ? "Loading caretaker access..."
      : error || "Caretaker data is unavailable.";

  const sharedAccountNotice = editingAssignment
    ? editingAssignment.otherLandlordCount > 0
      ? "This caretaker account is already shared with other landlords on DoorRent. You can update only your assignment here."
      : "You are updating this landlord's assignment details."
    : "If the email already belongs to a DoorRent caretaker, we will reuse that account and only add your landlord assignment.";

  return (
    <>
      <PageMeta title="DoorRent - Caretakers" urlPath="/landlord/caretakers" />
      <LandlordPortalShell topbarTitle="Caretakers" breadcrumb="Dashboard -> Caretakers">
        <PageHeader title="Caretakers" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="grid-2" style={{ alignItems: "start" }}>
          <form className="card" onSubmit={handleSubmit}>
            <div className="card-header">
              <div>
                <div className="card-title">
                  {editingAssignmentId ? "Update Caretaker Access" : "Invite or Link a Caretaker"}
                </div>
                <div className="card-subtitle">
                  Add a property company or legal firm to manage some or all of your properties.
                </div>
              </div>
            </div>
            <div className="card-body">
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: "var(--radius)",
                  background: "rgba(26, 58, 42, 0.06)",
                  border: "1px solid rgba(26, 58, 42, 0.12)",
                  color: "var(--ink2)",
                  lineHeight: 1.6,
                }}
              >
                {sharedAccountNotice}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organization Name</label>
                  <input
                    className="form-input"
                    value={formState.organizationName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setFormState((current) => ({
                        ...current,
                        organizationName: event.target.value,
                      }))
                    }
                    placeholder="Acme Property Services"
                    disabled={Boolean(editingAssignmentId)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input
                    className="form-input"
                    value={formState.contactName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setFormState((current) => ({
                        ...current,
                        contactName: event.target.value,
                      }))
                    }
                    placeholder="Primary contact person"
                    disabled={Boolean(editingAssignmentId)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    value={formState.email}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setFormState((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="caretaker@company.com"
                    disabled={Boolean(editingAssignmentId)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={formState.phone}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setFormState((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+234..."
                    disabled={Boolean(editingAssignmentId)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Service Type</label>
                  <input
                    className="form-input"
                    value={formState.serviceType}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setFormState((current) => ({
                        ...current,
                        serviceType: event.target.value,
                      }))
                    }
                    placeholder="Property management, legal support..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Scope</label>
                  <select
                    className="form-input"
                    value={formState.scope}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setFormState((current) => ({
                        ...current,
                        scope: event.target.value,
                        propertyIds:
                          event.target.value === "ALL_PROPERTIES"
                            ? []
                            : current.propertyIds,
                      }))
                    }
                  >
                    <option value="ALL_PROPERTIES">All Properties</option>
                    <option value="SELECTED_PROPERTIES">Selected Properties</option>
                  </select>
                </div>
              </div>

              {formState.scope === "SELECTED_PROPERTIES" ? (
                <div className="form-group">
                  <label className="form-label">Select Properties</label>
                  <div style={{ display: "grid", gap: 8 }}>
                    {properties.map((property) => (
                      <label key={property.id} className="checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={formState.propertyIds.includes(property.id)}
                          onChange={() => toggleProperty(property.id)}
                        />
                        <span>{property.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                {editingAssignmentId ? (
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                ) : null}
                <button
                  type="submit"
                  className={`btn btn-primary ${editingAssignmentId ? "" : "btn-full"}`}
                  disabled={saving}
                >
                  {saving
                    ? editingAssignmentId
                      ? "Saving..."
                      : "Sending Invite..."
                    : editingAssignmentId
                      ? "Save Access"
                      : "Invite Caretaker"}
                </button>
              </div>
            </div>
          </form>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Active Caretakers</div>
                <div className="card-subtitle">
                  Teams currently managing part of your portfolio.
                </div>
              </div>
            </div>
            <div className="card-body">
              {(caretakerData?.caretakers ?? []).length ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {caretakerData?.caretakers.map((caretaker) => (
                    <div
                      key={caretaker.id}
                      style={{
                        padding: 16,
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                        background: "var(--surface2)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>
                            {caretaker.organizationName}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4 }}>
                            {caretaker.contactName} · {caretaker.serviceType}
                          </div>
                        </div>
                        <span className="badge badge-green">{caretaker.status}</span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 12,
                        }}
                      >
                        {caretaker.existingAccount ? (
                          <span className="tag">Existing DoorRent account</span>
                        ) : (
                          <span className="tag">New DoorRent account</span>
                        )}
                        <span className="tag">{caretaker.propertyCount}</span>
                        <span className="tag">
                          Managing {caretaker.activeLandlordCount} landlord portfolio(s)
                        </span>
                      </div>

                      {caretaker.otherLandlordCount > 0 ? (
                        <div
                          style={{
                            marginBottom: 10,
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "rgba(200, 169, 110, 0.12)",
                            color: "var(--ink2)",
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          This caretaker already manages {caretaker.otherLandlordCount} other
                          landlord portfolio(s) on DoorRent. Revoking here only removes your
                          landlord assignment.
                        </div>
                      ) : null}

                      <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.8 }}>
                        <div>{caretaker.email}</div>
                        <div>{caretaker.phone || "No phone supplied"}</div>
                        <div>Joined {caretaker.joinedAt}</div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {caretaker.scope === "ALL_PROPERTIES" ? (
                          <span className="tag">All your properties</span>
                        ) : (
                          caretaker.properties.map((property) => (
                            <span key={property.id} className="tag">
                              {property.name}
                            </span>
                          ))
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => startEditing(caretaker)}
                        >
                          Edit Access
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            borderColor: "rgba(220, 103, 80, 0.22)",
                            color: "var(--red)",
                          }}
                          onClick={() => revokeAccess(caretaker.id)}
                        >
                          Revoke Access
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--ink2)" }}>
                  {loading ? "Loading caretakers..." : "No caretakers linked yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
