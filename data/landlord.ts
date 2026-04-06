import type {
  AppUser,
  ArrearsRow,
  ChartPoint,
  HighlightBanner,
  LandlordAgreementRow,
  LandlordNotificationPreference,
  LandlordNoticeRow,
  LandlordPayoutSettings,
  LandlordProfile,
  LandlordQuickNoticeAction,
  LandlordReceiptRow,
  LandlordReminderLogRow,
  LandlordReminderRule,
  LandlordUnitRow,
  NavSection,
  PaymentHistoryRow,
  PaymentRecord,
  PropertyPortfolioItem,
  RevenueBreakdownRow,
  StatItem,
  TenantLedgerRow,
  TenantInviteRow,
  TeamMember,
} from "../types/app";
import {
  resolveLandlordCapabilities,
  type LandlordCapabilities,
} from "../lib/landlord-access";

export const landlordUser: AppUser = {
  name: "Babatunde Adeyemi",
  role: "Workspace owner",
  initials: "BA",
};

const landlordNavSections: NavSection[] = [
  {
    section: "Main",
    items: [
      { label: "Overview", href: "/landlord", icon: "grid" },
      { label: "Properties", href: "/landlord/properties", icon: "home" },
      { label: "Units", href: "/landlord/units", icon: "building" },
      { label: "Tenants", href: "/landlord/tenants", icon: "users", badge: "3" },
      {
        label: "Agreements",
        href: "/landlord/agreements",
        icon: "doc",
        badge: "2",
        badgeClass: "amber",
      },
    ],
  },
  {
    section: "Finance",
    items: [
      { label: "Payments", href: "/landlord/payments", icon: "card" },
      { label: "Receipts", href: "/landlord/receipts", icon: "receipt" },
      { label: "Rent Defaults", href: "/landlord/rent-defaults", icon: "bell" },
    ],
  },
  {
    section: "Communication",
    items: [
      { label: "Meetings", href: "/landlord/meetings", icon: "clock" },
      { label: "Notices", href: "/landlord/notices", icon: "bell" },
      { label: "Reminders", href: "/landlord/reminders", icon: "clock" },
      { label: "Notifications", href: "/landlord/notifications", icon: "chat" },
    ],
  },
  {
    section: "Analytics",
    items: [
      { label: "Reports", href: "/landlord/reports", icon: "chart" },
      { label: "Audit Log", href: "/landlord/audit", icon: "log" },
    ],
  },
  {
    section: "Tools",
    items: [
      { label: "Integrations", href: "/landlord/integrations", icon: "grid" },
      { label: "Landing Page Builder", href: "/landlord/landing", icon: "settings" },
    ],
  },
  {
    section: "Account",
    items: [
      // { label: "Caretakers", href: "/landlord/caretakers", icon: "users" },
      { label: "Settings", href: "/landlord/settings", icon: "settings" },
    ],
  },
];

export function buildLandlordNav(
  capabilities?: Partial<LandlordCapabilities> | null,
) {
  const resolved = resolveLandlordCapabilities({ capabilities });
  return landlordNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.href === "/landlord/properties") {
          return resolved.canManageProperties;
        }

        if (item.href === "/landlord/units") {
          return resolved.canManageUnits;
        }

        if (item.href === "/landlord/tenants") {
          return resolved.canManageTenants;
        }

        if (item.href === "/landlord/agreements") {
          return resolved.canManageAgreements;
        }

        if (item.href === "/landlord/payments") {
          return resolved.canManagePayments;
        }

        if (item.href === "/landlord/receipts") {
          return resolved.canViewReceipts;
        }

        if (item.href === "/landlord/reminders") {
          return resolved.canManageReminders;
        }

        if (item.href === "/landlord/meetings") {
          return resolved.canManageMeetings;
        }

        if (item.href === "/landlord/notifications") {
          return resolved.canViewNotifications;
        }

        if (item.href === "/landlord/reports") {
          return resolved.canViewReports;
        }

        if (item.href === "/landlord/caretakers") {
          return resolved.canManageCaretakers;
        }

        if (item.href === "/landlord/notices") {
          return resolved.canManageNotices;
        }

        if (item.href === "/landlord/landing") {
          return resolved.canManageAccountUpdates || resolved.canManageBranding;
        }

        if (item.href === "/landlord/rent-defaults") {
          return resolved.canManageRiskWorkflows;
        }

        if (item.href === "/landlord/settings") {
          return (
            resolved.canManageAccountUpdates ||
            resolved.canManageTeamMembers ||
            resolved.canManageBranding ||
            resolved.canManageCaretakers ||
            resolved.canManageEmergency ||
            resolved.canDeleteAccount ||
            resolved.canUseBiometricUnlock
          );
        }

        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export const landlordNav = buildLandlordNav();

