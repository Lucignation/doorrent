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
    potentialMonthlyRevenue: string;
  };
  properties: Array<PropertyPortfolioItem & { id: string }>;
}

export default function LandlordPropertiesPage() {
  const router = useRouter();
  const { openModal } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [propertyData, setPropertyData] = useState<LandlordPropertiesResponse | null>(
    null,
  );
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
  }, [landlordSession?.token]);

  const description = propertyData
    ? `${propertyData.summary.properties} properties · ${propertyData.summary.units} units · ${propertyData.summary.potentialMonthlyRevenue} potential monthly revenue`
    : loading
      ? "Loading your property portfolio..."
      : error || "No properties yet.";

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
      </LandlordPortalShell>
    </>
  );
}
