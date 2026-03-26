import { useEffect, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface EmergencyContact {
  label: string;
  phone: string;
  type: "police" | "estate_security" | "landlord" | "caretaker" | "emergency_contact";
  callUrl?: string;
}

interface EmergencyWorkspaceResponse {
  actor: {
    role: "landlord" | "tenant";
    name: string;
  };
  property: {
    id: string;
    name: string;
    fullAddress: string;
    estateName?: string | null;
  };
  availableProperties?: Array<{
    id: string;
    name: string;
    fullAddress: string;
    estateName?: string | null;
  }>;
  primaryCallTarget: EmergencyContact;
  secondaryCallTargets: EmergencyContact[];
  smsRecipients: EmergencyContact[];
  guidance: string;
  alert?: {
    triggeredAtLabel: string;
    smsRecipientCount: number;
    sms: {
      attempted: boolean;
      status?: "SENT" | "FAILED";
      errorMessage?: string;
    };
  };
}

function getContactTone(type: EmergencyContact["type"]) {
  if (type === "police") return { bg: "var(--red-light)", fg: "var(--red)" };
  if (type === "estate_security") return { bg: "var(--amber-light)", fg: "var(--amber)" };
  if (type === "caretaker") return { bg: "rgba(41,98,255,0.10)", fg: "#2962FF" };
  return { bg: "var(--surface2)", fg: "var(--ink2)" };
}

export default function LandlordEmergencyPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { showToast } = usePrototypeUI();
  const [workspace, setWorkspace] = useState<EmergencyWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [triggering, setTriggering] = useState(false);

  async function loadWorkspace(propertyId?: string) {
    if (!landlordSession?.token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const path = propertyId
        ? `/landlord/emergency?propertyId=${encodeURIComponent(propertyId)}`
        : "/landlord/emergency";
      const { data } = await apiRequest<EmergencyWorkspaceResponse>(path, {
        token: landlordSession.token,
      });
      setWorkspace(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not load your emergency workspace.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [landlordSession?.token]);

  function openCallLine(contact: EmergencyContact) {
    if (typeof window !== "undefined") {
      window.location.href = contact.callUrl ?? `tel:${contact.phone}`;
    }
  }

  async function triggerEmergency() {
    if (!landlordSession?.token || !workspace || triggering) {
      return;
    }

    setTriggering(true);

    try {
      const { data, message } = await apiRequest<EmergencyWorkspaceResponse>(
        "/landlord/emergency/alert",
        {
          method: "POST",
          token: landlordSession.token,
          body: {
            propertyId: workspace.property.id,
          },
        },
      );

      setWorkspace(data);
      showToast(message || "Emergency alert sent. Opening the call line now.", "success");
      openCallLine(data.primaryCallTarget);
    } catch (requestError) {
      if (workspace.primaryCallTarget?.phone) {
        showToast(
          "We could not confirm the SMS alert, but we are opening the emergency call line now.",
          "error",
        );
        openCallLine(workspace.primaryCallTarget);
      } else {
        showToast(
          requestError instanceof Error
            ? requestError.message
            : "Emergency action failed.",
          "error",
        );
      }
    } finally {
      setTriggering(false);
    }
  }

  return (
    <>
      <PageMeta title="DoorRent — Emergency" />
      <LandlordPortalShell topbarTitle="Emergency" breadcrumb="Dashboard → Emergency">
        <PageHeader
          title="Emergency Response"
          description={
            loading
              ? "Preparing your emergency contacts..."
              : workspace?.guidance || error || "Call and alert your property response team."
          }
        />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        {workspace?.availableProperties && workspace.availableProperties.length > 1 ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                Select property
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {workspace.availableProperties.map((property) => {
                  const active = property.id === workspace.property.id;
                  return (
                    <button
                      key={property.id}
                      type="button"
                      className={`btn ${active ? "btn-primary" : "btn-secondary"} btn-sm`}
                      onClick={() => void loadWorkspace(property.id)}
                    >
                      {property.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {workspace ? (
          <div className="grid-2">
            <div>
              <div
                className="card"
                style={{
                  background: "#2A0E0E",
                  color: "#fff",
                  border: "1px solid rgba(220,64,64,0.22)",
                  marginBottom: 16,
                }}
              >
                <div className="card-body">
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.08)",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 12,
                    }}
                  >
                    Emergency Call
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
                    {workspace.primaryCallTarget.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
                    {workspace.primaryCallTarget.phone}
                  </div>
                  <div style={{ color: "#F5DCDC", lineHeight: 1.7, marginBottom: 16 }}>
                    {workspace.guidance}
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void triggerEmergency()}
                    disabled={triggering}
                  >
                    {triggering ? "Starting emergency response..." : "Call & Send Alert"}
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Response Address</div>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                    {workspace.property.name}
                  </div>
                  <div style={{ color: "var(--ink3)", lineHeight: 1.7 }}>
                    {workspace.property.fullAddress}
                  </div>
                  {workspace.property.estateName ? (
                    <div style={{ marginTop: 12 }}>
                      <span className="badge badge-amber">{workspace.property.estateName}</span>
                    </div>
                  ) : null}
                  {workspace.alert ? (
                    <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink3)" }}>
                      Last alert: {workspace.alert.triggeredAtLabel} · {workspace.alert.smsRecipientCount} SMS recipient(s)
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Backup Call Targets</div>
                </div>
                <div className="card-body" style={{ display: "grid", gap: 12 }}>
                  {workspace.secondaryCallTargets.length === 0 ? (
                    <div style={{ color: "var(--ink3)" }}>
                      No backup numbers are configured yet.
                    </div>
                  ) : (
                    workspace.secondaryCallTargets.map((contact) => {
                      const tone = getContactTone(contact.type);
                      return (
                        <button
                          key={`${contact.type}-${contact.phone}`}
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            justifyContent: "flex-start",
                            border: "1px solid var(--border)",
                            padding: 12,
                          }}
                          onClick={() => openCallLine(contact)}
                        >
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: tone.bg,
                              color: tone.fg,
                              marginRight: 12,
                            }}
                          >
                            ☎
                          </span>
                          <span style={{ display: "grid", textAlign: "left" }}>
                            <span style={{ fontWeight: 600 }}>{contact.label}</span>
                            <span style={{ fontSize: 12, color: "var(--ink3)" }}>{contact.phone}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">SMS Alert Recipients</div>
                </div>
                <div className="card-body" style={{ display: "grid", gap: 12 }}>
                  {workspace.smsRecipients.length === 0 ? (
                    <div style={{ color: "var(--ink3)" }}>
                      No emergency SMS recipients are configured yet.
                    </div>
                  ) : (
                    workspace.smsRecipients.map((contact) => {
                      const tone = getContactTone(contact.type);
                      return (
                        <div
                          key={`${contact.type}-${contact.phone}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            padding: 12,
                          }}
                        >
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: tone.bg,
                              color: tone.fg,
                            }}
                          >
                            ✉
                          </span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{contact.label}</div>
                            <div style={{ fontSize: 12, color: "var(--ink3)" }}>{contact.phone}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </LandlordPortalShell>
    </>
  );
}