export const landlordHighlights: HighlightBanner[] = [
  {
    title: "3 tenants have overdue rent",
    body: "Total outstanding: ₦780,000 · Oldest overdue: 21 days",
    tone: "red",
    cta: { label: "View arrears", href: "/landlord/payments" },
  },
  {
    title: "2 leases expire within 30 days",
    body: "Send renewal notices to avoid vacancies",
    tone: "amber",
    cta: { label: "View leases", href: "/landlord/tenants" },
  },
];

export const landlordStats: StatItem[] = [
  {
    label: "Properties",
    value: "4",
    subtext: "24 total units",
    icon: "🏠",
    accent: "green",
    href: "/landlord/properties",
  },
  {
    label: "Occupancy",
    value: "87.5%",
    subtext: "▲ 21 of 24 occupied",
    icon: "📐",
    accent: "blue",
    href: "/landlord/properties",
  },
  {
    label: "Collected (Mar)",
    value: "₦3.12M",
    subtext: "↑ 12% vs Feb",
    icon: "₦",
    accent: "gold",
    href: "/landlord/payments",
  },
  {
    label: "Overdue Rent",
    value: "₦780K",
    subtext: "3 tenants overdue",
    icon: "⚠",
    accent: "red",
    href: "/landlord/payments",
  },
  {
    label: "Due This Month",
    value: "₦560K",
    subtext: "7 invoices pending",
    icon: "📋",
    accent: "amber",
    href: "/landlord/payments",
  },
  {
    label: "Awaiting Signature",
    value: "2",
    subtext: "Agreements pending",
    icon: "✍",
    accent: "gold",
    href: "/landlord/agreements",
  },
];

export const landlordCollection: ChartPoint[] = [
  { label: "A", value: 1.2, display: "1.2M" },
  { label: "M", value: 1.5, display: "1.5M" },
  { label: "J", value: 1.4, display: "1.4M" },
  { label: "J", value: 1.8, display: "1.8M" },
  { label: "A", value: 2.1, display: "2.1M" },
  { label: "S", value: 1.9, display: "1.9M" },
  { label: "O", value: 2.3, display: "2.3M" },
  { label: "N", value: 2.0, display: "2.0M" },
  { label: "D", value: 2.8, display: "2.8M" },
  { label: "J", value: 2.4, display: "2.4M" },
  { label: "F", value: 2.9, display: "2.9M" },
  { label: "M", value: 3.1, display: "3.1M" },
];

export const landlordProperties: PropertyPortfolioItem[] = [
  {
    name: "Lekki Gardens Estate",
    location: "Lekki Phase 1, Lagos",
    category: "Residential",
    units: 8,
    occupied: 7,
    monthly: "₦1.05M",
    occupancy: 87,
    index: 1,
  },
  {
    name: "VI Towers",
    location: "Victoria Island, Lagos",
    category: "Mixed",
    units: 10,
    occupied: 9,
    monthly: "₦2.24M",
    occupancy: 90,
    index: 2,
  },
  {
    name: "Ikoyi Residences",
    location: "Ikoyi, Lagos",
    category: "Residential",
    units: 4,
    occupied: 4,
    monthly: "₦1.28M",
    occupancy: 100,
    index: 3,
  },
  {
    name: "Yaba Court",
    location: "Yaba, Lagos",
    category: "Residential",
    units: 2,
    occupied: 1,
    monthly: "₦190K",
    occupancy: 50,
    index: 4,
  },
];

