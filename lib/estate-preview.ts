export type EstateBillingBasis = "UNIT_BASED" | "RESIDENT_BASED";

export type EstateCharge = {
  id: string;
  name: string;
  basis: EstateBillingBasis;
  amount: number;
  frequency: string;
  status: string;
};

export type EstateCause = {
  id: string;
  title: string;
  targetAmount: number;
  contributedAmount: number;
  deadline: string;
  contributors: number;
};

export type EstateWorker = {
  id: string;
  name: string;
  role: string;
  phone: string;
  monthlyPay: number;
  shift: string;
  onDuty: boolean;
};

export type EstateExpense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  status: string;
  requestedBy: string;
  approvals: string[];
};

export type EstateApproval = {
  id: string;
  title: string;
  stage: string;
  requiredApprovals: number;
  receivedApprovals: number;
  approvers: string[];
};

export type EstateLandingTemplate = {
  id: string;
  name: string;
  summary: string;
  sections: string[];
};

export type EstateResident = {
  id: string;
  fullName: string;
  houseNumber: string;
  status: string;
  phone: string;
  billingBasis: EstateBillingBasis;
};

export type EstateHouse = {
  id: string;
  houseNumber: string;
  block: string;
  ownerName: string;
  occupiedBy: number;
  billingBasis: EstateBillingBasis;
};

export type EstatePass = {
  id: string;
  type: "WORKER" | "VISITOR" | "DELIVERY";
  houseNumber: string;
  holder: string;
  peopleCount: number;
  code: string;
  validFrom: string;
  validUntil: string;
};

export type EstateDashboardData = {
  estate: {
    id?: string;
    name: string;
    location: string;
    subdomain: string;
    brandingStatus: string;
    description?: string | null;
    defaultBillingBasis?: EstateBillingBasis;
    qrGateEnforcement?: boolean;
    accessCodeRequired?: boolean;
    exitCodeRequired?: boolean;
    allowResidentCrowdfunding?: boolean;
    landingTemplateId?: string | null;
    landingHeroTitle?: string | null;
    landingHeroSubtitle?: string | null;
    landingPrimaryCta?: string | null;
    landingSecondaryCta?: string | null;
  };
  overview: {
    houses: number;
    residents: number;
    billedThisCycle: number;
    collectedThisCycle: number;
    workersOnDuty: number;
    pendingApprovals: number;
  };
  charges: Array<{
    id: string;
    title: string;
    billingBasis: EstateBillingBasis;
    amount: number;
    frequency: string;
    status: string;
    notes?: string | null;
  }>;
  residences: Array<{
    id: string;
    houseNumber: string;
    block?: string | null;
    label?: string | null;
    ownerName?: string | null;
    ownerPhone?: string | null;
    occupantsCount: number;
    billingBasis: EstateBillingBasis;
    status: string;
    accessCode: string;
    exitCode: string;
    notes?: string | null;
  }>;
  residents: Array<{
    id: string;
    fullName: string;
    houseNumber?: string | null;
    email?: string | null;
    status: string;
    phone?: string | null;
    residentType: string;
    billingBasis?: EstateBillingBasis | null;
    canAccessResidentPortal: boolean;
  }>;
  expenses: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    status: string;
    requestedByName?: string | null;
    incurredOn?: string | null;
    notes?: string | null;
  }>;
  causes: Array<{
    id: string;
    title: string;
    description?: string | null;
    targetAmount: number;
    contributionMode: "FLEXIBLE" | "FIXED";
    fixedContributionAmount?: number | null;
    contributedAmount: number;
    deadline?: string | null;
    contributors: number;
    status: string;
  }>;
  contributions: Array<{
    id: string;
    causeId: string;
    residentId?: string | null;
    contributorName: string;
    amount: number;
    status: string;
    note?: string | null;
    paidAt?: string | null;
  }>;
  workers: Array<{
    id: string;
    fullName: string;
    role: string;
    phone?: string | null;
    monthlySalary: number;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    shiftLabel?: string | null;
    onDuty: boolean;
    status: string;
    notes?: string | null;
  }>;
  approvals: Array<{
    id: string;
    type: "EXPENSE" | "CAUSE" | "LEVY" | "EXCO_HANDOVER" | "POLICY";
    title: string;
    entityType?: string | null;
    entityId?: string | null;
    status: string;
    requiredApprovals: number;
    receivedApprovals: number;
    approvers: string[];
  }>;
  passes: Array<{
    id: string;
    type: "WORKER" | "VISITOR" | "DELIVERY" | "VEHICLE" | "MOVE";
    houseNumber?: string | null;
    holderName: string;
    purpose?: string | null;
    peopleCount: number;
    vehicleDetails?: string | null;
    accessCode: string;
    qrToken: string;
    validFrom: string;
    validUntil: string;
    status: string;
  }>;
};

