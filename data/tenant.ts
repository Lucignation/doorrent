import type {
  AppUser,
  HighlightBanner,
  NavSection,
  StatItem,
  TenantAgreementTimelineRow,
  TenantNoticeRow,
  TenantPaymentHistoryRow,
  TenantQuickAction,
  TenantReceiptRow,
} from "../types/app";

export const tenantUser: AppUser = {
  name: "Amaka Obi",
  role: "Tenant · Unit A3",
  initials: "AO",
};

export const tenantNav: NavSection[] = [
  {
    section: "My Portal",
    items: [
      { label: "Dashboard", href: "/tenant", icon: "grid" },
      { label: "My Rent", href: "/tenant/rent", icon: "card" },
      { label: "Pay Rent", href: "/tenant/pay", icon: "pay" },
      { label: "Meetings", href: "/tenant/meetings", icon: "clock" },
      { label: "Community", href: "/tenant/community", icon: "chat" },
      { label: "Receipts", href: "/tenant/receipts", icon: "receipt" },
      {
        label: "My Agreement",
        href: "/tenant/agreement",
        icon: "doc",
        badge: "1",
        badgeClass: "amber",
      },
      { label: "Notices", href: "/tenant/notices", icon: "bell", badge: "2" },
    ],
  },
  {
    section: "Account",
    items: [{ label: "Profile", href: "/tenant/profile", icon: "settings" }],
  },
];

export const tenantAgreementAlert: HighlightBanner = {
  title: "Your tenancy agreement is awaiting signature",
  body: "Please review and sign your agreement before April 10, 2026",
  tone: "amber",
  cta: { label: "Sign now", href: "/tenant/agreement" },
};

export const tenantStats: StatItem[] = [
  {
    label: "Annual Rent",
    value: "₦1,800,000",
    subtext: "≈ ₦150,000 monthly equivalent",
    accent: "gold",
  },
  {
    label: "Outstanding Balance",
    value: "₦0",
    subtext: "✓ All paid up",
    accent: "green",
  },
  {
    label: "Lease Expires",
    value: "Mar 2027",
    subtext: "377 days remaining",
    accent: "amber",
  },
];

export const tenantQuickActions: TenantQuickAction[] = [
  {
    icon: "💳",
    label: "Pay Rent Now",
    description: "Annual due available in portal",
    href: "/tenant/pay",
  },
  {
    icon: "📅",
    label: "Book Meeting",
    description: "Request time with your landlord",
    href: "/tenant/meetings",
  },
  {
    icon: "🗨",
    label: "Community Chat",
    description: "Join or create a compound group",
    href: "/tenant/community",
  },
  {
    icon: "📄",
    label: "Download Receipt",
    description: "Last receipt: Mar 18",
    href: "/tenant/receipts",
  },
  {
    icon: "✍",
    label: "Sign Agreement",
    description: "Pending since Mar 10",
    href: "/tenant/agreement",
  },
  {
    icon: "📢",
    label: "View Notices",
    description: "2 unread notices",
    href: "/tenant/notices",
  },
];

export const tenantPaymentHistory: TenantPaymentHistoryRow[] = [
  { period: "Mar 2026", amount: "₦150,000", date: "Mar 18", status: "paid" },
  { period: "Feb 2026", amount: "₦150,000", date: "Feb 3", status: "paid" },
  { period: "Jan 2026", amount: "₦150,000", date: "Jan 2", status: "paid" },
  { period: "Dec 2025", amount: "₦150,000", date: "Dec 1", status: "paid" },
  { period: "Nov 2025", amount: "₦150,000", date: "Nov 4", status: "paid" },
];

export const tenantReceipts: TenantReceiptRow[] = [
  {
    receipt: "RCP-2026-0142",
    period: "Mar 2026",
    amount: "₦150,000",
    issued: "Mar 18",
    status: "paid",
  },
  {
    receipt: "RCP-2026-0137",
    period: "Feb 2026",
    amount: "₦150,000",
    issued: "Feb 3",
    status: "paid",
  },
  {
    receipt: "RCP-2026-0129",
    period: "Jan 2026",
    amount: "₦150,000",
    issued: "Jan 2",
    status: "paid",
  },
];

export const tenantAgreementTimeline: TenantAgreementTimelineRow[] = [
  {
    label: "Agreement created",
    description: "By Babatunde Adeyemi",
    time: "Mar 10, 2026",
    done: true,
  },
  {
    label: "Sent to tenant",
    description: "Delivered to amaka@email.com",
    time: "Mar 10, 2026",
    done: true,
  },
  {
    label: "Email opened",
    description: "Amaka opened notification",
    time: "Mar 11, 2026",
    done: true,
  },
  {
    label: "Agreement viewed",
    description: "Tenant viewed the document",
    time: "Mar 11, 2026",
    done: true,
  },
  {
    label: "Tenant signature",
    description: "Pending — expires Apr 10",
    time: "Pending",
    done: false,
  },
  {
    label: "Landlord countersign",
    description: "After tenant signs",
    time: "—",
    done: false,
  },
  {
    label: "Fully executed",
    description: "Both parties signed",
    time: "—",
    done: false,
  },
];

export const tenantNotices: TenantNoticeRow[] = [
  {
    icon: "💸",
    type: "Rent Increase",
    title: "Rent Increase Notice — Q3 2026",
    body:
      "Dear Amaka, we wish to inform you that your annual rent will increase from ₦1,800,000 to ₦1,980,000 effective July 1, 2026. A monthly equivalent breakdown will still be shared for planning. Please contact us if you have any questions.",
    date: "Mar 1, 2026",
    read: false,
    badge: "amber",
  },
  {
    icon: "🔧",
    type: "Maintenance",
    title: "Scheduled water supply maintenance",
    body:
      "Please be informed that there will be a scheduled interruption to water supply on Saturday March 23, 2026 between 9am–3pm for maintenance work. We apologize for any inconvenience.",
    date: "Feb 20, 2026",
    read: true,
    badge: "blue",
  },
  {
    icon: "📋",
    type: "Lease Renewal",
    title: "Lease renewal offer — March 2027",
    body:
      "Your current tenancy expires March 31, 2027. We are pleased to offer you a lease renewal at the updated rate. Please indicate your intention to renew by December 31, 2026.",
    date: "Feb 10, 2026",
    read: true,
    badge: "green",
  },
];