export const landlordRecentPayments: PaymentRecord[] = [
  {
    tenant: "Amaka Obi",
    unit: "Lekki Gardens / A3",
    amount: "₦150,000",
    date: "Mar 18",
    method: "Paystack",
    status: "paid",
  },
  {
    tenant: "Emeka Nwosu",
    unit: "VI Towers / 12B",
    amount: "₦280,000",
    date: "Mar 15",
    method: "Paystack",
    status: "paid",
  },
  {
    tenant: "Chidinma Eze",
    unit: "Ikoyi Residences / 5A",
    amount: "₦320,000",
    date: "Mar 10",
    method: "Paystack",
    status: "paid",
  },
  {
    tenant: "Tunde Adeola",
    unit: "Lekki Gardens / B1",
    amount: "₦150,000",
    date: "Mar 1",
    method: "—",
    status: "overdue",
  },
  {
    tenant: "Ngozi Adichie",
    unit: "VI Towers / 8C",
    amount: "₦280,000",
    date: "Feb 28",
    method: "—",
    status: "overdue",
  },
  {
    tenant: "Bayo Martins",
    unit: "Yaba Court / 1F",
    amount: "₦95,000",
    date: "Mar 20",
    method: "Paystack",
    status: "paid",
  },
];

export const landlordTenants: TenantLedgerRow[] = [
  {
    tenant: "Amaka Obi",
    email: "ao@email.com",
    unit: "A3 · Lekki",
    rent: "₦150,000",
    leaseEnd: "Mar 2027",
    balance: "—",
    status: "current",
  },
  {
    tenant: "Emeka Nwosu",
    email: "en@email.com",
    unit: "12B · VI",
    rent: "₦280,000",
    leaseEnd: "Apr 2026",
    balance: "—",
    status: "expiring",
  },
  {
    tenant: "Chidinma Eze",
    email: "ce@email.com",
    unit: "5A · Ikoyi",
    rent: "₦320,000",
    leaseEnd: "Sep 2026",
    balance: "—",
    status: "current",
  },
  {
    tenant: "Tunde Adeola",
    email: "ta@email.com",
    unit: "B1 · Lekki",
    rent: "₦150,000",
    leaseEnd: "Dec 2026",
    balance: "₦150,000",
    status: "overdue",
  },
  {
    tenant: "Ngozi Adichie",
    email: "na@email.com",
    unit: "8C · VI",
    rent: "₦280,000",
    leaseEnd: "Mar 2026",
    balance: "₦560,000",
    status: "overdue",
  },
  {
    tenant: "Bayo Martins",
    email: "bm@email.com",
    unit: "1F · Yaba",
    rent: "₦95,000",
    leaseEnd: "Jun 2026",
    balance: "—",
    status: "current",
  },
  {
    tenant: "Kelechi Dike",
    email: "kd@email.com",
    unit: "3B · Ikoyi",
    rent: "₦295,000",
    leaseEnd: "Aug 2026",
    balance: "—",
    status: "current",
  },
];

export const landlordPendingInvites: TenantInviteRow[] = [
  {
    email: "amina.james@email.com",
    property: "Lekki Gardens Estate",
    unit: "C2",
    rent: "₦85,000",
    lease: "Apr 2026 → Mar 2027",
    expires: "Apr 15 2026",
    status: "pending",
  },
  {
    email: "segun.adeyemi@email.com",
    property: "VI Towers",
    unit: "9A",
    rent: "₦260,000",
    lease: "Apr 2026 → Mar 2027",
    expires: "Apr 10 2026",
    status: "pending",
  },
];

export const landlordArrears: ArrearsRow[] = [
  {
    tenant: "Tunde Adeola",
    unit: "Lekki / B1",
    amount: "₦150,000",
    overdueDays: 21,
    reminder: "Mar 14",
  },
  {
    tenant: "Ngozi Adichie",
    unit: "VI / 8C",
    amount: "₦280,000",
    overdueDays: 18,
    reminder: "Mar 14",
  },
  {
    tenant: "Bayo Martins (partial)",
    unit: "Yaba / 1F",
    amount: "₦350,000",
    overdueDays: 5,
    reminder: "Mar 16",
  },
];

