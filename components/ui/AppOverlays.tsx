import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { ModalId } from "../../types/app";
import SignaturePad from "./SignaturePad";

function ModalFrame({
  modalId,
  size,
  title,
  children,
  footer,
}: {
  modalId: ModalId;
  size?: "modal-lg" | "modal-xl";
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { activeModal, closeModal } = usePrototypeUI();
  const open = activeModal === modalId;

  return (
    <div
      className={`modal-overlay ${open ? "open" : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <div className={`modal ${size || ""}`}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button type="button" className="modal-close" onClick={closeModal}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

interface UnitLookupResponse {
  filters: {
    properties: Array<{ id: string; name: string }>;
  };
}

interface TenantInvitationLookupResponse {
  formOptions: {
    properties: Array<{ id: string; name: string }>;
    vacantUnits: Array<{ id: string; propertyId: string; label: string }>;
    templates: Array<{ id: string; name: string }>;
  };
}

interface AgreementsLookupResponse {
  formOptions: {
    properties: Array<{ id: string; name: string }>;
      tenants: Array<{
        id: string;
        name: string;
        propertyId: string;
        property: string;
        unitId?: string | null;
        unit: string;
        annualRent?: number;
        monthlyRent?: number;
        rentAmount?: number;
        leaseStart: string;
        leaseEnd: string;
      }>;
    units: Array<{ id: string; propertyId: string; label: string }>;
    templates: Array<{ id: string; name: string; fileName?: string | null }>;
  };
}

interface InvitationCreateResponse {
  onboardingUrl: string;
}

interface PayoutTemplateUploadForm {
  name: string;
  description: string;
  fileName: string;
  mimeType: string;
  content: string;
  fileDataUrl: string;
}

const amenityOptions = [
  "24/7 Security",
  "Parking",
  "Swimming Pool",
  "Generator",
  "Gym",
  "Borehole",
];

function calculateMonthlyEquivalent(annualRentValue: string) {
  const parsed = Number(annualRentValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  return Math.round(parsed / 12).toLocaleString("en-NG");
}

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("We could not read the selected file."));
    };
    reader.onerror = () => reject(new Error("We could not read the selected file."));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("We could not read the selected file."));
    };
    reader.onerror = () => reject(new Error("We could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function FieldError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
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
      {message}
    </div>
  );
}

function LandlordAccessHint() {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface2)",
        fontSize: 12,
        color: "var(--ink2)",
        lineHeight: 1.7,
      }}
    >
      Sign in as a landlord to create records from this modal.
    </div>
  );
}

export default function AppOverlays() {
  const router = useRouter();
  const { activeModal, closeModal, showToast, toasts } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();

  const [modalError, setModalError] = useState("");

  const [propertyForm, setPropertyForm] = useState({
    name: "",
    type: "RESIDENTIAL",
    address: "",
    city: "",
    state: "",
    totalFloors: "",
    description: "",
    amenities: ["24/7 Security", "Parking", "Generator", "Borehole"],
  });
  const [savingProperty, setSavingProperty] = useState(false);

  const [unitLookup, setUnitLookup] = useState<UnitLookupResponse | null>(null);
  const [unitForm, setUnitForm] = useState({
    propertyId: "",
    unitNumber: "",
    type: "",
    annualRent: "",
    leaseEnd: "",
    status: "VACANT",
  });
  const [savingUnit, setSavingUnit] = useState(false);

  const [invitationLookup, setInvitationLookup] =
    useState<TenantInvitationLookupResponse | null>(null);
  const [invitationForm, setInvitationForm] = useState({
    propertyId: "",
    unitId: "",
    email: "",
    inviteeName: "",
    agreementTemplateId: "",
    leaseStart: "",
    leaseEnd: "",
    annualRent: "",
    depositAmount: "",
    message: "",
  });
  const [savingInvitation, setSavingInvitation] = useState(false);

  const [agreementLookup, setAgreementLookup] =
    useState<AgreementsLookupResponse | null>(null);
  const [agreementForm, setAgreementForm] = useState({
    tenantId: "",
    propertyId: "",
    unitId: "",
    templateId: "",
    title: "",
    leaseStart: "",
    leaseEnd: "",
    annualRent: "",
    depositAmount: "",
    notes: "",
    sendNow: true,
  });
  const [savingAgreement, setSavingAgreement] = useState(false);

  const [templateForm, setTemplateForm] = useState<PayoutTemplateUploadForm>({
    name: "",
    description: "",
    fileName: "",
    mimeType: "",
    content: "",
    fileDataUrl: "",
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [agreementSignature, setAgreementSignature] = useState("");

  const filteredInviteUnits = useMemo(
    () =>
      (invitationLookup?.formOptions.vacantUnits ?? []).filter(
        (unit) => !invitationForm.propertyId || unit.propertyId === invitationForm.propertyId,
      ),
    [invitationForm.propertyId, invitationLookup?.formOptions.vacantUnits],
  );

  const filteredAgreementUnits = useMemo(
    () =>
      (agreementLookup?.formOptions.units ?? []).filter(
        (unit) => !agreementForm.propertyId || unit.propertyId === agreementForm.propertyId,
      ),
    [agreementForm.propertyId, agreementLookup?.formOptions.units],
  );

  const selectedAgreementTenant = useMemo(
    () =>
      (agreementLookup?.formOptions.tenants ?? []).find(
        (tenant) => tenant.id === agreementForm.tenantId,
      ),
    [agreementForm.tenantId, agreementLookup?.formOptions.tenants],
  );

  useEffect(() => {
    if (!selectedAgreementTenant) {
      return;
    }

    setAgreementForm((current) => ({
      ...current,
      propertyId: selectedAgreementTenant.propertyId,
      unitId: selectedAgreementTenant.unitId ?? "",
      title:
        current.title ||
        `Tenancy Agreement - ${
          selectedAgreementTenant.unit !== "—"
            ? selectedAgreementTenant.unit
            : selectedAgreementTenant.property
        }`,
      leaseStart: current.leaseStart || selectedAgreementTenant.leaseStart.slice(0, 10),
      leaseEnd: current.leaseEnd || selectedAgreementTenant.leaseEnd.slice(0, 10),
      annualRent:
        current.annualRent ||
        `${
          selectedAgreementTenant.annualRent ??
          (selectedAgreementTenant.monthlyRent ?? selectedAgreementTenant.rentAmount ?? 0) *
            12
        }`,
    }));
  }, [selectedAgreementTenant]);

  useEffect(() => {
    if (!activeModal || !landlordSession?.token) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

    async function loadLookupData() {
      try {
        if (activeModal === "add-unit") {
          const { data } = await apiRequest<UnitLookupResponse>("/landlord/units", {
            token: landlordToken,
          });
          if (!cancelled) {
            setUnitLookup(data);
          }
        }

        if (activeModal === "add-tenant") {
          const { data } = await apiRequest<TenantInvitationLookupResponse>(
            "/landlord/tenants/invitations",
            {
              token: landlordToken,
            },
          );
          if (!cancelled) {
            setInvitationLookup(data);
          }
        }

        if (activeModal === "add-agreement") {
          const { data } = await apiRequest<AgreementsLookupResponse>(
            "/landlord/agreements",
            {
              token: landlordToken,
            },
          );
          if (!cancelled) {
            setAgreementLookup(data);
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setModalError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load this form.",
          );
        }
      }
    }

    void loadLookupData();

    return () => {
      cancelled = true;
    };
  }, [activeModal, landlordSession?.token]);

  useEffect(() => {
    if (!activeModal) {
      setModalError("");
      setAgreementSignature("");
    }
  }, [activeModal]);

  function refreshCurrentPage() {
    void router.replace(router.asPath);
  }

  function resetPropertyForm() {
    setPropertyForm({
      name: "",
      type: "RESIDENTIAL",
      address: "",
      city: "",
      state: "",
      totalFloors: "",
      description: "",
      amenities: ["24/7 Security", "Parking", "Generator", "Borehole"],
    });
  }

  function resetUnitForm() {
    setUnitForm({
      propertyId: "",
      unitNumber: "",
      type: "",
      annualRent: "",
      leaseEnd: "",
      status: "VACANT",
    });
  }

  function resetInvitationForm() {
    setInvitationForm({
      propertyId: "",
      unitId: "",
      email: "",
      inviteeName: "",
      agreementTemplateId: "",
      leaseStart: "",
      leaseEnd: "",
      annualRent: "",
      depositAmount: "",
      message: "",
    });
  }

  function resetAgreementForm() {
    setAgreementForm({
      tenantId: "",
      propertyId: "",
      unitId: "",
      templateId: "",
      title: "",
      leaseStart: "",
      leaseEnd: "",
      annualRent: "",
      depositAmount: "",
      notes: "",
      sendNow: true,
    });
  }

  function resetTemplateForm() {
    setTemplateForm({
      name: "",
      description: "",
      fileName: "",
      mimeType: "",
      content: "",
      fileDataUrl: "",
    });
  }

  async function submitProperty() {
    if (!landlordSession?.token) {
      return;
    }

    setSavingProperty(true);
    setModalError("");

    try {
      await apiRequest("/landlord/properties", {
        method: "POST",
        token: landlordSession.token,
        body: {
          name: propertyForm.name,
          type: propertyForm.type,
          address: propertyForm.address,
          city: propertyForm.city,
          state: propertyForm.state,
          totalFloors: propertyForm.totalFloors
            ? Number(propertyForm.totalFloors)
            : undefined,
          description: propertyForm.description || undefined,
          amenities: propertyForm.amenities,
        },
      });

      closeModal();
      resetPropertyForm();
      refreshCurrentPage();
      showToast("Property created successfully", "success");
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : "We could not create this property.",
      );
    } finally {
      setSavingProperty(false);
    }
  }

  async function submitUnit() {
    if (!landlordSession?.token) {
      return;
    }

    if (!unitForm.propertyId) {
      setModalError("Select the property for this unit.");
      return;
    }

    if (!unitForm.unitNumber.trim()) {
      setModalError("Enter the unit number.");
      return;
    }

    if (!unitForm.type.trim()) {
      setModalError("Enter the unit type, for example 1 Bed, 2 Bed, Self Contain, or Shop.");
      return;
    }

    if (!unitForm.annualRent || Number(unitForm.annualRent) <= 0) {
      setModalError("Enter the yearly rent for this unit.");
      return;
    }

    setSavingUnit(true);
    setModalError("");

    try {
      await apiRequest("/landlord/units", {
        method: "POST",
        token: landlordSession.token,
        body: {
          propertyId: unitForm.propertyId,
          unitNumber: unitForm.unitNumber.trim(),
          type: unitForm.type.trim(),
          annualRent: Number(unitForm.annualRent),
          leaseEnd: unitForm.leaseEnd || undefined,
          status: unitForm.status,
        },
      });

      closeModal();
      resetUnitForm();
      refreshCurrentPage();
      showToast("Unit created successfully", "success");
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : "We could not create this unit.",
      );
    } finally {
      setSavingUnit(false);
    }
  }

  async function submitInvitation() {
    if (!landlordSession?.token) {
      return;
    }

    setSavingInvitation(true);
    setModalError("");

    try {
      const { data } = await apiRequest<InvitationCreateResponse>(
        "/landlord/tenants/invitations",
        {
          method: "POST",
          token: landlordSession.token,
          body: {
            propertyId: invitationForm.propertyId,
            unitId: invitationForm.unitId || undefined,
            email: invitationForm.email,
            inviteeName: invitationForm.inviteeName || undefined,
            agreementTemplateId: invitationForm.agreementTemplateId || undefined,
            leaseStart: invitationForm.leaseStart,
            leaseEnd: invitationForm.leaseEnd,
            annualRent: Number(invitationForm.annualRent),
            depositAmount: invitationForm.depositAmount
              ? Number(invitationForm.depositAmount)
              : undefined,
            message: invitationForm.message || undefined,
          },
        },
      );

      closeModal();
      resetInvitationForm();
      refreshCurrentPage();
      showToast(
        data.onboardingUrl
          ? "Onboarding invite email sent"
          : "Tenant invite created successfully",
        "success",
      );
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : "We could not send this invite.",
      );
    } finally {
      setSavingInvitation(false);
    }
  }

  async function submitAgreement() {
    if (!landlordSession?.token) {
      return;
    }

    setSavingAgreement(true);
    setModalError("");

    try {
      await apiRequest("/landlord/agreements", {
        method: "POST",
        token: landlordSession.token,
        body: {
          tenantId: agreementForm.tenantId,
          propertyId: agreementForm.propertyId,
          unitId: agreementForm.unitId || undefined,
          templateId: agreementForm.templateId || undefined,
          title: agreementForm.title,
          leaseStart: agreementForm.leaseStart,
          leaseEnd: agreementForm.leaseEnd,
          annualRent: Number(agreementForm.annualRent),
          depositAmount: agreementForm.depositAmount
            ? Number(agreementForm.depositAmount)
            : undefined,
          notes: agreementForm.notes || undefined,
          sendNow: agreementForm.sendNow,
        },
      });

      closeModal();
      resetAgreementForm();
      refreshCurrentPage();
      showToast("Agreement created successfully", "success");
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : "We could not create this agreement.",
      );
    } finally {
      setSavingAgreement(false);
    }
  }

  async function submitTemplate() {
    if (!landlordSession?.token) {
      return;
    }

    setSavingTemplate(true);
    setModalError("");

    try {
      await apiRequest("/landlord/agreements/templates", {
        method: "POST",
        token: landlordSession.token,
        body: {
          name: templateForm.name,
          description: templateForm.description || undefined,
          fileName: templateForm.fileName || undefined,
          mimeType: templateForm.mimeType || undefined,
          content: templateForm.content,
          fileDataUrl: templateForm.fileDataUrl || undefined,
        },
      });

      closeModal();
      resetTemplateForm();
      refreshCurrentPage();
      showToast("Agreement template uploaded successfully", "success");
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : "We could not upload this template.",
      );
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleTemplateFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const [fileDataUrl, content] = await Promise.all([
        readFileAsDataUrl(file),
        file.type.startsWith("text/") || /\.(txt|html?|md)$/i.test(file.name)
          ? readTextFile(file)
          : Promise.resolve(`Uploaded template file: ${file.name}`),
      ]);
      setTemplateForm((current) => ({
        ...current,
        fileName: file.name,
        mimeType: file.type || "text/plain",
        fileDataUrl,
        content,
        name: current.name || file.name.replace(/\.[^/.]+$/, ""),
      }));
      showToast("Template file loaded and ready for upload", "success");
    } catch (requestError) {
      setModalError(
        requestError instanceof Error
          ? requestError.message
          : "We could not load that template file.",
      );
    }
  }

  return (
    <>
      <ModalFrame
        modalId="add-property"
        size="modal-lg"
        title="Add New Property"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void submitProperty()}
              disabled={savingProperty || !landlordSession?.token}
            >
              {savingProperty ? "Creating..." : "Create Property"}
            </button>
          </>
        }
      >
        {!landlordSession?.token ? (
          <LandlordAccessHint />
        ) : (
          <>
            <FieldError message={activeModal === "add-property" ? modalError : ""} />
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Property Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Lekki Gardens Estate"
                  value={propertyForm.name}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Property Type *</label>
                <select
                  className="form-input"
                  value={propertyForm.type}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="MIXED_USE">Mixed Use</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Full Address *</label>
              <input
                className="form-input"
                placeholder="Street address"
                value={propertyForm.address}
                onChange={(event) =>
                  setPropertyForm((current) => ({ ...current, address: event.target.value }))
                }
              />
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  className="form-input"
                  placeholder="Lagos"
                  value={propertyForm.city}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, city: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <input
                  className="form-input"
                  placeholder="Lagos State"
                  value={propertyForm.state}
                  onChange={(event) =>
                    setPropertyForm((current) => ({ ...current, state: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total Floors</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 4"
                  value={propertyForm.totalFloors}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      totalFloors: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                placeholder="Brief description of the property..."
                value={propertyForm.description}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amenities</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {amenityOptions.map((amenity) => {
                  const checked = propertyForm.amenities.includes(amenity);

                  return (
                    <label
                      key={amenity}
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setPropertyForm((current) => ({
                            ...current,
                            amenities: event.target.checked
                              ? [...current.amenities, amenity]
                              : current.amenities.filter((item) => item !== amenity),
                          }))
                        }
                      />{" "}
                      {amenity}
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </ModalFrame>

      <ModalFrame
        modalId="add-unit"
        size="modal-lg"
        title="Add New Unit"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void submitUnit()}
              disabled={savingUnit || !landlordSession?.token}
            >
              {savingUnit ? "Creating..." : "Create Unit"}
            </button>
          </>
        }
      >
        {!landlordSession?.token ? (
          <LandlordAccessHint />
        ) : (
          <>
            <FieldError message={activeModal === "add-unit" ? modalError : ""} />
            <div className="form-group">
              <label className="form-label">Property *</label>
              <select
                className="form-input"
                value={unitForm.propertyId}
                onChange={(event) =>
                  setUnitForm((current) => ({ ...current, propertyId: event.target.value }))
                }
              >
                <option value="">Select property</option>
                {(unitLookup?.filters.properties ?? []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Unit Number *</label>
                <input
                  className="form-input"
                  placeholder="A3"
                  value={unitForm.unitNumber}
                  onChange={(event) =>
                    setUnitForm((current) => ({ ...current, unitNumber: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Type *</label>
                <input
                  className="form-input"
                  placeholder="e.g. 2 Bed, Self Contain, Shop"
                  value={unitForm.type}
                  onChange={(event) =>
                    setUnitForm((current) => ({ ...current, type: event.target.value }))
                  }
                />
                <div className="td-muted" style={{ marginTop: 6 }}>
                  You can use short labels like 1 Bed, 2 Bed, 3 Bed, Shop, or Office.
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Yearly Rent (₦) *</label>
                <input
                  className="form-input"
                  type="number"
                  value={unitForm.annualRent}
                  onChange={(event) =>
                    setUnitForm((current) => ({ ...current, annualRent: event.target.value }))
                  }
                />
                {unitForm.annualRent ? (
                  <div className="td-muted" style={{ marginTop: 6 }}>
                    Monthly equivalent: ₦{calculateMonthlyEquivalent(unitForm.annualRent)}
                  </div>
                ) : null}
              </div>
              <div className="form-group">
                <label className="form-label">Lease End</label>
                <input
                  className="form-input"
                  type="date"
                  value={unitForm.leaseEnd}
                  onChange={(event) =>
                    setUnitForm((current) => ({ ...current, leaseEnd: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={unitForm.status}
                onChange={(event) =>
                  setUnitForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="VACANT">Vacant</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="EXPIRING">Expiring</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </>
        )}
      </ModalFrame>

      <ModalFrame
        modalId="add-tenant"
        size="modal-lg"
        title="Invite Tenant"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void submitInvitation()}
              disabled={savingInvitation || !landlordSession?.token}
            >
              {savingInvitation ? "Sending..." : "Send Invite"}
            </button>
          </>
        }
      >
        {!landlordSession?.token ? (
          <LandlordAccessHint />
        ) : (
          <>
            <FieldError message={activeModal === "add-tenant" ? modalError : ""} />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Invite Recipient
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tenant Full Name</label>
                  <input
                    className="form-input"
                    placeholder="Amina James"
                    value={invitationForm.inviteeName}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        inviteeName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="tenant@email.com"
                    value={invitationForm.email}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Agreement Template</label>
                  <select
                    className="form-input"
                    value={invitationForm.agreementTemplateId}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        agreementTemplateId: event.target.value,
                      }))
                    }
                  >
                    <option value="">No template selected</option>
                    {(invitationLookup?.formOptions.templates ?? []).map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Custom Message</label>
                  <input
                    className="form-input"
                    value={invitationForm.message}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Optional note to the tenant"
                  />
                </div>
              </div>
            </div>
            <div className="form-divider" />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Property, Unit & Lease
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Property *</label>
                  <select
                    className="form-input"
                    value={invitationForm.propertyId}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        propertyId: event.target.value,
                        unitId: "",
                      }))
                    }
                  >
                    <option value="">Select property</option>
                    {(invitationLookup?.formOptions.properties ?? []).map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select
                    className="form-input"
                    value={invitationForm.unitId}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        unitId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select unit</option>
                    {filteredInviteUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lease Start Date *</label>
                  <input
                    className="form-input"
                    type="date"
                    value={invitationForm.leaseStart}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        leaseStart: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lease End Date *</label>
                  <input
                    className="form-input"
                    type="date"
                    value={invitationForm.leaseEnd}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        leaseEnd: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Yearly Rent (₦) *</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="2160000"
                    value={invitationForm.annualRent}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        annualRent: event.target.value,
                      }))
                    }
                  />
                  {invitationForm.annualRent ? (
                    <div className="td-muted" style={{ marginTop: 6 }}>
                      Monthly equivalent: ₦{calculateMonthlyEquivalent(invitationForm.annualRent)}
                    </div>
                  ) : null}
                </div>
                <div className="form-group">
                  <label className="form-label">Deposit Amount (₦)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="360000"
                    value={invitationForm.depositAmount}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        depositAmount: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="form-divider" />
            <div
              style={{
                padding: 14,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg)",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                Tenant completes the rest
              </div>
              <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.7 }}>
                The tenant will open the onboarding link from their email, upload their ID, provide their guarantor&apos;s full name, job, workplace, phone, email, and relationship, then both the tenant and guarantor will sign before submission.
              </div>
            </div>
          </>
        )}
      </ModalFrame>

      <ModalFrame
        modalId="add-agreement"
        size="modal-lg"
        title="Create Agreement"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void submitAgreement()}
              disabled={savingAgreement || !landlordSession?.token}
            >
              {savingAgreement ? "Creating..." : "Create Agreement"}
            </button>
          </>
        }
      >
        {!landlordSession?.token ? (
          <LandlordAccessHint />
        ) : (
          <>
            <FieldError message={activeModal === "add-agreement" ? modalError : ""} />
            <div className="form-group">
              <label className="form-label">Tenant *</label>
              <select
                className="form-input"
                value={agreementForm.tenantId}
                onChange={(event) =>
                  setAgreementForm((current) => ({
                    ...current,
                    tenantId: event.target.value,
                    title: "",
                    leaseStart: "",
                    leaseEnd: "",
                    annualRent: "",
                  }))
                }
              >
                <option value="">Select tenant</option>
                {(agreementLookup?.formOptions.tenants ?? []).map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} — {tenant.property} / {tenant.unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Property *</label>
                <select
                  className="form-input"
                  value={agreementForm.propertyId}
                  onChange={(event) =>
                    setAgreementForm((current) => ({
                      ...current,
                      propertyId: event.target.value,
                      unitId: "",
                    }))
                  }
                >
                  <option value="">Select property</option>
                  {(agreementLookup?.formOptions.properties ?? []).map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select
                  className="form-input"
                  value={agreementForm.unitId}
                  onChange={(event) =>
                    setAgreementForm((current) => ({ ...current, unitId: event.target.value }))
                  }
                >
                  <option value="">No unit selected</option>
                  {filteredAgreementUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Agreement Title *</label>
                <input
                  className="form-input"
                  value={agreementForm.title}
                  onChange={(event) =>
                    setAgreementForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Template</label>
                <select
                  className="form-input"
                  value={agreementForm.templateId}
                  onChange={(event) =>
                    setAgreementForm((current) => ({
                      ...current,
                      templateId: event.target.value,
                    }))
                  }
                >
                  <option value="">Custom template</option>
                  {(agreementLookup?.formOptions.templates ?? []).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Lease Start *</label>
                <input
                  className="form-input"
                  type="date"
                  value={agreementForm.leaseStart}
                  onChange={(event) =>
                    setAgreementForm((current) => ({
                      ...current,
                      leaseStart: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lease End *</label>
                <input
                  className="form-input"
                  type="date"
                  value={agreementForm.leaseEnd}
                  onChange={(event) =>
                    setAgreementForm((current) => ({
                      ...current,
                      leaseEnd: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Yearly Rent (₦) *</label>
                <input
                  className="form-input"
                  type="number"
                  value={agreementForm.annualRent}
                  onChange={(event) =>
                    setAgreementForm((current) => ({
                      ...current,
                      annualRent: event.target.value,
                    }))
                  }
                />
                {agreementForm.annualRent ? (
                  <div className="td-muted" style={{ marginTop: 6 }}>
                    Monthly equivalent: ₦{calculateMonthlyEquivalent(agreementForm.annualRent)}
                  </div>
                ) : null}
              </div>
              <div className="form-group">
                <label className="form-label">Deposit Amount (₦)</label>
                <input
                  className="form-input"
                  type="number"
                  value={agreementForm.depositAmount}
                  onChange={(event) =>
                    setAgreementForm((current) => ({
                      ...current,
                      depositAmount: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                value={agreementForm.notes}
                onChange={(event) =>
                  setAgreementForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
            <div className="checkbox-wrap">
              <input
                type="checkbox"
                id="send-agreement-now"
                checked={agreementForm.sendNow}
                onChange={(event) =>
                  setAgreementForm((current) => ({
                    ...current,
                    sendNow: event.target.checked,
                  }))
                }
              />
              <label htmlFor="send-agreement-now">Send agreement to tenant immediately</label>
            </div>
          </>
        )}
      </ModalFrame>

      <ModalFrame
        modalId="upload-template"
        size="modal-lg"
        title="Upload Agreement Template"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void submitTemplate()}
              disabled={savingTemplate || !landlordSession?.token}
            >
              {savingTemplate ? "Uploading..." : "Upload Template"}
            </button>
          </>
        }
      >
        {!landlordSession?.token ? (
          <LandlordAccessHint />
        ) : (
          <>
            <FieldError message={activeModal === "upload-template" ? modalError : ""} />
            <div className="form-group">
              <label className="form-label">Template Name *</label>
              <input
                className="form-input"
                value={templateForm.name}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                value={templateForm.description}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Upload File</label>
              <input className="form-input" type="file" onChange={handleTemplateFileUpload} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">File Name</label>
                <input
                  className="form-input"
                  value={templateForm.fileName}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      fileName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mime Type</label>
                <input
                  className="form-input"
                  value={templateForm.mimeType}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      mimeType: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Template Content *</label>
              <textarea
                className="form-input"
                style={{ minHeight: 180 }}
                value={templateForm.content}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, content: event.target.value }))
                }
              />
            </div>
          </>
        )}
      </ModalFrame>

      <ModalFrame
        modalId="send-notice"
        title="Send Notice"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                closeModal();
                showToast("Notice sent to 24 tenants", "success");
              }}
            >
              Send Notice
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Notice Type *</label>
          <select className="form-input" defaultValue="Rent Increase Notice">
            <option>Rent Increase Notice</option>
            <option>Vacate Notice</option>
            <option>General Announcement</option>
            <option>Maintenance Notice</option>
            <option>Rent Reminder</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Recipients *</label>
          <select className="form-input" defaultValue="All Tenants (24)">
            <option>All Tenants (24)</option>
            <option>Lekki Gardens — All Tenants (8)</option>
            <option>VI Towers — All Tenants (9)</option>
            <option>Specific Tenant…</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Subject *</label>
          <input className="form-input" defaultValue="Rent Increase Notice — Q3 2026" />
        </div>
        <div className="form-group">
          <label className="form-label">Message *</label>
          <textarea
            className="form-input"
            style={{ minHeight: 120 }}
            defaultValue={`Dear Tenant,

We wish to inform you that effective from July 1, 2026, your annual rent will be adjusted in line with current market rates. A monthly equivalent breakdown will be shared for planning purposes.
Please contact us if you have any questions.

DoorRent Property Management`}
          />
        </div>
      </ModalFrame>

      <ModalFrame
        modalId="sign-agreement"
        size="modal-lg"
        title="Review & Sign Agreement"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                closeModal();
                showToast("Agreement signed successfully", "success");
              }}
              disabled={!agreementSignature}
            >
              Sign Agreement
            </button>
          </>
        }
      >
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, marginBottom: 20, fontSize: 13, lineHeight: 1.8, maxHeight: 280, overflowY: "auto" }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, textAlign: "center" }}>TENANCY AGREEMENT</div>
          <p>This Tenancy Agreement is entered into on <strong>April 1, 2026</strong>, between <strong>Babatunde Adeyemi</strong> (&quot;Landlord&quot;) and <strong>Amaka Obi</strong> (&quot;Tenant&quot;).</p>
          <br />
          <p><strong>1. PROPERTY:</strong> The Landlord agrees to let and the Tenant agrees to take on tenancy the property known as Unit A3, Lekki Gardens Estate, Lekki Phase 1, Lagos.</p>
          <br />
          <p><strong>2. TERM:</strong> The tenancy shall commence on April 1, 2026 and expire on March 31, 2027 (12 months).</p>
          <br />
          <p><strong>3. RENT:</strong> The Tenant shall pay an annual rent of ₦1,800,000 for the tenancy term, with a monthly equivalent of ₦150,000 for reference only.</p>
        </div>
        <div className="form-group">
          <label className="form-label">Your Signature *</label>
          <SignaturePad onChange={setAgreementSignature} />
        </div>
      </ModalFrame>

      <ModalFrame
        modalId="notifications"
        title="Notifications"
        footer={
          <div className="card-footer" style={{ width: "100%", padding: 0, border: "none", background: "transparent" }}>
            <span style={{ fontSize: 12, color: "var(--ink3)" }}>5 notifications</span>
            <button type="button" className="btn btn-ghost btn-xs">
              Mark all read
            </button>
          </div>
        }
      >
        <div style={{ padding: 0 }}>
          <div className="timeline" style={{ padding: "0 20px" }}>
            {[
              ["var(--red)", "Tunde Adeola — Rent Overdue", "₦150,000 rent is 21 days overdue on Unit B1, Lekki Gardens", "2h ago"],
              ["var(--amber)", "Emeka Nwosu — Lease Expiring", "Lease expires in 25 days. Send renewal notice.", "5h ago"],
              ["var(--green)", "Payment Received — Chidinma Eze", "₦320,000 received for Unit 5A, Ikoyi Residences", "1d ago"],
              ["var(--accent)", "Agreement Signed — Kelechi Dike", "Tenancy agreement for Unit 3B has been signed", "2d ago"],
              ["var(--accent)", "New Tenant Portal Access", "Ngozi Adichie activated their tenant portal account", "3d ago"],
            ].map(([color, title, description, time]) => (
              <div key={`${title}-${time}`} className="timeline-item">
                <div className="timeline-dot" style={{ background: color }} />
                <div className="timeline-content">
                  <div className="timeline-title">{title}</div>
                  <div className="timeline-desc">{description}</div>
                </div>
                <div className="timeline-time">{time}</div>
              </div>
            ))}
          </div>
        </div>
      </ModalFrame>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone === "default" ? "" : toast.tone}`.trim()}>
            <span style={{ fontSize: 16 }}>
              {toast.tone === "success" ? "✓" : toast.tone === "error" ? "✕" : toast.tone === "info" ? "ℹ" : "·"}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
