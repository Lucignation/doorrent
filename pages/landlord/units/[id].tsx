import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../../components/auth/LandlordPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import {
  annualEquivalentFromBilling,
  type BillingFrequency,
  formatBillingCyclePriceInput,
  formatBillingSchedule,
  formatNaira,
  monthlyEquivalentFromBilling,
  normalizeBillingFrequency,
} from "../../../lib/rent";
import type { BadgeTone, TableColumn } from "../../../types/app";

interface RecentPaymentRow {
  id: string;
  reference: string;
  amount: string;
  status: string;
  paidAt: string;
  method: string;
}

interface UnitDetail {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  statusLabel: string;
  meterNumber?: string | null;
  property: {
    id: string;
    name: string;
    address: string;
    marketplacePhotoUrls: string[];
    marketplaceDisplayPhotoUrls: string[];
    marketplacePhotoSource: "unit" | "property" | "none";
    marketplacePhotoCount: number;
    marketplaceMinimumPhotoCount: number;
    marketplaceHasMinimumPhotos: boolean;
    marketplaceGalleryPreview: string[];
  };
  rent: {
    annualRent: number;
    annualRentFormatted: string;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePrice: number;
    billingCyclePriceFormatted: string;
    billingSchedule: string;
  };
  leaseEnd: string;
  leaseEndIso: string | null;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    balanceAmount: number;
    balanceFormatted: string;
    leaseEnd: string;
  } | null;
  agreement: { id: string; status: string; title: string } | null;
  recentPayments: RecentPaymentRow[];
  marketplace: {
    readyForListing: boolean;
    readyForListingAt: string | null;
    readyForListingAtIso: string | null;
    eligibleNow: boolean;
    canMarkReady: boolean;
    canClearReady: boolean;
    statusLabel: string;
    blocker: string | null;
    photoCount: number;
    minimumPhotoCount: number;
    hasMinimumPhotos: boolean;
    photoSource: "unit" | "property" | "none";
  };
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

function statusTone(status: string): BadgeTone {
  if (status === "occupied") return "green";
  if (status === "vacant") return "gray";
  if (status === "maintenance") return "blue";
  if (status === "expiring") return "amber";
  return "red";
}