export const landlordPaymentHistory: PaymentHistoryRow[] = [
  {
    reference: "PAY-2026-0318",
    tenant: "Amaka Obi",
    amount: "₦150,000",
    date: "Mar 18",
    channel: "Paystack · Card",
    status: "paid",
  },
  {
    reference: "PAY-2026-0315",
    tenant: "Emeka Nwosu",
    amount: "₦280,000",
    date: "Mar 15",
    channel: "Paystack · Card",
    status: "paid",
  },
  {
    reference: "PAY-2026-0310",
    tenant: "Chidinma Eze",
    amount: "₦320,000",
    date: "Mar 10",
    channel: "Paystack · Transfer",
    status: "paid",
  },
  {
    reference: "PAY-2026-0320",
    tenant: "Bayo Martins",
    amount: "₦95,000",
    date: "Mar 20",
    channel: "Paystack · Card",
    status: "paid",
  },
  {
    reference: "PAY-2026-0308",
    tenant: "Kelechi Dike",
    amount: "₦295,000",
    date: "Mar 8",
    channel: "Paystack · Card",
    status: "paid",
  },
  {
    reference: "PAY-2026-0305",
    tenant: "Amaka Obi",
    amount: "₦150,000",
    date: "Mar 5",
    channel: "Paystack · Card",
    status: "paid",
  },
];

export const landlordUnits: LandlordUnitRow[] = [
  {
    unit: "A3",
    property: "Lekki Gardens",
    type: "2 Bed",
    tenant: "Amaka Obi",
    tenantEmail: "ao@email.com",
    rent: "₦150,000",
    leaseEnd: "Mar 31 2027",
    status: "occupied",
  },
  {
    unit: "12B",
    property: "VI Towers",
    type: "3 Bed",
    tenant: "Emeka Nwosu",
    tenantEmail: "en@email.com",
    rent: "₦280,000",
    leaseEnd: "Apr 15 2026",
    status: "expiring",
  },
  {
    unit: "5A",
    property: "Ikoyi Residences",
    type: "3 Bed",
    tenant: "Chidinma Eze",
    tenantEmail: "ce@email.com",
    rent: "₦320,000",
    leaseEnd: "Sep 30 2026",
    status: "occupied",
  },
  {
    unit: "B1",
    property: "Lekki Gardens",
    type: "2 Bed",
    tenant: "Tunde Adeola",
    tenantEmail: "ta@email.com",
    rent: "₦150,000",
    leaseEnd: "Dec 31 2026",
    status: "overdue",
  },
  {
    unit: "8C",
    property: "VI Towers",
    type: "2 Bed",
    tenant: "Ngozi Adichie",
    tenantEmail: "na@email.com",
    rent: "₦280,000",
    leaseEnd: "Mar 31 2026",
    status: "overdue",
  },
  {
    unit: "1F",
    property: "Yaba Court",
    type: "1 Bed",
    tenant: "Bayo Martins",
    tenantEmail: "bm@email.com",
    rent: "₦95,000",
    leaseEnd: "Jun 30 2026",
    status: "occupied",
  },
  {
    unit: "C2",
    property: "Lekki Gardens",
    type: "Studio",
    tenant: "—",
    rent: "₦85,000",
    leaseEnd: "—",
    status: "vacant",
  },
  {
    unit: "9A",
    property: "VI Towers",
    type: "2 Bed",
    tenant: "—",
    rent: "₦260,000",
    leaseEnd: "—",
    status: "vacant",
  },
  {
    unit: "3B",
    property: "Ikoyi Residences",
    type: "2 Bed",
    tenant: "—",
    rent: "₦295,000",
    leaseEnd: "—",
    status: "maintenance",
  },
];

export const landlordAgreements: LandlordAgreementRow[] = [
  {
    tenant: "Amaka Obi",
    unit: "A3 · Lekki",
    template: "Standard Residential",
    sent: "Jan 5",
    lastActivity: "Signed Jan 6",
    status: "signed",
  },
  {
    tenant: "Emeka Nwosu",
    unit: "12B · VI",
    template: "Standard Residential",
    sent: "Mar 10",
    lastActivity: "Viewed Mar 11",
    status: "sent",
  },
  {
    tenant: "Chidinma Eze",
    unit: "5A · Ikoyi",
    template: "Commercial Lease",
    sent: "Nov 1",
    lastActivity: "Signed Nov 2",
    status: "signed",
  },
  {
    tenant: "Kelechi Dike",
    unit: "3B · Ikoyi",
    template: "Standard Residential",
    sent: "Mar 15",
    lastActivity: "—",
    status: "draft",
  },
  {
    tenant: "Tunde Adeola",
    unit: "B1 · Lekki",
    template: "Standard Residential",
    sent: "Jan 2",
    lastActivity: "Signed Jan 3",
    status: "signed",
  },
  {
    tenant: "Ngozi Adichie",
    unit: "8C · VI",
    template: "Standard Residential",
    sent: "Dec 1",
    lastActivity: "Signed Dec 3",
    status: "signed",
  },
  {
    tenant: "Bayo Martins",
    unit: "1F · Yaba",
    template: "Standard Residential",
    sent: "Mar 20",
    lastActivity: "—",
    status: "sent",
  },
];

