import { type FormEvent, useState } from "react";
import ResidentPortalShell from "../../../components/auth/ResidentPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import PageHeader from "../../../components/ui/PageHeader";
import { useResidentPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import { formatEstateCurrency } from "../../../lib/estate-preview";

type GateLookupResult = {
  query: string;
  matchedBy: "QR" | "ACCESS_CODE" | "EXIT_CODE";
  suggestedLane: "ENTRY" | "EXIT";
  codeType?: "RESIDENTIAL" | "VISITOR_PASS";
  warningMessages: string[];
  validation: {
    effectiveStatus: string;
    entryAllowed: boolean;
    exitAllowed: boolean;
    identityVerified?: boolean;
    requiresLiveQr?: boolean;
  };
  pass: {
    id: string;
    holderName: string;
    houseNumber?: string | null;
    contactPhone?: string | null;
    type: string;
  };
  residence?: {
    houseNumber: string;
    block?: string | null;
    residents: Array<{
      id: string;
      fullName: string;
      residentType: string;
      phone?: string | null;
      status: string;
    }>;
  } | null;
};

type GateDecisionResult = {
  allowed: boolean;
  message: string;
};

type ResidentDuesOwed = {
  residentId: string;
  fullName: string;
  outstandingBalance: number;
  chargesSummary: Array<{ title: string; amount: number }>;
};

export default function ResidentOfficeGatePage() {
  const { residentSession } = useResidentPortalSession();
  const token = residentSession?.token;
  const [inputValue, setInputValue] = useState("");
  const [note, setNote] = useState("");
  const [lookupResult, setLookupResult] = useState<GateLookupResult | null>(null);
  const [duesOwed, setDuesOwed] = useState<ResidentDuesOwed[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [actioningKey, setActioningKey] = useState("");
  const [error, setError] = useState("");

  async function runLookup(queryOverride?: string) {
    const query = (queryOverride ?? inputValue).trim();

    if (!token || !query) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<GateLookupResult>(
        `/resident/office/gate/lookup?query=${encodeURIComponent(query)}`,
        { token },
      );
      setLookupResult(response.data);

      if (response.data.codeType === "RESIDENTIAL" && response.data.pass.houseNumber) {
        try {
          const duesResponse = await apiRequest<{ duesOwed: ResidentDuesOwed[] }>(
            `/resident/office/gate/house-dues/${encodeURIComponent(response.data.pass.houseNumber)}`,
            { token },
          );
          setDuesOwed(duesResponse.data.duesOwed ?? []);
        } catch {
          setDuesOwed(null);
        }
      } else {
        setDuesOwed(null);
      }
    } catch (requestError) {
      setLookupResult(null);
      setDuesOwed(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not validate that gate proof.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(action: "ALLOW" | "DENY", lane: "ENTRY" | "EXIT") {
    if (!token || !lookupResult) {
      return;
    }

    const actionKey = `${action}-${lane}`;
    setActioningKey(actionKey);

    try {
      const response = await apiRequest<GateDecisionResult>(
        `/resident/office/gate/${lookupResult.pass.id}/decision`,
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
      setError("");
      await runLookup(lookupResult.query);
      window.alert(response.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not save that gate decision.",
      );
    } finally {
      setActioningKey("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await runLookup();
  }

  return (
    <ResidentPortalShell topbarTitle="Gate Console" breadcrumb="Office Gate">
      <PageMeta title="Resident Office Gate Console" />
      <PageHeader
        title="Resident Gate Coordination"
        description="Active security office holders can validate live resident QR access and visitor passes."
      />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: "var(--bg)",
              color: "var(--ink2)",
              lineHeight: 1.7,
            }}
          >
            Resident gate access now depends on a short-lived live QR. Shared resident or house codes
            should show as verification-required and must not be approved.
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Scanned value or pass code</span>
              <input
                className="form-input"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Paste the resident QR scan, pass QR, or visitor code"
                required
              />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Gate note (optional)</span>
              <input
                className="form-input"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. ID matched, dues checked, denied for expired QR"
              />
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Checking..." : "Validate"}
              </button>
              {lookupResult ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setLookupResult(null);
                    setDuesOwed(null);
                    setInputValue("");
                    setNote("");
                    setError("");
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      {lookupResult ? (
        <div style={{ display: "grid", gap: 24 }}>
          <div className="card">
            <div className="card-body" style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>
                    MATCHED BY {lookupResult.matchedBy.replace("_", " ")}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 24 }}>{lookupResult.pass.holderName}</div>
                  <div className="td-muted" style={{ marginTop: 4 }}>
                    {lookupResult.pass.type}
                    {lookupResult.pass.houseNumber
                      ? ` · House ${lookupResult.pass.houseNumber}`
                      : ""}
                    {lookupResult.pass.contactPhone
                      ? ` · ${lookupResult.pass.contactPhone}`
                      : ""}
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

              {lookupResult.warningMessages.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {lookupResult.warningMessages.map((message) => (
                    <div
                      key={message}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "rgba(177, 133, 48, 0.12)",
                        color: "var(--amber)",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      {message}
                    </div>
                  ))}
                </div>
              ) : null}

              {lookupResult.residence?.residents.length ? (
                <div className="card" style={{ background: "var(--bg)" }}>
                  <div className="card-body" style={{ display: "grid", gap: 10 }}>
                    <strong>Registered residents on this address</strong>
                    {lookupResult.residence.residents.map((resident) => (
                      <div
                        key={resident.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                          fontSize: 13,
                        }}
                      >
                        <span>
                          {resident.fullName} · {resident.residentType}
                          {resident.phone ? ` · ${resident.phone}` : ""}
                        </span>
                        <strong>{resident.status}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {duesOwed?.length ? (
                <div className="card" style={{ background: "var(--bg)" }}>
                  <div className="card-body" style={{ display: "grid", gap: 10 }}>
                    <strong>Outstanding dues at this address</strong>
                    {duesOwed.map((item) => (
                      <div
                        key={item.residentId}
                        style={{
                          display: "grid",
                          gap: 4,
                          paddingBottom: 10,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {item.fullName} · {formatEstateCurrency(item.outstandingBalance)}
                        </div>
                        <div className="td-muted" style={{ fontSize: 12 }}>
                          {item.chargesSummary.map((charge) => charge.title).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
    </ResidentPortalShell>
  );
}