function formatTenantOccupancyStatus(status?: string | null) {
  if (!status) {
    return "—";
  }

  if (status === "overdue") {
    return "Lease Expired";
  }

  if (status === "expiring") {
    return "Expiring Soon";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function paymentTone(status: string): BadgeTone {
  if (status === "paid") return "green";
  if (status === "pending") return "amber";
  return "red";
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

function deriveAnnualEquivalent(value: string, frequency: BillingFrequency) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return annualEquivalentFromBilling(parsed, frequency);
}

export default function UnitDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { landlordSession } = useLandlordPortalSession();
  const { openModal, showToast } = usePrototypeUI();
  const [detail, setDetail] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [savingMarketplace, setSavingMarketplace] = useState(false);
  const [updatingMarketplaceGallery, setUpdatingMarketplaceGallery] = useState(false);
  const [editingUnit, setEditingUnit] = useState(false);
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

  useEffect(() => {
    const token = landlordSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest<UnitDetail>(`/landlord/units/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load unit.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, landlordSession?.token, refreshNonce]);

  const paymentColumns: TableColumn<RecentPaymentRow>[] = [
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink3)" }}>
          {row.reference}
        </span>
      ),
    },
    { key: "amount", label: "Amount" },
    { key: "method", label: "Method" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={paymentTone(row.status)}>{row.status}</StatusBadge>
      ),
    },
    { key: "paidAt", label: "Date" },
  ];

  async function updateMarketplaceReadiness(readyForListing: boolean) {
    if (!landlordSession?.token || !detail || savingMarketplace) {
      return;
    }

    setSavingMarketplace(true);

    try {
      const response = await apiRequest<UnitDetail>(
        `/landlord/units/${detail.id}/marketplace-readiness`,
        {
          method: "PATCH",
          token: landlordSession.token,
          body: {
            readyForListing,
          },
        },
      );

      setDetail(response.data);
      setError("");
      showToast(
        readyForListing
          ? "Unit marked as vacated and ready for marketplace return."
          : "Marketplace readiness cleared.",
        "success",
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "We could not update marketplace readiness.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingMarketplace(false);
    }
  }

  function openEditUnit() {
    if (!detail) {
      return;
    }

    const billingFrequency = normalizeBillingFrequency(detail.rent.billingFrequency);
    const annualEquivalent =
      detail.rent.annualRent && detail.rent.annualRent > 0
        ? detail.rent.annualRent
        : annualEquivalentFromBilling(detail.rent.billingCyclePrice ?? 0, billingFrequency);

    setEditError("");
    setEditAnnualEquivalent(annualEquivalent || null);
    setEditForm({
      unitNumber: detail.unitNumber,
      type: detail.type,
      billingFrequency,
      billingCyclePrice: formatBillingCyclePriceInput(annualEquivalent, billingFrequency),
      leaseEnd: detail.leaseEndIso ? detail.leaseEndIso.slice(0, 10) : "",
      meterNumber: detail.meterNumber ?? "",
    });
    setEditingUnit(true);
  }

  function closeEditUnit() {
    if (savingEdit) {
      return;
    }

    setEditingUnit(false);
    setEditError("");
    setEditAnnualEquivalent(null);
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
    if (!landlordSession?.token || !detail || savingEdit) {
      return;
    }

    if (!editForm.unitNumber.trim()) {
      setEditError("Enter a unit number for this unit.");
      return;
    }

    if (!editForm.type.trim()) {
      setEditError("Enter a unit type for this unit.");
      return;
    }

    if (!editForm.billingCyclePrice || Number(editForm.billingCyclePrice) <= 0) {
      setEditError("Enter a valid rent amount for this unit.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      await apiRequest(`/landlord/units/${detail.id}`, {
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

      setEditingUnit(false);
      setRefreshNonce((current) => current + 1);
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
    if (!landlordSession?.token || !detail || updatingMarketplaceGallery || !files?.length) {
      return;
    }

    setUpdatingMarketplaceGallery(true);

    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file, index) => ({
          dataUrl: await readFileAsDataUrl(file),
          fileName:
            file.name ||
            `${detail.property.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")}-marketplace-${Date.now()}-${index + 1}.jpg`,
          mimeType: file.type || "image/jpeg",
        })),
      );

      await apiRequest(`/landlord/units/${detail.id}/marketplace`, {
        method: "PATCH",
        token: landlordSession.token,
        body: { uploads },
      });

      setRefreshNonce((current) => current + 1);
      showToast("Marketplace photos updated successfully.", "success");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "We could not upload marketplace photos.";
      showToast(message, "error");
    } finally {
      setUpdatingMarketplaceGallery(false);
    }
  }

  async function removeMarketplacePhoto(url: string) {
    if (!landlordSession?.token || !detail || updatingMarketplaceGallery) {
      return;
    }

    setUpdatingMarketplaceGallery(true);

    try {
      await apiRequest(`/landlord/units/${detail.id}/marketplace`, {
        method: "PATCH",
        token: landlordSession.token,
        body: {
          removeUrls: [url],
        },
      });

      setRefreshNonce((current) => current + 1);
      showToast("Marketplace photo removed.", "success");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "We could not remove that marketplace photo.";
      showToast(message, "error");
    } finally {
      setUpdatingMarketplaceGallery(false);
    }
  }

  if (loading) {
    return (
      <LandlordPortalShell topbarTitle="Units" breadcrumb="Dashboard → Units → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading unit...</div>
      </LandlordPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <LandlordPortalShell topbarTitle="Units" breadcrumb="Dashboard → Units → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Unit not found."}</div>
      </LandlordPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent — Unit ${detail.unitNumber}`} urlPath={`/landlord/units/${detail.id}`} />
      <LandlordPortalShell topbarTitle="Units" breadcrumb="Dashboard → Units → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/landlord/units")}
          >
            ← Back to Units
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              Unit {detail.unitNumber}
            </h1>
            <div style={{ color: "var(--ink2)", fontSize: 14, marginTop: 4 }}>
              {detail.property.name} · {detail.type}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={statusTone(detail.status)}>{detail.statusLabel}</StatusBadge>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={openEditUnit}
            >
              Edit Unit
            </button>
            {detail.status === "vacant" ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openModal("add-tenant")}
              >
                Invite Tenant
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Unit Details</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Property</div>
                  <div style={{ fontWeight: 500 }}>{detail.property.name}</div>
                  <div className="td-muted" style={{ fontSize: 12 }}>{detail.property.address}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Type</div>
                  <div style={{ fontWeight: 500 }}>{detail.type}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Billing Schedule</div>
                  <div style={{ fontWeight: 500 }}>{detail.rent.billingSchedule}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Annual Rent</div>
                  <div style={{ fontWeight: 600 }}>{detail.rent.annualRentFormatted}</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="td-muted" style={{ fontSize: 12 }}>Lease End</div>
                <div style={{ fontWeight: 500 }}>{detail.leaseEnd || "—"}</div>
              </div>
              {detail.meterNumber ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="td-muted" style={{ fontSize: 12 }}>Electricity Meter Number</div>
                  <div style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 15, marginTop: 2 }}>
                    {detail.meterNumber}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                    Visible to the current tenant in their portal.
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <div className="td-muted" style={{ fontSize: 12 }}>Electricity Meter Number</div>
                  <div style={{ fontWeight: 500, color: "var(--ink3)" }}>Not set — edit the unit to add one.</div>
                </div>
              )}
            </div>
          </div>

          {detail.tenant ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Current Tenant</div>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{detail.tenant.name}</div>
                  <div className="td-muted">{detail.tenant.email}</div>
                </div>
                <div className="form-row">
                  <div>
                    <div className="td-muted" style={{ fontSize: 12 }}>Status</div>
                    <StatusBadge
                      tone={
                        detail.tenant.status === "current"
                          ? "green"
                          : detail.tenant.status === "expiring"
                            ? "amber"
                            : "red"
                      }
                    >
                      {formatTenantOccupancyStatus(detail.tenant.status)}
                    </StatusBadge>
                  </div>
                  <div>
                    <div className="td-muted" style={{ fontSize: 12 }}>Lease End</div>
                    <div style={{ fontWeight: 500 }}>{detail.tenant.leaseEnd}</div>
                  </div>
                </div>
                {detail.tenant.balanceAmount > 0 ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "8px 12px",
                      background: "var(--red-light)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(192,57,43,0.18)",
                    }}
                  >
                    <span style={{ color: "var(--red)", fontWeight: 700 }}>
                      Outstanding: {detail.tenant.balanceFormatted}
                    </span>
                  </div>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => void router.push(`/landlord/tenants/${detail.tenant!.id}`)}
                  >
                    View Tenant Profile →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Occupancy</div>
              </div>
              <div className="card-body">
                <div style={{ color: "var(--ink2)", textAlign: "center", padding: "24px 0" }}>
                  This unit is currently vacant.
                </div>
                <div style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openModal("add-tenant")}
                  >
                    Invite Tenant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {detail.agreement ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div style={{ flex: 1 }}>
                <div className="card-title">Agreement</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => void router.push(`/landlord/agreements/${detail.agreement!.id}`)}
              >
                View Agreement
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontWeight: 500 }}>{detail.agreement.title}</div>
                <StatusBadge
                  tone={
                    detail.agreement.status === "signed"
                      ? "green"
                      : detail.agreement.status === "sent"
                        ? "amber"
                        : detail.agreement.status === "draft"
                          ? "gray"
                          : "red"
                  }
                >
                  {detail.agreement.status}
                </StatusBadge>
              </div>
            </div>
          </div>
        ) : null}

        <div className="card" id="marketplace-photos" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Marketplace Readiness</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
          </div>
          <div className="card-body">
            <div style={{ fontWeight: 600, fontSize: 16 }}>{detail.marketplace.statusLabel}</div>
            <div className="td-muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              {detail.marketplace.photoCount > 0
                ? `${detail.marketplace.photoCount} uploaded marketplace photo(s) for this unit.`
                : detail.marketplace.photoSource === "property" &&
                    detail.property.marketplaceDisplayPhotoUrls.length > 0
                  ? "Marketplace is currently using property photos for this unit."
                : "No uploaded marketplace photos yet for this unit."}
            </div>
            {detail.marketplace.photoSource === "property" &&
            detail.property.marketplaceDisplayPhotoUrls.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    void router.push(
                      `/landlord/properties#marketplace-gallery-${detail.property.id}`,
                    )
                  }
                >
                  Manage Property Photos
                </button>
              </div>
            ) : null}
            <div className="td-muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Upload and update this unit's marketplace photos directly here on the unit screen.
            </div>
            {detail.marketplace.blocker ? (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--ink2)",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {detail.marketplace.blocker}
              </div>
            ) : null}
            {detail.property.marketplaceDisplayPhotoUrls.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {detail.property.marketplaceDisplayPhotoUrls.map((item, index) => (
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
                        alt={`${detail.property.name} marketplace ${index + 1}`}
                        style={{
                          width: "100%",
                          height: 118,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 118,
                          background: "var(--surface2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--ink3)",
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
                          detail.marketplace.photoSource === "unit"
                            ? "space-between"
                            : "flex-start",
                        gap: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 600 }}>
                        {detail.marketplace.photoSource === "property"
                          ? `Property Photo ${index + 1}`
                          : `Photo ${index + 1}`}
                      </span>
                      {detail.marketplace.photoSource === "unit" ? (
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
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Payments</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={paymentColumns}
              rows={detail.recentPayments}
              emptyMessage="No payments recorded for this unit."
            />
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
                    <input className="form-input" value={detail.property.name} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Tenant</label>
                    <input className="form-input" value={detail.tenant?.name ?? "—"} disabled />
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
