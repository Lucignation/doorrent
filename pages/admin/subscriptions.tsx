import { useEffect, useMemo, useState } from "react";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { TableColumn } from "../../types/app";

interface SubscriptionOption {
  id: string;
  name: string;
  model: string;
  interval: string;
  priceAmount?: number;
  listPriceAmount?: number;
  priceLabel: string;
  description: string;
  commissionPercent?: number;
}

interface ComparisonRow {
  label: string;
  option1: string | boolean;
  option2: string | boolean;
}

interface PromoCodeRow {
  id: string;
  code: string;
  agentName: string;
  agentEmail?: string | null;
  agentPhone?: string | null;
  commissionPercent: number;
  usageLimit?: number | null;
  timesUsed: number;
  remainingUses?: number | null;
  expiresAt?: string | null;
  expiresAtLabel: string;
  active: boolean;
}

interface AdminSubscriptionsResponse {
  summary: {
    subscriptionLandlords: number;
    commissionLandlords: number;
    subscriptionMrr: string;
    activePromoCodes: number;
  };
  catalog: {
    options: SubscriptionOption[];
    comparisonRows: ComparisonRow[];
  };
  promoCodes: PromoCodeRow[];
}

const initialPromoForm = {
  code: "",
  agentName: "",
  agentEmail: "",
  agentPhone: "",
  commissionPercent: "3",
  usageLimit: "",
  expiresAt: "",
};

