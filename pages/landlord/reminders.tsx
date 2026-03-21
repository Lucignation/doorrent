import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import PageHeader from "../../components/ui/PageHeader";
import {
  landlordNav,
  landlordReminderLog,
  landlordReminderRules,
  landlordUser,
} from "../../data/landlord";

export default function LandlordRemindersPage() {
  const { showToast } = usePrototypeUI();
  return (
    <>
      <PageMeta title="DoorRent — Reminders" />
      <AppShell
        user={landlordUser}
        topbarTitle="Reminders"
        breadcrumb="Dashboard → Reminders"
        navSections={landlordNav}
      >
        <PageHeader
          title="Reminders & Automations"
          description="Configure automatic notification rules"
        />

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

            {landlordReminderRules.map((rule) => (
              <div key={rule.trigger} className="card" style={{ marginBottom: 10 }}>
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
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                      {rule.trigger}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                      {rule.action}
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      defaultChecked={rule.enabled}
                      onChange={(event) => showToast(`Rule ${event.target.checked ? "enabled" : "disabled"}`, "success")}
                    />
                    <div className="switch-slider" />
                  </label>
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={() => showToast("Custom rule added", "success")}>
              + Add Custom Rule
            </button>
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
                  {landlordReminderLog.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="timeline-item">
                      <div
                        className="timeline-dot"
                        style={{ background: item.status === "delivered" ? "var(--green)" : "var(--red)" }}
                      />
                      <div className="timeline-content">
                        <div className="timeline-title">{item.title}</div>
                        <div className="timeline-desc">{item.description}</div>
                      </div>
                      <div className="timeline-time">{item.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
