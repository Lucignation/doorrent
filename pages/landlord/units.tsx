import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import {
  annualEquivalentFromBilling,
  type BillingFrequency,
  formatBillingCyclePriceInput,
  formatBillingSchedule,
  formatNaira,
  monthlyEquivalentFromBilling,
  normalizeBillingFrequency,
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
  meterNumber?: string | null;
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

interface MarketplacePropertyRecord {
  id: string;
  name: string;
  marketplacePhotoUrls: string[];
  marketplaceDisplayPhotoUrls: string[];
  marketplacePhotoSource: "unit" | "property" | "none";
  marketplacePhotoCount: number;
  marketplaceMinimumPhotoCount: number;
  marketplaceHasMinimumPhotos: boolean;
  marketplaceGalleryPreview: string[];
}

interface UnitMarketplaceDetailResponse {
  property: MarketplacePropertyRecord;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        resolve(result);
        return;
      }

      reject(new Error("We could not read that image file."));
    };
    reader.onerror = () => reject(new Error("We could not read that image file."));
    reader.readAsDataURL(file);
  });
}

function isMarketplaceImage(value: string) {
  return /^(https?:|data:image\/)/i.test(value);
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
  const router = useRouter();
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
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const [editingUnit, setEditingUnit] = useState<LandlordUnitRecord | null>(null);
  const [editForm, setEditForm] = useState({
    unitNumber: "",
    type: "",
    billingFrequency: "yearly" as BillingFrequency,
    billingCyclePrice: "",
    leaseEnd: "",
    meterNumber: "",
  });
  const [editAnnualEquivalent, setEditAnnualEquivalent] = useState<number | null>(null);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingPropertyMarketplace, setEditingPropertyMarketplace] =
    useState<MarketplacePropertyRecord | null>(null);
  const [loadingMarketplaceGallery, setLoadingMarketplaceGallery] = useState(false);
  const [updatingMarketplaceGallery, setUpdatingMarketplaceGallery] = useState(false);

  function deriveAnnualEquivalent(value: string, frequency: BillingFrequency) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return annualEquivalentFromBilling(parsed, frequency);
  }

  async function loadEditingPropertyMarketplace(unitId: string) {
    if (!landlordSession?.token) {
      return;
    }

    setLoadingMarketplaceGallery(true);

    try {
      const { data } = await apiRequest<UnitMarketplaceDetailResponse>(
        `/landlord/units/${unitId}`,
        {
          token: landlordSession.token,
        },
      );

      setEditingPropertyMarketplace(data.property ?? null);
    } catch (requestError) {
      setEditingPropertyMarketplace(null);
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not load marketplace photos for this property.",
        "error",
      );
    } finally {
      setLoadingMarketplaceGallery(false);
    }
  }

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
    const billingFrequency = normalizeBillingFrequency(unit.billingFrequency);
    const annualEquivalent =
      unit.annualRent && unit.annualRent > 0
        ? unit.annualRent
        : annualEquivalentFromBilling(unit.billingCyclePrice ?? 0, billingFrequency);

    setEditingUnit(unit);
    setEditError("");
    setEditAnnualEquivalent(annualEquivalent || null);
    setEditForm({
      unitNumber: unit.unit,
      type: unit.type,
      billingFrequency,
      billingCyclePrice: formatBillingCyclePriceInput(annualEquivalent, billingFrequency),
      leaseEnd: unit.leaseEndIso ? unit.leaseEndIso.slice(0, 10) : "",
      meterNumber: unit.meterNumber ?? "",
    });
    setEditingPropertyMarketplace(null);
    void loadEditingPropertyMarketplace(unit.id);
  }

  function closeEditUnit() {
    if (savingEdit) {
      return;
    }

    setEditingUnit(null);
    setEditError("");
    setEditAnnualEquivalent(null);
    setEditingPropertyMarketplace(null);
  }

  function handleEditBillingFrequencyChange(nextFrequency: BillingFrequency) {
    const annualEquivalent =
      editAnnualEquivalent ??
      deriveAnnualEquivalent(editForm.billingCyclePrice, editForm.billingFrequency);

    setEditAnnualEquivalent(annualEquivalent);
    setEditForm((current) => ({
      ...current,
      billingFrequency: nextFrequency,
      billingCyclePrice: annualEquivalent
        ? formatBillingCyclePriceInput(annualEquivalent, nextFrequency)
        : current.billingCyclePrice,
    }));
  }

  function handleEditBillingCyclePriceChange(nextValue: string) {
    setEditForm((current) => ({
      ...current,
      billingCyclePrice: nextValue,
    }));
    setEditAnnualEquivalent(deriveAnnualEquivalent(nextValue, editForm.billingFrequency));
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
          unitNumber: editForm.unitNumber.trim(),
          type: editForm.type.trim(),
          billingFrequency: editForm.billingFrequency.toUpperCase(),
          billingCyclePrice: Number(editForm.billingCyclePrice),
          leaseEnd: editForm.leaseEnd || null,
          meterNumber: editForm.meterNumber.trim(),
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

  async function uploadMarketplacePhotos(files: FileList | null) {
    if (!landlordSession?.token || !editingUnit || updatingMarketplaceGallery || !files?.length) {
      return;
    }

    setUpdatingMarketplaceGallery(true);

    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file, index) => ({
          dataUrl: await readFileAsDataUrl(file),
          fileName:
            file.name ||
            `${editingUnit.property
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")}-marketplace-${Date.now()}-${index + 1}.jpg`,
          mimeType: file.type || "image/jpeg",
        })),
      );

      await apiRequest(`/landlord/units/${editingUnit.id}/marketplace`, {
        method: "PATCH",
        token: landlordSession.token,
        body: { uploads },
      });

      await loadEditingPropertyMarketplace(editingUnit.id);
      setRefreshNonce((current) => current + 1);
      refreshData();
      showToast("Marketplace photos updated successfully.", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not upload marketplace photos.",
        "error",
      );
    } finally {
      setUpdatingMarketplaceGallery(false);
    }
  }

  async function removeMarketplacePhoto(url: string) {
    if (!landlordSession?.token || !editingUnit || updatingMarketplaceGallery) {
      return;
    }

    setUpdatingMarketplaceGallery(true);

    try {
      await apiRequest(`/landlord/units/${editingUnit.id}/marketplace`, {
        method: "PATCH",
        token: landlordSession.token,
        body: {
          removeUrls: [url],
        },
      });

      await loadEditingPropertyMarketplace(editingUnit.id);
      setRefreshNonce((current) => current + 1);
      refreshData();
      showToast("Marketplace photo removed.", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not remove that marketplace photo.",
        "error",
      );
    } finally {
      setUpdatingMarketplaceGallery(false);
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
              onClick={() => void router.push(`/landlord/units/${row.id}`)}
            >
              View
            </button>
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
    [openModal, router],
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
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <select
            className="filter-select"
            value={propertyId}
            onChange={(event) => { setPropertyId(event.target.value); setPage(1); }}
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
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
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
            onChange={(event) => { setType(event.target.value); setPage(1); }}
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
          {(() => {
            const allUnits = unitsData?.units ?? [];
            const totalPages = Math.max(1, Math.ceil(allUnits.length / PAGE_SIZE));
            const safePage = Math.min(page, totalPages);
            const pageRows = allUnits.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
            const from = allUnits.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
            const to = Math.min(safePage * PAGE_SIZE, allUnits.length);

            return (
              <>
                <DataTable
                  columns={unitColumns}
                  rows={pageRows}
                  loading={loading}
                  loadingMessage="Updating units..."
                  emptyMessage={loading ? "Loading units..." : "No units found."}
                />
                <div className="pagination">
                  <span className="pagination-info">
                    {loading ? "Loading units..." : allUnits.length === 0 ? "No units" : `${from}–${to} of ${allUnits.length} units`}
                  </span>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "…" ? (
                          <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: "var(--ink3)", fontSize: 13 }}>…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            className={`btn btn-xs${p === safePage ? " btn-primary" : " btn-ghost"}`}
                            onClick={() => setPage(p as number)}
                          >
                            {p}
                          </button>
                        )
                      )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
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
            <div className="modal" style={{ width: "min(1080px, 96vw)", maxWidth: 1080 }}>
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
                        handleEditBillingFrequencyChange(
                          event.target.value as BillingFrequency,
                        )
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
                        handleEditBillingCyclePriceChange(event.target.value)
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
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Electricity Meter Number</label>
                    <input
                      className="form-input"
                      placeholder="e.g. 45123678901"
                      value={editForm.meterNumber}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          meterNumber: event.target.value,
                        }))
                      }
                    />
                    <div className="helper-text">
                      Tenants can view this meter number when they need to buy electricity units for the property.
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 18,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="form-label" style={{ marginBottom: 4 }}>
                        Marketplace Photos
                      </div>
                      <div className="helper-text" style={{ maxWidth: 640 }}>
                        Upload and update this unit's marketplace photos directly from this edit
                        screen.
                      </div>
                    </div>
                    <label
                      className="btn btn-secondary btn-sm"
                      style={{
                        cursor: updatingMarketplaceGallery ? "wait" : "pointer",
                        opacity: updatingMarketplaceGallery ? 0.7 : 1,
                      }}
                    >
                      {updatingMarketplaceGallery ? "Working..." : "Add Photos Here"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        disabled={updatingMarketplaceGallery}
                        onChange={(event) => {
                          void uploadMarketplacePhotos(event.target.files);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div className="helper-text" style={{ marginTop: 10 }}>
                    {editingPropertyMarketplace
                      ? editingPropertyMarketplace.marketplacePhotoCount > 0
                        ? `${editingPropertyMarketplace.marketplacePhotoCount} uploaded marketplace photo(s) for this unit.`
                        : editingPropertyMarketplace.marketplacePhotoSource === "property" &&
                            editingPropertyMarketplace.marketplaceDisplayPhotoUrls.length > 0
                          ? "Marketplace is currently using property photos for this unit."
                        : "No uploaded marketplace photos yet for this unit."
                      : loadingMarketplaceGallery
                        ? "Loading marketplace photos..."
                        : "Marketplace photos are not available yet for this unit."}
                  </div>
                  {editingPropertyMarketplace?.marketplacePhotoSource === "property" &&
                  editingPropertyMarketplace.marketplaceDisplayPhotoUrls.length > 0 ? (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          closeEditUnit();
                          void router.push(
                            `/landlord/properties#marketplace-gallery-${editingPropertyMarketplace.id}`,
                          );
                        }}
                      >
                        Manage Property Photos
                      </button>
                    </div>
                  ) : null}

                  {editingPropertyMarketplace &&
                  editingPropertyMarketplace.marketplaceDisplayPhotoUrls.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 12,
                        marginTop: 14,
                      }}
                    >
                      {editingPropertyMarketplace.marketplaceDisplayPhotoUrls.map((item, index) => {
                        return (
                          <div
                            key={`${item}-${index}`}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 14,
                              overflow: "hidden",
                              background: "var(--surface)",
                            }}
                          >
                            {isMarketplaceImage(item) ? (
                              <img
                                src={item}
                                alt={`${editingPropertyMarketplace.name} marketplace ${index + 1}`}
                                style={{
                                  width: "100%",
                                  height: 112,
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: 112,
                                  background: `linear-gradient(160deg, ${item}, #102018)`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "rgba(255,255,255,0.88)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Photo unavailable
                              </div>
                            )}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent:
                                  editingPropertyMarketplace.marketplacePhotoSource === "unit"
                                    ? "space-between"
                                    : "flex-start",
                                gap: 8,
                                padding: "10px 12px",
                              }}
                            >
                              <span style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 600 }}>
                                {editingPropertyMarketplace.marketplacePhotoSource === "property"
                                  ? `Property Photo ${index + 1}`
                                  : `Photo ${index + 1}`}
                              </span>
                              {editingPropertyMarketplace.marketplacePhotoSource === "unit" ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => void removeMarketplacePhoto(item)}
                                  disabled={updatingMarketplaceGallery}
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
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