export const landlordReceipts: LandlordReceiptRow[] = [
  {
    receipt: "RCP-2026-0142",
    tenant: "Amaka Obi",
    unit: "Lekki / A3",
    amount: "₦150,000",
    period: "Mar 2026",
    issued: "Mar 18",
  },
  {
    receipt: "RCP-2026-0141",
    tenant: "Emeka Nwosu",
    unit: "VI / 12B",
    amount: "₦280,000",
    period: "Mar 2026",
    issued: "Mar 15",
  },
  {
    receipt: "RCP-2026-0140",
    tenant: "Chidinma Eze",
    unit: "Ikoyi / 5A",
    amount: "₦320,000",
    period: "Mar 2026",
    issued: "Mar 10",
  },
  {
    receipt: "RCP-2026-0139",
    tenant: "Bayo Martins",
    unit: "Yaba / 1F",
    amount: "₦95,000",
    period: "Mar 2026",
    issued: "Mar 20",
  },
  {
    receipt: "RCP-2026-0138",
    tenant: "Kelechi Dike",
    unit: "Ikoyi / 3B",
    amount: "₦295,000",
    period: "Mar 2026",
    issued: "Mar 8",
  },
  {
    receipt: "RCP-2026-0137",
    tenant: "Amaka Obi",
    unit: "Lekki / A3",
    amount: "₦150,000",
    period: "Feb 2026",
    issued: "Feb 3",
  },
];

export const landlordNotices: LandlordNoticeRow[] = [
  {
    subject: "Rent Increase Notice — Q2 2026",
    recipients: "All tenants (24)",
    type: "Rent Increase",
    sent: "Mar 1",
    status: "delivered",
  },
  {
    subject: "Scheduled water maintenance",
    recipients: "Lekki Gardens (8)",
    type: "Maintenance",
    sent: "Feb 20",
    status: "delivered",
  },
  {
    subject: "Lease renewal — April expiries",
    recipients: "2 tenants",
    type: "Renewal",
    sent: "Mar 10",
    status: "delivered",
  },
  {
    subject: "Overdue reminder — Tunde Adeola",
    recipients: "1 tenant",
    type: "Reminder",
    sent: "Mar 14",
    status: "delivered",
  },
  {
    subject: "Welcome to DoorRent — Bayo Martins",
    recipients: "1 tenant",
    type: "Welcome",
    sent: "Mar 18",
    status: "delivered",
  },
];

export const landlordNoticeTemplates: LandlordQuickNoticeAction[] = [
  {
    icon: "💸",
    title: "Rent Increase Notice",
    description: "Notify tenants of new rent amount",
    tone: "amber",
  },
  {
    icon: "🔔",
    title: "Overdue Reminder",
    description: "Send to tenants with outstanding balance",
    tone: "red",
  },
  {
    icon: "📋",
    title: "Lease Renewal",
    description: "Send renewal offer before expiry",
    tone: "green",
  },
  {
    icon: "🔧",
    title: "Maintenance Notice",
    description: "Inform tenants of scheduled works",
    tone: "blue",
  },
  {
    icon: "📢",
    title: "General Announcement",
    description: "Broadcast to all or selected tenants",
    tone: "gray",
  },
];

export const landlordReminderRules: LandlordReminderRule[] = [
  {
    trigger: "30 days before lease expiry",
    action: "Email + SMS renewal notice",
    enabled: true,
  },
  {
    trigger: "14 days before lease expiry",
    action: "Email reminder",
    enabled: true,
  },
  {
    trigger: "7 days before lease expiry",
    action: "Email + SMS final notice",
    enabled: true,
  },
  {
    trigger: "1 day after rent due date",
    action: "Email overdue alert",
    enabled: true,
  },
  {
    trigger: "7 days after rent due date",
    action: "Email + SMS strong notice",
    enabled: true,
  },
  {
    trigger: "30 days after rent due date",
    action: "Email formal demand notice",
    enabled: false,
  },
];