export const estatePreview = {
  estate: {
    name: "Lekki Palm Court Residents Association",
    location: "Lekki Phase 1, Lagos",
    subdomain: "palmcourt.usedoorrent.com",
    brandingStatus: "Custom logo, colors, subdomain, and public landing page ready",
  },
  overview: {
    houses: 128,
    residents: 362,
    billedThisCycle: 12450000,
    collectedThisCycle: 10380000,
    workersOnDuty: 9,
    pendingApprovals: 4,
  },
  charges: [
    {
      id: "security",
      name: "Security Fee",
      basis: "UNIT_BASED" as const,
      amount: 45000,
      frequency: "Monthly",
      status: "Live",
    },
    {
      id: "waste",
      name: "Waste Fee",
      basis: "UNIT_BASED" as const,
      amount: 12000,
      frequency: "Monthly",
      status: "Live",
    },
    {
      id: "estate-levy",
      name: "Estate Levy",
      basis: "RESIDENT_BASED" as const,
      amount: 18000,
      frequency: "Quarterly",
      status: "Live",
    },
    {
      id: "road-special",
      name: "Road Rehabilitation Levy",
      basis: "UNIT_BASED" as const,
      amount: 85000,
      frequency: "One-off",
      status: "Draft",
    },
  ],
  houses: [
    {
      id: "house-a1",
      houseNumber: "A1",
      block: "Block A",
      ownerName: "Babatunde Adeyemi",
      occupiedBy: 4,
      billingBasis: "UNIT_BASED" as const,
    },
    {
      id: "house-b3",
      houseNumber: "B3",
      block: "Block B",
      ownerName: "Mariam Bello",
      occupiedBy: 2,
      billingBasis: "RESIDENT_BASED" as const,
    },
    {
      id: "house-c7",
      houseNumber: "C7",
      block: "Block C",
      ownerName: "Osinachi Chidinma",
      occupiedBy: 5,
      billingBasis: "UNIT_BASED" as const,
    },
  ],
  residents: [
    {
      id: "resident-1",
      fullName: "Gerald Olumide",
      houseNumber: "A1",
      status: "Resident",
      phone: "08030001111",
      billingBasis: "UNIT_BASED" as const,
    },
    {
      id: "resident-2",
      fullName: "Naomi Cleveland",
      houseNumber: "B3",
      status: "Resident",
      phone: "08030002222",
      billingBasis: "RESIDENT_BASED" as const,
    },
    {
      id: "resident-3",
      fullName: "Femi Damilola",
      houseNumber: "C7",
      status: "Landlord",
      phone: "08030003333",
      billingBasis: "UNIT_BASED" as const,
    },
  ],
  expenses: [
    {
      id: "expense-1",
      title: "April security payroll",
      category: "Payroll",
      amount: 720000,
      status: "Awaiting final approval",
      requestedBy: "Estate manager",
      approvals: ["Treasurer", "Chairman"],
    },
    {
      id: "expense-2",
      title: "Streetlight cable replacement",
      category: "Infrastructure",
      amount: 310000,
      status: "Approved",
      requestedBy: "Facilities lead",
      approvals: ["Treasurer", "Vice chairman", "Chairman"],
    },
    {
      id: "expense-3",
      title: "Waste contractor invoice",
      category: "Operations",
      amount: 180000,
      status: "Pending committee review",
      requestedBy: "Finance officer",
      approvals: ["Treasurer"],
    },
  ],
  causes: [
    {
      id: "cause-road",
      title: "Inner road rehabilitation",
      targetAmount: 4500000,
      contributedAmount: 2950000,
      deadline: "30 Apr 2026",
      contributors: 84,
    },
    {
      id: "cause-cctv",
      title: "Additional CCTV coverage",
      targetAmount: 1800000,
      contributedAmount: 1160000,
      deadline: "18 Apr 2026",
      contributors: 59,
    },
  ],
  workers: [
    {
      id: "worker-1",
      name: "Musa Ibrahim",
      role: "Security Lead",
      phone: "08035550001",
      monthlyPay: 145000,
      shift: "Day shift",
      onDuty: true,
    },
    {
      id: "worker-2",
      name: "Grace Aina",
      role: "Estate Manager",
      phone: "08035550002",
      monthlyPay: 220000,
      shift: "Admin desk",
      onDuty: true,
    },
    {
      id: "worker-3",
      name: "John Bassey",
      role: "Gardener",
      phone: "08035550003",
      monthlyPay: 85000,
      shift: "Morning",
      onDuty: false,
    },
    {
      id: "worker-4",
      name: "Sade Lawal",
      role: "Cleaner",
      phone: "08035550004",
      monthlyPay: 78000,
      shift: "Evening",
      onDuty: true,
    },
  ],
  approvals: [
    {
      id: "approval-1",
      title: "Treasurer handover to 2026 exco",
      stage: "Handover ratification",
      requiredApprovals: 4,
      receivedApprovals: 3,
      approvers: ["Chairman", "Secretary", "Outgoing treasurer"],
    },
    {
      id: "approval-2",
      title: "Road levy activation",
      stage: "Committee approval",
      requiredApprovals: 5,
      receivedApprovals: 2,
      approvers: ["Chairman", "Infrastructure chair"],
    },
  ],
  templates: [
    {
      id: "template-estate",
      name: "Estate Official Landing",
      summary: "Best for resident communication, dues, announcements, and gate information.",
      sections: ["Hero", "About", "Estate fees", "Notices", "Contacts", "FAQ"],
    },
    {
      id: "template-company",
      name: "Property Company Showcase",
      summary: "Best for enterprise property companies, listings, portfolio trust, and leasing enquiries.",
      sections: ["Hero", "Portfolio", "Listings", "Team", "Testimonials", "CTA"],
    },
    {
      id: "template-operations",
      name: "Resident Operations Portal",
      summary: "Best for estate worker duty roster, visitor pass notices, and service updates.",
      sections: ["Hero", "Passes", "On-duty team", "Service requests", "Emergency contacts"],
    },
  ],
  passes: [
    {
      id: "pass-1",
      type: "WORKER" as const,
      houseNumber: "A1",
      holder: "Apex Aluminium Works",
      peopleCount: 3,
      code: "ET-482913",
      validFrom: "5 Apr · 8:00am",
      validUntil: "5 Apr · 5:00pm",
    },
    {
      id: "pass-2",
      type: "DELIVERY" as const,
      houseNumber: "C7",
      holder: "Fresh Basket Delivery",
      peopleCount: 1,
      code: "ET-731205",
      validFrom: "5 Apr · 1:00pm",
      validUntil: "5 Apr · 3:00pm",
    },
  ],
};

