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
      ownerName?: string | null;
      ownerPayoutEnabled?: boolean;
      managementFeePercent?: number | null;
      ownerPayoutBankCode?: string | null;
      ownerPayoutBankName?: string | null;
      ownerPayoutAccountName?: string | null;
      ownerPayoutAccountNumber?: string | null;
      splitConfiguredAt?: string | null;
      estateName?: string | null;
      estateSecurityPhones?: string[];
      policeEmergencyPhone?: string | null;
    }
  >;
}

interface PayoutBanksResponse {
  banks: Array<{
    id: string;
    name: string;
  }>;
}

interface ResolvePayoutAccountResponse {
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
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
  const [collectionForms, setCollectionForms] = useState<
    Record<
      string,
      {
        enabled: boolean;
        ownerName: string;
        managementFeePercent: string;
        bankId: string;
        accountNumber: string;
        accountName: string;
        saving: boolean;
        resolving: boolean;
      }
    >
  >({});
  const [availableBanks, setAvailableBanks] = useState<PayoutBanksResponse["banks"]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
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
          setCollectionForms((current) => {
            const next = { ...current };

            data.properties.forEach((property) => {
              next[property.id] = next[property.id]
                ? {
                    ...next[property.id],
                    saving: false,
                    resolving: false,
                  }
                : {
                    enabled: Boolean(property.ownerPayoutEnabled),
                    ownerName: property.ownerName ?? "",
                    managementFeePercent:
                      typeof property.managementFeePercent === "number"
                        ? `${property.managementFeePercent}`
                        : "",
                    bankId:
                      availableBanks.find(
                        (bank) => bank.name === property.ownerPayoutBankName,
                      )?.id ?? "",
                    accountNumber: property.ownerPayoutAccountNumber ?? "",
                    accountName: property.ownerPayoutAccountName ?? "",
                    saving: false,
                    resolving: false,
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

  useEffect(() => {
    if (
      !landlordSession?.token ||
      landlordSession.landlord.workspaceMode !== "PROPERTY_MANAGER_COMPANY"
    ) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

    async function loadBanks() {
      setLoadingBanks(true);

      try {
        const { data } = await apiRequest<PayoutBanksResponse>(
          "/landlord/settings/payout/banks",
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setAvailableBanks(data.banks);
        }
      } catch (requestError) {
        if (!cancelled) {
          showToast(
            requestError instanceof Error
              ? requestError.message
              : "We could not load Nigerian banks.",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingBanks(false);
        }
      }
    }

    void loadBanks();

    return () => {
      cancelled = true;
    };
  }, [landlordSession?.landlord.workspaceMode, landlordSession?.token, showToast]);

  useEffect(() => {
    if (!availableBanks.length) {
      return;
    }

    setCollectionForms((current) => {
      const next = { ...current };

      Object.entries(next).forEach(([propertyId, form]) => {
        if (form.bankId || !propertyData) {
          return;
        }

        const property = propertyData.properties.find((item) => item.id === propertyId);
        const matchedBank = availableBanks.find(
          (bank) => bank.name === property?.ownerPayoutBankName,
        );

        if (matchedBank) {
          next[propertyId] = {
            ...form,
            bankId: matchedBank.id,
          };
        }
      });

      return next;
    });
  }, [availableBanks, propertyData]);

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

  function updateCollectionField(
    propertyId: string,
    field:
      | "enabled"
      | "ownerName"
      | "managementFeePercent"
      | "bankId"
      | "accountNumber"
      | "accountName",
    value: string | boolean,
  ) {
    setCollectionForms((current) => ({
      ...current,
      [propertyId]: {
        enabled: current[propertyId]?.enabled ?? false,
        ownerName: current[propertyId]?.ownerName ?? "",
        managementFeePercent: current[propertyId]?.managementFeePercent ?? "",
        bankId: current[propertyId]?.bankId ?? "",
        accountNumber: current[propertyId]?.accountNumber ?? "",
        accountName: current[propertyId]?.accountName ?? "",
        saving: current[propertyId]?.saving ?? false,
        resolving: current[propertyId]?.resolving ?? false,
        [field]: value,
        // Clear resolved name whenever bank or account number changes
        ...(field === "bankId" || field === "accountNumber" ? { accountName: "" } : {}),
      },
    }));
  }

  // Auto-resolve when both bankId and a 10-digit accountNumber are present
  useEffect(() => {
    Object.entries(collectionForms).forEach(([propertyId, form]) => {
      if (
        form.bankId &&
        form.accountNumber.length === 10 &&
        !form.accountName &&
        !form.resolving
      ) {
        void resolveCollectionAccount(propertyId);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.entries(collectionForms).map(([id, f]) => `${id}:${f.bankId}:${f.accountNumber}`).join("|")]);

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

  async function resolveCollectionAccount(propertyId: string) {
    if (!landlordSession?.token) {
      showToast("Landlord session missing. Please sign in again.", "error");
      return;
    }

    const form = collectionForms[propertyId];

    if (!form?.bankId || !form.accountNumber) {
      showToast("Select a bank and enter the owner's account number first.", "error");
      return;
    }

    setCollectionForms((current) => ({
      ...current,
      [propertyId]: {
        ...current[propertyId],
        resolving: true,
      },
    }));

    try {
      const { data } = await apiRequest<ResolvePayoutAccountResponse>(
        "/landlord/settings/payout/resolve-account",
        {
          method: "POST",
          token: landlordSession.token,
          body: {
            bankId: form.bankId,
            accountNumber: form.accountNumber,
          },
        },
      );

      setCollectionForms((current) => ({
        ...current,
        [propertyId]: {
          ...current[propertyId],
          bankId: data.bankId,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          ownerName: current[propertyId]?.ownerName || data.accountName,
          resolving: false,
        },
      }));
      showToast("Owner account resolved successfully.", "success");
    } catch (requestError) {
      setCollectionForms((current) => ({
        ...current,
        [propertyId]: {
          ...current[propertyId],
          resolving: false,
        },
      }));
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not verify this owner payout account.",
        "error",
      );
    }
  }

  async function saveCollectionRouting(propertyId: string) {
    if (!landlordSession?.token) {
      showToast("Landlord session missing. Please sign in again.", "error");
      return;
    }

    const form = collectionForms[propertyId];

    if (!form) {
      return;
    }

    setCollectionForms((current) => ({
      ...current,
      [propertyId]: {
        ...current[propertyId],
        saving: true,
      },
    }));

    try {
      await apiRequest(`/landlord/properties/${propertyId}/collection-routing`, {
        method: "PATCH",
        token: landlordSession.token,
        body: {
          enabled: form.enabled,
          ownerName: form.ownerName || undefined,
          managementFeePercent: form.managementFeePercent
            ? Number(form.managementFeePercent)
            : undefined,
          bankId: form.bankId || undefined,
          accountNumber: form.accountNumber || undefined,
          accountName: form.accountName || undefined,
        },
      });

      refreshData();
      showToast("Collection routing saved.", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not save this property's payout routing.",
        "error",
      );
    } finally {
      setCollectionForms((current) => ({
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

        {(propertyData?.properties?.length ?? 0) > 0 &&
        landlordSession?.landlord.workspaceMode === "PROPERTY_MANAGER_COMPANY" ? (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Owner Payout Split Setup</div>
                <div className="card-subtitle">
                  Route each property&apos;s tenant collections between your company and the property owner.
                </div>
              </div>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 18 }}>
              {propertyData?.properties.map((property) => {
                const form = collectionForms[property.id] ?? {
                  enabled: Boolean(property.ownerPayoutEnabled),
                  ownerName: property.ownerName ?? "",
                  managementFeePercent:
                    typeof property.managementFeePercent === "number"
                      ? `${property.managementFeePercent}`
                      : "",
                  bankId:
                    availableBanks.find(
                      (bank) => bank.name === property.ownerPayoutBankName,
                    )?.id ?? "",
                  accountNumber: property.ownerPayoutAccountNumber ?? "",
                  accountName: property.ownerPayoutAccountName ?? "",
                  saving: false,
                  resolving: false,
                };

                return (
                  <div
                    key={`${property.id}-collection`}
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

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 14,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(event) =>
                          updateCollectionField(property.id, "enabled", event.target.checked)
                        }
                      />
                      Split this property&apos;s rent between company and owner
                    </label>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Owner / Client Name</label>
                        <input
                          className="form-input"
                          value={form.ownerName}
                          onChange={(event) =>
                            updateCollectionField(property.id, "ownerName", event.target.value)
                          }
                          placeholder="Blue Oak Property Holdings"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Management Fee (%)</label>
                        <input
                          className="form-input"
                          value={form.managementFeePercent}
                          onChange={(event) =>
                            updateCollectionField(
                              property.id,
                              "managementFeePercent",
                              event.target.value.replace(/[^\d]/g, "").slice(0, 2),
                            )
                          }
                          placeholder="10"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Owner Payout Bank</label>
                        <select
                          className="form-input"
                          value={form.bankId}
                          onChange={(event) =>
                            updateCollectionField(property.id, "bankId", event.target.value)
                          }
                        >
                          <option value="">
                            {loadingBanks ? "Loading banks..." : "Select owner bank"}
                          </option>
                          {availableBanks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Owner Account Number</label>
                        <input
                          className="form-input"
                          value={form.accountNumber}
                          onChange={(event) =>
                            updateCollectionField(
                              property.id,
                              "accountNumber",
                              event.target.value.replace(/[^\d]/g, "").slice(0, 10),
                            )
                          }
                          placeholder="0123456789"
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Resolved Owner Account Name</label>
                      <div style={{ position: "relative" }}>
                        <input
                          className="form-input"
                          value={form.resolving ? "" : form.accountName}
                          disabled
                          placeholder={form.resolving ? "Verifying account..." : "Auto-filled after account number is entered"}
                          style={{ background: "var(--bg)", color: form.accountName ? "var(--ink)" : undefined, paddingRight: form.resolving ? 36 : undefined }}
                        />
                        {form.resolving && (
                          <span style={{
                            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                            width: 16, height: 16, border: "2px solid var(--border)", borderTopColor: "var(--accent)",
                            borderRadius: "50%", display: "inline-block",
                            animation: "spin 0.7s linear infinite",
                          }} />
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6 }}>
                        DoorRent will keep the platform fee, your company receives the management share,
                        and the owner receives the balance on successful tenant payment.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => void saveCollectionRouting(property.id)}
                        disabled={form.saving || !form.accountName}
                      >
                        {form.saving ? "Saving..." : "Save Collection Routing"}
                      </button>
                    </div>

                    {property.splitConfiguredAt ? (
                      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 10 }}>
                        Split enabled on {new Date(property.splitConfiguredAt).toLocaleDateString()}.
                      </div>
                    ) : null}
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