export default function AdminSubscriptionsPage() {
  const { adminSession } = useAdminPortalSession();
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const [basicBillingCycle, setBasicBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [subscriptionData, setSubscriptionData] =
    useState<AdminSubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoForm, setPromoForm] = useState(initialPromoForm);

  useEffect(() => {
    const adminToken = adminSession?.token;

    if (!adminToken) {
      return;
    }

    let cancelled = false;

    async function loadSubscriptions() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<AdminSubscriptionsResponse>(
          "/admin/subscriptions",
          { token: adminToken },
        );

        if (!cancelled) {
          setSubscriptionData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load subscription settings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSubscriptions();

    return () => {
      cancelled = true;
    };
  }, [adminSession?.token, dataRefreshVersion]);

  async function createPromoCode() {
    if (!adminSession?.token) {
      return;
    }

    setSavingPromo(true);

    try {
      const { data } = await apiRequest<PromoCodeRow>(
        "/admin/subscriptions/promo-codes",
        {
          method: "POST",
          token: adminSession.token,
          body: {
            code: promoForm.code.toUpperCase(),
            agentName: promoForm.agentName,
            agentEmail: promoForm.agentEmail || undefined,
            agentPhone: promoForm.agentPhone || undefined,
            commissionPercent: Number(promoForm.commissionPercent),
            usageLimit: promoForm.usageLimit ? Number(promoForm.usageLimit) : undefined,
            expiresAt: promoForm.expiresAt || undefined,
          },
        },
      );

      setSubscriptionData((current) =>
        current
          ? {
              ...current,
              summary: {
                ...current.summary,
                activePromoCodes: current.summary.activePromoCodes + (data.active ? 1 : 0),
              },
              promoCodes: [data, ...current.promoCodes],
            }
          : current,
      );
      setPromoForm(initialPromoForm);
      showToast("Referral promo code created", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Promo code could not be created.",
        "error",
      );
    } finally {
      setSavingPromo(false);
    }
  }

  const promoColumns: TableColumn<PromoCodeRow>[] = useMemo(
    () => [
      {
        key: "code",
        label: "Promo Code",
        render: (row) => (
          <div>
            <div style={{ fontWeight: 700, letterSpacing: "0.04em" }}>{row.code}</div>
            <div className="td-muted">{row.agentName}</div>
          </div>
        ),
      },
      {
        key: "commissionPercent",
        label: "Commission",
        render: (row) => `${row.commissionPercent}%`,
      },
      {
        key: "remainingUses",
        label: "Usage",
        render: (row) =>
          row.usageLimit
            ? `${row.timesUsed}/${row.usageLimit} used`
            : `${row.timesUsed} used`,
      },
      {
        key: "expiresAtLabel",
        label: "Expires",
        render: (row) => row.expiresAtLabel || "No expiry",
      },
      {
        key: "active",
        label: "Status",
        render: (row) => (
          <StatusBadge tone={row.active ? "green" : "red"}>
            {row.active ? "active" : "inactive"}
          </StatusBadge>
        ),
      },
    ],
    [],
  );

  const basicMonthlyOption = useMemo(
    () =>
      subscriptionData?.catalog.options.find(
        (option) => option.model === "subscription" && option.interval === "monthly",
      ) ?? null,
    [subscriptionData?.catalog.options],
  );
  const basicYearlyOption = useMemo(
    () =>
      subscriptionData?.catalog.options.find(
        (option) => option.model === "subscription" && option.interval === "yearly",
      ) ?? null,
    [subscriptionData?.catalog.options],
  );
  const fullServiceOption = useMemo(
    () =>
      subscriptionData?.catalog.options.find((option) => option.model === "commission") ??
      null,
    [subscriptionData?.catalog.options],
  );
  const activeBasicOption =
    basicBillingCycle === "monthly" ? basicMonthlyOption : basicYearlyOption;
  const yearlySavingsAmount =
    (basicYearlyOption?.listPriceAmount ?? 0) - (basicYearlyOption?.priceAmount ?? 0);
  const yearlySavingsPercent =
    basicYearlyOption?.listPriceAmount && basicYearlyOption.priceAmount
      ? Math.round((yearlySavingsAmount / basicYearlyOption.listPriceAmount) * 100)
      : 0;

  const description = subscriptionData
    ? `${subscriptionData.summary.subscriptionLandlords} subscription landlords · ${subscriptionData.summary.commissionLandlords} commission landlords`
    : loading
      ? "Loading subscription catalog..."
      : error || "Subscription data is unavailable.";

  return (
    <>
      <PageMeta title="DoorRent — Subscriptions" />
      <AdminPortalShell topbarTitle="Subscriptions" breadcrumb="Dashboard → Subscriptions">
        <PageHeader
          title="Subscriptions"
          description={description}
          actions={[
            {
              label: "Refresh",
              variant: "secondary",
              toastMessage: "Subscriptions refresh automatically from live admin data.",
              toastTone: "info",
            },
          ]}
        />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card accent-green">
            <div className="stat-label">Subscription Landlords</div>
            <div className="stat-value">
              {subscriptionData?.summary.subscriptionLandlords ?? "—"}
            </div>
            <div className="stat-sub">Basic</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Commission Landlords</div>
            <div className="stat-value">
              {subscriptionData?.summary.commissionLandlords ?? "—"}
            </div>
            <div className="stat-sub">Full Service</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Subscription MRR</div>
            <div className="stat-value">
              {subscriptionData?.summary.subscriptionMrr ?? "—"}
            </div>
            <div className="stat-sub">Monthly equivalent from subscriptions</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Active Promo Codes</div>
            <div className="stat-value">
              {subscriptionData?.summary.activePromoCodes ?? "—"}
            </div>
            <div className="stat-sub">Referral codes available to agents</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 16,
            alignItems: "start",
            marginBottom: 16,
          }}
        >
          <div className="card">
            <div className="card-header" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="card-title">Basic</div>
                <div className="card-subtitle">
                  Subscription plan for tenant management, rent reminders, and marketplace
                  listing.
                </div>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 6,
                  borderRadius: 999,
                  background: "#131512",
                }}
              >
                <button
                  type="button"
                  className={`btn btn-xs ${
                    basicBillingCycle === "monthly" ? "btn-secondary" : "btn-ghost"
                  }`}
                  onClick={() => setBasicBillingCycle("monthly")}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${
                    basicBillingCycle === "yearly" ? "btn-secondary" : "btn-ghost"
                  }`}
                  onClick={() => setBasicBillingCycle("yearly")}
                >
                  Yearly · Save {yearlySavingsPercent || 0}%
                </button>
              </div>
            </div>
            <div className="card-body">
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  marginBottom: 8,
                }}
              >
                {activeBasicOption?.priceLabel ?? "—"}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.7 }}>
                {basicBillingCycle === "monthly"
                  ? "Monthly billing at ₦8,500/month."
                  : `Standard yearly price is ₦${(basicYearlyOption?.listPriceAmount ?? 102000).toLocaleString("en-NG")}/year, discounted to ₦${(basicYearlyOption?.priceAmount ?? 95000).toLocaleString("en-NG")}/year.`}
              </div>
              {basicBillingCycle === "yearly" ? (
                <div className="td-muted" style={{ marginTop: 12 }}>
                  Savings: ₦{yearlySavingsAmount.toLocaleString("en-NG")} ({yearlySavingsPercent}
                  %)
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{fullServiceOption?.name ?? "Full Service"}</div>
                <div className="card-subtitle">
                  Automated collections, agreements, caretaker access, reports, and late
                  payment enforcement.
                </div>
              </div>
              <StatusBadge tone="gold">Popular choice</StatusBadge>
            </div>
            <div className="card-body">
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  marginBottom: 8,
                }}
              >
                {fullServiceOption?.priceLabel ?? "3% only when rent is paid"}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.7 }}>
                No monthly subscription. DoorRent only takes commission when rent is paid.
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Create Agent Promo Code</div>
                <div className="card-subtitle">
                  Set the commission percentage and how long or how many times a referral code can
                  work before it expires.
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Promo Code *</label>
                  <input
                    className="form-input"
                    value={promoForm.code}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="AGENT25"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Agent Name *</label>
                  <input
                    className="form-input"
                    value={promoForm.agentName}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        agentName: event.target.value,
                      }))
                    }
                    placeholder="Amina Yusuf"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Agent Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={promoForm.agentEmail}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        agentEmail: event.target.value,
                      }))
                    }
                    placeholder="agent@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Agent Phone</label>
                  <input
                    className="form-input"
                    value={promoForm.agentPhone}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        agentPhone: event.target.value,
                      }))
                    }
                    placeholder="+234..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Commission % *</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={100}
                    value={promoForm.commissionPercent}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        commissionPercent: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Usage Limit</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    value={promoForm.usageLimit}
                    onChange={(event) =>
                      setPromoForm((current) => ({
                        ...current,
                        usageLimit: event.target.value,
                      }))
                    }
                    placeholder="Leave blank for unlimited"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={promoForm.expiresAt}
                  onChange={(event) =>
                    setPromoForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void createPromoCode()}
                disabled={
                  savingPromo ||
                  !promoForm.code.trim() ||
                  !promoForm.agentName.trim() ||
                  !promoForm.commissionPercent
                }
              >
                {savingPromo ? "Creating..." : "Create Promo Code"}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Referral Promo Codes</div>
                <div className="card-subtitle">
                  Track code performance, remaining uses, and expiry status.
                </div>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={promoColumns}
                rows={subscriptionData?.promoCodes ?? []}
                emptyMessage={loading ? "Loading promo codes..." : "No promo codes created yet."}
              />
            </div>
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
