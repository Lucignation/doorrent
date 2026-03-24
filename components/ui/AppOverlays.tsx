import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
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
import type { ModalId } from "../../types/app";
import type { AgreementPrintData } from "../../lib/agreement-print";
import { printAgreementDocument } from "../../lib/agreement-print";
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
        email?: string;
        phone?: string | null;
        propertyId: string;
        property: string;
        unitId?: string | null;
        unit: string;
        billingFrequency?: string;
        billingSchedule?: string;
        billingCyclePrice?: number;
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

interface NotificationModalItem {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: "green" | "amber" | "red" | "blue";
  href?: string;
}

interface NotificationModalResponse {
  summary: {
    total: number;
    unread: number;
  };
  items: NotificationModalItem[];
}

const amenityOptions = [
  "24/7 Security",
  "Parking",
  "Swimming Pool",
  "Generator",
  "Gym",
  "Borehole",
];

function pricingHelperText(value: string, frequency: BillingFrequency) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "—";
  }

  return `${formatBillingSchedule(parsed, frequency)} · Annual equivalent ${formatNaira(
    annualEquivalentFromBilling(parsed, frequency),
  )} · Monthly equivalent ${formatNaira(
    monthlyEquivalentFromBilling(parsed, frequency),
  )}`;
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
  const { activeModal, closeModal, refreshData, showToast, toasts } = usePrototypeUI();
  const { landlordSession, tenantSession, caretakerSession } = useLandlordPortalSession();

  const [modalError, setModalError] = useState("");
  const [notificationData, setNotificationData] =
    useState<NotificationModalResponse | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

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
    billingFrequency: "yearly" as BillingFrequency,
    billingCyclePrice: "",
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
    billingFrequency: "yearly" as BillingFrequency,
    billingCyclePrice: "",
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
    billingFrequency: "yearly" as BillingFrequency,
    billingCyclePrice: "",
    depositAmount: "",
    serviceCharge: "",
    noticePeriodDays: "30",
    utilities: "",
    permittedUse: "Residential dwelling only",
    specialConditions: "",
    guarantorName: "",
    guarantorPhone: "",
    guarantorEmail: "",
    guarantorRelationship: "",
    guarantorOccupation: "",
    guarantorCompany: "",
    guarantorAddress: "",
    notes: "",
    sendNow: true,
  });
  const [agreementStep, setAgreementStep] = useState(1);
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

  const notificationConfig = useMemo(() => {
    if (router.pathname.startsWith("/tenant")) {
      return {
        path: "/tenant/notifications",
        token: tenantSession?.token ?? "",
        emptyMessage: "No notifications yet.",
      };
    }

    if (router.pathname.startsWith("/caretaker")) {
      return {
        path: "/caretaker/notifications",
        token: caretakerSession?.token ?? "",
        emptyMessage: "No notifications yet.",
      };
    }

    if (router.pathname.startsWith("/landlord")) {
      return {
        path: "/landlord/notifications",
        token: landlordSession?.token ?? "",
        emptyMessage: "No notifications yet.",
      };
    }

    return {
      path: "",
      token: "",
      emptyMessage: "Notifications are not available here yet.",
    };
  }, [
    caretakerSession?.token,
    landlordSession?.token,
    router.pathname,
    tenantSession?.token,
  ]);

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
      billingFrequency:
        (selectedAgreementTenant.billingFrequency?.toLowerCase() as BillingFrequency) ??
        current.billingFrequency,
      title:
        current.title ||
        `Tenancy Agreement - ${
          selectedAgreementTenant.unit !== "—"
            ? selectedAgreementTenant.unit
            : selectedAgreementTenant.property
        }`,
      leaseStart: current.leaseStart || selectedAgreementTenant.leaseStart.slice(0, 10),
      leaseEnd: current.leaseEnd || selectedAgreementTenant.leaseEnd.slice(0, 10),
      billingCyclePrice:
        current.billingCyclePrice ||
        `${selectedAgreementTenant.billingCyclePrice ?? selectedAgreementTenant.annualRent ?? selectedAgreementTenant.monthlyRent ?? selectedAgreementTenant.rentAmount ?? 0}`,
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

  useEffect(() => {
    if (activeModal !== "notifications") {
      return;
    }

    if (!notificationConfig.path || !notificationConfig.token) {
      setNotificationData({
        summary: {
          total: 0,
          unread: 0,
        },
        items: [],
      });
      setNotificationError(
        notificationConfig.path ? "Sign in again to view notifications." : "",
      );
      setNotificationLoading(false);
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      setNotificationLoading(true);
      setNotificationError("");

      try {
        const { data } = await apiRequest<NotificationModalResponse>(
          notificationConfig.path,
          {
            token: notificationConfig.token,
          },
        );

        if (!cancelled) {
          setNotificationData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setNotificationError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load notifications.",
          );
          setNotificationData(null);
        }
      } finally {
        if (!cancelled) {
          setNotificationLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [activeModal, notificationConfig]);

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
      billingFrequency: "yearly",
      billingCyclePrice: "",
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
      billingFrequency: "yearly",
      billingCyclePrice: "",
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
      billingFrequency: "yearly",
      billingCyclePrice: "",
      depositAmount: "",
      serviceCharge: "",
      noticePeriodDays: "30",
      utilities: "",
      permittedUse: "Residential dwelling only",
      specialConditions: "",
      guarantorName: "",
      guarantorPhone: "",
      guarantorEmail: "",
      guarantorRelationship: "",
      guarantorOccupation: "",
      guarantorCompany: "",
      guarantorAddress: "",
      notes: "",
      sendNow: true,
    });
    setAgreementStep(1);
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

  function notificationToneColor(tone: NotificationModalItem["tone"]) {
    if (tone === "red") {
      return "var(--red)";
    }

    if (tone === "amber") {
      return "var(--amber)";
    }

    if (tone === "blue") {
      return "var(--blue)";
    }

    return "var(--green)";
  }

  function markAllNotificationsRead() {
    setNotificationData((current) =>
      current
        ? {
            ...current,
            summary: {
              ...current.summary,
              unread: 0,
            },
          }
        : current,
    );
    showToast("Notifications marked as read", "success");
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
      refreshData();
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

    if (!unitForm.billingCyclePrice || Number(unitForm.billingCyclePrice) <= 0) {
      setModalError("Enter the rent amount for this billing cycle.");
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
          billingFrequency: unitForm.billingFrequency.toUpperCase(),
          billingCyclePrice: Number(unitForm.billingCyclePrice),
          leaseEnd: unitForm.leaseEnd || undefined,
          status: unitForm.status,
        },
      });

      closeModal();
      resetUnitForm();
      refreshData();
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

    if (!invitationForm.billingCyclePrice || Number(invitationForm.billingCyclePrice) <= 0) {
      setModalError("Enter the rent amount for this tenant invitation.");
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
            billingFrequency: invitationForm.billingFrequency.toUpperCase(),
            billingCyclePrice: Number(invitationForm.billingCyclePrice),
            depositAmount: invitationForm.depositAmount
              ? Number(invitationForm.depositAmount)
              : undefined,
            message: invitationForm.message || undefined,
          },
        },
      );

      closeModal();
      resetInvitationForm();
      refreshData();
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

    if (!agreementForm.tenantId) {
      setModalError("Select a tenant.");
      setAgreementStep(1);
      return;
    }
    if (!agreementForm.propertyId) {
      setModalError("Select a property.");
      setAgreementStep(1);
      return;
    }
    if (!agreementForm.leaseStart || !agreementForm.leaseEnd) {
      setModalError("Enter the lease start and end dates.");
      setAgreementStep(2);
      return;
    }
    if (!agreementForm.billingCyclePrice || Number(agreementForm.billingCyclePrice) <= 0) {
      setModalError("Enter the rent amount.");
      setAgreementStep(2);
      return;
    }

    setSavingAgreement(true);
    setModalError("");

    // Pack extra fields into structured notes JSON
    const extras: Record<string, unknown> = {};
    if (agreementForm.guarantorName) {
      extras.guarantor = {
        name: agreementForm.guarantorName,
        phone: agreementForm.guarantorPhone || null,
        email: agreementForm.guarantorEmail || null,
        relationship: agreementForm.guarantorRelationship || null,
        occupation: agreementForm.guarantorOccupation || null,
        company: agreementForm.guarantorCompany || null,
        address: agreementForm.guarantorAddress || null,
      };
    }
    extras.conditions = {
      noticePeriodDays: Number(agreementForm.noticePeriodDays) || 30,
      utilities: agreementForm.utilities || null,
      permittedUse: agreementForm.permittedUse || "Residential dwelling only",
      specialConditions: agreementForm.specialConditions || null,
    };
    if (agreementForm.serviceCharge) {
      extras.serviceCharge = Number(agreementForm.serviceCharge);
    }
    if (agreementForm.notes) {
      extras.notes = agreementForm.notes;
    }
    const notesPayload = JSON.stringify(extras);

    try {
      const { data: createdAgreement } = await apiRequest<Record<string, any>>("/landlord/agreements", {
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
          billingFrequency: agreementForm.billingFrequency.toUpperCase(),
          billingCyclePrice: Number(agreementForm.billingCyclePrice),
          depositAmount: agreementForm.depositAmount
            ? Number(agreementForm.depositAmount)
            : undefined,
          notes: notesPayload,
          sendNow: agreementForm.sendNow,
        },
      });

      closeModal();
      resetAgreementForm();
      refreshData();
      showToast("Agreement created — opening document preview.", "success");

      // Open the print document immediately
      if (createdAgreement) {
        setTimeout(() => {
          printAgreementDocument({
            agreementRef: createdAgreement.id as string,
            generatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            landlord: {
              companyName: createdAgreement.landlordCompanyName as string ?? "",
              name: createdAgreement.landlordName as string ?? "",
              email: createdAgreement.landlordEmail as string ?? "",
              phone: createdAgreement.landlordPhone as string ?? null,
            },
            tenant: {
              name: createdAgreement.tenant as string ?? "",
              email: createdAgreement.tenantEmail as string ?? "",
              phone: createdAgreement.tenantPhone as string ?? null,
              residentialAddress: createdAgreement.tenantResidentialAddress as string ?? null,
              idType: createdAgreement.tenantIdType as string ?? null,
              idNumber: createdAgreement.tenantIdNumber as string ?? null,
            },
            premises: {
              propertyName: createdAgreement.property as string ?? "",
              address: createdAgreement.propertyAddress as string ?? "",
              unitNumber: createdAgreement.unitNumber as string ?? null,
            },
            lease: {
              title: createdAgreement.title as string ?? "",
              startDate: createdAgreement.leaseStartIso as string ?? "",
              endDate: createdAgreement.leaseEndIso as string ?? "",
            },
            financial: {
              annualRent: createdAgreement.annualRent as number ?? 0,
              billingFrequency: createdAgreement.billingFrequency as string ?? "",
              billingFrequencyLabel: createdAgreement.billingFrequencyLabel as string ?? "",
              billingCyclePrice: createdAgreement.billingCyclePrice as number ?? 0,
              billingSchedule: createdAgreement.billingSchedule as string ?? "",
              depositAmount: createdAgreement.depositAmount as number ?? null,
              serviceCharge: createdAgreement.serviceCharge as number ?? null,
            },
            guarantor: createdAgreement.guarantor as AgreementPrintData["guarantor"] ?? null,
            conditions: createdAgreement.conditions as AgreementPrintData["conditions"] ?? null,
            notes: createdAgreement.notes as string ?? null,
            templateName: createdAgreement.template as string ?? null,
          });
        }, 400);
      }
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
      refreshData();
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
                <label className="form-label">Billing Frequency *</label>
                <select
                  className="form-input"
                  value={unitForm.billingFrequency}
                  onChange={(event) =>
                    setUnitForm((current) => ({
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
                  value={unitForm.billingCyclePrice}
                  onChange={(event) =>
                    setUnitForm((current) => ({
                      ...current,
                      billingCyclePrice: event.target.value,
                    }))
                  }
                />
                {unitForm.billingCyclePrice ? (
                  <div className="td-muted" style={{ marginTop: 6 }}>
                    {pricingHelperText(
                      unitForm.billingCyclePrice,
                      unitForm.billingFrequency,
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="form-row">
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
                <div className="td-muted" style={{ marginTop: 6 }}>
                  Once the unit is created, DoorRent will use the lease end date and rent
                  activity to handle future status changes automatically.
                </div>
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
                <option value="OVERDUE">Lease Expired</option>
              </select>
              <div className="td-muted" style={{ marginTop: 6 }}>
                This is only for the initial setup. After creation, landlords can no longer
                change the unit status manually.
              </div>
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
                  <label className="form-label">Billing Frequency *</label>
                  <select
                    className="form-input"
                    value={invitationForm.billingFrequency}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
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
                    placeholder="2160000"
                    value={invitationForm.billingCyclePrice}
                    onChange={(event) =>
                      setInvitationForm((current) => ({
                        ...current,
                        billingCyclePrice: event.target.value,
                      }))
                    }
                  />
                  {invitationForm.billingCyclePrice ? (
                    <div className="td-muted" style={{ marginTop: 6 }}>
                      {pricingHelperText(
                        invitationForm.billingCyclePrice,
                        invitationForm.billingFrequency,
                      )}
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
              <div style={{ fontSize: 12, color: "var(--amber)", lineHeight: 1.7, marginTop: 10 }}>
                DoorRent will block duplicate onboarding if the same tenant already has an
                existing or expired lease on this property and unit within the last 4 years.
              </div>
            </div>
          </>
        )}
      </ModalFrame>

      <ModalFrame
        modalId="add-agreement"
        size="modal-xl"
        title="Create Tenancy Agreement"
        footer={
          !landlordSession?.token ? null : (
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--ink2)", fontFamily: "Arial, sans-serif" }}>
                Step {agreementStep} of 4
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {agreementStep > 1 ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setAgreementStep((s) => s - 1)}>
                    ← Back
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                )}
                {agreementStep < 4 ? (
                  <button type="button" className="btn btn-primary" onClick={() => setAgreementStep((s) => s + 1)}>
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void submitAgreement()}
                    disabled={savingAgreement}
                  >
                    {savingAgreement ? "Creating..." : "Create & Preview Agreement"}
                  </button>
                )}
              </div>
            </div>
          )
        }
      >
        {!landlordSession?.token ? (
          <LandlordAccessHint />
        ) : (
          <>
            {/* Step indicator */}
            <div style={{ display: "flex", gap: 0, marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
              {["1. Parties & Premises", "2. Financial Terms", "3. Conditions", "4. Guarantor"].map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAgreementStep(idx + 1)}
                  style={{
                    flex: 1, padding: "10px 6px", border: "none", borderRight: idx < 3 ? "1px solid var(--border)" : "none",
                    background: agreementStep === idx + 1 ? "var(--accent, #1a3a2a)" : agreementStep > idx + 1 ? "var(--surface2, #f0eeea)" : "var(--surface, #fff)",
                    color: agreementStep === idx + 1 ? "#fff" : agreementStep > idx + 1 ? "var(--ink2)" : "var(--ink2)",
                    fontSize: 12, fontWeight: agreementStep === idx + 1 ? 700 : 500, cursor: "pointer",
                    fontFamily: "Arial, sans-serif", letterSpacing: "0.01em",
                  }}
                >
                  {agreementStep > idx + 1 ? "✓ " : ""}{label}
                </button>
              ))}
            </div>

            <FieldError message={activeModal === "add-agreement" ? modalError : ""} />

            {/* ─── STEP 1: PARTIES & PREMISES ─── */}
            {agreementStep === 1 && (
              <>
                <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Parties & Premises</div>
                  <div style={{ fontSize: 12, color: "var(--ink2)" }}>Select the tenant and property for this agreement.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tenant *</label>
                  <select
                    className="form-input"
                    value={agreementForm.tenantId}
                    onChange={(event) =>
                      setAgreementForm((current) => ({
                        ...current,
                        tenantId: event.target.value,
                        propertyId: (agreementLookup?.formOptions.tenants ?? []).find((t) => t.id === event.target.value)?.propertyId ?? current.propertyId,
                        title: "",
                        leaseStart: "",
                        leaseEnd: "",
                        billingCyclePrice: "",
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
                {selectedAgreementTenant && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 14, fontSize: 12 }}>
                    <div><div style={{ color: "var(--ink2)", marginBottom: 2 }}>Email</div><strong>{selectedAgreementTenant.email}</strong></div>
                    <div><div style={{ color: "var(--ink2)", marginBottom: 2 }}>Phone</div><strong>{selectedAgreementTenant.phone ?? "—"}</strong></div>
                    <div><div style={{ color: "var(--ink2)", marginBottom: 2 }}>Current Lease</div><strong>{selectedAgreementTenant.leaseStart} → {selectedAgreementTenant.leaseEnd ?? "—"}</strong></div>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Property *</label>
                    <select
                      className="form-input"
                      value={agreementForm.propertyId}
                      onChange={(event) =>
                        setAgreementForm((current) => ({ ...current, propertyId: event.target.value, unitId: "" }))
                      }
                    >
                      <option value="">Select property</option>
                      {(agreementLookup?.formOptions.properties ?? []).map((property) => (
                        <option key={property.id} value={property.id}>{property.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select
                      className="form-input"
                      value={agreementForm.unitId}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, unitId: event.target.value }))}
                    >
                      <option value="">No specific unit</option>
                      {filteredAgreementUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Agreement Title *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Residential Tenancy Agreement — Unit 4B"
                      value={agreementForm.title}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Template</label>
                    <select
                      className="form-input"
                      value={agreementForm.templateId}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, templateId: event.target.value }))}
                    >
                      <option value="">Standard Agreement</option>
                      {(agreementLookup?.formOptions.templates ?? []).map((template) => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ─── STEP 2: FINANCIAL TERMS ─── */}
            {agreementStep === 2 && (
              <>
                <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Financial Terms</div>
                  <div style={{ fontSize: 12, color: "var(--ink2)" }}>Define the rent, deposit, and tenancy period.</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Lease Start *</label>
                    <input className="form-input" type="date" value={agreementForm.leaseStart}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, leaseStart: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lease End *</label>
                    <input className="form-input" type="date" value={agreementForm.leaseEnd}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, leaseEnd: event.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Frequency *</label>
                    <select className="form-input" value={agreementForm.billingFrequency}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, billingFrequency: event.target.value as BillingFrequency }))}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly (Annual)</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rent Per Payment Cycle (₦) *</label>
                    <input className="form-input" type="number" placeholder="e.g. 1200000"
                      value={agreementForm.billingCyclePrice}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, billingCyclePrice: event.target.value }))} />
                    {agreementForm.billingCyclePrice ? (
                      <div className="td-muted" style={{ marginTop: 6, fontSize: 12 }}>
                        {pricingHelperText(agreementForm.billingCyclePrice, agreementForm.billingFrequency)}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Security Deposit (₦)</label>
                    <input className="form-input" type="number" placeholder="e.g. 1200000"
                      value={agreementForm.depositAmount}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, depositAmount: event.target.value }))} />
                    <div className="td-muted" style={{ marginTop: 4, fontSize: 11 }}>Held as security. Refunded within 30 days of vacation less deductions.</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Annual Service Charge (₦)</label>
                    <input className="form-input" type="number" placeholder="Optional — estate/building levy"
                      value={agreementForm.serviceCharge}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, serviceCharge: event.target.value }))} />
                  </div>
                </div>
                <div className="checkbox-wrap">
                  <input type="checkbox" id="send-agreement-now" checked={agreementForm.sendNow}
                    onChange={(event) => setAgreementForm((current) => ({ ...current, sendNow: event.target.checked }))} />
                  <label htmlFor="send-agreement-now">Mark as sent to tenant immediately</label>
                </div>
              </>
            )}

            {/* ─── STEP 3: CONDITIONS ─── */}
            {agreementStep === 3 && (
              <>
                <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Conditions & Legal Terms</div>
                  <div style={{ fontSize: 12, color: "var(--ink2)" }}>Configure notice period, utility arrangements, and any special conditions.</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Notice Period (days)</label>
                    <input className="form-input" type="number" value={agreementForm.noticePeriodDays}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, noticePeriodDays: event.target.value }))} />
                    <div className="td-muted" style={{ marginTop: 4, fontSize: 11 }}>Minimum notice either party must give before terminating or not renewing.</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Permitted Use</label>
                    <input className="form-input" value={agreementForm.permittedUse}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, permittedUse: event.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Utility Responsibilities (one per line)</label>
                  <textarea className="form-input" rows={4}
                    placeholder={"Electricity (Tenant manages own meter)\nWater (monthly estate levy)\nGenerator fuel (shared, 1/N share)\nInternet and cable TV"}
                    value={agreementForm.utilities}
                    onChange={(event) => setAgreementForm((current) => ({ ...current, utilities: event.target.value }))} />
                  <div className="td-muted" style={{ marginTop: 4, fontSize: 11 }}>Leave blank to use the standard utility clause.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Special Conditions</label>
                  <textarea className="form-input" rows={5}
                    placeholder="Enter any special conditions specific to this tenancy that override or supplement the standard terms. E.g. parking arrangements, pet allowance, agreed renovations, etc."
                    value={agreementForm.specialConditions}
                    onChange={(event) => setAgreementForm((current) => ({ ...current, specialConditions: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Internal Notes (not printed in agreement)</label>
                  <textarea className="form-input" rows={2}
                    value={agreementForm.notes}
                    onChange={(event) => setAgreementForm((current) => ({ ...current, notes: event.target.value }))} />
                </div>
              </>
            )}

            {/* ─── STEP 4: GUARANTOR ─── */}
            {agreementStep === 4 && (
              <>
                <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Guarantor (Optional)</div>
                  <div style={{ fontSize: 12, color: "var(--ink2)" }}>If the tenant already has a guarantor on record it will be used automatically. Fill in here to override or add one.</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Guarantor Full Name</label>
                    <input className="form-input" placeholder="e.g. Mr. Emeka Okafor"
                      value={agreementForm.guarantorName}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, guarantorName: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relationship to Tenant</label>
                    <input className="form-input" placeholder="e.g. Father, Employer, Colleague"
                      value={agreementForm.guarantorRelationship}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, guarantorRelationship: event.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" type="tel" value={agreementForm.guarantorPhone}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, guarantorPhone: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" type="email" value={agreementForm.guarantorEmail}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, guarantorEmail: event.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Occupation</label>
                    <input className="form-input" value={agreementForm.guarantorOccupation}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, guarantorOccupation: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employer / Company</label>
                    <input className="form-input" value={agreementForm.guarantorCompany}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, guarantorCompany: event.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Guarantor Residential Address</label>
                  <input className="form-input" placeholder="Full address"
                    value={agreementForm.guarantorAddress}
                    onChange={(event) => setAgreementForm((current) => ({ ...current, guarantorAddress: event.target.value }))} />
                </div>
                <div style={{ padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--ink)" }}>Ready to generate?</strong><br />
                  Clicking &quot;Create &amp; Preview Agreement&quot; will save the agreement and immediately open a multi-page printable legal document you can print or save as PDF.
                </div>
              </>
            )}
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

We wish to inform you that effective from July 1, 2026, your rent will be adjusted in line with current market rates and your updated billing schedule.
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
          <p><strong>3. RENT:</strong> The Tenant shall pay rent according to the agreed billing schedule of ₦150,000/month for the tenancy term.</p>
        </div>
        <div className="form-group">
          <label className="form-label">Your Signature *</label>
          <SignaturePad onChange={setAgreementSignature} />
        </div>
      </ModalFrame>

      <ModalFrame
        modalId="notifications"
        size="modal-lg"
        title="Notifications"
        footer={
          <div className="notifications-modal-footer">
            <span>
              {notificationData?.summary.total ?? 0} notification
              {(notificationData?.summary.total ?? 0) === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={markAllNotificationsRead}
              disabled={!notificationData?.items.length}
            >
              Mark all read
            </button>
          </div>
        }
      >
        <div className="notifications-modal-list">
          {notificationError ? (
            <div className="notifications-modal-empty">{notificationError}</div>
          ) : notificationLoading ? (
            <div className="notifications-modal-empty">Loading notifications...</div>
          ) : notificationData?.items.length ? (
            notificationData.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="notifications-modal-item"
                onClick={() => {
                  if (item.href) {
                    closeModal();
                    void router.push(item.href);
                  }
                }}
              >
                <span
                  className="notifications-modal-dot"
                  style={{ background: notificationToneColor(item.tone) }}
                />
                <span className="notifications-modal-copy">
                  <span className="notifications-modal-title">{item.title}</span>
                  <span className="notifications-modal-body">{item.body}</span>
                </span>
                <span className="notifications-modal-time">{item.time}</span>
              </button>
            ))
          ) : (
            <div className="notifications-modal-empty">
              {notificationConfig.emptyMessage}
            </div>
          )}
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
