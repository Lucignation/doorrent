import { useRouter } from "next/router";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

type GateLookupResult = {
  query: string;
  matchedBy: "QR" | "ACCESS_CODE" | "EXIT_CODE";
  suggestedLane: "ENTRY" | "EXIT";
  // codeType distinguishes a residential access/exit code from a visitor pass code
  codeType?: "RESIDENTIAL" | "VISITOR_PASS";
  gateRules: {
    qrGateEnforcement: boolean;
    accessCodeRequired: boolean;
    exitCodeRequired: boolean;
  };
  warningMessages: string[];
  validation: {
    effectiveStatus: string;
    expired: boolean;
    entryRecorded: boolean;
    exitRecorded: boolean;
    entryAllowed: boolean;
    exitAllowed: boolean;
    identityVerified?: boolean;
    requiresLiveQr?: boolean;
  };
  pass: {
    id: string;
    houseNumber?: string | null;
    type: string;
    holderName: string;
    contactPhone?: string | null;
    purpose?: string | null;
    peopleCount: number;
    accessCode: string;
    exitCode: string;
    qrToken: string;
    validFrom: string;
    validUntil: string;
    status: string;
    entryUsedAt?: string | null;
    exitUsedAt?: string | null;
  };
  // Only present when codeType === "RESIDENTIAL" — shows the real registered residents
  // at the address this code belongs to, so operators can detect code-sharing fraud.
  residence?: {
    houseNumber: string;
    block?: string | null;
    ownerName?: string | null;
    ownerPhone?: string | null;
    residents: Array<{
      id: string;
      fullName: string;
      residentType: string;
      phone?: string | null;
      status: string;
    }>;
  } | null;
};

// Dues owed by a resident — returned alongside the gate lookup when enforcement is on
type ResidentDuesOwed = {
  residentId: string;
  fullName: string;
  houseNumber: string | null;
  outstandingBalance: number;
  overdueSince: string | null;
  chargesSummary: Array<{ title: string; amount: number; frequency: string }>;
};

type GateDecisionResult = {
  allowed: boolean;
  lane: "ENTRY" | "EXIT";
  action: "ALLOW" | "DENY";
  message: string;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-NG");
}

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function RulePill({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderRadius: 999,
        background: enabled ? "rgba(34, 139, 94, 0.12)" : "rgba(177, 133, 48, 0.12)",
        color: enabled ? "var(--green)" : "var(--amber)",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: enabled ? "var(--green)" : "var(--amber)",
        }}
      />
      {label}
    </span>
  );
}