export const landlordReminderLog: LandlordReminderLogRow[] = [
  {
    date: "Mar 21",
    title: "Lease expiry reminder",
    description: "Emeka Nwosu · 25 days to expiry",
    status: "delivered",
  },
  {
    date: "Mar 20",
    title: "Overdue rent notice (7 days)",
    description: "Tunde Adeola · ₦150,000 overdue",
    status: "delivered",
  },
  {
    date: "Mar 14",
    title: "Overdue rent notice (1 day)",
    description: "Tunde Adeola · ₦150,000 overdue",
    status: "delivered",
  },
  {
    date: "Mar 14",
    title: "Overdue rent notice (1 day)",
    description: "Ngozi Adichie · ₦280,000 overdue",
    status: "delivered",
  },
  {
    date: "Mar 10",
    title: "Lease expiry reminder (30 days)",
    description: "Emeka Nwosu · 35 days to expiry",
    status: "delivered",
  },
];

export const landlordOccupancyTrend: ChartPoint[] = [
  { label: "A", value: 84, display: "84%" },
  { label: "M", value: 85, display: "85%" },
  { label: "J", value: 86, display: "86%" },
  { label: "J", value: 87, display: "87%" },
  { label: "A", value: 88, display: "88%" },
  { label: "S", value: 89, display: "89%" },
  { label: "O", value: 90, display: "90%" },
  { label: "N", value: 90, display: "90%" },
  { label: "D", value: 91, display: "91%" },
  { label: "J", value: 90, display: "90%" },
  { label: "F", value: 91, display: "91%" },
  { label: "M", value: 91, display: "91%" },
];

export const landlordRevenueByProperty: RevenueBreakdownRow[] = [
  { name: "VI Towers", revenue: "₦2,240,000", percent: 34, color: "var(--accent)" },
  { name: "Ikoyi Residences", revenue: "₦1,280,000", percent: 20, color: "var(--accent2)" },
  { name: "Lekki Gardens", revenue: "₦1,050,000", percent: 16, color: "var(--green)" },
  { name: "Yaba Court", revenue: "₦190,000", percent: 3, color: "var(--blue)" },
];

export const landlordProfile: LandlordProfile = {
  companyName: "Lekki Property Holdings Ltd",
  firstName: "Babatunde",
  lastName: "Adeyemi",
  phone: "+234 806 000 0001",
  email: "babatunde@lekki.io",
  plan: "Pro",
  planDescription: "Up to 30 properties · 200 units · 3 team members",
  price: "₦25,000/mo",
  nextBilling: "April 1, 2026",
};

export const landlordPayoutSettings: LandlordPayoutSettings = {
  bankName: "Guaranty Trust Bank",
  bankCode: "058",
  accountNumber: "0123456789",
  accountName: "Lekki Property Holdings Ltd",
  subaccountCode: "ACCT_x7k9pq2nd1y4ezz",
  platformFeePercent: 3,
  verified: true,
};

export const landlordNotificationPreferences: LandlordNotificationPreference[] = [
  {
    label: "Rent payment received",
    channel: "Email + SMS",
    enabled: true,
  },
  {
    label: "Overdue rent alerts",
    channel: "Email + SMS",
    enabled: true,
  },
  {
    label: "Lease expiry reminders",
    channel: "Email",
    enabled: true,
  },
  {
    label: "Agreement signed",
    channel: "Email",
    enabled: true,
  },
  {
    label: "New support replies",
    channel: "Email",
    enabled: false,
  },
];

export const landlordTeamMembers: TeamMember[] = [
  {
    name: "Babatunde Adeyemi",
    email: "babatunde@lekki.io",
    role: "Owner",
    initials: "BA",
  },
  {
    name: "Funmi Adeola",
    email: "funmi@lekki.io",
    role: "Property Manager",
    initials: "FA",
  },
  {
    name: "Olu Johnson",
    email: "olu@lekki.io",
    role: "Finance",
    initials: "OJ",
  },
];
