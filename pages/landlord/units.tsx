import { useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type { BadgeTone, LandlordUnitRow, TableColumn } from "../../types/app";

interface UnitsResponse {
  count: number;
  summary: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
    expiring: number;
    overdue: number;
  };
  filters: {
    properties: Array<{ id: string; name: string }>;
    statuses: Array<{ value: string; label: string }>;
    types: string[];
  };
  units: Array<LandlordUnitRow & { id: string }>;
}

function statusTone(status: LandlordUnitRow["status"]): BadgeTone {
  if (status === "occupied") {
    return "green";
  }

  if (status === "vacant") {
    return "gray";
  }

  if (status === "maintenance") {
    return "blue";
  }

  if (status === "expiring") {
    return "amber";
  }

  return "red";
}

export default function LandlordUnitsPage() {
  const { openModal } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [unitsData, setUnitsData] = useState<UnitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    if (!landlordSession?.token) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

    async function loadUnits() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (propertyId) {
        params.set("propertyId", propertyId);
      }

      if (status) {
        params.set("status", status);
      }

      if (type) {
        params.set("type", type);
      }

      try {
        const { data } = await apiRequest<UnitsResponse>(
          `/landlord/units${params.toString() ? `?${params.toString()}` : ""}`,
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setUnitsData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your units.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUnits();

    return () => {
      cancelled = true;
    };
  }, [landlordSession?.token, propertyId, search, status, type]);

  const unitColumns: TableColumn<LandlordUnitRow & { id: string }>[] = useMemo(
    () => [
      {
        key: "unit",
        label: "Unit",
        render: (row) => <span style={{ fontWeight: 600 }}>{row.unit}</span>,
      },
      {
        key: "property",
        label: "Property",
        render: (row) => <span className="td-muted">{row.property}</span>,
      },
      { key: "type", label: "Type" },
      {
        key: "tenant",
        label: "Tenant",
        render: (row) =>
          row.tenant === "—" ? (
            <span className="td-muted">—</span>
          ) : (
            <IdentityCell primary={row.tenant} secondary={row.tenantEmail} />
          ),
      },
      {
        key: "rent",
        label: "Rent/mo",
        render: (row) => <span style={{ fontWeight: 600 }}>{row.rent}</span>,
      },
      {
        key: "leaseEnd",
        label: "Lease End",
        render: (row) => <span className="td-muted">{row.leaseEnd}</span>,
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" className="btn btn-ghost btn-xs">
              Edit
            </button>
            {row.status === "vacant" ? (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => openModal("add-tenant")}
              >
                Assign
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [openModal],
  );

  const description = unitsData
    ? `${unitsData.summary.total} units · ${unitsData.summary.occupied} occupied · ${unitsData.summary.vacant} vacant`
    : loading
      ? "Loading your units..."
      : error || "No units yet.";

  return (
    <>
      <PageMeta title="DoorRent — Units" />
      <LandlordPortalShell topbarTitle="Units" breadcrumb="Dashboard → Units">
        <PageHeader
          title="Units"
          description={description}
          actions={[{ label: "+ Add Unit", modal: "add-unit", variant: "primary" }]}
        />

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              placeholder="Search units or tenants..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          >
            <option value="">All Properties</option>
            {(unitsData?.filters.properties ?? []).map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All Status</option>
            {(unitsData?.filters.statuses ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">All Types</option>
            {(unitsData?.filters.types ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <DataTable
            columns={unitColumns}
            rows={unitsData?.units ?? []}
            emptyMessage={loading ? "Loading units..." : "No units found."}
          />
          <div className="pagination">
            <span>
              {loading
                ? "Loading units..."
                : `Showing ${unitsData?.units.length ?? 0} of ${unitsData?.count ?? 0} units`}
            </span>
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
