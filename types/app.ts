import type { ReactNode } from "react";

export type NavIconName =
  | "grid"
  | "home"
  | "building"
  | "users"
  | "card"
  | "chat"
  | "receipt"
  | "doc"
  | "bell"
  | "clock"
  | "chart"
  | "star"
  | "shield"
  | "log"
  | "pay"
  | "settings";

export type ModalId =
  | "add-property"
  | "add-unit"
  | "add-tenant"
  | "add-agreement"
  | "upload-template"
  | "send-notice"
  | "sign-agreement"
  | "notifications"
  | "new-default";

export type ToastTone = "default" | "success" | "error" | "info";

export type AccentTone = "green" | "amber" | "red" | "blue" | "gold";
export type BadgeTone =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "gray"
  | "gold"
  | "accent";
export type HighlightTone = "green" | "amber" | "red" | "blue";

export interface AppUser {
  name: string;
  role: string;
  initials: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
  badge?: string;
  badgeClass?: string;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export interface ActionLink {
  label: string;
  href?: string;
  variant?: "primary" | "secondary";
  modal?: ModalId;
  toastMessage?: string;
  toastTone?: ToastTone;
}

export interface HighlightBanner {
  title: string;
  body: string;
  tone: HighlightTone;
  cta: ActionLink;
}

export interface StatItem {
  label: string;
  value: string;
  subtext: string;
  icon?: string;
  accent: AccentTone;
  href?: string;
}

export interface ChartPoint {
  label: string;
  value: number;
  display?: string;
}

export interface PropertyPortfolioItem {
  name: string;
  location: string;
  category: string;
  units: number;
  occupied: number;
  monthly: string;
  annualRevenue?: string;
  monthlyRevenue?: string;
  occupancy: number;
  index: number;
}

export interface LandlordUnitRow {
  unit: string;
  property: string;
  type: string;
  tenant: string;
  tenantEmail?: string;
  rent: string;
  annualRent?: number;
  monthlyEquivalent?: string;
  leaseEnd: string;
  status: "occupied" | "vacant" | "maintenance" | "expiring" | "overdue";
}

export interface PaymentRecord {
  tenant: string;
  unit: string;
  amount: string;
  date: string;
  method: string;
  status: "paid" | "overdue";
}

export interface TenantLedgerRow {
  tenant: string;
  email: string;
  unit: string;
  rent: string;
  annualRent?: number;
  monthlyEquivalent?: string;
  leaseEnd: string;
  balance: string;
  status: "current" | "expiring" | "overdue";
}

export interface TenantInviteRow {
  email: string;
  property: string;
  unit: string;
  rent: string;
  monthlyEquivalent?: string;
  lease: string;
  expires: string;
  status: "pending" | "completed" | "expired";
}

export interface ArrearsRow {
  tenant: string;
  unit: string;
  amount: string;
  overdueDays: number;
  reminder: string;
}

export interface PaymentHistoryRow {
  reference: string;
  tenant: string;
  amount: string;
  date: string;
  channel: string;
  status: "paid" | "overdue";
}

export interface LandlordAgreementRow {
  tenant: string;
  unit: string;
  template: string;
  sent: string;
  lastActivity: string;
  status:
    | "fully_signed"
    | "awaiting_witness_signatures"
    | "awaiting_landlord_signature"
    | "signed"
    | "sent"
    | "draft"
    | "expired";
}

export interface LandlordReceiptRow {
  receipt: string;
  tenant: string;
  unit: string;
  amount: string;
  period: string;
  issued: string;
}

export interface LandlordNoticeRow {
  subject: string;
  recipients: string;
  type: "Rent Increase" | "Maintenance" | "Renewal" | "Reminder" | "Welcome";
  sent: string;
  status: "delivered" | "scheduled" | "draft";
}

export interface LandlordQuickNoticeAction {
  icon: string;
  title: string;
  description: string;
  tone: BadgeTone;
}

export interface LandlordReminderRule {
  trigger: string;
  action: string;
  enabled: boolean;
}

export interface LandlordReminderLogRow {
  date: string;
  title: string;
  description: string;
  status: "delivered" | "failed";
}

export interface RevenueBreakdownRow {
  name: string;
  revenue: string;
  percent: number;
  color: string;
}

export interface LandlordNotificationPreference {
  label: string;
  channel: string;
  enabled: boolean;
}

export interface TeamMember {
  name: string;
  email: string;
  role: string;
  initials: string;
}

export interface LandlordProfile {
  companyName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  plan: string;
  planDescription: string;
  price: string;
  nextBilling: string;
}

export interface LandlordPayoutSettings {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  subaccountCode: string;
  platformFeePercent: number;
  verified: boolean;
}

export interface AdminActivityRow {
  landlord: string;
  plan: "Starter" | "Pro" | "Enterprise";
  properties: string;
  status: "active" | "trial" | "suspended";
}

export interface AdminLandlordRow {
  landlord: string;
  email: string;
  plan: "Starter" | "Pro" | "Enterprise";
  properties: number;
  tenants: number;
  mrr: string;
  billingModel?: "subscription" | "commission";
  flags?: string[];
  status: "active" | "trial" | "suspended";
  joined: string;
}

export interface AdminPropertyRow {
  property: string;
  landlord: string;
  location: string;
  units: number;
  occupancy: string;
  revenue: string;
  status: "active" | "trial" | "suspended";
}

export interface AdminSettingsProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface AdminPlatformSettings {
  supportEmail: string;
  billingEmail: string;
  alertsEmail: string;
  maintenanceMode: boolean;
  allowLandlordRegistration: boolean;
  defaultTrialDays: number;
}

export interface AdminTicketRow {
  ticket: string;
  requester: string;
  subject: string;
  priority: "critical" | "high" | "medium";
  status: "open" | "in_progress" | "resolved";
  owner: string;
  opened: string;
}

export interface AdminAuditRow {
  timestamp: string;
  actor: string;
  role: "super_admin" | "landlord" | "tenant" | "admin_staff";
  action: string;
  entity: string;
  ipAddress: string;
}

export interface PropertyFootprintRow {
  state: string;
  landlords: string;
  properties: string;
  occupancy: string;
  volume: string;
}

export interface TenantPaymentHistoryRow {
  period: string;
  amount: string;
  date: string;
  status: "paid";
}

export interface TenantQuickAction {
  icon: string;
  label: string;
  description: string;
  href: string;
}

export interface TenantAgreementTimelineRow {
  label: string;
  description: string;
  time: string;
  done: boolean;
}

export interface TenantNoticeRow {
  icon: string;
  type: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  badge: BadgeTone;
}

export interface TenantReceiptRow {
  receipt: string;
  period: string;
  amount: string;
  issued: string;
  status: "paid";
}

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

export type TableRow = Record<string, unknown> & {
  id?: string | number;
  reference?: string;
  ticket?: string;
};
