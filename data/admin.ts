import type {
  AdminActivityRow,
  AdminAuditRow,
  AdminLandlordRow,
  AdminTicketRow,
  AppUser,
  ChartPoint,
  NavSection,
  PropertyFootprintRow,
  StatItem,
} from "../types/app";

export const adminUser: AppUser = {
  name: "DoorRent Admin",
  role: "Super Admin",
  initials: "PA",
};

export const adminNav: NavSection[] = [
  {
    section: "Back Office",
    items: [
      { label: "Overview", href: "/admin", icon: "grid" },
      { label: "Landlords", href: "/admin/landlords", icon: "users" },
      { label: "Properties", href: "/admin/properties", icon: "home" },
      { label: "Transactions", href: "/admin/transactions", icon: "card" },
      { label: "Subscriptions", href: "/admin/subscriptions", icon: "star" },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Support", href: "/admin/support", icon: "chat", badge: "5" },
      { label: "Templates", href: "/admin/templates", icon: "doc" },
      { label: "Staff & Roles", href: "/admin/staff", icon: "shield" },
    ],
  },
  {
    section: "Analytics",
    items: [
      { label: "Reports", href: "/admin/reports", icon: "chart" },
      { label: "Audit Logs", href: "/admin/audit", icon: "log" },
    ],
  },
  {
    section: "System",
    items: [{ label: "Settings", href: "/admin/settings", icon: "settings" }],
  },
];

export const adminStats: StatItem[] = [
  {
    label: "Active Landlords",
    value: "1,284",
    subtext: "↑ 48 this month",
    icon: "🏢",
    accent: "green",
    href: "/admin/landlords",
  },
  {
    label: "Total Properties",
    value: "8,432",
    subtext: "Across 6 states",
    icon: "🏠",
    accent: "blue",
    href: "/admin/properties",
  },
  {
    label: "Platform MRR",
    value: "₦42.1M",
    subtext: "↑ 22% vs Feb",
    icon: "₦",
    accent: "gold",
    href: "/admin/landlords",
  },
  {
    label: "Transactions (Mar)",
    value: "24,180",
    subtext: "₦4.2B processed",
    icon: "📊",
    accent: "amber",
    href: "/admin/properties",
  },
  {
    label: "Open Tickets",
    value: "47",
    subtext: "↑ 5 from yesterday",
    icon: "🎫",
    accent: "red",
    href: "/admin/support",
  },
  {
    label: "Webhook Success",
    value: "99.6%",
    subtext: "Last 30 days",
    icon: "✓",
    accent: "green",
    href: "/admin/support",
  },
];

export const adminSignups: ChartPoint[] = [
  { label: "A", value: 48, display: "48" },
  { label: "M", value: 62, display: "62" },
  { label: "J", value: 55, display: "55" },
  { label: "J", value: 71, display: "71" },
  { label: "A", value: 88, display: "88" },
  { label: "S", value: 76, display: "76" },
  { label: "O", value: 94, display: "94" },
  { label: "N", value: 82, display: "82" },
  { label: "D", value: 105, display: "105" },
  { label: "J", value: 97, display: "97" },
  { label: "F", value: 110, display: "110" },
  { label: "M", value: 48, display: "48" },
];

export const adminRecentActivity: AdminActivityRow[] = [
  { landlord: "Chisom Okafor", plan: "Pro", properties: "12", status: "active" },
  { landlord: "Aisha Buhari", plan: "Starter", properties: "3", status: "active" },
  { landlord: "Funke Adeyemi", plan: "Enterprise", properties: "45", status: "active" },
  { landlord: "Emeka Peters", plan: "Pro", properties: "8", status: "active" },
  { landlord: "Grace Nwosu", plan: "Starter", properties: "2", status: "trial" },
  { landlord: "Ibrahim Musa", plan: "Pro", properties: "17", status: "suspended" },
];

export const adminLandlords: AdminLandlordRow[] = [
  {
    landlord: "Chisom Okafor",
    email: "chisom@realty.ng",
    plan: "Pro",
    properties: 12,
    tenants: 78,
    mrr: "₦1.2M",
    status: "active",
    joined: "Jan 2025",
  },
  {
    landlord: "Aisha Buhari",
    email: "aisha@property.ng",
    plan: "Starter",
    properties: 3,
    tenants: 12,
    mrr: "₦180K",
    status: "active",
    joined: "Mar 2025",
  },
  {
    landlord: "Funke Adeyemi",
    email: "funke@estates.ng",
    plan: "Enterprise",
    properties: 45,
    tenants: 320,
    mrr: "₦8.4M",
    status: "active",
    joined: "Jun 2024",
  },
  {
    landlord: "Emeka Peters",
    email: "emeka@homes.ng",
    plan: "Pro",
    properties: 8,
    tenants: 45,
    mrr: "₦640K",
    status: "active",
    joined: "Feb 2025",
  },
  {
    landlord: "Grace Nwosu",
    email: "grace@grace.ng",
    plan: "Starter",
    properties: 2,
    tenants: 8,
    mrr: "₦120K",
    status: "trial",
    joined: "Mar 2026",
  },
  {
    landlord: "Ibrahim Musa",
    email: "ibrahim@musa.ng",
    plan: "Pro",
    properties: 17,
    tenants: 92,
    mrr: "₦1.8M",
    status: "suspended",
    joined: "Aug 2024",
  },
];

