import { useEffect, useMemo, useState } from "react";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import DataTable from "../../components/ui/DataTable";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type { AdminPropertyRow, BadgeTone, TableColumn } from "../../types/app";

interface AdminPropertiesResponse {
  count: number;
  summary: {
    properties: number;
    landlords: number;
    occupancy: string;
  };
  properties: Array<{
    id: string;
    name: string;
    landlord: string;
    companyName: string;
    location: string;
    units: number;
    occupancy: string;
    annualRevenue?: string;
    monthlyEquivalent?: string;
    monthlyRevenue: string;
    status: AdminPropertyRow["status"];
    type: string;
    createdAt: string;
  }>;
}

function statusTone(status: AdminPropertyRow["status"]): BadgeTone {
  if (status === "active") {
    return "green";
  }

  if (status === "trial") {
    return "amber";
  }

  return "red";
}

export default function AdminPropertiesPage() {
  const { dataRefreshVersion } = usePrototypeUI();
  const { adminSession } = useAdminPortalSession();
  const [propertyData, setPropertyData] = useState<AdminPropertiesResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    if (!adminSession?.token) {
      return;
    }

    const adminToken = adminSession.token;
    let cancelled = false;

    async function loadProperties() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (state.trim()) {
        params.set("state", state.trim());
      }

      try {
        const { data } = await apiRequest<AdminPropertiesResponse>(
          `/admin/properties${params.toString() ? `?${params.toString()}` : ""}`,
          {
            token: adminToken,
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
              : "We could not load the property footprint.",
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
  }, [adminSession?.token, dataRefreshVersion, search, state]);

  const propertyRows: Array<AdminPropertyRow & { id: string }> = (propertyData?.properties ?? []).map(
    (property) => ({
      id: property.id,
      property: property.name,
      landlord: property.landlord,
      location: property.location,
      units: property.units,
      occupancy: property.occupancy,
      revenue: property.annualRevenue ?? property.monthlyRevenue,
      status: property.status,
    }),
  );

  const propertyColumns: TableColumn<AdminPropertyRow & { id: string }>[] = useMemo(
    () => [
      { key: "property", label: "Property" },
      { key: "landlord", label: "Landlord" },
      { key: "location", label: "Location" },
      { key: "units", label: "Units" },
      { key: "occupancy", label: "Occupancy" },
      { key: "revenue", label: "Potential Lease Value" },
      {
        key: "status",
        label: "Landlord Status",
        render: (row) => (
          <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
        ),
      },
    ],
    [],
  );

  const description = propertyData
    ? `${propertyData.summary.properties} properties · ${propertyData.summary.landlords} landlords · ${propertyData.summary.occupancy} occupancy`
    : loading
      ? "Loading platform property data..."
      : error || "No properties found.";

  return (
    <>
      <PageMeta title="DoorRent — All Properties" />
      <AdminPortalShell topbarTitle="All Properties" breadcrumb="Dashboard → All Properties">
        <PageHeader
          title="All Properties"
          description={description}
          actions={[{ label: "Export Portfolio", variant: "secondary" }]}
        />

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              placeholder="Search properties or landlords..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <input
            className="filter-select"
            placeholder="State"
            value={state}
            onChange={(event) => setState(event.target.value)}
          />
        </div>

        <div className="card">
          <DataTable
            columns={propertyColumns}
            rows={propertyRows}
            emptyMessage={loading ? "Loading properties..." : "No properties found."}
          />
        </div>
      </AdminPortalShell>
    </>
  );
}
