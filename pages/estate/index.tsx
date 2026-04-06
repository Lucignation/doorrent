import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/router";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import LandingTemplateThumbnail from "../../components/estate/LandingTemplateThumbnail";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import {
  buildEstateQrUrl,
  convertRowsToCsv,
  estatePreview,
  formatEstateCurrency,
  mapEstateDashboardToPreviewData,
  parseCsvText,
  type EstateBillingBasis,
  type EstateDashboardData,
} from "../../lib/estate-preview";

type ImportTarget = "houses" | "residents" | "workers";
type EstateModuleKey =
  | "overview"
  | "dues"
  | "treasury"
  | "contributions"
  | "workforce"
  | "passes"
  | "governance"
  | "landing"
  | "receipts"
  | "broadcasts"
  | "polls"
  | "incidents"
  | "maintenance"
  | "assets"
  | "providers"
  | "budget"
  | "defaulters"
  | "documents"
  | "vehicles"
  | "amenities"
  | "penalties"
  | "move-log"
  | "blacklist"
  | "committees"
  | "resolutions"
  | "payroll"
  | "roster";

type EstateDashboardEnvelope = { data: EstateDashboardData };
type ResidenceRecord = EstateDashboardData["residences"][number];
type ResidentRecord = EstateDashboardData["residents"][number];
type ChargeRecord = EstateDashboardData["charges"][number];
type ExpenseRecord = EstateDashboardData["expenses"][number];
type CauseRecord = EstateDashboardData["causes"][number];
type ContributionRecord = EstateDashboardData["contributions"][number];
type WorkerRecord = EstateDashboardData["workers"][number];
type PassRecord = EstateDashboardData["passes"][number];
type ApprovalRecord = EstateDashboardData["approvals"][number];

const ESTATE_MODULES: Array<{
  key: EstateModuleKey;
  label: string;
  description: string;
}> = [
  {
    key: "overview",
    label: "Overview",
    description: "Estate-wide view of residents, dues, treasury, access passes, and governance.",
  },
  {
    key: "dues",
    label: "Dues",
    description: "Manage residences, residents, and estate charges billed per house or per resident.",
  },
  {
    key: "treasury",
    label: "Treasury",
    description: "Track estate money, expenses, and financial decisions.",
  },
  {
    key: "contributions",
    label: "Contributions",
    description: "Create crowdfunding causes and record resident contributions.",
  },
  {
    key: "workforce",
    label: "Workers",
    description: "Manage estate workers, payroll details, and duty status.",
  },
  {
    key: "passes",
    label: "Passes",
    description: "Issue one-time QR and code access passes for workers, visitors, and deliveries.",
  },
  {
    key: "governance",
    label: "Governance",
    description: "Manage approval chains, exco controls, and controlled handover steps.",
  },
  {
    key: "landing",
    label: "Landing Page",
    description: "Pick an enterprise landing template and manage branded content blocks.",
  },
  { key: "receipts", label: "Receipts", description: "Issue and track receipts for estate dues payments." },
  { key: "broadcasts", label: "Broadcasts", description: "Send announcements, emergency alerts, and meeting notices to residents." },
  { key: "polls", label: "Polls & Voting", description: "Create polls for levy approvals, project decisions, and resident votes." },
  { key: "incidents", label: "Incidents", description: "Report and track theft, noise, damage, and safety issues." },
  { key: "maintenance", label: "Maintenance", description: "Log and track maintenance requests for estate infrastructure." },
  { key: "assets", label: "Assets", description: "Manage estate assets like generators, CCTV, gate motors, and boreholes." },
  { key: "providers", label: "Service Providers", description: "Track waste vendors, security companies, electricians, and plumbers." },
  { key: "budget", label: "Budget", description: "Set planned budget lines and compare against actual estate expenditure." },
  { key: "defaulters", label: "Defaulters", description: "Track residents who owe estate dues, penalties, and send reminders." },
  { key: "documents", label: "Documents", description: "Store estate rules, constitution, vendor contracts, and meeting minutes." },
  { key: "vehicles", label: "Vehicles", description: "Register resident vehicles, stickers, and plate numbers." },
  { key: "amenities", label: "Amenities", description: "Manage bookable estate amenities like halls, courts, pools, and fields." },
  { key: "penalties", label: "Penalties", description: "Issue and track fines for sanitation, parking, and noise violations." },
  { key: "move-log", label: "Move Log", description: "Record move-in and move-out events with clearance status." },
  { key: "blacklist", label: "Worker Blacklist", description: "Flag and track bad workers or artisans barred from the estate." },
  { key: "committees", label: "Committees", description: "Manage estate governance committees and their members." },
  { key: "resolutions", label: "Resolutions", description: "Record meeting resolutions, votes, and decisions." },
  { key: "payroll", label: "Payroll", description: "Run and approve monthly salary payments for estate workers." },
  { key: "roster", label: "Duty Roster", description: "Schedule worker shifts and track daily attendance." },
];

const initialProfileForm = {
  estateName: "",
  defaultBillingBasis: "UNIT_BASED" as EstateBillingBasis,
  description: "",
  qrGateEnforcement: true,
  accessCodeRequired: true,
  exitCodeRequired: true,
  allowResidentCrowdfunding: true,
  landingTemplateId: estatePreview.templates[0]?.id ?? "",
  landingHeroTitle: "Estate living with structure, transparency, and trust.",
  landingHeroSubtitle:
    "Collect dues, manage passes, track workers, and keep residents informed from one branded estate portal.",
  landingPrimaryCta: "Pay estate dues",
  landingSecondaryCta: "Request visitor pass",
};

const initialChargeForm = {
  id: "",
  title: "",
  amount: "",
  frequency: "MONTHLY",
  billingBasis: "UNIT_BASED" as EstateBillingBasis,
  status: "ACTIVE",
  notes: "",
};

const initialResidenceForm = {
  id: "",
  houseNumber: "",
  block: "",
  label: "",
  ownerName: "",
  ownerPhone: "",
  billingBasis: "UNIT_BASED" as EstateBillingBasis,
  status: "ACTIVE",
  occupantsCount: "0",
  notes: "",
  regenerateCodes: false,
};

const initialResidentForm = {
  id: "",
  residenceId: "",
  fullName: "",
  email: "",
  phone: "",
  residentType: "RESIDENT",
  status: "ACTIVE",
  billingBasis: "",
  canAccessResidentPortal: true,
  regenerateCodes: false,
};

const initialExpenseForm = {
  id: "",
  title: "",
  category: "",
  amount: "",
  requestedByName: "",
  status: "PENDING",
  incurredOn: "",
  notes: "",
};

const initialCauseForm = {
  id: "",
  title: "",
  description: "",
  targetAmount: "",
  contributionMode: "FLEXIBLE",
  fixedContributionAmount: "",
  deadline: "",
  status: "ACTIVE",
};

const initialContributionForm = {
  id: "",
  causeId: "",
  residentId: "",
  contributorName: "",
  amount: "",
  status: "PAID",
  note: "",
  paidAt: "",
};

const initialWorkerForm = {
  id: "",
  fullName: "",
  role: "",
  phone: "",
  monthlySalary: "",
  bankName: "",
  bankAccountNumber: "",
  shiftLabel: "",
  onDuty: true,
  status: "ACTIVE",
  notes: "",
};

const initialPassForm = {
  id: "",
  residenceId: "",
  type: "VISITOR",
  holderName: "",
  purpose: "",
  peopleCount: "1",
  vehicleDetails: "",
  validFrom: "",
  validUntil: "",
  status: "ACTIVE",
  regenerateCodes: false,
};

const initialApprovalForm = {
  id: "",
  type: "EXPENSE",
  title: "",
  entityType: "",
  entityId: "",
  status: "PENDING",
  requiredApprovals: "1",
  receivedApprovals: "0",
  approverRoles: "Treasurer, Chairman",
};

const initialReceiptForm = { id: "", residenceId: "", residentId: "", description: "", amount: "", periodLabel: "", status: "ISSUED", issuedAt: "" };
const initialBroadcastForm = { id: "", type: "ANNOUNCEMENT", audience: "ALL", title: "", body: "", sentByName: "", scheduledFor: "" };
const initialPollForm = { id: "", type: "GENERAL", title: "", description: "", status: "DRAFT", deadline: "", options: "Option A, Option B" };
const initialIncidentForm = { id: "", residenceId: "", type: "NOISE", title: "", description: "", reportedByName: "", status: "OPEN", notes: "" };
const initialMaintenanceForm = { id: "", residenceId: "", category: "GATE", title: "", description: "", reportedByName: "", assignedTo: "", status: "OPEN", notes: "" };
const initialAssetForm = { id: "", name: "", category: "GENERATOR", serialNumber: "", condition: "GOOD", purchaseDate: "", purchaseCost: "", lastServicedAt: "", nextServiceDue: "", location: "", notes: "" };
const initialProviderForm = { id: "", name: "", category: "SECURITY", contactName: "", phone: "", email: "", contractStart: "", contractEnd: "", monthlyCost: "", status: "ACTIVE", notes: "" };
const initialBudgetLineForm = { id: "", title: "", category: "", period: "", plannedAmount: "", notes: "" };
const initialDueDefaultForm = { id: "", residenceId: "", residentId: "", subjectName: "", periodsOwed: "1", baseAmount: "", penaltyAmount: "0", totalOwed: "", notes: "" };
const initialDocumentForm = { id: "", title: "", category: "RULES", fileUrl: "", uploadedByName: "" };
const initialVehicleForm = { id: "", residenceId: "", residentId: "", ownerName: "", plateNumber: "", make: "", model: "", color: "", stickerIssued: false, stickerCode: "", status: "ACTIVE", notes: "" };
const initialAmenityForm = { id: "", name: "", type: "", capacity: "", rules: "", status: "AVAILABLE" };
const initialBookingForm = { id: "", amenityId: "", bookerName: "", date: "", timeFrom: "", timeTo: "", purpose: "", status: "PENDING", notes: "" };
const initialPenaltyForm = { id: "", residenceId: "", residentId: "", subjectName: "", type: "NOISE", reason: "", amount: "", status: "UNPAID", issuedByName: "", notes: "" };
const initialMoveLogForm = { id: "", residenceId: "", residentId: "", type: "MOVE_IN", residentName: "", date: "", clearanceGiven: false, notes: "", recordedByName: "" };
const initialBlacklistForm = { id: "", workerName: "", workerPhone: "", company: "", reason: "", incidentDate: "", recordedByName: "" };
const initialCommitteeForm = { id: "", name: "", description: "", memberNames: "" };
const initialResolutionForm = { id: "", meetingDate: "", title: "", resolution: "", votesFor: "0", votesAgainst: "0", votesAbstained: "0", status: "PASSED", recordedByName: "" };
const initialPayrollForm = { id: "", periodLabel: "", periodStart: "", periodEnd: "", status: "DRAFT", notes: "" };
const initialRosterForm = { id: "", workerId: "", workerName: "", workerRole: "", date: "", shiftStart: "", shiftEnd: "", notes: "" };

function getEstateModule(value: unknown): EstateModuleKey {
  if (typeof value !== "string") {
    return "overview";
  }

  return ESTATE_MODULES.find((module) => module.key === value)?.key ?? "overview";
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="estate-stat-card">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function normalizeDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function normalizeDateTimeInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function maybeNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const number = Number(trimmed);
  return Number.isFinite(number) ? number : undefined;
}

function serializeApprovalSteps(raw: string) {
  return raw
    .split(",")
    .map((step) => step.trim())
    .filter(Boolean)
    .map((roleLabel, index) => ({
      orderIndex: index + 1,
      roleLabel,
      status: "PENDING" as const,
    }));
}

