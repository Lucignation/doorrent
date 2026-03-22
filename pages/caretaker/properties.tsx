import { useEffect, useState } from "react";
import CaretakerPortalShell from "../../components/auth/CaretakerPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useCaretakerPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { TableColumn } from "../../types/app";

interface CaretakerPropertyRow {
  id: string;
  name: string;
  landlordId: string;
  landlordName: string;
  location: string;
  type: string;
  units: number;
  occupied: number;
  tenants: number;
  occupancyPercent: number;
  monthlyRevenue: string;
}

interface CaretakerPropertiesResponse {
  summary: {
    totalProperties: number;
    totalUnits: number;
    totalTenants: number;
  };
  properties: CaretakerPropertyRow[];
}

export default function CaretakerPropertiesPage() {
  const { caretakerSession } = useCaretakerPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [propertyData, setPropertyData] = useState<CaretakerPropertiesResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const caretakerToken = caretakerSession?.token;

    if (!caretakerToken) {
      return;
    }

    let cancelled = false;

    async function loadProperties() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<CaretakerPropertiesResponse>(
          "/caretaker/properties",
          {
            token: caretakerToken,
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
              : "We could not load caretaker properties.",
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
  }, [caretakerSession?.token, dataRefreshVersion]);

  const columns: TableColumn<CaretakerPropertyRow>[] = [
    { key: "landlordName", label: "Landlord" },
    { key: "name", label: "Property" },
    { key: "location", label: "Location" },
    { key: "type", label: "Type" },
    { key: "units", label: "Units" },
    { key: "occupied", label: "Occupied" },
    {
      key: "occupancyPercent",
      label: "Occupancy",
      render: (row) => <span>{row.occupancyPercent}%</span>,
    },
    { key: "monthlyRevenue", label: "Revenue" },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Caretaker Properties" urlPath="/caretaker/properties" />
      <CaretakerPortalShell
        topbarTitle="Properties"
        breadcrumb="Workspace → Properties"
      >
        <PageHeader
          title="Assigned Properties"
          description={
            propertyData
              ? `${propertyData.summary.totalProperties} propert${propertyData.summary.totalProperties === 1 ? "y" : "ies"} across ${propertyData.summary.totalTenants} active tenant record(s)`
              : loading
                ? "Loading assigned properties..."
                : error || "Assigned properties are unavailable."
          }
        />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div
          className="stats-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          <div className="stat-card accent-blue">
            <div className="stat-label">Properties</div>
            <div className="stat-value">{propertyData?.summary.totalProperties ?? 0}</div>
            <div className="stat-sub">Assigned to your team</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Units</div>
            <div className="stat-value">{propertyData?.summary.totalUnits ?? 0}</div>
            <div className="stat-sub">Across all assignments</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Tenants</div>
            <div className="stat-value">{propertyData?.summary.totalTenants ?? 0}</div>
            <div className="stat-sub">Active tenant records</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={columns}
              rows={propertyData?.properties ?? []}
              emptyMessage={loading ? "Loading properties..." : "No assigned properties."}
            />
          </div>
        </div>
      </CaretakerPortalShell>
    </>
  );
}
