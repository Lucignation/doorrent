import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import PropertyCard from "../../components/ui/PropertyCard";
import type { PropertyPortfolioItem } from "../../types/app";

interface LandlordPropertiesResponse {
  count: number;
  summary: {
    properties: number;
    units: number;
    occupiedUnits: number;
    potentialAnnualRevenue?: string;
    potentialMonthlyEquivalent?: string;
    potentialMonthlyRevenue: string;
  };
  properties: Array<
    PropertyPortfolioItem & {
      id: string;
      address: string;
      city: string;
      state: string;
      estateName?: string | null;
      estateSecurityPhones?: string[];
      policeEmergencyPhone?: string | null;
    }
  >;
}

export default function LandlordPropertiesPage() {
  const router = useRouter();
  const { dataRefreshVersion, openModal, refreshData, showToast } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [propertyData, setPropertyData] = useState<LandlordPropertiesResponse | null>(
    null,
  );
  const [emergencyForms, setEmergencyForms] = useState<
    Record<
      string,
      {
        estateName: string;
        estateSecurityPhones: string;
        policeEmergencyPhone: string;
        saving: boolean;
      }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!landlordSession?.token) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

    async function loadProperties() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordPropertiesResponse>(
          "/landlord/properties",
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setPropertyData(data);
          setEmergencyForms((current) => {
            const next = { ...current };

            data.properties.forEach((property) => {
              next[property.id] = next[property.id]
                ? {
                    ...next[property.id],
                    estateName: next[property.id].estateName,
                    estateSecurityPhones: next[property.id].estateSecurityPhones,
                    policeEmergencyPhone: next[property.id].policeEmergencyPhone,
                  }
                : {
                    estateName: property.estateName ?? "",
                    estateSecurityPhones: (property.estateSecurityPhones ?? []).join(", "),
                    policeEmergencyPhone: property.policeEmergencyPhone ?? "",
                    saving: false,
                  };
            });

            return next;
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your properties.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProperties();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token]);

  const description = propertyData
    ? `${propertyData.summary.properties} properties · ${propertyData.summary.units} units · ${
        propertyData.summary.potentialAnnualRevenue ?? propertyData.summary.potentialMonthlyRevenue
      } lease value across billing schedules`
    : loading
      ? "Loading your property portfolio..."
      : error || "No properties yet.";

  function updateEmergencyField(
    propertyId: string,
    field: "estateName" | "estateSecurityPhones" | "policeEmergencyPhone",
    value: string,
  ) {
    setEmergencyForms((current) => ({
      ...current,
      [propertyId]: {
        estateName: current[propertyId]?.estateName ?? "",
        estateSecurityPhones: current[propertyId]?.estateSecurityPhones ?? "",
        policeEmergencyPhone: current[propertyId]?.policeEmergencyPhone ?? "",
        saving: current[propertyId]?.saving ?? false,
        [field]: value,
      },
    }));
  }

  async function saveEmergencySetup(propertyId: string) {
    if (!landlordSession?.token) {
      showToast("Landlord session missing. Please sign in again.", "error");
      return;
    }

    const form = emergencyForms[propertyId];

    if (!form) {
      return;
    }

    setEmergencyForms((current) => ({
      ...current,
      [propertyId]: {
        ...current[propertyId],
        saving: true,
      },
    }));

    try {
      await apiRequest(`/landlord/properties/${propertyId}/emergency`, {
        method: "PATCH",
        token: landlordSession.token,
        body: {
          estateName: form.estateName || undefined,
          estateSecurityPhones: form.estateSecurityPhones
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          policeEmergencyPhone: form.policeEmergencyPhone || undefined,
        },
        offline: {
          queue: true,
          dedupeKey: `landlord-property-emergency-${propertyId}`,
          invalidatePaths: ["/landlord/properties", "/landlord/emergency"],
        },
      });

      refreshData();
      showToast("Emergency contacts saved.", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not save this property's emergency contacts.",
        "error",
      );
    } finally {
      setEmergencyForms((current) => ({
        ...current,
        [propertyId]: {
          ...current[propertyId],
          saving: false,
        },
      }));
    }
  }

  return (
    <>
      <PageMeta title="DoorRent — Properties" />
      <LandlordPortalShell
        topbarTitle="Properties"
        breadcrumb="Dashboard → Properties"
      >
        <PageHeader
          title="Properties"
          description={description}
          actions={[
            { label: "Filter", variant: "secondary" },
            { label: "+ Add Property", modal: "add-property", variant: "primary" },
          ]}
        />

        <div className="property-grid">
          {(propertyData?.properties ?? []).map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => void router.push("/landlord/units")}
            />
          ))}
          <PropertyCard addNew onClick={() => openModal("add-property")} />
        </div>

        {(propertyData?.properties?.length ?? 0) > 0 ? (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Emergency & Security Setup</div>
                <div className="card-subtitle">
                  Add estate security and police numbers for each property so tenants
                  and landlords can use the emergency button immediately.
                </div>
              </div>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 18 }}>
              {propertyData?.properties.map((property) => {
                const form = emergencyForms[property.id] ?? {
                  estateName: "",
                  estateSecurityPhones: "",
                  policeEmergencyPhone: "",
                  saving: false,
                };

                return (
                  <div
                    key={property.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: 16,
                      background: "var(--surface2)",
                    }}
                  >
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{property.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                        {property.address}, {property.city}, {property.state}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Estate Name</label>
                        <input
                          className="form-input"
                          value={form.estateName}
                          onChange={(event) =>
                            updateEmergencyField(property.id, "estateName", event.target.value)
                          }
                          placeholder="Optional estate or compound name"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Police Emergency Number</label>
                        <input
                          className="form-input"
                          value={form.policeEmergencyPhone}
                          onChange={(event) =>
                            updateEmergencyField(
                              property.id,
                              "policeEmergencyPhone",
                              event.target.value,
                            )
                          }
                          placeholder="Local police line or leave blank for 112"
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Estate Security Numbers</label>
                      <input
                        className="form-input"
                        value={form.estateSecurityPhones}
                        onChange={(event) =>
                          updateEmergencyField(
                            property.id,
                            "estateSecurityPhones",
                            event.target.value,
                          )
                        }
                        placeholder="Comma-separated phone numbers"
                      />
                      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6 }}>
                        These numbers are shown to tenants and will receive the tenant's
                        full property address during an emergency alert.
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void saveEmergencySetup(property.id)}
                      disabled={form.saving}
                    >
                      {form.saving ? "Saving..." : "Save Emergency Setup"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </LandlordPortalShell>
    </>
  );
}