export const adminSupportStats: StatItem[] = [
  { label: "Critical", value: "5", subtext: "", accent: "red" },
  { label: "High Priority", value: "12", subtext: "", accent: "amber" },
  { label: "In Progress", value: "18", subtext: "", accent: "blue" },
  { label: "Resolved Today", value: "8", subtext: "", accent: "green" },
];

export const adminTickets: AdminTicketRow[] = [
  {
    ticket: "#TKT-1028",
    requester: "Chisom Okafor (Landlord)",
    subject: "Payment webhook not updating invoice status",
    priority: "critical",
    status: "open",
    owner: "Unassigned",
    opened: "Mar 21",
  },
  {
    ticket: "#TKT-1027",
    requester: "Amaka Obi (Tenant)",
    subject: "Cannot download my receipt — PDF error",
    priority: "high",
    status: "in_progress",
    owner: "Olu Support",
    opened: "Mar 20",
  },
  {
    ticket: "#TKT-1026",
    requester: "Ibrahim Musa (Landlord)",
    subject: "Account suspension — requesting review",
    priority: "high",
    status: "open",
    owner: "Unassigned",
    opened: "Mar 20",
  },
  {
    ticket: "#TKT-1025",
    requester: "Grace Nwosu (Landlord)",
    subject: "How to add multiple unit types?",
    priority: "medium",
    status: "resolved",
    owner: "Funmi CS",
    opened: "Mar 19",
  },
  {
    ticket: "#TKT-1024",
    requester: "Emeka Peters (Landlord)",
    subject: "SMS reminder not sending for tenant",
    priority: "medium",
    status: "in_progress",
    owner: "Olu Support",
    opened: "Mar 18",
  },
];

export const adminPropertyFootprint: PropertyFootprintRow[] = [
  {
    state: "Lagos",
    landlords: "822",
    properties: "5,612",
    occupancy: "91%",
    volume: "₦2.9B",
  },
  {
    state: "FCT",
    landlords: "184",
    properties: "1,022",
    occupancy: "88%",
    volume: "₦510M",
  },
  {
    state: "Oyo",
    landlords: "93",
    properties: "544",
    occupancy: "84%",
    volume: "₦144M",
  },
  {
    state: "Rivers",
    landlords: "67",
    properties: "401",
    occupancy: "82%",
    volume: "₦133M",
  },
];

export const adminAuditLogs: AdminAuditRow[] = [
  {
    timestamp: "Mar 21 14:32:11",
    actor: "DoorRent Admin",
    role: "super_admin",
    action: "USER_SUSPENDED",
    entity: "Landlord: Ibrahim Musa",
    ipAddress: "41.190.3.xxx",
  },
  {
    timestamp: "Mar 21 13:18:44",
    actor: "Chisom Okafor",
    role: "landlord",
    action: "PROPERTY_CREATED",
    entity: "Property: Lekki Courts",
    ipAddress: "105.112.xx.xx",
  },
  {
    timestamp: "Mar 21 12:05:22",
    actor: "Amaka Obi",
    role: "tenant",
    action: "AGREEMENT_SIGNED",
    entity: "Agreement: A3-2026",
    ipAddress: "102.89.xx.xx",
  },
  {
    timestamp: "Mar 21 11:44:08",
    actor: "DoorRent Admin",
    role: "super_admin",
    action: "PLAN_UPDATED",
    entity: "Plan: Pro → Enterprise (Funke)",
    ipAddress: "41.190.3.xxx",
  },
  {
    timestamp: "Mar 21 10:30:55",
    actor: "Emeka Peters",
    role: "landlord",
    action: "TENANT_CREATED",
    entity: "Tenant: Bello Usman",
    ipAddress: "105.113.xx.xx",
  },
  {
    timestamp: "Mar 21 09:12:30",
    actor: "Olu Support",
    role: "admin_staff",
    action: "TICKET_RESOLVED",
    entity: "Ticket: #TKT-1025",
    ipAddress: "41.190.3.xxx",
  },
];