export function EstateWorkspaceContent({
  activeModule,
  onSelectModule,
}: {
  activeModule: EstateModuleKey;
  onSelectModule?: (module: EstateModuleKey) => void;
}) {
  const { landlordSession } = useLandlordPortalSession();
  const { showToast } = usePrototypeUI();
  const token = landlordSession?.token ?? "";
  const [dashboard, setDashboard] = useState<EstateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [importFeedback, setImportFeedback] = useState("");
  const [activeImportTarget, setActiveImportTarget] =
    useState<ImportTarget>("houses");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [chargeForm, setChargeForm] = useState(initialChargeForm);
  const [residenceForm, setResidenceForm] = useState(initialResidenceForm);
  const [residentForm, setResidentForm] = useState(initialResidentForm);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [causeForm, setCauseForm] = useState(initialCauseForm);
  const [contributionForm, setContributionForm] = useState(initialContributionForm);
  const [workerForm, setWorkerForm] = useState(initialWorkerForm);
  const [passForm, setPassForm] = useState(initialPassForm);
  const [approvalForm, setApprovalForm] = useState(initialApprovalForm);
  const [receiptForm, setReceiptForm] = useState(initialReceiptForm);
  const [broadcastForm, setBroadcastForm] = useState(initialBroadcastForm);
  const [pollForm, setPollForm] = useState(initialPollForm);
  const [incidentForm, setIncidentForm] = useState(initialIncidentForm);
  const [maintenanceForm, setMaintenanceForm] = useState(initialMaintenanceForm);
  const [assetForm, setAssetForm] = useState(initialAssetForm);
  const [providerForm, setProviderForm] = useState(initialProviderForm);
  const [budgetLineForm, setBudgetLineForm] = useState(initialBudgetLineForm);
  const [dueDefaultForm, setDueDefaultForm] = useState(initialDueDefaultForm);
  const [documentForm, setDocumentForm] = useState(initialDocumentForm);
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);
  const [amenityForm, setAmenityForm] = useState(initialAmenityForm);
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const [penaltyForm, setPenaltyForm] = useState(initialPenaltyForm);
  const [moveLogForm, setMoveLogForm] = useState(initialMoveLogForm);
  const [blacklistForm, setBlacklistForm] = useState(initialBlacklistForm);
  const [committeeForm, setCommitteeForm] = useState(initialCommitteeForm);
  const [resolutionForm, setResolutionForm] = useState(initialResolutionForm);
  const [payrollForm, setPayrollForm] = useState(initialPayrollForm);
  const [rosterForm, setRosterForm] = useState(initialRosterForm);

  const estateData = useMemo(
    () => (dashboard ? mapEstateDashboardToPreviewData(dashboard) : estatePreview),
    [dashboard],
  );

  const selectedTemplate = useMemo(
    () =>
      estatePreview.templates.find(
        (template) => template.id === profileForm.landingTemplateId,
      ) ?? estatePreview.templates[0],
    [profileForm.landingTemplateId],
  );

  const activeModuleMeta =
    ESTATE_MODULES.find((module) => module.key === activeModule) ?? ESTATE_MODULES[0];

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setFeedback("");

      try {
        const response = await apiRequest<EstateDashboardData>("/estate/dashboard", {
          token,
        });

        if (cancelled) {
          return;
        }

        setDashboard(response.data);
        setProfileForm({
          estateName: response.data.estate.name,
          defaultBillingBasis:
            response.data.estate.defaultBillingBasis ?? "UNIT_BASED",
          description: response.data.estate.description ?? "",
          qrGateEnforcement: response.data.estate.qrGateEnforcement ?? true,
          accessCodeRequired: response.data.estate.accessCodeRequired ?? true,
          exitCodeRequired: response.data.estate.exitCodeRequired ?? true,
          allowResidentCrowdfunding:
            response.data.estate.allowResidentCrowdfunding ?? true,
          landingTemplateId:
            response.data.estate.landingTemplateId ??
            estatePreview.templates[0]?.id ??
            "",
          landingHeroTitle:
            response.data.estate.landingHeroTitle ??
            initialProfileForm.landingHeroTitle,
          landingHeroSubtitle:
            response.data.estate.landingHeroSubtitle ??
            initialProfileForm.landingHeroSubtitle,
          landingPrimaryCta:
            response.data.estate.landingPrimaryCta ??
            initialProfileForm.landingPrimaryCta,
          landingSecondaryCta:
            response.data.estate.landingSecondaryCta ??
            initialProfileForm.landingSecondaryCta,
        });
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error
              ? error.message
              : "We could not load the estate workspace.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function refreshDashboard(successMessage?: string) {
    if (!token) {
      return;
    }

    const response = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
    setDashboard(response.data);
    if (successMessage) {
      setFeedback(successMessage);
      showToast(successMessage, "success");
    }
  }

  async function submitMutation(
    key: string,
    request: () => Promise<unknown>,
    successMessage: string,
    resetForm?: () => void,
  ) {
    setSavingKey(key);
    setFeedback("");

    try {
      await request();
      resetForm?.();
      await refreshDashboard(successMessage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We could not save that change.";
      setFeedback(message);
      showToast(message, "error");
    } finally {
      setSavingKey(null);
    }
  }

  function exportCsv(target: ImportTarget) {
    const rows =
      target === "houses"
        ? estateData.houses.map((house) => ({
            houseNumber: house.houseNumber,
            block: house.block,
            ownerName: house.ownerName,
            occupiedBy: house.occupiedBy,
            billingBasis: house.billingBasis,
          }))
        : target === "residents"
          ? estateData.residents.map((resident) => ({
              fullName: resident.fullName,
              houseNumber: resident.houseNumber,
              status: resident.status,
              phone: resident.phone,
              billingBasis: resident.billingBasis,
            }))
          : estateData.workers.map((worker) => ({
              name: worker.name,
              role: worker.role,
              phone: worker.phone,
              monthlyPay: worker.monthlyPay,
              shift: worker.shift,
              onDuty: worker.onDuty ? "Yes" : "No",
            }));

    const csv = convertRowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${target}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function startImport(target: ImportTarget) {
    setActiveImportTarget(target);
    fileInputRef.current?.click();
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseCsvText(text);
      setImportFeedback(
        `${activeImportTarget} CSV ready: ${parsed.rows.length} row(s) with ${parsed.headers.length} column(s) detected.`,
      );
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  async function handleDelete(path: string, label: string) {
    if (!window.confirm(`Remove ${label}?`)) {
      return;
    }

    await submitMutation(`delete-${path}`, () =>
      apiRequest(path, { method: "DELETE", token }), `${label} removed.`);
  }

  function fillChargeForm(charge: ChargeRecord) {
    setChargeForm({
      id: charge.id,
      title: charge.title,
      amount: String(charge.amount),
      frequency: charge.frequency,
      billingBasis: charge.billingBasis,
      status: charge.status,
      notes: charge.notes ?? "",
    });
  }

  function fillResidenceForm(residence: ResidenceRecord) {
    setResidenceForm({
      id: residence.id,
      houseNumber: residence.houseNumber,
      block: residence.block ?? "",
      label: residence.label ?? "",
      ownerName: residence.ownerName ?? "",
      ownerPhone: residence.ownerPhone ?? "",
      billingBasis: residence.billingBasis,
      status: residence.status,
      occupantsCount: String(residence.occupantsCount),
      notes: residence.notes ?? "",
      regenerateCodes: false,
    });
  }

  function fillResidentForm(resident: ResidentRecord) {
    setResidentForm({
      id: resident.id,
      residenceId:
        dashboard?.residences.find((item) => item.houseNumber === resident.houseNumber)?.id ??
        "",
      fullName: resident.fullName,
      email: resident.email ?? "",
      phone: resident.phone ?? "",
      residentType: resident.residentType,
      status: resident.status,
      billingBasis: resident.billingBasis ?? "",
      canAccessResidentPortal: resident.canAccessResidentPortal,
      regenerateCodes: false,
    });
  }

  function fillExpenseForm(expense: ExpenseRecord) {
    setExpenseForm({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      requestedByName: expense.requestedByName ?? "",
      status: expense.status,
      incurredOn: normalizeDateInput(expense.incurredOn),
      notes: expense.notes ?? "",
    });
  }

  function fillCauseForm(cause: CauseRecord) {
    setCauseForm({
      id: cause.id,
      title: cause.title,
      description: cause.description ?? "",
      targetAmount: String(cause.targetAmount),
      contributionMode: cause.contributionMode,
      fixedContributionAmount: cause.fixedContributionAmount
        ? String(cause.fixedContributionAmount)
        : "",
      deadline: normalizeDateInput(cause.deadline),
      status: cause.status,
    });
  }

  function fillContributionForm(contribution: ContributionRecord) {
    setContributionForm({
      id: contribution.id,
      causeId: contribution.causeId,
      residentId: contribution.residentId ?? "",
      contributorName: contribution.contributorName,
      amount: String(contribution.amount),
      status: contribution.status,
      note: contribution.note ?? "",
      paidAt: normalizeDateInput(contribution.paidAt),
    });
  }

  function fillWorkerForm(worker: WorkerRecord) {
    setWorkerForm({
      id: worker.id,
      fullName: worker.fullName,
      role: worker.role,
      phone: worker.phone ?? "",
      monthlySalary: String(worker.monthlySalary),
      bankName: worker.bankName ?? "",
      bankAccountNumber: worker.bankAccountNumber ?? "",
      shiftLabel: worker.shiftLabel ?? "",
      onDuty: worker.onDuty,
      status: worker.status,
      notes: worker.notes ?? "",
    });
  }

  function fillPassForm(pass: PassRecord) {
    const residenceId =
      dashboard?.residences.find((item) => item.houseNumber === pass.houseNumber)?.id ?? "";
    setPassForm({
      id: pass.id,
      residenceId,
      type: pass.type,
      holderName: pass.holderName,
      purpose: pass.purpose ?? "",
      peopleCount: String(pass.peopleCount),
      vehicleDetails: pass.vehicleDetails ?? "",
      validFrom: normalizeDateTimeInput(pass.validFrom),
      validUntil: normalizeDateTimeInput(pass.validUntil),
      status: pass.status,
      regenerateCodes: false,
    });
  }

  function fillApprovalForm(approval: ApprovalRecord) {
    setApprovalForm({
      id: approval.id,
      type: approval.type,
      title: approval.title,
      entityType: approval.entityType ?? "",
      entityId: approval.entityId ?? "",
      status: approval.status,
      requiredApprovals: String(approval.requiredApprovals),
      receivedApprovals: String(approval.receivedApprovals),
      approverRoles: approval.approvers.join(", "),
    });
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "profile",
      () =>
        apiRequest("/estate/profile", {
          method: "PATCH",
          token,
          body: {
            estateName: profileForm.estateName,
            defaultBillingBasis: profileForm.defaultBillingBasis,
            description: profileForm.description,
            qrGateEnforcement: profileForm.qrGateEnforcement,
            accessCodeRequired: profileForm.accessCodeRequired,
            exitCodeRequired: profileForm.exitCodeRequired,
            allowResidentCrowdfunding: profileForm.allowResidentCrowdfunding,
            landingTemplateId: profileForm.landingTemplateId,
            landingHeroTitle: profileForm.landingHeroTitle,
            landingHeroSubtitle: profileForm.landingHeroSubtitle,
            landingPrimaryCta: profileForm.landingPrimaryCta,
            landingSecondaryCta: profileForm.landingSecondaryCta,
          },
        }),
      "Estate profile updated.",
    );
  }

  async function handleSaveCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      title: chargeForm.title,
      amount: Number(chargeForm.amount || 0),
      frequency: chargeForm.frequency,
      billingBasis: chargeForm.billingBasis,
      status: chargeForm.status,
      notes: chargeForm.notes,
    };

    await submitMutation(
      "charge",
      () =>
        apiRequest(
          chargeForm.id ? `/estate/charges/${chargeForm.id}` : "/estate/charges",
          {
            method: chargeForm.id ? "PATCH" : "POST",
            token,
            body: payload,
          },
        ),
      chargeForm.id ? "Estate charge updated." : "Estate charge created.",
      () => setChargeForm(initialChargeForm),
    );
  }

  async function handleSaveResidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "residence",
      () =>
        apiRequest(
          residenceForm.id
            ? `/estate/residences/${residenceForm.id}`
            : "/estate/residences",
          {
            method: residenceForm.id ? "PATCH" : "POST",
            token,
            body: {
              houseNumber: residenceForm.houseNumber,
              block: residenceForm.block,
              label: residenceForm.label,
              ownerName: residenceForm.ownerName,
              ownerPhone: residenceForm.ownerPhone,
              billingBasis: residenceForm.billingBasis,
              status: residenceForm.status,
              occupantsCount: Number(residenceForm.occupantsCount || 0),
              notes: residenceForm.notes,
              regenerateCodes: residenceForm.regenerateCodes,
            },
          },
        ),
      residenceForm.id ? "Residence updated." : "Residence created.",
      () => setResidenceForm(initialResidenceForm),
    );
  }

  async function handleSaveResident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "resident",
      () =>
        apiRequest(
          residentForm.id ? `/estate/residents/${residentForm.id}` : "/estate/residents",
          {
            method: residentForm.id ? "PATCH" : "POST",
            token,
            body: {
              residenceId: residentForm.residenceId,
              fullName: residentForm.fullName,
              email: residentForm.email,
              phone: residentForm.phone,
              residentType: residentForm.residentType,
              status: residentForm.status,
              billingBasis: residentForm.billingBasis || undefined,
              canAccessResidentPortal: residentForm.canAccessResidentPortal,
              regenerateCodes: residentForm.regenerateCodes,
            },
          },
        ),
      residentForm.id ? "Resident updated." : "Resident added.",
      () => setResidentForm(initialResidentForm),
    );
  }

  async function handleSaveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "expense",
      () =>
        apiRequest(
          expenseForm.id ? `/estate/expenses/${expenseForm.id}` : "/estate/expenses",
          {
            method: expenseForm.id ? "PATCH" : "POST",
            token,
            body: {
              title: expenseForm.title,
              category: expenseForm.category,
              amount: Number(expenseForm.amount || 0),
              requestedByName: expenseForm.requestedByName,
              status: expenseForm.status,
              incurredOn: expenseForm.incurredOn || undefined,
              notes: expenseForm.notes,
            },
          },
        ),
      expenseForm.id ? "Expense updated." : "Expense created.",
      () => setExpenseForm(initialExpenseForm),
    );
  }

  async function handleSaveCause(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "cause",
      () =>
        apiRequest(causeForm.id ? `/estate/causes/${causeForm.id}` : "/estate/causes", {
          method: causeForm.id ? "PATCH" : "POST",
          token,
          body: {
            title: causeForm.title,
            description: causeForm.description,
            targetAmount: Number(causeForm.targetAmount || 0),
            contributionMode: causeForm.contributionMode,
            fixedContributionAmount:
              causeForm.contributionMode === "FIXED"
                ? Number(causeForm.fixedContributionAmount || 0)
                : undefined,
            deadline: causeForm.deadline || undefined,
            status: causeForm.status,
          },
        }),
      causeForm.id ? "Crowdfunding cause updated." : "Crowdfunding cause created.",
      () => setCauseForm(initialCauseForm),
    );
  }

  async function handleSaveContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "contribution",
      () =>
        apiRequest(
          contributionForm.id
            ? `/estate/contributions/${contributionForm.id}`
            : "/estate/contributions",
          {
            method: contributionForm.id ? "PATCH" : "POST",
            token,
            body: {
              causeId: contributionForm.causeId,
              residentId: contributionForm.residentId || undefined,
              contributorName: contributionForm.contributorName,
              amount: maybeNumber(contributionForm.amount),
              status: contributionForm.status,
              note: contributionForm.note,
              paidAt: contributionForm.paidAt || undefined,
            },
          },
        ),
      contributionForm.id
        ? "Contribution updated."
        : "Contribution recorded successfully.",
      () => setContributionForm(initialContributionForm),
    );
  }

  async function handleSaveWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "worker",
      () =>
        apiRequest(workerForm.id ? `/estate/workers/${workerForm.id}` : "/estate/workers", {
          method: workerForm.id ? "PATCH" : "POST",
          token,
          body: {
            fullName: workerForm.fullName,
            role: workerForm.role,
            phone: workerForm.phone,
            monthlySalary: Number(workerForm.monthlySalary || 0),
            bankName: workerForm.bankName,
            bankAccountNumber: workerForm.bankAccountNumber,
            shiftLabel: workerForm.shiftLabel,
            onDuty: workerForm.onDuty,
            status: workerForm.status,
            notes: workerForm.notes,
          },
        }),
      workerForm.id ? "Worker updated." : "Worker created.",
      () => setWorkerForm(initialWorkerForm),
    );
  }

  async function handleSavePass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "pass",
      () =>
        apiRequest(passForm.id ? `/estate/passes/${passForm.id}` : "/estate/passes", {
          method: passForm.id ? "PATCH" : "POST",
          token,
          body: {
            residenceId: passForm.residenceId,
            type: passForm.type,
            holderName: passForm.holderName,
            purpose: passForm.purpose,
            peopleCount: Number(passForm.peopleCount || 1),
            vehicleDetails: passForm.vehicleDetails,
            validFrom: passForm.validFrom,
            validUntil: passForm.validUntil,
            status: passForm.status,
            regenerateCodes: passForm.regenerateCodes,
          },
        }),
      passForm.id ? "Access pass updated." : "Access pass created.",
      () => setPassForm(initialPassForm),
    );
  }

  async function handleSaveApproval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation(
      "approval",
      () =>
        apiRequest(
          approvalForm.id
            ? `/estate/approvals/${approvalForm.id}`
            : "/estate/approvals",
          {
            method: approvalForm.id ? "PATCH" : "POST",
            token,
            body: {
              type: approvalForm.type,
              title: approvalForm.title,
              entityType: approvalForm.entityType,
              entityId: approvalForm.entityId,
              status: approvalForm.status,
              requiredApprovals: Number(approvalForm.requiredApprovals || 1),
              receivedApprovals: Number(approvalForm.receivedApprovals || 0),
              steps: serializeApprovalSteps(approvalForm.approverRoles),
            },
          },
        ),
      approvalForm.id ? "Approval flow updated." : "Approval flow created.",
      () => setApprovalForm(initialApprovalForm),
    );
  }

  async function handleSaveReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("receipt", () => apiRequest(receiptForm.id ? `/estate/receipts/${receiptForm.id}` : "/estate/receipts", { method: receiptForm.id ? "PATCH" : "POST", token, body: { residenceId: receiptForm.residenceId, residentId: receiptForm.residentId, description: receiptForm.description, amount: Number(receiptForm.amount || 0), periodLabel: receiptForm.periodLabel, status: receiptForm.status, issuedAt: receiptForm.issuedAt || undefined } }), receiptForm.id ? "Receipt updated." : "Receipt issued.", () => setReceiptForm(initialReceiptForm));
  }

  async function handleSaveBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("broadcast", () => apiRequest(broadcastForm.id ? `/estate/broadcasts/${broadcastForm.id}` : "/estate/broadcasts", { method: broadcastForm.id ? "PATCH" : "POST", token, body: { type: broadcastForm.type, audience: broadcastForm.audience, title: broadcastForm.title, body: broadcastForm.body, sentByName: broadcastForm.sentByName, scheduledFor: broadcastForm.scheduledFor || undefined } }), broadcastForm.id ? "Broadcast updated." : "Broadcast sent.", () => setBroadcastForm(initialBroadcastForm));
  }

  async function handleSavePoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const options = pollForm.options.split(",").map((o) => ({ label: o.trim() })).filter((o) => o.label);
    await submitMutation("poll", () => apiRequest(pollForm.id ? `/estate/polls/${pollForm.id}` : "/estate/polls", { method: pollForm.id ? "PATCH" : "POST", token, body: { type: pollForm.type, title: pollForm.title, description: pollForm.description, status: pollForm.status, deadline: pollForm.deadline || undefined, options } }), pollForm.id ? "Poll updated." : "Poll created.", () => setPollForm(initialPollForm));
  }

  async function handleSaveIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("incident", () => apiRequest(incidentForm.id ? `/estate/incidents/${incidentForm.id}` : "/estate/incidents", { method: incidentForm.id ? "PATCH" : "POST", token, body: { residenceId: incidentForm.residenceId, type: incidentForm.type, title: incidentForm.title, description: incidentForm.description, reportedByName: incidentForm.reportedByName, status: incidentForm.status, notes: incidentForm.notes } }), incidentForm.id ? "Incident updated." : "Incident reported.", () => setIncidentForm(initialIncidentForm));
  }

  async function handleSaveMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("maintenance", () => apiRequest(maintenanceForm.id ? `/estate/maintenance/${maintenanceForm.id}` : "/estate/maintenance", { method: maintenanceForm.id ? "PATCH" : "POST", token, body: { residenceId: maintenanceForm.residenceId, category: maintenanceForm.category, title: maintenanceForm.title, description: maintenanceForm.description, reportedByName: maintenanceForm.reportedByName, assignedTo: maintenanceForm.assignedTo, status: maintenanceForm.status, notes: maintenanceForm.notes } }), maintenanceForm.id ? "Request updated." : "Maintenance request logged.", () => setMaintenanceForm(initialMaintenanceForm));
  }

  async function handleSaveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("asset", () => apiRequest(assetForm.id ? `/estate/assets/${assetForm.id}` : "/estate/assets", { method: assetForm.id ? "PATCH" : "POST", token, body: { name: assetForm.name, category: assetForm.category, serialNumber: assetForm.serialNumber, condition: assetForm.condition, purchaseDate: assetForm.purchaseDate || undefined, purchaseCost: assetForm.purchaseCost ? Number(assetForm.purchaseCost) : undefined, lastServicedAt: assetForm.lastServicedAt || undefined, nextServiceDue: assetForm.nextServiceDue || undefined, location: assetForm.location, notes: assetForm.notes } }), assetForm.id ? "Asset updated." : "Asset added.", () => setAssetForm(initialAssetForm));
  }

  async function handleSaveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("provider", () => apiRequest(providerForm.id ? `/estate/service-providers/${providerForm.id}` : "/estate/service-providers", { method: providerForm.id ? "PATCH" : "POST", token, body: { name: providerForm.name, category: providerForm.category, contactName: providerForm.contactName, phone: providerForm.phone, email: providerForm.email, contractStart: providerForm.contractStart || undefined, contractEnd: providerForm.contractEnd || undefined, monthlyCost: providerForm.monthlyCost ? Number(providerForm.monthlyCost) : undefined, status: providerForm.status, notes: providerForm.notes } }), providerForm.id ? "Provider updated." : "Service provider added.", () => setProviderForm(initialProviderForm));
  }

  async function handleSaveBudgetLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("budget", () => apiRequest(budgetLineForm.id ? `/estate/budget-lines/${budgetLineForm.id}` : "/estate/budget-lines", { method: budgetLineForm.id ? "PATCH" : "POST", token, body: { title: budgetLineForm.title, category: budgetLineForm.category, period: budgetLineForm.period, plannedAmount: Number(budgetLineForm.plannedAmount || 0), notes: budgetLineForm.notes } }), budgetLineForm.id ? "Budget line updated." : "Budget line created.", () => setBudgetLineForm(initialBudgetLineForm));
  }

  async function handleSaveDueDefault(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("duedefault", () => apiRequest(dueDefaultForm.id ? `/estate/due-defaults/${dueDefaultForm.id}` : "/estate/due-defaults", { method: dueDefaultForm.id ? "PATCH" : "POST", token, body: { residenceId: dueDefaultForm.residenceId, residentId: dueDefaultForm.residentId, subjectName: dueDefaultForm.subjectName, periodsOwed: Number(dueDefaultForm.periodsOwed || 1), baseAmount: Number(dueDefaultForm.baseAmount || 0), penaltyAmount: Number(dueDefaultForm.penaltyAmount || 0), totalOwed: Number(dueDefaultForm.totalOwed || 0), notes: dueDefaultForm.notes } }), dueDefaultForm.id ? "Defaulter record updated." : "Defaulter recorded.", () => setDueDefaultForm(initialDueDefaultForm));
  }

  async function handleSaveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("document", () => apiRequest(documentForm.id ? `/estate/documents/${documentForm.id}` : "/estate/documents", { method: documentForm.id ? "PATCH" : "POST", token, body: { title: documentForm.title, category: documentForm.category, fileUrl: documentForm.fileUrl, uploadedByName: documentForm.uploadedByName } }), documentForm.id ? "Document updated." : "Document uploaded.", () => setDocumentForm(initialDocumentForm));
  }

  async function handleSaveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("vehicle", () => apiRequest(vehicleForm.id ? `/estate/vehicles/${vehicleForm.id}` : "/estate/vehicles", { method: vehicleForm.id ? "PATCH" : "POST", token, body: { residenceId: vehicleForm.residenceId, residentId: vehicleForm.residentId, ownerName: vehicleForm.ownerName, plateNumber: vehicleForm.plateNumber, make: vehicleForm.make, model: vehicleForm.model, color: vehicleForm.color, stickerIssued: vehicleForm.stickerIssued, stickerCode: vehicleForm.stickerCode, status: vehicleForm.status, notes: vehicleForm.notes } }), vehicleForm.id ? "Vehicle updated." : "Vehicle registered.", () => setVehicleForm(initialVehicleForm));
  }

  async function handleSaveAmenity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("amenity", () => apiRequest(amenityForm.id ? `/estate/amenities/${amenityForm.id}` : "/estate/amenities", { method: amenityForm.id ? "PATCH" : "POST", token, body: { name: amenityForm.name, type: amenityForm.type, capacity: amenityForm.capacity ? Number(amenityForm.capacity) : undefined, rules: amenityForm.rules, status: amenityForm.status } }), amenityForm.id ? "Amenity updated." : "Amenity added.", () => setAmenityForm(initialAmenityForm));
  }

  async function handleSaveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("booking", () => apiRequest(bookingForm.id ? `/estate/bookings/${bookingForm.id}` : "/estate/bookings", { method: bookingForm.id ? "PATCH" : "POST", token, body: { amenityId: bookingForm.amenityId, bookerName: bookingForm.bookerName, date: bookingForm.date, timeFrom: bookingForm.timeFrom, timeTo: bookingForm.timeTo, purpose: bookingForm.purpose, status: bookingForm.status, notes: bookingForm.notes } }), bookingForm.id ? "Booking updated." : "Booking created.", () => setBookingForm(initialBookingForm));
  }

  async function handleSavePenalty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("penalty", () => apiRequest(penaltyForm.id ? `/estate/penalties/${penaltyForm.id}` : "/estate/penalties", { method: penaltyForm.id ? "PATCH" : "POST", token, body: { residenceId: penaltyForm.residenceId, residentId: penaltyForm.residentId, subjectName: penaltyForm.subjectName, type: penaltyForm.type, reason: penaltyForm.reason, amount: Number(penaltyForm.amount || 0), status: penaltyForm.status, issuedByName: penaltyForm.issuedByName, notes: penaltyForm.notes } }), penaltyForm.id ? "Penalty updated." : "Penalty issued.", () => setPenaltyForm(initialPenaltyForm));
  }

  async function handleSaveMoveLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("movelog", () => apiRequest(moveLogForm.id ? `/estate/move-logs/${moveLogForm.id}` : "/estate/move-logs", { method: moveLogForm.id ? "PATCH" : "POST", token, body: { residenceId: moveLogForm.residenceId, residentId: moveLogForm.residentId, type: moveLogForm.type, residentName: moveLogForm.residentName, date: moveLogForm.date, clearanceGiven: moveLogForm.clearanceGiven, notes: moveLogForm.notes, recordedByName: moveLogForm.recordedByName } }), moveLogForm.id ? "Move log updated." : "Move event recorded.", () => setMoveLogForm(initialMoveLogForm));
  }

  async function handleSaveBlacklist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("blacklist", () => apiRequest(blacklistForm.id ? `/estate/blacklist/${blacklistForm.id}` : "/estate/blacklist", { method: blacklistForm.id ? "PATCH" : "POST", token, body: { workerName: blacklistForm.workerName, workerPhone: blacklistForm.workerPhone, company: blacklistForm.company, reason: blacklistForm.reason, incidentDate: blacklistForm.incidentDate || undefined, recordedByName: blacklistForm.recordedByName } }), blacklistForm.id ? "Entry updated." : "Worker blacklisted.", () => setBlacklistForm(initialBlacklistForm));
  }

  async function handleSaveCommittee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const members = committeeForm.memberNames.split(",").map((n) => ({ memberName: n.trim(), role: "MEMBER" as const })).filter((m) => m.memberName);
    await submitMutation("committee", () => apiRequest(committeeForm.id ? `/estate/committees/${committeeForm.id}` : "/estate/committees", { method: committeeForm.id ? "PATCH" : "POST", token, body: { name: committeeForm.name, description: committeeForm.description, members } }), committeeForm.id ? "Committee updated." : "Committee created.", () => setCommitteeForm(initialCommitteeForm));
  }

  async function handleSaveResolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("resolution", () => apiRequest(resolutionForm.id ? `/estate/resolutions/${resolutionForm.id}` : "/estate/resolutions", { method: resolutionForm.id ? "PATCH" : "POST", token, body: { meetingDate: resolutionForm.meetingDate, title: resolutionForm.title, resolution: resolutionForm.resolution, votesFor: Number(resolutionForm.votesFor || 0), votesAgainst: Number(resolutionForm.votesAgainst || 0), votesAbstained: Number(resolutionForm.votesAbstained || 0), status: resolutionForm.status, recordedByName: resolutionForm.recordedByName } }), resolutionForm.id ? "Resolution updated." : "Resolution recorded.", () => setResolutionForm(initialResolutionForm));
  }

  async function handleSavePayroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entries = (dashboard?.workers ?? []).map((w) => ({ workerId: w.id, workerName: w.fullName, workerRole: w.role, amount: w.monthlySalary, bankName: w.bankName ?? "", bankAccountNumber: w.bankAccountNumber ?? "" }));
    await submitMutation("payroll", () => apiRequest(payrollForm.id ? `/estate/payroll-runs/${payrollForm.id}` : "/estate/payroll-runs", { method: payrollForm.id ? "PATCH" : "POST", token, body: { periodLabel: payrollForm.periodLabel, periodStart: payrollForm.periodStart, periodEnd: payrollForm.periodEnd, status: payrollForm.status, notes: payrollForm.notes, entries } }), payrollForm.id ? "Payroll updated." : "Payroll run created.", () => setPayrollForm(initialPayrollForm));
  }

  async function handleSaveRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMutation("roster", () => apiRequest(rosterForm.id ? `/estate/duty-roster/${rosterForm.id}` : "/estate/duty-roster", { method: rosterForm.id ? "PATCH" : "POST", token, body: { workerId: rosterForm.workerId, workerName: rosterForm.workerName, workerRole: rosterForm.workerRole, date: rosterForm.date, shiftStart: rosterForm.shiftStart, shiftEnd: rosterForm.shiftEnd, notes: rosterForm.notes } }), rosterForm.id ? "Roster updated." : "Shift scheduled.", () => setRosterForm(initialRosterForm));
  }

  return (
    <>
      <PageHeader
        title={`Estate ${activeModuleMeta.label}`}
        description={activeModuleMeta.description}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />

      <section className="estate-module-row">
        {ESTATE_MODULES.map((module) => (
          <button
            key={module.key}
            type="button"
            className={`estate-module-pill${module.key === activeModule ? " is-active" : ""}`}
            onClick={() => onSelectModule?.(module.key)}
          >
            {module.label}
          </button>
        ))}
      </section>

      {feedback ? <div className="estate-feedback">{feedback}</div> : null}
      {importFeedback ? <div className="estate-feedback">{importFeedback}</div> : null}

      {loading ? (
        <div className="empty-state" style={{ minHeight: 320 }}>
          <h3>Loading estate workspace.</h3>
          <p>Fetching live estate records, treasury, passes, and approvals.</p>
        </div>
      ) : null}

      {!loading && activeModule === "overview" ? (
        <>
          <section className="estate-hero-grid">
            <article className="estate-hero-card estate-hero-card--brand">
              <span className="eyebrow">Estate workspace</span>
              <h2>{estateData.estate.name}</h2>
              <p>{estateData.estate.location}</p>
              <div className="estate-pill">{estateData.estate.subdomain}</div>
              <div className="estate-note">{estateData.estate.brandingStatus}</div>
            </article>
            <article className="estate-stat-grid">
              <MetricCard label="Houses" value={`${estateData.overview.houses}`} note="Residence register" />
              <MetricCard label="Residents" value={`${estateData.overview.residents}`} note="Per-house and per-resident support" />
              <MetricCard
                label="Collected"
                value={formatEstateCurrency(estateData.overview.collectedThisCycle)}
                note="Recorded contributions"
              />
              <MetricCard
                label="Pending approvals"
                value={`${estateData.overview.pendingApprovals}`}
                note="Governance actions waiting"
              />
            </article>
          </section>

          <section className="estate-grid">
            <article className="estate-card estate-card--wide">
              <div className="estate-card-header">
                <div>
                  <span className="eyebrow">Estate profile</span>
                  <h3>Core controls and resident access rules</h3>
                </div>
              </div>
              <form className="estate-form-grid" onSubmit={handleSaveProfile}>
                <label>
                  Estate name
                  <input
                    className="form-input"
                    value={profileForm.estateName}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        estateName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Default billing basis
                  <select
                    className="form-input"
                    value={profileForm.defaultBillingBasis}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        defaultBillingBasis: event.target.value as EstateBillingBasis,
                      }))
                    }
                  >
                    <option value="UNIT_BASED">Per house</option>
                    <option value="RESIDENT_BASED">Per resident</option>
                  </select>
                </label>
                <label className="estate-form-wide">
                  Description
                  <textarea
                    className="form-input"
                    rows={3}
                    value={profileForm.description}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="estate-check">
                  <input
                    type="checkbox"
                    checked={profileForm.qrGateEnforcement}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        qrGateEnforcement: event.target.checked,
                      }))
                    }
                  />
                  Enforce QR validation at the gate
                </label>
                <label className="estate-check">
                  <input
                    type="checkbox"
                    checked={profileForm.accessCodeRequired}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        accessCodeRequired: event.target.checked,
                      }))
                    }
                  />
                  Require access code for entry
                </label>
                <label className="estate-check">
                  <input
                    type="checkbox"
                    checked={profileForm.exitCodeRequired}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        exitCodeRequired: event.target.checked,
                      }))
                    }
                  />
                  Require exit code on departure
                </label>
                <label className="estate-check estate-form-wide">
                  <input
                    type="checkbox"
                    checked={profileForm.allowResidentCrowdfunding}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        allowResidentCrowdfunding: event.target.checked,
                      }))
                    }
                  />
                  Allow residents to contribute to active estate causes
                </label>
                <div className="estate-form-actions estate-form-wide">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingKey === "profile"}
                  >
                    {savingKey === "profile" ? "Saving..." : "Save Estate Profile"}
                  </button>
                </div>
              </form>
            </article>
          </section>
        </>
      ) : null}

      {!loading && activeModule === "dues" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Estate charges</span>
                <h3>Create or edit dues</h3>
              </div>
            </div>
            <form className="estate-form-grid" onSubmit={handleSaveCharge}>
              <label>
                Title
                <input className="form-input" value={chargeForm.title} onChange={(event) => setChargeForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Amount
                <input className="form-input" inputMode="numeric" value={chargeForm.amount} onChange={(event) => setChargeForm((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label>
                Frequency
                <select className="form-input" value={chargeForm.frequency} onChange={(event) => setChargeForm((current) => ({ ...current, frequency: event.target.value }))}>
                  <option value="ONE_OFF">One-off</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </label>
              <label>
                Billing basis
                <select className="form-input" value={chargeForm.billingBasis} onChange={(event) => setChargeForm((current) => ({ ...current, billingBasis: event.target.value as EstateBillingBasis }))}>
                  <option value="UNIT_BASED">Per house</option>
                  <option value="RESIDENT_BASED">Per resident</option>
                </select>
              </label>
              <label>
                Status
                <input className="form-input" value={chargeForm.status} onChange={(event) => setChargeForm((current) => ({ ...current, status: event.target.value }))} />
              </label>
              <label className="estate-form-wide">
                Notes
                <textarea className="form-input" rows={3} value={chargeForm.notes} onChange={(event) => setChargeForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "charge"}>
                  {savingKey === "charge" ? "Saving..." : chargeForm.id ? "Update Charge" : "Create Charge"}
                </button>
                {chargeForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setChargeForm(initialChargeForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
            <div className="estate-stack estate-top-gap">
              {dashboard?.charges.map((charge) => (
                <div key={charge.id} className="estate-row">
                  <div>
                    <strong>{charge.title}</strong>
                    <p>{charge.frequency} · {charge.billingBasis === "UNIT_BASED" ? "Per house" : "Per resident"}</p>
                  </div>
                  <div className="estate-row-right">
                    <strong>{formatEstateCurrency(charge.amount)}</strong>
                    <span>{charge.status}</span>
                    <div className="estate-inline-actions">
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillChargeForm(charge)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/charges/${charge.id}`, charge.title)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="estate-card">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Residences</span>
                <h3>Create or edit houses</h3>
              </div>
            </div>
            <form className="estate-form-grid" onSubmit={handleSaveResidence}>
              <label>
                House number
                <input className="form-input" value={residenceForm.houseNumber} onChange={(event) => setResidenceForm((current) => ({ ...current, houseNumber: event.target.value }))} />
              </label>
              <label>
                Block
                <input className="form-input" value={residenceForm.block} onChange={(event) => setResidenceForm((current) => ({ ...current, block: event.target.value }))} />
              </label>
              <label>
                Label
                <input className="form-input" value={residenceForm.label} onChange={(event) => setResidenceForm((current) => ({ ...current, label: event.target.value }))} />
              </label>
              <label>
                Owner name
                <input className="form-input" value={residenceForm.ownerName} onChange={(event) => setResidenceForm((current) => ({ ...current, ownerName: event.target.value }))} />
              </label>
              <label>
                Owner phone
                <input className="form-input" value={residenceForm.ownerPhone} onChange={(event) => setResidenceForm((current) => ({ ...current, ownerPhone: event.target.value }))} />
              </label>
              <label>
                Occupants count
                <input className="form-input" inputMode="numeric" value={residenceForm.occupantsCount} onChange={(event) => setResidenceForm((current) => ({ ...current, occupantsCount: event.target.value }))} />
              </label>
              <label>
                Billing basis
                <select className="form-input" value={residenceForm.billingBasis} onChange={(event) => setResidenceForm((current) => ({ ...current, billingBasis: event.target.value as EstateBillingBasis }))}>
                  <option value="UNIT_BASED">Per house</option>
                  <option value="RESIDENT_BASED">Per resident</option>
                </select>
              </label>
              <label>
                Status
                <select className="form-input" value={residenceForm.status} onChange={(event) => setResidenceForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="VACANT">Vacant</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </label>
              <label className="estate-form-wide">
                Notes
                <textarea className="form-input" rows={3} value={residenceForm.notes} onChange={(event) => setResidenceForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              {residenceForm.id ? (
                <label className="estate-check estate-form-wide">
                  <input type="checkbox" checked={residenceForm.regenerateCodes} onChange={(event) => setResidenceForm((current) => ({ ...current, regenerateCodes: event.target.checked }))} />
                  Regenerate house access, exit, and QR codes
                </label>
              ) : null}
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "residence"}>
                  {savingKey === "residence" ? "Saving..." : residenceForm.id ? "Update Residence" : "Create Residence"}
                </button>
                {residenceForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setResidenceForm(initialResidenceForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
            <div className="estate-stack estate-top-gap">
              {dashboard?.residences.map((residence) => (
                <div key={residence.id} className="estate-row">
                  <div>
                    <strong>House {residence.houseNumber}</strong>
                    <p>{residence.block ?? "No block"} · {residence.ownerName ?? "No owner set"}</p>
                    <p>Entry {residence.accessCode} · Exit {residence.exitCode}</p>
                  </div>
                  <div className="estate-row-right">
                    <strong>{residence.occupantsCount} occupants</strong>
                    <span>{residence.status}</span>
                    <div className="estate-inline-actions">
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillResidenceForm(residence)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/residences/${residence.id}`, `house ${residence.houseNumber}`)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="estate-card estate-card--wide">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Residents</span>
                <h3>Create or edit resident profiles</h3>
              </div>
            </div>
            <form className="estate-form-grid" onSubmit={handleSaveResident}>
              <label>
                Residence
                <select className="form-input" value={residentForm.residenceId} onChange={(event) => setResidentForm((current) => ({ ...current, residenceId: event.target.value }))}>
                  <option value="">Select house</option>
                  {dashboard?.residences.map((residence) => (
                    <option key={residence.id} value={residence.id}>
                      {residence.houseNumber} {residence.block ? `· ${residence.block}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Full name
                <input className="form-input" value={residentForm.fullName} onChange={(event) => setResidentForm((current) => ({ ...current, fullName: event.target.value }))} />
              </label>
              <label>
                Email
                <input className="form-input" type="email" value={residentForm.email} onChange={(event) => setResidentForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                Phone
                <input className="form-input" value={residentForm.phone} onChange={(event) => setResidentForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label>
                Resident type
                <input className="form-input" value={residentForm.residentType} onChange={(event) => setResidentForm((current) => ({ ...current, residentType: event.target.value }))} />
              </label>
              <label>
                Status
                <select className="form-input" value={residentForm.status} onChange={(event) => setResidentForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="MOVED_OUT">Moved out</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>
              <label>
                Billing basis
                <select className="form-input" value={residentForm.billingBasis} onChange={(event) => setResidentForm((current) => ({ ...current, billingBasis: event.target.value }))}>
                  <option value="">Use residence default</option>
                  <option value="UNIT_BASED">Per house</option>
                  <option value="RESIDENT_BASED">Per resident</option>
                </select>
              </label>
              <label className="estate-check">
                <input type="checkbox" checked={residentForm.canAccessResidentPortal} onChange={(event) => setResidentForm((current) => ({ ...current, canAccessResidentPortal: event.target.checked }))} />
                Allow resident portal access
              </label>
              {residentForm.id ? (
                <label className="estate-check estate-form-wide">
                  <input type="checkbox" checked={residentForm.regenerateCodes} onChange={(event) => setResidentForm((current) => ({ ...current, regenerateCodes: event.target.checked }))} />
                  Regenerate resident access and QR code
                </label>
              ) : null}
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "resident"}>
                  {savingKey === "resident" ? "Saving..." : residentForm.id ? "Update Resident" : "Add Resident"}
                </button>
                {residentForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setResidentForm(initialResidentForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
            <div className="estate-stack estate-top-gap">
              {dashboard?.residents.map((resident) => (
                <div key={resident.id} className="estate-row">
                  <div>
                    <strong>{resident.fullName}</strong>
                    <p>House {resident.houseNumber ?? "—"} · {resident.phone ?? "No phone"}</p>
                    <p>{resident.email ?? "No email"} · Portal {resident.canAccessResidentPortal ? "enabled" : "disabled"}</p>
                  </div>
                  <div className="estate-row-right">
                    <strong>{resident.status}</strong>
                    <span>{resident.billingBasis ?? "Residence default"}</span>
                    <div className="estate-inline-actions">
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillResidentForm(resident)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/residents/${resident.id}`, resident.fullName)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {!loading && activeModule === "treasury" ? (
        <section className="estate-grid">
          <article className="estate-card estate-card--wide">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Treasury</span>
                <h3>Create and track estate expenses</h3>
              </div>
              <span className="estate-pill estate-pill--accent">
                {formatEstateCurrency(
                  dashboard?.expenses.reduce((sum, item) => sum + item.amount, 0) ?? 0,
                )}
              </span>
            </div>
            <form className="estate-form-grid" onSubmit={handleSaveExpense}>
              <label>
                Title
                <input className="form-input" value={expenseForm.title} onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Category
                <input className="form-input" value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} />
              </label>
              <label>
                Amount
                <input className="form-input" inputMode="numeric" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label>
                Requested by
                <input className="form-input" value={expenseForm.requestedByName} onChange={(event) => setExpenseForm((current) => ({ ...current, requestedByName: event.target.value }))} />
              </label>
              <label>
                Status
                <input className="form-input" value={expenseForm.status} onChange={(event) => setExpenseForm((current) => ({ ...current, status: event.target.value }))} />
              </label>
              <label>
                Incurred on
                <input className="form-input" type="date" value={expenseForm.incurredOn} onChange={(event) => setExpenseForm((current) => ({ ...current, incurredOn: event.target.value }))} />
              </label>
              <label className="estate-form-wide">
                Notes
                <textarea className="form-input" rows={3} value={expenseForm.notes} onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "expense"}>
                  {savingKey === "expense" ? "Saving..." : expenseForm.id ? "Update Expense" : "Create Expense"}
                </button>
                {expenseForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setExpenseForm(initialExpenseForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
            <div className="estate-stack estate-top-gap">
              {dashboard?.expenses.map((expense) => (
                <div key={expense.id} className="estate-row">
                  <div>
                    <strong>{expense.title}</strong>
                    <p>{expense.category} · Requested by {expense.requestedByName ?? "Estate admin"}</p>
                  </div>
                  <div className="estate-row-right">
                    <strong>{formatEstateCurrency(expense.amount)}</strong>
                    <span>{expense.status}</span>
                    <div className="estate-inline-actions">
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillExpenseForm(expense)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/expenses/${expense.id}`, expense.title)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {!loading && activeModule === "contributions" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Crowdfunding causes</span>
                <h3>Create or edit a cause</h3>
              </div>
            </div>
            <form className="estate-form-grid" onSubmit={handleSaveCause}>
              <label>
                Title
                <input className="form-input" value={causeForm.title} onChange={(event) => setCauseForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Target amount
                <input className="form-input" inputMode="numeric" value={causeForm.targetAmount} onChange={(event) => setCauseForm((current) => ({ ...current, targetAmount: event.target.value }))} />
              </label>
              <label>
                Contribution mode
                <select className="form-input" value={causeForm.contributionMode} onChange={(event) => setCauseForm((current) => ({ ...current, contributionMode: event.target.value }))}>
                  <option value="FLEXIBLE">Flexible amount</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </label>
              <label>
                Fixed amount
                <input className="form-input" inputMode="numeric" value={causeForm.fixedContributionAmount} onChange={(event) => setCauseForm((current) => ({ ...current, fixedContributionAmount: event.target.value }))} />
              </label>
              <label>
                Deadline
                <input className="form-input" type="date" value={causeForm.deadline} onChange={(event) => setCauseForm((current) => ({ ...current, deadline: event.target.value }))} />
              </label>
              <label>
                Status
                <select className="form-input" value={causeForm.status} onChange={(event) => setCauseForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </label>
              <label className="estate-form-wide">
                Description
                <textarea className="form-input" rows={3} value={causeForm.description} onChange={(event) => setCauseForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "cause"}>
                  {savingKey === "cause" ? "Saving..." : causeForm.id ? "Update Cause" : "Create Cause"}
                </button>
                {causeForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setCauseForm(initialCauseForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="estate-card">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Contribution records</span>
                <h3>Record resident contributions</h3>
              </div>
            </div>
            <form className="estate-form-grid" onSubmit={handleSaveContribution}>
              <label>
                Cause
                <select className="form-input" value={contributionForm.causeId} onChange={(event) => setContributionForm((current) => ({ ...current, causeId: event.target.value }))}>
                  <option value="">Select cause</option>
                  {dashboard?.causes.map((cause) => (
                    <option key={cause.id} value={cause.id}>
                      {cause.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Resident
                <select className="form-input" value={contributionForm.residentId} onChange={(event) => setContributionForm((current) => ({ ...current, residentId: event.target.value }))}>
                  <option value="">External / unnamed</option>
                  {dashboard?.residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.fullName} · {resident.houseNumber ?? "—"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Contributor name
                <input className="form-input" value={contributionForm.contributorName} onChange={(event) => setContributionForm((current) => ({ ...current, contributorName: event.target.value }))} />
              </label>
              <label>
                Amount
                <input className="form-input" inputMode="numeric" value={contributionForm.amount} onChange={(event) => setContributionForm((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label>
                Status
                <select className="form-input" value={contributionForm.status} onChange={(event) => setContributionForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="PAID">Paid</option>
                  <option value="PLEDGED">Pledged</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </label>
              <label>
                Paid at
                <input className="form-input" type="date" value={contributionForm.paidAt} onChange={(event) => setContributionForm((current) => ({ ...current, paidAt: event.target.value }))} />
              </label>
              <label className="estate-form-wide">
                Note
                <textarea className="form-input" rows={3} value={contributionForm.note} onChange={(event) => setContributionForm((current) => ({ ...current, note: event.target.value }))} />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "contribution"}>
                  {savingKey === "contribution" ? "Saving..." : contributionForm.id ? "Update Contribution" : "Record Contribution"}
                </button>
                {contributionForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setContributionForm(initialContributionForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="estate-card estate-card--wide">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Active causes</span>
                <h3>Resident-facing contribution causes</h3>
              </div>
            </div>
            <div className="estate-stack">
              {dashboard?.causes.map((cause) => {
                const progress = cause.targetAmount
                  ? Math.min(
                      100,
                      Math.round((cause.contributedAmount / cause.targetAmount) * 100),
                    )
                  : 0;
                return (
                  <div key={cause.id} className="estate-cause">
                    <div className="estate-row">
                      <div>
                        <strong>{cause.title}</strong>
                        <p>{cause.contributors} contributors · {cause.contributionMode === "FIXED" ? `Fixed ${formatEstateCurrency(cause.fixedContributionAmount ?? 0)}` : "Flexible contributions"}</p>
                      </div>
                      <div className="estate-row-right">
                        <strong>{formatEstateCurrency(cause.contributedAmount)}</strong>
                        <span>of {formatEstateCurrency(cause.targetAmount)}</span>
                        <div className="estate-inline-actions">
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillCauseForm(cause)}>Edit</button>
                          <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/causes/${cause.id}`, cause.title)}>Delete</button>
                        </div>
                      </div>
                    </div>
                    <div className="estate-progress">
                      <div className="estate-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <small>{progress}% funded · {cause.deadline ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(cause.deadline)) : "No deadline"}</small>
                  </div>
                );
              })}
            </div>
            <div className="estate-stack estate-top-gap">
              <span className="eyebrow">Recent contributions</span>
              {dashboard?.contributions.map((contribution) => (
                <div key={contribution.id} className="estate-row">
                  <div>
                    <strong>{contribution.contributorName}</strong>
                    <p>{dashboard?.causes.find((cause) => cause.id === contribution.causeId)?.title ?? "Cause"} · {contribution.status}</p>
                  </div>
                  <div className="estate-row-right">
                    <strong>{formatEstateCurrency(contribution.amount)}</strong>
                    <span>{contribution.paidAt ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(contribution.paidAt)) : "No date"}</span>
                    <div className="estate-inline-actions">
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillContributionForm(contribution)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/contributions/${contribution.id}`, contribution.contributorName)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {!loading && activeModule === "workforce" ? (
        <section className="estate-grid">
          <article className="estate-card estate-card--wide">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Workers</span>
                <h3>Create and manage estate staff</h3>
              </div>
            </div>
            <form className="estate-form-grid" onSubmit={handleSaveWorker}>
              <label>
                Full name
                <input className="form-input" value={workerForm.fullName} onChange={(event) => setWorkerForm((current) => ({ ...current, fullName: event.target.value }))} />
              </label>
              <label>
                Role
                <input className="form-input" value={workerForm.role} onChange={(event) => setWorkerForm((current) => ({ ...current, role: event.target.value }))} />
              </label>
              <label>
                Phone
                <input className="form-input" value={workerForm.phone} onChange={(event) => setWorkerForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label>
                Monthly salary
                <input className="form-input" inputMode="numeric" value={workerForm.monthlySalary} onChange={(event) => setWorkerForm((current) => ({ ...current, monthlySalary: event.target.value }))} />
              </label>
              <label>
                Bank name
                <input className="form-input" value={workerForm.bankName} onChange={(event) => setWorkerForm((current) => ({ ...current, bankName: event.target.value }))} />
              </label>
              <label>
                Account number
                <input className="form-input" value={workerForm.bankAccountNumber} onChange={(event) => setWorkerForm((current) => ({ ...current, bankAccountNumber: event.target.value }))} />
              </label>
              <label>
                Shift label
                <input className="form-input" value={workerForm.shiftLabel} onChange={(event) => setWorkerForm((current) => ({ ...current, shiftLabel: event.target.value }))} />
              </label>
              <label>
                Status
                <select className="form-input" value={workerForm.status} onChange={(event) => setWorkerForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <label className="estate-check">
                <input type="checkbox" checked={workerForm.onDuty} onChange={(event) => setWorkerForm((current) => ({ ...current, onDuty: event.target.checked }))} />
                Worker is on duty
              </label>
              <label className="estate-form-wide">
                Notes
                <textarea className="form-input" rows={3} value={workerForm.notes} onChange={(event) => setWorkerForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "worker"}>
                  {savingKey === "worker" ? "Saving..." : workerForm.id ? "Update Worker" : "Add Worker"}
                </button>
                {workerForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setWorkerForm(initialWorkerForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
            <div className="estate-stack estate-top-gap">
              {dashboard?.workers.map((worker) => (
                <div key={worker.id} className="estate-row">
                  <div>
                    <strong>{worker.fullName}</strong>
                    <p>{worker.role} · {worker.shiftLabel ?? "Shift not set"}</p>
                    <p>{worker.phone ?? "No phone"} · {worker.bankName ?? "No bank set"}</p>
                  </div>
                  <div className="estate-row-right">
                    <strong>{formatEstateCurrency(worker.monthlySalary)}</strong>
                    <span>{worker.onDuty ? "On duty" : "Off duty"}</span>
                    <div className="estate-inline-actions">
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillWorkerForm(worker)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/workers/${worker.id}`, worker.fullName)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {!loading && activeModule === "passes" ? (
        <section className="estate-grid">
          <article className="estate-card estate-card--wide">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Pass centre</span>
                <h3>Create one-time QR and code access passes</h3>
              </div>
            </div>
            <form className="estate-form-grid" onSubmit={handleSavePass}>
              <label>
                Residence
                <select className="form-input" value={passForm.residenceId} onChange={(event) => setPassForm((current) => ({ ...current, residenceId: event.target.value }))}>
                  <option value="">Select house</option>
                  {dashboard?.residences.map((residence) => (
                    <option key={residence.id} value={residence.id}>
                      {residence.houseNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pass type
                <select className="form-input" value={passForm.type} onChange={(event) => setPassForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="VISITOR">Visitor</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="WORKER">Worker</option>
                  <option value="VEHICLE">Vehicle</option>
                  <option value="MOVE">Move</option>
                </select>
              </label>
              <label>
                Holder name
                <input className="form-input" value={passForm.holderName} onChange={(event) => setPassForm((current) => ({ ...current, holderName: event.target.value }))} />
              </label>
              <label>
                People count
                <input className="form-input" inputMode="numeric" value={passForm.peopleCount} onChange={(event) => setPassForm((current) => ({ ...current, peopleCount: event.target.value }))} />
              </label>
              <label>
                Valid from
                <input className="form-input" type="datetime-local" value={passForm.validFrom} onChange={(event) => setPassForm((current) => ({ ...current, validFrom: event.target.value }))} />
              </label>
              <label>
                Valid until
                <input className="form-input" type="datetime-local" value={passForm.validUntil} onChange={(event) => setPassForm((current) => ({ ...current, validUntil: event.target.value }))} />
              </label>
              <label className="estate-form-wide">
                Purpose
                <input className="form-input" value={passForm.purpose} onChange={(event) => setPassForm((current) => ({ ...current, purpose: event.target.value }))} />
              </label>
              <label className="estate-form-wide">
                Vehicle details
                <input className="form-input" value={passForm.vehicleDetails} onChange={(event) => setPassForm((current) => ({ ...current, vehicleDetails: event.target.value }))} />
              </label>
              <label>
                Status
                <select className="form-input" value={passForm.status} onChange={(event) => setPassForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="USED">Used</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
              {passForm.id ? (
                <label className="estate-check">
                  <input type="checkbox" checked={passForm.regenerateCodes} onChange={(event) => setPassForm((current) => ({ ...current, regenerateCodes: event.target.checked }))} />
                  Regenerate pass QR and access codes
                </label>
              ) : null}
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "pass"}>
                  {savingKey === "pass" ? "Saving..." : passForm.id ? "Update Pass" : "Create Pass"}
                </button>
                {passForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setPassForm(initialPassForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
            <div className="estate-pass-grid estate-top-gap">
              {dashboard?.passes.map((pass) => (
                <div key={pass.id} className="estate-pass-card">
                  <div>
                    <strong>{pass.type}</strong>
                    <p>House {pass.houseNumber ?? "—"} · {pass.holderName}</p>
                    <p>{pass.peopleCount} person(s) · {new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(pass.validFrom))} to {new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(pass.validUntil))}</p>
                    <div className="estate-pass-code">{pass.accessCode}</div>
                    <div className="estate-inline-actions">
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillPassForm(pass)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/passes/${pass.id}`, pass.holderName)}>Delete</button>
                    </div>
                  </div>
                  <img src={buildEstateQrUrl(pass.qrToken)} alt={`${pass.holderName} QR`} className="estate-pass-qr" />
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {!loading && activeModule === "governance" ? (
        <section className="estate-grid">
          <article className="estate-card estate-card--wide">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Approvals</span>
                <h3>Create or update multi-level approval flows</h3>
              </div>
            </div>
            <form className="estate-form-grid" onSubmit={handleSaveApproval}>
              <label>
                Type
                <select className="form-input" value={approvalForm.type} onChange={(event) => setApprovalForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="EXPENSE">Expense</option>
                  <option value="CAUSE">Cause</option>
                  <option value="LEVY">Levy</option>
                  <option value="EXCO_HANDOVER">Exco handover</option>
                  <option value="POLICY">Policy</option>
                </select>
              </label>
              <label>
                Title
                <input className="form-input" value={approvalForm.title} onChange={(event) => setApprovalForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Entity type
                <input className="form-input" value={approvalForm.entityType} onChange={(event) => setApprovalForm((current) => ({ ...current, entityType: event.target.value }))} />
              </label>
              <label>
                Entity id
                <input className="form-input" value={approvalForm.entityId} onChange={(event) => setApprovalForm((current) => ({ ...current, entityId: event.target.value }))} />
              </label>
              <label>
                Required approvals
                <input className="form-input" inputMode="numeric" value={approvalForm.requiredApprovals} onChange={(event) => setApprovalForm((current) => ({ ...current, requiredApprovals: event.target.value }))} />
              </label>
              <label>
                Received approvals
                <input className="form-input" inputMode="numeric" value={approvalForm.receivedApprovals} onChange={(event) => setApprovalForm((current) => ({ ...current, receivedApprovals: event.target.value }))} />
              </label>
              <label>
                Status
                <select className="form-input" value={approvalForm.status} onChange={(event) => setApprovalForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
              <label className="estate-form-wide">
                Approver roles
                <textarea className="form-input" rows={3} value={approvalForm.approverRoles} onChange={(event) => setApprovalForm((current) => ({ ...current, approverRoles: event.target.value }))} />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "approval"}>
                  {savingKey === "approval" ? "Saving..." : approvalForm.id ? "Update Approval" : "Create Approval"}
                </button>
                {approvalForm.id ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setApprovalForm(initialApprovalForm)}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
            <div className="estate-stack estate-top-gap">
              {dashboard?.approvals.map((approval) => (
                <div key={approval.id} className="estate-governance">
                  <div className="estate-row">
                    <div>
                      <strong>{approval.title}</strong>
                      <p>{approval.type} · {approval.status}</p>
                    </div>
                    <div className="estate-row-right">
                      <strong>{approval.receivedApprovals}/{approval.requiredApprovals}</strong>
                      <span>approvals</span>
                      <div className="estate-inline-actions">
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillApprovalForm(approval)}>Edit</button>
                        <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDelete(`/estate/approvals/${approval.id}`, approval.title)}>Delete</button>
                      </div>
                    </div>
                  </div>
                  <div className="estate-tags">
                    {approval.approvers.map((approver) => (
                      <span key={approver} className="estate-tag">{approver}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {!loading && activeModule === "landing" ? (
        <section className="estate-grid">
          <article className="estate-card estate-card--wide">
            <div className="estate-card-header">
              <div>
                <span className="eyebrow">Landing page templates</span>
                <h3>Choose a template — preview before you publish</h3>
              </div>
              <span className="estate-pill estate-pill--accent">Enterprise branding</span>
            </div>

            {/* Visual template gallery — click to select */}
            <div className="estate-template-grid">
              {estatePreview.templates.map((template) => {
                const isActive = template.id === profileForm.landingTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={`estate-template-card${isActive ? " is-active" : ""}`}
                    onClick={() =>
                      setProfileForm((current) => ({
                        ...current,
                        landingTemplateId: template.id,
                      }))
                    }
                  >
                    <LandingTemplateThumbnail templateId={template.id} />
                    <div className="estate-template-meta">
                      <strong>{template.name}</strong>
                      <p>{template.summary}</p>
                    </div>
                    {isActive && (
                      <div className="estate-template-check">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <circle cx="7" cy="7" r="7" fill="currentColor" fillOpacity="0.15" />
                          <path d="M4 7L6 9L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content editor — shown below the gallery */}
            <form className="estate-form-grid estate-top-gap" onSubmit={handleSaveProfile}>
              <label>
                Hero title
                <input className="form-input" value={profileForm.landingHeroTitle} onChange={(event) => setProfileForm((current) => ({ ...current, landingHeroTitle: event.target.value }))} />
              </label>
              <label>
                Primary CTA button
                <input className="form-input" value={profileForm.landingPrimaryCta} onChange={(event) => setProfileForm((current) => ({ ...current, landingPrimaryCta: event.target.value }))} />
              </label>
              <label className="estate-form-wide">
                Hero subtitle
                <textarea className="form-input" rows={3} value={profileForm.landingHeroSubtitle} onChange={(event) => setProfileForm((current) => ({ ...current, landingHeroSubtitle: event.target.value }))} />
              </label>
              <label>
                Secondary CTA button
                <input className="form-input" value={profileForm.landingSecondaryCta} onChange={(event) => setProfileForm((current) => ({ ...current, landingSecondaryCta: event.target.value }))} />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={savingKey === "profile"}>
                  {savingKey === "profile" ? "Saving..." : "Save & Publish Landing Page"}
                </button>
              </div>
            </form>

            {/* Live content preview */}
            <div className="estate-preview-card estate-top-gap">
              <span className="eyebrow">Live content preview — {selectedTemplate?.name}</span>
              <div className="estate-preview-banner" style={{ marginTop: 12 }}>
                <h2>{profileForm.landingHeroTitle}</h2>
                <p>{profileForm.landingHeroSubtitle}</p>
                <div className="estate-preview-actions">
                  <button type="button" className="btn btn-primary btn-sm">
                    {profileForm.landingPrimaryCta}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm">
                    {profileForm.landingSecondaryCta}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {(activeModule === "overview" || activeModule === "dues") && !loading ? (
        <section className="estate-toolbar estate-top-gap">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => startImport("houses")}>
            Import Houses CSV
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startImport("residents")}>
            Import Residents CSV
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startImport("workers")}>
            Import Workers CSV
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportCsv("houses")}>
            Export Houses CSV
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportCsv("residents")}>
            Export Residents CSV
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportCsv("workers")}>
            Export Workers CSV
          </button>
        </section>
      ) : null}

      {/* ── Receipts ── */}
      {!loading && activeModule === "receipts" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Issue receipt</span><h3>Record estate dues payment receipt</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveReceipt}>
              <label>House (optional)<input className="form-input" value={receiptForm.residenceId} onChange={(e) => setReceiptForm((f) => ({ ...f, residenceId: e.target.value }))} placeholder="Residence ID" /></label>
              <label>Resident (optional)<input className="form-input" value={receiptForm.residentId} onChange={(e) => setReceiptForm((f) => ({ ...f, residentId: e.target.value }))} placeholder="Resident ID" /></label>
              <label>Description<input className="form-input" required value={receiptForm.description} onChange={(e) => setReceiptForm((f) => ({ ...f, description: e.target.value }))} /></label>
              <label>Amount<input className="form-input" type="number" required value={receiptForm.amount} onChange={(e) => setReceiptForm((f) => ({ ...f, amount: e.target.value }))} /></label>
              <label>Period label<input className="form-input" value={receiptForm.periodLabel} placeholder="e.g. January 2025" onChange={(e) => setReceiptForm((f) => ({ ...f, periodLabel: e.target.value }))} /></label>
              <label>Status<select className="form-input" value={receiptForm.status} onChange={(e) => setReceiptForm((f) => ({ ...f, status: e.target.value }))}><option value="ISSUED">Issued</option><option value="VOIDED">Voided</option></select></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "receipt"}>{savingKey === "receipt" ? "Saving..." : receiptForm.id ? "Update" : "Issue Receipt"}</button>{receiptForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setReceiptForm(initialReceiptForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Broadcasts ── */}
      {!loading && activeModule === "broadcasts" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">New broadcast</span><h3>Send announcements, alerts & notices</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveBroadcast}>
              <label>Type<select className="form-input" value={broadcastForm.type} onChange={(e) => setBroadcastForm((f) => ({ ...f, type: e.target.value }))}><option value="ANNOUNCEMENT">Announcement</option><option value="EMERGENCY">Emergency</option><option value="MEETING_NOTICE">Meeting Notice</option><option value="GENERAL">General</option></select></label>
              <label>Audience<select className="form-input" value={broadcastForm.audience} onChange={(e) => setBroadcastForm((f) => ({ ...f, audience: e.target.value }))}><option value="ALL">All</option><option value="OWNERS">Owners</option><option value="TENANTS">Tenants</option><option value="WORKERS">Workers</option></select></label>
              <label className="estate-form-wide">Title<input className="form-input" required value={broadcastForm.title} onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label className="estate-form-wide">Message<textarea className="form-input" rows={4} required value={broadcastForm.body} onChange={(e) => setBroadcastForm((f) => ({ ...f, body: e.target.value }))} /></label>
              <label>Sent by<input className="form-input" value={broadcastForm.sentByName} onChange={(e) => setBroadcastForm((f) => ({ ...f, sentByName: e.target.value }))} /></label>
              <label>Schedule for (optional)<input className="form-input" type="datetime-local" value={broadcastForm.scheduledFor} onChange={(e) => setBroadcastForm((f) => ({ ...f, scheduledFor: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "broadcast"}>{savingKey === "broadcast" ? "Sending..." : broadcastForm.id ? "Update" : "Send Broadcast"}</button>{broadcastForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setBroadcastForm(initialBroadcastForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Polls ── */}
      {!loading && activeModule === "polls" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Create poll</span><h3>Levy approval, project votes & decisions</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSavePoll}>
              <label>Type<select className="form-input" value={pollForm.type} onChange={(e) => setPollForm((f) => ({ ...f, type: e.target.value }))}><option value="GENERAL">General</option><option value="LEVY_APPROVAL">Levy Approval</option><option value="PROJECT_APPROVAL">Project Approval</option><option value="ELECTION">Election</option></select></label>
              <label>Status<select className="form-input" value={pollForm.status} onChange={(e) => setPollForm((f) => ({ ...f, status: e.target.value }))}><option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label>
              <label className="estate-form-wide">Title<input className="form-input" required value={pollForm.title} onChange={(e) => setPollForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label className="estate-form-wide">Description<textarea className="form-input" rows={3} value={pollForm.description} onChange={(e) => setPollForm((f) => ({ ...f, description: e.target.value }))} /></label>
              <label>Options (comma-separated)<input className="form-input" required value={pollForm.options} onChange={(e) => setPollForm((f) => ({ ...f, options: e.target.value }))} placeholder="Yes, No, Abstain" /></label>
              <label>Deadline<input className="form-input" type="date" value={pollForm.deadline} onChange={(e) => setPollForm((f) => ({ ...f, deadline: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "poll"}>{savingKey === "poll" ? "Saving..." : pollForm.id ? "Update Poll" : "Create Poll"}</button>{pollForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setPollForm(initialPollForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Incidents ── */}
      {!loading && activeModule === "incidents" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Report incident</span><h3>Theft, noise, damage & safety issues</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveIncident}>
              <label>Type<select className="form-input" value={incidentForm.type} onChange={(e) => setIncidentForm((f) => ({ ...f, type: e.target.value }))}><option value="THEFT">Theft</option><option value="NOISE">Noise</option><option value="DAMAGE">Damage</option><option value="SAFETY">Safety</option><option value="TRESPASS">Trespass</option><option value="OTHER">Other</option></select></label>
              <label>Status<select className="form-input" value={incidentForm.status} onChange={(e) => setIncidentForm((f) => ({ ...f, status: e.target.value }))}><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label>
              <label className="estate-form-wide">Title<input className="form-input" required value={incidentForm.title} onChange={(e) => setIncidentForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label className="estate-form-wide">Description<textarea className="form-input" rows={3} required value={incidentForm.description} onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))} /></label>
              <label>Reported by<input className="form-input" value={incidentForm.reportedByName} onChange={(e) => setIncidentForm((f) => ({ ...f, reportedByName: e.target.value }))} /></label>
              <label>House ID (optional)<input className="form-input" value={incidentForm.residenceId} onChange={(e) => setIncidentForm((f) => ({ ...f, residenceId: e.target.value }))} /></label>
              <label className="estate-form-wide">Notes<textarea className="form-input" rows={2} value={incidentForm.notes} onChange={(e) => setIncidentForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "incident"}>{savingKey === "incident" ? "Saving..." : incidentForm.id ? "Update" : "Report Incident"}</button>{incidentForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setIncidentForm(initialIncidentForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Maintenance ── */}
      {!loading && activeModule === "maintenance" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Maintenance request</span><h3>Streetlight, drainage, gate, road & transformer</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveMaintenance}>
              <label>Category<select className="form-input" value={maintenanceForm.category} onChange={(e) => setMaintenanceForm((f) => ({ ...f, category: e.target.value }))}><option value="GATE">Gate</option><option value="ROAD">Road</option><option value="DRAINAGE">Drainage</option><option value="STREETLIGHT">Streetlight</option><option value="TRANSFORMER">Transformer</option><option value="BOREHOLE">Borehole</option><option value="CCTV">CCTV</option><option value="OTHER">Other</option></select></label>
              <label>Status<select className="form-input" value={maintenanceForm.status} onChange={(e) => setMaintenanceForm((f) => ({ ...f, status: e.target.value }))}><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label>
              <label className="estate-form-wide">Title<input className="form-input" required value={maintenanceForm.title} onChange={(e) => setMaintenanceForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label className="estate-form-wide">Description<textarea className="form-input" rows={3} value={maintenanceForm.description} onChange={(e) => setMaintenanceForm((f) => ({ ...f, description: e.target.value }))} /></label>
              <label>Reported by<input className="form-input" value={maintenanceForm.reportedByName} onChange={(e) => setMaintenanceForm((f) => ({ ...f, reportedByName: e.target.value }))} /></label>
              <label>Assigned to<input className="form-input" value={maintenanceForm.assignedTo} onChange={(e) => setMaintenanceForm((f) => ({ ...f, assignedTo: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "maintenance"}>{savingKey === "maintenance" ? "Saving..." : maintenanceForm.id ? "Update" : "Log Request"}</button>{maintenanceForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setMaintenanceForm(initialMaintenanceForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Assets ── */}
      {!loading && activeModule === "assets" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Asset register</span><h3>Generator, borehole, CCTV, gate motors & streetlights</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveAsset}>
              <label>Name<input className="form-input" required value={assetForm.name} onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))} /></label>
              <label>Category<select className="form-input" value={assetForm.category} onChange={(e) => setAssetForm((f) => ({ ...f, category: e.target.value }))}><option value="GENERATOR">Generator</option><option value="BOREHOLE">Borehole</option><option value="CCTV">CCTV</option><option value="GATE_MOTOR">Gate Motor</option><option value="STREETLIGHT">Streetlight</option><option value="PUMP">Pump</option><option value="TRANSFORMER">Transformer</option><option value="OTHER">Other</option></select></label>
              <label>Condition<select className="form-input" value={assetForm.condition} onChange={(e) => setAssetForm((f) => ({ ...f, condition: e.target.value }))}><option value="GOOD">Good</option><option value="FAIR">Fair</option><option value="NEEDS_SERVICE">Needs Service</option><option value="OUT_OF_ORDER">Out of Order</option></select></label>
              <label>Serial number<input className="form-input" value={assetForm.serialNumber} onChange={(e) => setAssetForm((f) => ({ ...f, serialNumber: e.target.value }))} /></label>
              <label>Purchase date<input className="form-input" type="date" value={assetForm.purchaseDate} onChange={(e) => setAssetForm((f) => ({ ...f, purchaseDate: e.target.value }))} /></label>
              <label>Purchase cost<input className="form-input" type="number" value={assetForm.purchaseCost} onChange={(e) => setAssetForm((f) => ({ ...f, purchaseCost: e.target.value }))} /></label>
              <label>Last serviced<input className="form-input" type="date" value={assetForm.lastServicedAt} onChange={(e) => setAssetForm((f) => ({ ...f, lastServicedAt: e.target.value }))} /></label>
              <label>Next service due<input className="form-input" type="date" value={assetForm.nextServiceDue} onChange={(e) => setAssetForm((f) => ({ ...f, nextServiceDue: e.target.value }))} /></label>
              <label>Location<input className="form-input" value={assetForm.location} onChange={(e) => setAssetForm((f) => ({ ...f, location: e.target.value }))} /></label>
              <label className="estate-form-wide">Notes<textarea className="form-input" rows={2} value={assetForm.notes} onChange={(e) => setAssetForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "asset"}>{savingKey === "asset" ? "Saving..." : assetForm.id ? "Update Asset" : "Add Asset"}</button>{assetForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setAssetForm(initialAssetForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Service Providers ── */}
      {!loading && activeModule === "providers" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Service providers</span><h3>Waste, security, electrician & plumber contracts</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveProvider}>
              <label>Name<input className="form-input" required value={providerForm.name} onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))} /></label>
              <label>Category<select className="form-input" value={providerForm.category} onChange={(e) => setProviderForm((f) => ({ ...f, category: e.target.value }))}><option value="WASTE">Waste</option><option value="SECURITY">Security</option><option value="ELECTRICIAN">Electrician</option><option value="PLUMBER">Plumber</option><option value="LANDSCAPING">Landscaping</option><option value="CLEANING">Cleaning</option><option value="INTERNET">Internet</option><option value="OTHER">Other</option></select></label>
              <label>Contact name<input className="form-input" value={providerForm.contactName} onChange={(e) => setProviderForm((f) => ({ ...f, contactName: e.target.value }))} /></label>
              <label>Phone<input className="form-input" value={providerForm.phone} onChange={(e) => setProviderForm((f) => ({ ...f, phone: e.target.value }))} /></label>
              <label>Email<input className="form-input" type="email" value={providerForm.email} onChange={(e) => setProviderForm((f) => ({ ...f, email: e.target.value }))} /></label>
              <label>Monthly cost<input className="form-input" type="number" value={providerForm.monthlyCost} onChange={(e) => setProviderForm((f) => ({ ...f, monthlyCost: e.target.value }))} /></label>
              <label>Contract start<input className="form-input" type="date" value={providerForm.contractStart} onChange={(e) => setProviderForm((f) => ({ ...f, contractStart: e.target.value }))} /></label>
              <label>Contract end<input className="form-input" type="date" value={providerForm.contractEnd} onChange={(e) => setProviderForm((f) => ({ ...f, contractEnd: e.target.value }))} /></label>
              <label>Status<select className="form-input" value={providerForm.status} onChange={(e) => setProviderForm((f) => ({ ...f, status: e.target.value }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
              <label className="estate-form-wide">Notes<textarea className="form-input" rows={2} value={providerForm.notes} onChange={(e) => setProviderForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "provider"}>{savingKey === "provider" ? "Saving..." : providerForm.id ? "Update" : "Add Provider"}</button>{providerForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setProviderForm(initialProviderForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Budget ── */}
      {!loading && activeModule === "budget" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Budget planner</span><h3>Plan vs actual estate expenditure</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveBudgetLine}>
              <label>Title<input className="form-input" required value={budgetLineForm.title} onChange={(e) => setBudgetLineForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label>Category<input className="form-input" required value={budgetLineForm.category} placeholder="e.g. Security, Maintenance" onChange={(e) => setBudgetLineForm((f) => ({ ...f, category: e.target.value }))} /></label>
              <label>Period<input className="form-input" required value={budgetLineForm.period} placeholder="e.g. Q1 2025" onChange={(e) => setBudgetLineForm((f) => ({ ...f, period: e.target.value }))} /></label>
              <label>Planned amount<input className="form-input" type="number" required value={budgetLineForm.plannedAmount} onChange={(e) => setBudgetLineForm((f) => ({ ...f, plannedAmount: e.target.value }))} /></label>
              <label className="estate-form-wide">Notes<textarea className="form-input" rows={2} value={budgetLineForm.notes} onChange={(e) => setBudgetLineForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "budget"}>{savingKey === "budget" ? "Saving..." : budgetLineForm.id ? "Update" : "Add Budget Line"}</button>{budgetLineForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setBudgetLineForm(initialBudgetLineForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Defaulters ── */}
      {!loading && activeModule === "defaulters" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Due defaulters</span><h3>Track unpaid estate dues and penalties</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveDueDefault}>
              <label>Subject name<input className="form-input" required value={dueDefaultForm.subjectName} onChange={(e) => setDueDefaultForm((f) => ({ ...f, subjectName: e.target.value }))} /></label>
              <label>Periods owed<input className="form-input" type="number" value={dueDefaultForm.periodsOwed} onChange={(e) => setDueDefaultForm((f) => ({ ...f, periodsOwed: e.target.value }))} /></label>
              <label>Base amount<input className="form-input" type="number" required value={dueDefaultForm.baseAmount} onChange={(e) => setDueDefaultForm((f) => ({ ...f, baseAmount: e.target.value }))} /></label>
              <label>Penalty amount<input className="form-input" type="number" value={dueDefaultForm.penaltyAmount} onChange={(e) => setDueDefaultForm((f) => ({ ...f, penaltyAmount: e.target.value }))} /></label>
              <label>Total owed<input className="form-input" type="number" required value={dueDefaultForm.totalOwed} onChange={(e) => setDueDefaultForm((f) => ({ ...f, totalOwed: e.target.value }))} /></label>
              <label className="estate-form-wide">Notes<textarea className="form-input" rows={2} value={dueDefaultForm.notes} onChange={(e) => setDueDefaultForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "duedefault"}>{savingKey === "duedefault" ? "Saving..." : dueDefaultForm.id ? "Update" : "Record Defaulter"}</button>{dueDefaultForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setDueDefaultForm(initialDueDefaultForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Documents ── */}
      {!loading && activeModule === "documents" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Document storage</span><h3>Estate rules, constitution, contracts & minutes</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveDocument}>
              <label>Title<input className="form-input" required value={documentForm.title} onChange={(e) => setDocumentForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label>Category<select className="form-input" value={documentForm.category} onChange={(e) => setDocumentForm((f) => ({ ...f, category: e.target.value }))}><option value="RULES">Estate Rules</option><option value="CONSTITUTION">Constitution</option><option value="VENDOR_CONTRACT">Vendor Contract</option><option value="MEETING_MINUTES">Meeting Minutes</option><option value="FINANCIAL_REPORT">Financial Report</option><option value="OTHER">Other</option></select></label>
              <label className="estate-form-wide">File URL<input className="form-input" type="url" required value={documentForm.fileUrl} placeholder="https://..." onChange={(e) => setDocumentForm((f) => ({ ...f, fileUrl: e.target.value }))} /></label>
              <label>Uploaded by<input className="form-input" value={documentForm.uploadedByName} onChange={(e) => setDocumentForm((f) => ({ ...f, uploadedByName: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "document"}>{savingKey === "document" ? "Saving..." : documentForm.id ? "Update" : "Save Document"}</button>{documentForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setDocumentForm(initialDocumentForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Vehicles ── */}
      {!loading && activeModule === "vehicles" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Vehicle registry</span><h3>Resident cars, stickers & plate numbers</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveVehicle}>
              <label>Owner name<input className="form-input" required value={vehicleForm.ownerName} onChange={(e) => setVehicleForm((f) => ({ ...f, ownerName: e.target.value }))} /></label>
              <label>Plate number<input className="form-input" required value={vehicleForm.plateNumber} onChange={(e) => setVehicleForm((f) => ({ ...f, plateNumber: e.target.value }))} /></label>
              <label>Make<input className="form-input" value={vehicleForm.make} onChange={(e) => setVehicleForm((f) => ({ ...f, make: e.target.value }))} /></label>
              <label>Model<input className="form-input" value={vehicleForm.model} onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))} /></label>
              <label>Color<input className="form-input" value={vehicleForm.color} onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))} /></label>
              <label>Sticker code<input className="form-input" value={vehicleForm.stickerCode} onChange={(e) => setVehicleForm((f) => ({ ...f, stickerCode: e.target.value }))} /></label>
              <label><input type="checkbox" checked={vehicleForm.stickerIssued} onChange={(e) => setVehicleForm((f) => ({ ...f, stickerIssued: e.target.checked }))} /> Sticker issued</label>
              <label>Status<select className="form-input" value={vehicleForm.status} onChange={(e) => setVehicleForm((f) => ({ ...f, status: e.target.value }))}><option value="ACTIVE">Active</option><option value="REMOVED">Removed</option></select></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "vehicle"}>{savingKey === "vehicle" ? "Saving..." : vehicleForm.id ? "Update" : "Register Vehicle"}</button>{vehicleForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setVehicleForm(initialVehicleForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Amenities ── */}
      {!loading && activeModule === "amenities" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Amenity booking</span><h3>Hall, court, pool, field & shared facilities</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveAmenity}>
              <label>Amenity name<input className="form-input" required value={amenityForm.name} onChange={(e) => setAmenityForm((f) => ({ ...f, name: e.target.value }))} /></label>
              <label>Type<input className="form-input" required value={amenityForm.type} placeholder="e.g. Hall, Court, Pool" onChange={(e) => setAmenityForm((f) => ({ ...f, type: e.target.value }))} /></label>
              <label>Capacity<input className="form-input" type="number" value={amenityForm.capacity} onChange={(e) => setAmenityForm((f) => ({ ...f, capacity: e.target.value }))} /></label>
              <label>Status<select className="form-input" value={amenityForm.status} onChange={(e) => setAmenityForm((f) => ({ ...f, status: e.target.value }))}><option value="AVAILABLE">Available</option><option value="MAINTENANCE">Maintenance</option><option value="INACTIVE">Inactive</option></select></label>
              <label className="estate-form-wide">Rules<textarea className="form-input" rows={2} value={amenityForm.rules} onChange={(e) => setAmenityForm((f) => ({ ...f, rules: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "amenity"}>{savingKey === "amenity" ? "Saving..." : amenityForm.id ? "Update Amenity" : "Add Amenity"}</button>{amenityForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setAmenityForm(initialAmenityForm)}>Cancel</button> : null}</div>
            </form>
          </article>
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">New booking</span><h3>Book an amenity for a resident</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveBooking}>
              <label>Amenity ID<input className="form-input" required value={bookingForm.amenityId} onChange={(e) => setBookingForm((f) => ({ ...f, amenityId: e.target.value }))} /></label>
              <label>Booked by<input className="form-input" required value={bookingForm.bookerName} onChange={(e) => setBookingForm((f) => ({ ...f, bookerName: e.target.value }))} /></label>
              <label>Date<input className="form-input" type="date" required value={bookingForm.date} onChange={(e) => setBookingForm((f) => ({ ...f, date: e.target.value }))} /></label>
              <label>From<input className="form-input" type="time" required value={bookingForm.timeFrom} onChange={(e) => setBookingForm((f) => ({ ...f, timeFrom: e.target.value }))} /></label>
              <label>To<input className="form-input" type="time" required value={bookingForm.timeTo} onChange={(e) => setBookingForm((f) => ({ ...f, timeTo: e.target.value }))} /></label>
              <label>Status<select className="form-input" value={bookingForm.status} onChange={(e) => setBookingForm((f) => ({ ...f, status: e.target.value }))}><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option><option value="COMPLETED">Completed</option></select></label>
              <label>Purpose<input className="form-input" value={bookingForm.purpose} onChange={(e) => setBookingForm((f) => ({ ...f, purpose: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "booking"}>{savingKey === "booking" ? "Saving..." : bookingForm.id ? "Update" : "Create Booking"}</button>{bookingForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setBookingForm(initialBookingForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Penalties ── */}
      {!loading && activeModule === "penalties" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Penalty tracking</span><h3>Sanitation, parking & noise fines</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSavePenalty}>
              <label>Subject name<input className="form-input" required value={penaltyForm.subjectName} onChange={(e) => setPenaltyForm((f) => ({ ...f, subjectName: e.target.value }))} /></label>
              <label>Type<select className="form-input" value={penaltyForm.type} onChange={(e) => setPenaltyForm((f) => ({ ...f, type: e.target.value }))}><option value="SANITATION">Sanitation</option><option value="PARKING">Parking</option><option value="NOISE">Noise</option><option value="PROPERTY_DAMAGE">Property Damage</option><option value="OTHER">Other</option></select></label>
              <label className="estate-form-wide">Reason<input className="form-input" required value={penaltyForm.reason} onChange={(e) => setPenaltyForm((f) => ({ ...f, reason: e.target.value }))} /></label>
              <label>Amount<input className="form-input" type="number" required value={penaltyForm.amount} onChange={(e) => setPenaltyForm((f) => ({ ...f, amount: e.target.value }))} /></label>
              <label>Status<select className="form-input" value={penaltyForm.status} onChange={(e) => setPenaltyForm((f) => ({ ...f, status: e.target.value }))}><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option><option value="WAIVED">Waived</option></select></label>
              <label>Issued by<input className="form-input" value={penaltyForm.issuedByName} onChange={(e) => setPenaltyForm((f) => ({ ...f, issuedByName: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "penalty"}>{savingKey === "penalty" ? "Saving..." : penaltyForm.id ? "Update" : "Issue Penalty"}</button>{penaltyForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setPenaltyForm(initialPenaltyForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Move Log ── */}
      {!loading && activeModule === "move-log" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Move log</span><h3>Move-in & move-out records with clearance</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveMoveLog}>
              <label>Resident name<input className="form-input" required value={moveLogForm.residentName} onChange={(e) => setMoveLogForm((f) => ({ ...f, residentName: e.target.value }))} /></label>
              <label>Type<select className="form-input" value={moveLogForm.type} onChange={(e) => setMoveLogForm((f) => ({ ...f, type: e.target.value }))}><option value="MOVE_IN">Move In</option><option value="MOVE_OUT">Move Out</option></select></label>
              <label>Date<input className="form-input" type="date" required value={moveLogForm.date} onChange={(e) => setMoveLogForm((f) => ({ ...f, date: e.target.value }))} /></label>
              <label>House ID<input className="form-input" required value={moveLogForm.residenceId} onChange={(e) => setMoveLogForm((f) => ({ ...f, residenceId: e.target.value }))} /></label>
              <label>Recorded by<input className="form-input" value={moveLogForm.recordedByName} onChange={(e) => setMoveLogForm((f) => ({ ...f, recordedByName: e.target.value }))} /></label>
              <label><input type="checkbox" checked={moveLogForm.clearanceGiven} onChange={(e) => setMoveLogForm((f) => ({ ...f, clearanceGiven: e.target.checked }))} /> Clearance given</label>
              <label className="estate-form-wide">Notes<textarea className="form-input" rows={2} value={moveLogForm.notes} onChange={(e) => setMoveLogForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "movelog"}>{savingKey === "movelog" ? "Saving..." : moveLogForm.id ? "Update" : "Record Move"}</button>{moveLogForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setMoveLogForm(initialMoveLogForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Blacklist ── */}
      {!loading && activeModule === "blacklist" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Worker blacklist</span><h3>Flag bad workers & artisans</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveBlacklist}>
              <label>Worker name<input className="form-input" required value={blacklistForm.workerName} onChange={(e) => setBlacklistForm((f) => ({ ...f, workerName: e.target.value }))} /></label>
              <label>Phone<input className="form-input" value={blacklistForm.workerPhone} onChange={(e) => setBlacklistForm((f) => ({ ...f, workerPhone: e.target.value }))} /></label>
              <label>Company<input className="form-input" value={blacklistForm.company} onChange={(e) => setBlacklistForm((f) => ({ ...f, company: e.target.value }))} /></label>
              <label>Incident date<input className="form-input" type="date" value={blacklistForm.incidentDate} onChange={(e) => setBlacklistForm((f) => ({ ...f, incidentDate: e.target.value }))} /></label>
              <label>Recorded by<input className="form-input" value={blacklistForm.recordedByName} onChange={(e) => setBlacklistForm((f) => ({ ...f, recordedByName: e.target.value }))} /></label>
              <label className="estate-form-wide">Reason<textarea className="form-input" rows={3} required value={blacklistForm.reason} onChange={(e) => setBlacklistForm((f) => ({ ...f, reason: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "blacklist"}>{savingKey === "blacklist" ? "Saving..." : blacklistForm.id ? "Update" : "Add to Blacklist"}</button>{blacklistForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setBlacklistForm(initialBlacklistForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Committees ── */}
      {!loading && activeModule === "committees" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Governance committees</span><h3>Create and manage estate committees</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveCommittee}>
              <label className="estate-form-wide">Committee name<input className="form-input" required value={committeeForm.name} onChange={(e) => setCommitteeForm((f) => ({ ...f, name: e.target.value }))} /></label>
              <label className="estate-form-wide">Description<textarea className="form-input" rows={2} value={committeeForm.description} onChange={(e) => setCommitteeForm((f) => ({ ...f, description: e.target.value }))} /></label>
              <label className="estate-form-wide">Members (comma-separated names)<input className="form-input" value={committeeForm.memberNames} placeholder="John Doe, Jane Smith, ..." onChange={(e) => setCommitteeForm((f) => ({ ...f, memberNames: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "committee"}>{savingKey === "committee" ? "Saving..." : committeeForm.id ? "Update" : "Create Committee"}</button>{committeeForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setCommitteeForm(initialCommitteeForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Resolutions ── */}
      {!loading && activeModule === "resolutions" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Meeting resolutions</span><h3>Record decisions, votes & resolutions</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveResolution}>
              <label>Meeting date<input className="form-input" type="date" required value={resolutionForm.meetingDate} onChange={(e) => setResolutionForm((f) => ({ ...f, meetingDate: e.target.value }))} /></label>
              <label>Status<select className="form-input" value={resolutionForm.status} onChange={(e) => setResolutionForm((f) => ({ ...f, status: e.target.value }))}><option value="PASSED">Passed</option><option value="REJECTED">Rejected</option><option value="TABLED">Tabled</option></select></label>
              <label className="estate-form-wide">Title<input className="form-input" required value={resolutionForm.title} onChange={(e) => setResolutionForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label className="estate-form-wide">Resolution text<textarea className="form-input" rows={3} required value={resolutionForm.resolution} onChange={(e) => setResolutionForm((f) => ({ ...f, resolution: e.target.value }))} /></label>
              <label>Votes for<input className="form-input" type="number" value={resolutionForm.votesFor} onChange={(e) => setResolutionForm((f) => ({ ...f, votesFor: e.target.value }))} /></label>
              <label>Votes against<input className="form-input" type="number" value={resolutionForm.votesAgainst} onChange={(e) => setResolutionForm((f) => ({ ...f, votesAgainst: e.target.value }))} /></label>
              <label>Abstained<input className="form-input" type="number" value={resolutionForm.votesAbstained} onChange={(e) => setResolutionForm((f) => ({ ...f, votesAbstained: e.target.value }))} /></label>
              <label>Recorded by<input className="form-input" value={resolutionForm.recordedByName} onChange={(e) => setResolutionForm((f) => ({ ...f, recordedByName: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "resolution"}>{savingKey === "resolution" ? "Saving..." : resolutionForm.id ? "Update" : "Record Resolution"}</button>{resolutionForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setResolutionForm(initialResolutionForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Payroll ── */}
      {!loading && activeModule === "payroll" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Payroll</span><h3>Run monthly worker salary payments</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSavePayroll}>
              <label className="estate-form-wide">Period label<input className="form-input" required value={payrollForm.periodLabel} placeholder="e.g. March 2025" onChange={(e) => setPayrollForm((f) => ({ ...f, periodLabel: e.target.value }))} /></label>
              <label>Period start<input className="form-input" type="date" required value={payrollForm.periodStart} onChange={(e) => setPayrollForm((f) => ({ ...f, periodStart: e.target.value }))} /></label>
              <label>Period end<input className="form-input" type="date" required value={payrollForm.periodEnd} onChange={(e) => setPayrollForm((f) => ({ ...f, periodEnd: e.target.value }))} /></label>
              <label>Status<select className="form-input" value={payrollForm.status} onChange={(e) => setPayrollForm((f) => ({ ...f, status: e.target.value }))}><option value="DRAFT">Draft</option><option value="APPROVED">Approved</option><option value="PAID">Paid</option></select></label>
              <label className="estate-form-wide">Notes<textarea className="form-input" rows={2} value={payrollForm.notes} onChange={(e) => setPayrollForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <p className="estate-form-wide" style={{ fontSize: 13, color: "var(--ink3)" }}>Entries will be generated from all active workers and their monthly salary on record.</p>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "payroll"}>{savingKey === "payroll" ? "Saving..." : payrollForm.id ? "Update Run" : "Create Payroll Run"}</button>{payrollForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setPayrollForm(initialPayrollForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      {/* ── Duty Roster ── */}
      {!loading && activeModule === "roster" ? (
        <section className="estate-grid">
          <article className="estate-card">
            <div className="estate-card-header"><div><span className="eyebrow">Duty roster</span><h3>Schedule worker shifts & track attendance</h3></div></div>
            <form className="estate-form-grid" onSubmit={handleSaveRoster}>
              <label>Worker<select className="form-input" value={rosterForm.workerId} onChange={(e) => { const w = dashboard?.workers.find((x) => x.id === e.target.value); setRosterForm((f) => ({ ...f, workerId: e.target.value, workerName: w?.fullName ?? "", workerRole: w?.role ?? "" })); }}><option value="">Select worker</option>{dashboard?.workers.map((w) => <option key={w.id} value={w.id}>{w.fullName} — {w.role}</option>)}</select></label>
              <label>Date<input className="form-input" type="date" required value={rosterForm.date} onChange={(e) => setRosterForm((f) => ({ ...f, date: e.target.value }))} /></label>
              <label>Shift start<input className="form-input" type="time" required value={rosterForm.shiftStart} onChange={(e) => setRosterForm((f) => ({ ...f, shiftStart: e.target.value }))} /></label>
              <label>Shift end<input className="form-input" type="time" required value={rosterForm.shiftEnd} onChange={(e) => setRosterForm((f) => ({ ...f, shiftEnd: e.target.value }))} /></label>
              <label className="estate-form-wide">Notes<textarea className="form-input" rows={2} value={rosterForm.notes} onChange={(e) => setRosterForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              <div className="estate-form-actions estate-form-wide"><button type="submit" className="btn btn-primary" disabled={savingKey === "roster"}>{savingKey === "roster" ? "Saving..." : rosterForm.id ? "Update Shift" : "Schedule Shift"}</button>{rosterForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setRosterForm(initialRosterForm)}>Cancel</button> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      <style jsx>{`
        .estate-module-row,
        .estate-toolbar,
        .estate-form-actions,
        .estate-inline-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .estate-top-gap {
          margin-top: 18px;
        }

        .estate-module-pill {
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 700;
          color: var(--ink2);
          cursor: pointer;
        }

        .estate-module-pill.is-active {
          background: rgba(26, 58, 42, 0.08);
          border-color: rgba(26, 58, 42, 0.28);
          color: var(--accent);
        }

        .estate-feedback {
          margin: 16px 0;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(26, 58, 42, 0.08);
          color: var(--ink2);
          font-size: 14px;
        }

        .estate-hero-grid {
          display: grid;
          grid-template-columns: minmax(280px, 1.1fr) minmax(280px, 1fr);
          gap: 18px;
          margin: 18px 0;
        }

        .estate-hero-card,
        .estate-card,
        .estate-stat-grid {
          border-radius: 24px;
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .estate-hero-card {
          padding: 24px;
          background: linear-gradient(135deg, rgba(13, 58, 43, 0.98), rgba(31, 95, 70, 0.94));
          color: #fff;
        }

        .estate-hero-card h2 {
          margin: 8px 0 6px;
          font-size: 30px;
          line-height: 1.1;
        }

        .estate-note {
          margin-top: 14px;
          color: rgba(255, 255, 255, 0.82);
        }

        .estate-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 12px;
        }

        .estate-stat-card {
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 18px;
        }

        .estate-stat-card strong {
          display: block;
          margin-top: 8px;
          font-size: 30px;
          line-height: 1;
        }

        .estate-stat-card small {
          display: block;
          margin-top: 8px;
          color: var(--ink3);
        }

        .estate-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .estate-card {
          padding: 22px;
        }

        .estate-card--wide {
          grid-column: 1 / -1;
        }

        .estate-card-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .estate-card h3 {
          margin: 6px 0 0;
          font-size: 22px;
          line-height: 1.2;
        }

        .eyebrow {
          display: inline-flex;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink3);
          font-weight: 700;
        }

        .estate-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(26, 58, 42, 0.12);
          color: var(--accent);
          font-weight: 700;
          height: fit-content;
        }

        .estate-pill--accent {
          background: rgba(198, 161, 92, 0.16);
        }

        .estate-form-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .estate-form-grid label {
          display: grid;
          gap: 8px;
          font-weight: 600;
          color: var(--ink2);
        }

        .estate-form-wide {
          grid-column: 1 / -1;
        }

        .estate-check {
          display: flex !important;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }

        .estate-stack {
          display: grid;
          gap: 12px;
        }

        .estate-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 14px 16px;
          background: #fff;
        }

        .estate-row p {
          margin: 6px 0 0;
          color: var(--ink3);
        }

        .estate-row-right {
          text-align: right;
          min-width: 140px;
        }

        .estate-row-right span {
          display: block;
          margin-top: 6px;
          color: var(--ink3);
        }

        .estate-danger {
          color: #9f2f2f;
        }

        .estate-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .estate-tag {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--surface-2);
          color: var(--ink2);
          font-size: 12px;
          font-weight: 600;
        }

        .estate-cause,
        .estate-governance {
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 14px 16px;
        }

        .estate-progress {
          margin-top: 14px;
          border-radius: 999px;
          overflow: hidden;
          background: var(--surface-2);
          height: 12px;
        }

        .estate-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #0d5a3a, #3ba46f);
        }

        .estate-pass-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }

        .estate-pass-card {
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
        }

        .estate-pass-card p {
          margin: 6px 0 0;
          color: var(--ink3);
        }

        .estate-pass-code {
          margin-top: 12px;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .estate-pass-qr {
          width: 112px;
          height: 112px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
        }

        .estate-template-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .estate-template-card {
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 16px;
          background: #fff;
          text-align: left;
          cursor: pointer;
        }

        .estate-template-card.is-active {
          border-color: rgba(26, 58, 42, 0.32);
          box-shadow: inset 0 0 0 1px rgba(26, 58, 42, 0.12);
        }

        .estate-template-card p {
          margin: 8px 0 0;
          color: var(--ink3);
          line-height: 1.55;
        }

        .estate-preview-card {
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 18px;
          display: grid;
          gap: 14px;
          background: var(--surface-2);
        }

        .estate-preview-banner {
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(13, 58, 43, 0.96), rgba(28, 93, 67, 0.92));
          color: #fff;
          padding: 22px;
        }

        .estate-preview-banner h2 {
          margin: 0 0 10px;
          font-size: 28px;
          line-height: 1.1;
        }

        .estate-preview-banner p {
          margin: 0;
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.6;
        }

        .estate-preview-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }

        @media (max-width: 900px) {
          .estate-hero-grid,
          .estate-grid,
          .estate-form-grid {
            grid-template-columns: 1fr;
          }

          .estate-form-wide {
            grid-column: auto;
          }
        }
      `}</style>
    </>
  );
}

export default function EstateDashboardPage() {
  const router = useRouter();
  const activeModule = getEstateModule(router.query.module);

  function handleSelectModule(module: EstateModuleKey) {
    void router.push(module === "overview" ? "/estate" : `/estate?module=${module}`);
  }

  return (
    <>
      <PageMeta
        title="DoorRent — Estate Workspace"
        description="Estate admin modules for dues, treasury, contributions, workers, one-time passes, governance, and branded landing pages."
        urlPath={`/estate${activeModule === "overview" ? "" : `?module=${activeModule}`}`}
      />
      <EstatePortalShell
        topbarTitle="Estate Workspace"
        breadcrumb={`Estate → ${ESTATE_MODULES.find((item) => item.key === activeModule)?.label ?? "Overview"}`}
      >
        <EstateWorkspaceContent
          activeModule={activeModule}
          onSelectModule={handleSelectModule}
        />
      </EstatePortalShell>
    </>
  );
}
