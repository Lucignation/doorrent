import { useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import {
  annualEquivalentFromBilling,
  type BillingFrequency,
  formatBillingSchedule,
  formatNaira,
  monthlyEquivalentFromBilling,
} from "../../lib/rent";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type { BadgeTone, LandlordUnitRow, TableColumn } from "../../types/app";

interface LandlordUnitRecord extends LandlordUnitRow {
  id: string;
  propertyId: string;
  leaseEndIso?: string | null;
  monthlyRent?: number;
  canAssignTenant?: boolean;
  statusLabel?: string;
  billingFrequency?: BillingFrequency;
  billingFrequencyLabel?: string;
  billingCyclePrice?: number;
  billingCyclePriceFormatted?: string;
  billingSchedule?: string;
}

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
  units: LandlordUnitRecord[];
}

function pricingHelperText(value: string, frequency: BillingFrequency) {
  const billingCyclePrice = Number(value);

  if (!Number.isFinite(billingCyclePrice) || billingCyclePrice <= 0) {
    return "—";
  }

  const annualEquivalent = annualEquivalentFromBilling(billingCyclePrice, frequency);
  const monthlyEquivalent = monthlyEquivalentFromBilling(billingCyclePrice, frequency);

  return `${formatBillingSchedule(billingCyclePrice, frequency)} · Annual equivalent ${formatNaira(
    annualEquivalent,
  )} · Monthly equivalent ${formatNaira(monthlyEquivalent)}`;
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
  const { dataRefreshVersion, openModal, refreshData, showToast } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [unitsData, setUnitsData] = useState<UnitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [editingUnit, setEditingUnit] = useState<LandlordUnitRecord | null>(null);
  const [editForm, setEditForm] = useState({
    unitNumber: "",
    type: "",
    billingFrequency: "yearly" as BillingFrequency,
    billingCyclePrice: "",
    leaseEnd: "",
  });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
  }, [dataRefreshVersion, landlordSession?.token, propertyId, refreshNonce, search, status, type]);

  function openEditUnit(unit: LandlordUnitRecord) {
    setEditingUnit(unit);
    setEditError("");
    setEditForm({
      unitNumber: unit.unit,
      type: unit.type,
      billingFrequency: unit.billingFrequency ?? "yearly",
      billingCyclePrice: unit.billingCyclePrice
        ? String(unit.billingCyclePrice)
        : unit.annualRent
          ? String(unit.annualRent)
          : "",
      leaseEnd: unit.leaseEndIso ? unit.leaseEndIso.slice(0, 10) : "",
    });
  }

  function closeEditUnit() {
    if (savingEdit) {
      return;
    }

    setEditingUnit(null);
    setEditError("");
  }

  async function submitUnitEdit() {
    if (!landlordSession?.token || !editingUnit) {
      return;
    }

    if (!editForm.billingCyclePrice || Number(editForm.billingCyclePrice) <= 0) {
      setEditError("Enter a valid rent amount for this unit.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      await apiRequest(`/landlord/units/${editingUnit.id}`, {
        method: "PATCH",
        token: landlordSession.token,
        body: {
          unitNumber: editForm.unitNumber,
          type: editForm.type,
          billingFrequency: editForm.billingFrequency.toUpperCase(),
          billingCyclePrice: Number(editForm.billingCyclePrice),
          leaseEnd: editForm.leaseEnd || null,
        },
      });

      setEditingUnit(null);
      setRefreshNonce((current) => current + 1);
      refreshData();
      showToast("Unit updated successfully", "success");
    } catch (requestError) {
      setEditError(
        requestError instanceof Error
          ? requestError.message
          : "We could not update this unit.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  const unitColumns: TableColumn<LandlordUnitRecord>[] = useMemo(
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
        label: "Rent",
        render: (row) => (
          <div>
            <span style={{ fontWeight: 600 }}>{row.billingSchedule ?? row.rent}</span>
            <div className="td-muted">
              Annual equivalent: {row.rent}
            </div>
          </div>
        ),
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
          <StatusBadge tone={statusTone(row.status)}>
            {row.statusLabel ?? row.status}
          </StatusBadge>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => openEditUnit(row)}
            >
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

        {editingUnit ? (
          <div
            className="modal-overlay open"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeEditUnit();
              }
            }}
          >
            <div className="modal">
              <div className="modal-header">
                <div className="modal-title">Edit Unit</div>
                <button type="button" className="modal-close" onClick={closeEditUnit}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                {editError ? (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--red-light)",
                      border: "1px solid rgba(192,57,43,0.18)",
                      color: "var(--red)",
                      fontSize: 12,
                    }}
                  >
                    {editError}
                  </div>
                ) : null}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Property</label>
                    <input className="form-input" value={editingUnit.property} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Tenant</label>
                    <input className="form-input" value={editingUnit.tenant} disabled />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Number *</label>
                    <input
                      className="form-input"
                      value={editForm.unitNumber}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          unitNumber: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <input
                      className="form-input"
                      value={editForm.type}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          type: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Billing Frequency *</label>
                    <select
                      className="form-input"
                      value={editForm.billingFrequency}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          billingFrequency: event.target.value as BillingFrequency,
                        }))
                      }
                    >
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price Per Billing Cycle (₦) *</label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      step="1000"
                      value={editForm.billingCyclePrice}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          billingCyclePrice: event.target.value,
                        }))
                      }
                    />
                    <div className="helper-text">
                      {pricingHelperText(
                        editForm.billingCyclePrice,
                        editForm.billingFrequency,
                      )}
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Lease End</label>
                    <input
                      className="form-input"
                      type="date"
                      value={editForm.leaseEnd}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          leaseEnd: event.target.value,
                        }))
                      }
                    />
                    <div className="helper-text">
                      DoorRent uses this lease end date to move the unit between occupied,
                      expiring, and lease expired automatically.
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: 14,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface2)",
                    fontSize: 12,
                    color: "var(--ink2)",
                    lineHeight: 1.7,
                  }}
                >
                  Current system status:{" "}
                  <strong>{editingUnit.statusLabel ?? editingUnit.status}</strong>.
                  Landlords can choose the initial status only when creating a unit. After
                  setup, DoorRent updates the status automatically from lease dates and
                  payment activity.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeEditUnit}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void submitUnitEdit()}
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </LandlordPortalShell>
    </>
  );
}