export const estateResidentPreview = {
  residentName: "Gerald Olumide",
  estateName: estatePreview.estate.name,
  houseNumber: "A1",
  duesDue: 57000,
  duesStatus: "Current cycle due on 10 Apr 2026",
  contributionSpotlight: estatePreview.causes[0],
};

export type EstatePreviewData = typeof estatePreview;

export function formatEstateCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildEstateQrUrl(payload: string) {
  return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=220&margin=1`;
}

export function createEstatePass(input: {
  type: EstatePass["type"];
  houseNumber: string;
  holder: string;
  peopleCount: number;
  validFrom: string;
  validUntil: string;
}) {
  const code = `ET-${Math.floor(100000 + Math.random() * 900000)}`;
  return {
    id: `${code}-${Date.now()}`,
    type: input.type,
    houseNumber: input.houseNumber.trim().toUpperCase(),
    holder: input.holder.trim(),
    peopleCount: input.peopleCount,
    code,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
  };
}

export function convertRowsToCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number) => {
    const raw = String(value ?? "");
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? "")).join(",")),
  ].join("\n");
}

export function parseCsvText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { headers: [] as string[], rows: [] as string[][] };
  }

  const headers = lines[0].split(",").map((cell) => cell.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));

  return { headers, rows };
}

export function mapEstateDashboardToPreviewData(data: EstateDashboardData) {
  return {
    estate: data.estate,
    overview: data.overview,
    charges: data.charges.map((charge) => ({
      id: charge.id,
      name: charge.title,
      basis: charge.billingBasis,
      amount: charge.amount,
      frequency: charge.frequency,
      status: charge.status,
    })),
    houses: data.residences.map((residence) => ({
      id: residence.id,
      houseNumber: residence.houseNumber,
      block: residence.block ?? "—",
      label: residence.label ?? null,
      ownerName: residence.ownerName ?? "—",
      ownerPhone: residence.ownerPhone ?? null,
      occupiedBy: residence.occupantsCount,
      billingBasis: residence.billingBasis,
      status: residence.status,
      accessCode: residence.accessCode,
      exitCode: residence.exitCode,
      notes: residence.notes ?? null,
    })),
    residents: data.residents.map((resident) => ({
      id: resident.id,
      fullName: resident.fullName,
      houseNumber: resident.houseNumber ?? "—",
      email: resident.email ?? null,
      status: resident.status,
      phone: resident.phone ?? "—",
      residentType: resident.residentType,
      billingBasis: resident.billingBasis ?? "UNIT_BASED",
      canAccessResidentPortal: resident.canAccessResidentPortal,
    })),
    expenses: data.expenses.map((expense) => ({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      status: expense.status,
      requestedBy: expense.requestedByName ?? "Estate admin",
      approvals: [],
      incurredOn: expense.incurredOn ?? null,
      notes: expense.notes ?? null,
    })),
    causes: data.causes.map((cause) => ({
      id: cause.id,
      title: cause.title,
      description: cause.description ?? null,
      targetAmount: cause.targetAmount,
      contributionMode: cause.contributionMode,
      fixedContributionAmount: cause.fixedContributionAmount ?? null,
      contributedAmount: cause.contributedAmount,
      deadline: cause.deadline
        ? new Intl.DateTimeFormat("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(cause.deadline))
        : "Open",
      contributors: cause.contributors,
      status: cause.status,
    })),
    workers: data.workers.map((worker) => ({
      id: worker.id,
      name: worker.fullName,
      role: worker.role,
      phone: worker.phone ?? "—",
      monthlyPay: worker.monthlySalary,
      bankName: worker.bankName ?? null,
      bankAccountNumber: worker.bankAccountNumber ?? null,
      shift: worker.shiftLabel ?? "Shift not set",
      onDuty: worker.onDuty,
      status: worker.status,
      notes: worker.notes ?? null,
    })),
    approvals: data.approvals.map((approval) => ({
      id: approval.id,
      type: approval.type,
      title: approval.title,
      entityType: approval.entityType ?? null,
      entityId: approval.entityId ?? null,
      stage: approval.status,
      requiredApprovals: approval.requiredApprovals,
      receivedApprovals: approval.receivedApprovals,
      approvers: approval.approvers,
    })),
    templates: estatePreview.templates,
    passes: data.passes.map((pass) => ({
      id: pass.id,
      type:
        pass.type === "VEHICLE" || pass.type === "MOVE"
          ? "VISITOR"
          : pass.type,
      houseNumber: pass.houseNumber ?? "—",
      holder: pass.holderName,
      purpose: pass.purpose ?? null,
      peopleCount: pass.peopleCount,
      vehicleDetails: pass.vehicleDetails ?? null,
      code: pass.accessCode,
      qrToken: pass.qrToken,
      validFrom: new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(pass.validFrom)),
      validUntil: new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(pass.validUntil)),
      status: pass.status,
    })),
  };
}