export default function EstateGateConsolePage() {
  const router = useRouter();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const { showToast } = usePrototypeUI();
  const token = estateAdminSession?.token;

  const [inputValue, setInputValue] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [actioningKey, setActioningKey] = useState("");
  const [lookupResult, setLookupResult] = useState<GateLookupResult | null>(null);
  const [resolvedScanValue, setResolvedScanValue] = useState("");
  const [duesOwed, setDuesOwed] = useState<ResidentDuesOwed[] | null>(null);

  const scanValue = useMemo(() => {
    return (
      readQueryValue(router.query.scan) ||
      readQueryValue(router.query.pass) ||
      readQueryValue(router.query.qr)
    );
  }, [router.query.pass, router.query.qr, router.query.scan]);

  async function runLookup(queryOverride?: string) {
    const query = (queryOverride ?? inputValue).trim();

    if (!token || !query) {
      return;
    }

    setLoading(true);

    try {
      const { data } = await apiRequest<GateLookupResult>(
        `/estate/passes/gate-lookup?query=${encodeURIComponent(query)}`,
        { token },
      );
      setLookupResult(data);
      setInputValue(query);
      showToast("Pass found.", "success");

      // If this is a residential code, also fetch outstanding dues for that address
      if (data.codeType === "RESIDENTIAL" && data.pass.houseNumber) {
        try {
          const duesRes = await apiRequest<{ duesOwed: ResidentDuesOwed[] }>(
            `/estate/dues-ledger/house/${encodeURIComponent(data.pass.houseNumber)}`,
            { token },
          );
          setDuesOwed(duesRes.data.duesOwed ?? []);
        } catch {
          setDuesOwed(null);
        }
      } else {
        setDuesOwed(null);
      }
    } catch (error) {
      setLookupResult(null);
      showToast(
        error instanceof Error ? error.message : "We could not validate that pass.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !scanValue || scanValue === resolvedScanValue) {
      return;
    }

    setResolvedScanValue(scanValue);
    void runLookup(scanValue);
  }, [resolvedScanValue, scanValue, token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await runLookup();
  }

  async function handleDecision(action: "ALLOW" | "DENY", lane: "ENTRY" | "EXIT") {
    if (!token || !lookupResult) {
      return;
    }

    const actionKey = `${action}-${lane}`;
    setActioningKey(actionKey);

    try {
      const { data, message } = await apiRequest<GateDecisionResult>(
        `/estate/passes/${lookupResult.pass.id}/gate-decision`,
        {
          method: "POST",
          token,
          body: {
            action,
            lane,
            query: inputValue.trim() || lookupResult.query,
            note: note.trim() || undefined,
          },
        },
      );

      showToast(message, data.allowed ? "success" : "error");
      setNote("");
      await runLookup(lookupResult.query);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "We could not record that gate decision.",
        "error",
      );
    } finally {
      setActioningKey("");
    }
  }

  const pass = lookupResult?.pass ?? null;

  return (
    <EstatePortalShell topbarTitle="Gate Console" breadcrumb="Gate Console">
      <PageMeta title="Gate Console — Estate" />
      <PageHeader
        title="Gate Console"
        description="Estate operators can validate visitor QR codes, access codes, and exit codes here."
      />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: "var(--bg)",
              color: "var(--ink3)",
              lineHeight: 1.6,
            }}
          >
            Open this page from the estate workspace on the gate device, then paste the scanned QR
            result, access code, or exit code. Estate admins and estate team members already signed
            into this workspace can use it directly.
          </div>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            style={{ display: "grid", gap: 14 }}
          >
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Scanned value or gate code</span>
              <input
                className="form-input"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Paste QR result, estate gate URL, access code, or exit code"
                required
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Gate note (optional)</span>
              <input
                className="form-input"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. ID checked, delivery verified, denied by resident"
              />
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Checking..." : "Validate Pass"}
              </button>
              {lookupResult ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setLookupResult(null);
                    setInputValue("");
                    setNote("");
                    setDuesOwed(null);
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      {lookupResult ? (
        <div style={{ display: "grid", gap: 24 }}>
          <div className="card">
            <div className="card-body" style={{ display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>
                    MATCHED BY {lookupResult.matchedBy.replace("_", " ")}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{pass?.holderName}</div>
                  <div style={{ color: "var(--ink3)" }}>
                    {pass?.type} {pass?.houseNumber ? `· House ${pass.houseNumber}` : ""}
                    {pass?.contactPhone ? ` · ${pass.contactPhone}` : ""}
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    background:
                      lookupResult.validation.effectiveStatus === "ACTIVE"
                        ? "rgba(34, 139, 94, 0.12)"
                        : "rgba(177, 133, 48, 0.12)",
                    color:
                      lookupResult.validation.effectiveStatus === "ACTIVE"
                        ? "var(--green)"
                        : "var(--amber)",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {lookupResult.validation.effectiveStatus}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <RulePill label="QR required" enabled={lookupResult.gateRules.qrGateEnforcement} />
                <RulePill
                  label="Entry code required"
                  enabled={lookupResult.gateRules.accessCodeRequired}
                />
                <RulePill
                  label="Exit code required"
                  enabled={lookupResult.gateRules.exitCodeRequired}
                />
              </div>

              {lookupResult.codeType === "RESIDENTIAL" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div className="card" style={{ background: "var(--bg)" }}>
                    <div className="card-body">
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>
                        RESIDENT IDENTITY
                      </div>
                      <div style={{ fontWeight: 700, marginTop: 6 }}>
                        {lookupResult.validation.identityVerified
                          ? "Live resident QR verified"
                          : "Live resident QR required"}
                      </div>
                      <div className="td-muted" style={{ marginTop: 6 }}>
                        House and long-lived resident codes are no longer gate-valid.
                      </div>
                    </div>
                  </div>
                  <div className="card" style={{ background: "var(--bg)" }}>
                    <div className="card-body">
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>
                        ADDRESS
                      </div>
                      <div style={{ fontWeight: 700, marginTop: 6 }}>
                        House {pass?.houseNumber ?? "—"}
                      </div>
                      <div className="td-muted" style={{ marginTop: 6 }}>
                        Match the person physically present with the registered resident list below.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div className="card" style={{ background: "var(--bg)" }}>
                    <div className="card-body">
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>
                        ACCESS CODE
                      </div>
                      <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
                        {pass?.accessCode}
                      </code>
                    </div>
                  </div>
                  <div className="card" style={{ background: "var(--bg)" }}>
                    <div className="card-body">
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>
                        EXIT CODE
                      </div>
                      <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
                        {pass?.exitCode}
                      </code>
                    </div>
                  </div>
                  <div className="card" style={{ background: "var(--bg)" }}>
                    <div className="card-body">
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>
                        VISIT WINDOW
                      </div>
                      <div style={{ fontWeight: 700 }}>{formatDateTime(pass?.validFrom)}</div>
                      <div className="td-muted" style={{ marginTop: 6 }}>
                        until {formatDateTime(pass?.validUntil)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <div className="card" style={{ background: "var(--bg)" }}>
                  <div className="card-body">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>
                      ENTRY RECORDED
                    </div>
                    <div style={{ fontWeight: 700 }}>{formatDateTime(pass?.entryUsedAt)}</div>
                  </div>
                </div>
                <div className="card" style={{ background: "var(--bg)" }}>
                  <div className="card-body">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>
                      EXIT RECORDED
                    </div>
                    <div style={{ fontWeight: 700 }}>{formatDateTime(pass?.exitUsedAt)}</div>
                  </div>
                </div>
                <div className="card" style={{ background: "var(--bg)" }}>
                  <div className="card-body">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>
                      PURPOSE / PEOPLE
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {pass?.purpose || "No purpose added"}
                    </div>
                    <div className="td-muted" style={{ marginTop: 6 }}>
                      {pass?.peopleCount ?? 0} visitor(s)
                    </div>
                  </div>
                </div>
              </div>

              {/* ── RESIDENT IDENTITY VERIFICATION ──────────────────────────
                   Shown when a RESIDENTIAL access/exit code is scanned.
                   The gate operator must visually confirm the person presenting
                   matches one of the registered residents at this address.
                   This stops residents borrowing a neighbour's code to re-enter. */}
              {lookupResult.codeType === "RESIDENTIAL" && lookupResult.residence ? (
                <div
                  style={{
                    borderRadius: 16,
                    border: "2px solid var(--amber)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(177,133,48,0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--amber)" }}>
                        IDENTITY VERIFICATION REQUIRED
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
                        This is a <strong>residential code</strong> for House {lookupResult.residence.houseNumber}
                        {lookupResult.residence.block ? ` (Block ${lookupResult.residence.block})` : ""}.
                        Confirm the person at the gate is one of the registered residents below.
                        Do NOT allow entry if the person does not match.
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 16, display: "grid", gap: 10 }}>
                    {lookupResult.residence.ownerName ? (
                      <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                        <strong>House owner:</strong> {lookupResult.residence.ownerName}
                        {lookupResult.residence.ownerPhone ? ` · ${lookupResult.residence.ownerPhone}` : ""}
                      </div>
                    ) : null}
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, marginBottom: 4 }}>
                      Registered residents at this address:
                    </div>
                    {lookupResult.residence.residents.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--ink3)" }}>No residents registered for this house.</div>
                    ) : (
                      lookupResult.residence.residents.map((res) => (
                        <div
                          key={res.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 14px",
                            borderRadius: 12,
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "var(--primary-light, rgba(26,92,66,0.12))",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: 13,
                              color: "var(--primary, #1A5C42)",
                              flexShrink: 0,
                            }}
                          >
                            {res.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{res.fullName}</div>
                            <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
                              {res.residentType}{res.phone ? ` · ${res.phone}` : ""}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: res.status === "ACTIVE" ? "rgba(34,139,94,0.1)" : "rgba(150,150,150,0.1)",
                              color: res.status === "ACTIVE" ? "var(--green)" : "var(--ink3)",
                            }}
                          >
                            {res.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {/* ── DUES OWED AT GATE ──────────────────────────────────────── */}
              {duesOwed && duesOwed.length > 0 && (
                <div
                  style={{
                    borderRadius: 16,
                    border: "2px solid var(--red, #dc2626)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(220,38,38,0.07)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🚨</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--red, #dc2626)" }}>
                        OUTSTANDING DUES
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
                        The following residents at this address have unpaid estate dues.
                        Report to estate management for enforcement action.
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 16, display: "grid", gap: 12 }}>
                    {duesOwed.map((d) => (
                      <div
                        key={d.residentId}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          background: "var(--bg)",
                          border: "1px solid rgba(220,38,38,0.18)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{d.fullName}</div>
                            <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
                              House {d.houseNumber ?? "—"}
                              {d.overdueSince ? ` · overdue since ${new Date(d.overdueSince).toLocaleDateString("en-NG")}` : ""}
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--red, #dc2626)" }}>
                            ₦{d.outstandingBalance.toLocaleString()}
                          </div>
                        </div>
                        {d.chargesSummary.length > 0 && (
                          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {d.chargesSummary.map((ch) => (
                              <span
                                key={ch.title}
                                style={{
                                  fontSize: 11,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: "rgba(220,38,38,0.08)",
                                  color: "var(--red, #dc2626)",
                                  fontWeight: 600,
                                }}
                              >
                                {ch.title} · ₦{ch.amount.toLocaleString()} ({ch.frequency})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lookupResult.warningMessages.length ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: "rgba(177, 133, 48, 0.12)",
                    color: "var(--amber)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {lookupResult.warningMessages.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={actioningKey !== "" || !lookupResult.validation.entryAllowed}
                  onClick={() => void handleDecision("ALLOW", "ENTRY")}
                >
                  {actioningKey === "ALLOW-ENTRY" ? "Saving..." : "Allow Entry"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={actioningKey !== "" || !lookupResult.validation.exitAllowed}
                  onClick={() => void handleDecision("ALLOW", "EXIT")}
                >
                  {actioningKey === "ALLOW-EXIT" ? "Saving..." : "Allow Exit"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={actioningKey !== ""}
                  onClick={() => void handleDecision("DENY", "ENTRY")}
                >
                  {actioningKey === "DENY-ENTRY" ? "Saving..." : "Deny Entry"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={actioningKey !== ""}
                  onClick={() => void handleDecision("DENY", "EXIT")}
                >
                  {actioningKey === "DENY-EXIT" ? "Saving..." : "Deny Exit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </EstatePortalShell>
  );
}
