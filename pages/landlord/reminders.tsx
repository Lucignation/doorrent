import { useEffect, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface ReminderRule {
  id: string;
  title: string;
  trigger: string;
  action: string;
  offsetDays: number;
  enabled: boolean;
}

interface ReminderLog {
  id: string;
  date: string;
  title: string;
  description: string;
  status: "delivered" | "failed";
  tenant: string | null;
}

interface LandlordRemindersResponse {
  summary: {
    enabledCount: number;
    totalRules: number;
    recentLogCount: number;
  };
  rules: ReminderRule[];
  logs: ReminderLog[];
}

export default function LandlordRemindersPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [reminderData, setReminderData] = useState<LandlordRemindersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingRuleId, setUpdatingRuleId] = useState("");

  useEffect(() => {
    const landlordToken = landlordSession?.token;

    if (!landlordToken) {
      return;
    }

    let cancelled = false;

    async function loadReminders() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordRemindersResponse>("/landlord/reminders", {
          token: landlordToken,
        });

        if (!cancelled) {
          setReminderData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your reminder rules.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReminders();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token]);

  async function toggleRule(rule: ReminderRule) {
    if (!landlordSession?.token) {
      showToast("Landlord session missing. Please sign in again.", "error");
      return;
    }

    setUpdatingRuleId(rule.id);

    try {
      await apiRequest(`/landlord/reminders/${rule.id}`, {
        method: "PATCH",
        token: landlordSession.token,
        body: {
          enabled: !rule.enabled,
        },
      });
      showToast(`Rule ${!rule.enabled ? "enabled" : "disabled"}`, "success");
      refreshData();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Reminder rule could not be updated.",
        "error",
      );
    } finally {
      setUpdatingRuleId("");
    }
  }

  const description = reminderData
    ? `${reminderData.summary.enabledCount} active rule(s) and ${reminderData.summary.recentLogCount} recent reminder log entries`
    : loading
      ? "Loading your reminder automation..."
      : error || "Reminder data is unavailable.";

  return (
    <>
      <PageMeta title="DoorRent — Reminders" urlPath="/landlord/reminders" />
      <LandlordPortalShell topbarTitle="Reminders" breadcrumb="Dashboard → Reminders">
        <PageHeader
          title="Reminders & Automations"
          description={description}
        />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div
          className="stats-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          <div className="stat-card accent-green">
            <div className="stat-label">Enabled Rules</div>
            <div className="stat-value">{reminderData?.summary.enabledCount ?? 0}</div>
            <div className="stat-sub">Currently automated</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Total Rules</div>
            <div className="stat-value">{reminderData?.summary.totalRules ?? 0}</div>
            <div className="stat-sub">Configured in workspace</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Recent Logs</div>
            <div className="stat-value">{reminderData?.summary.recentLogCount ?? 0}</div>
            <div className="stat-sub">Latest reminder activity</div>
          </div>
        </div>

        <div className="grid-2">
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              Reminder Rules
            </div>

            {(reminderData?.rules ?? []).map((rule) => (
              <div key={rule.id} className="card" style={{ marginBottom: 10 }}>
                <div
                  className="card-body"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                      {rule.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4 }}>
                      {rule.trigger}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                      {rule.action}
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => void toggleRule(rule)}
                      disabled={updatingRuleId === rule.id}
                    />
                    <div className="switch-slider" />
                  </label>
                </div>
              </div>
            ))}

            {!reminderData?.rules.length ? (
              <div className="card">
                <div className="card-body" style={{ color: "var(--ink2)" }}>
                  {loading ? "Loading reminder rules..." : "No reminder rules configured."}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              Recent Reminder Log
            </div>

            <div className="card">
              <div className="card-body">
                <div className="timeline">
                  {(reminderData?.logs ?? []).map((item) => (
                    <div key={item.id} className="timeline-item">
                      <div
                        className="timeline-dot"
                        style={{
                          background:
                            item.status === "delivered" ? "var(--green)" : "var(--red)",
                        }}
                      />
                      <div className="timeline-content">
                        <div className="timeline-title">{item.title}</div>
                        <div className="timeline-desc">{item.description}</div>
                        {item.tenant ? (
                          <div className="timeline-desc" style={{ marginTop: 4 }}>
                            Tenant: {item.tenant}
                          </div>
                        ) : null}
                      </div>
                      <div className="timeline-time">{item.date}</div>
                    </div>
                  ))}
                  {!reminderData?.logs.length ? (
                    <div style={{ color: "var(--ink2)" }}>
                      {loading ? "Loading reminder logs..." : "No reminder logs yet."}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
