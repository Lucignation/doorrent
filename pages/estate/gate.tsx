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
