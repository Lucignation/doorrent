import { useEffect, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import {
  getSafeWorkspaceHostFromWindow,
  PUBLIC_APP_ORIGIN,
  ROOT_PUBLIC_DOMAIN,
} from "../../lib/frontend-security";

interface EstatePass {
  id: string;
  type: "VISITOR" | "DELIVERY" | "WORKER" | "VEHICLE" | "MOVE" | string;
  holderName: string;
  contactPhone: string | null;
  purpose: string | null;
  peopleCount: number;
  accessCode: string;
  exitCode: string;
  qrToken: string;
  status: "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED" | string;
  validFrom: string;
  validUntil: string;
  createdAt: string;
}

const initialForm = {
  holderName: "",
  type: "VISITOR",
  contactPhone: "",
  purpose: "",
  peopleCount: "1",
  validUntil: "",
};

function buildGateConsoleUrl(qrToken: string, workspaceSlug?: string | null) {
  const safeHost = getSafeWorkspaceHostFromWindow();

  if (safeHost && typeof window !== "undefined") {
    return `${window.location.protocol}//${safeHost}/estate/gate?scan=${encodeURIComponent(qrToken)}`;
  }

  if (workspaceSlug) {
    return `https://${workspaceSlug}.${ROOT_PUBLIC_DOMAIN}/estate/gate?scan=${encodeURIComponent(qrToken)}`;
  }

  return `${PUBLIC_APP_ORIGIN}/estate/gate?scan=${encodeURIComponent(qrToken)}`;
}

function buildPassQrUrl(qrToken: string, workspaceSlug?: string | null) {
  const payload = buildGateConsoleUrl(qrToken, workspaceSlug);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payload)}`;
}

export default function ResidentPassPage() {
  const { residentSession } = useResidentPortalSession();
  const { showToast } = usePrototypeUI();
  const token = residentSession?.token;

  const [passes, setPasses] = useState<EstatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    if (!token) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiRequest<{ passes: EstatePass[] }>("/resident/passes", {
        token,
      });
      setPasses(data.passes ?? []);
    } catch {
      // Ignore list failures and keep the page usable.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  async function handleCreatePass(event: React.FormEvent) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/resident/passes", {
        method: "POST",
        token,
        body: {
          holderName: form.holderName,
          type: form.type,
          contactPhone: form.contactPhone,
          purpose: form.purpose || undefined,
          peopleCount: Number(form.peopleCount) || 1,
          validUntil: form.validUntil || undefined,
        },
      });
      showToast("Pass created.", "success");
      setForm(initialForm);
      void loadData();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to create pass.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  const resident = residentSession?.resident;

  return (
    <ResidentPortalShell topbarTitle="My Passes" breadcrumb="My Passes">
      <PageMeta title="My Passes — Resident Portal" />
      <PageHeader
        title="My Passes"
        description="Create visitor passes with phone numbers, gate codes, and QR verification."
      />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <strong>Your House Entry / Exit Codes</strong>
        </div>
        <div
          className="card-body"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ink3)",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              ENTRY CODE
            </div>
            <code
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: 4,
                background: "var(--bg)",
                padding: "10px 16px",
                borderRadius: 8,
                display: "inline-block",
              }}
            >
              {resident?.accessCode ?? "—"}
            </code>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ink3)",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              EXIT CODE
            </div>
            <code
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: 4,
                background: "var(--bg)",
                padding: "10px 16px",
                borderRadius: 8,
                display: "inline-block",
              }}
            >
              {resident?.exitCode ?? "—"}
            </code>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Create Visitor Pass
          </h3>
          <form onSubmit={handleCreatePass} className="estate-form-grid">
            <label>
              Visitor name
              <input
                className="form-input"
                value={form.holderName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    holderName: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Pass type
              <select
                className="form-input"
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                <option value="VISITOR">Visitor</option>
                <option value="DELIVERY">Delivery</option>
                <option value="WORKER">Worker</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="MOVE">Move in/out</option>
              </select>
            </label>
            <label>
              Visitor phone
              <input
                className="form-input"
                value={form.contactPhone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contactPhone: event.target.value,
                  }))
                }
                placeholder="+234..."
                required
              />
            </label>
            <label>
              People count
              <input
                className="form-input"
                inputMode="numeric"
                value={form.peopleCount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    peopleCount: event.target.value,
                  }))
                }
              />
            </label>
            <label className="estate-form-wide">
              Purpose of visit
              <input
                className="form-input"
                value={form.purpose}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    purpose: event.target.value,
                  }))
                }
                placeholder="e.g. Delivery, guest visit, technician access"
              />
            </label>
            <label>
              Valid until
              <input
                className="form-input"
                type="datetime-local"
                value={form.validUntil}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    validUntil: event.target.value,
                  }))
                }
              />
            </label>
            <div className="estate-form-actions estate-form-wide">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create Pass"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <strong>My Passes</strong>
        </div>
        {loading ? (
          <div className="empty-state">
            <p>Loading passes...</p>
          </div>
        ) : passes.length === 0 ? (
          <div className="empty-state">
            <p>No passes created yet.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
              padding: 18,
            }}
          >
            {passes.map((pass) => (
              <div
                key={pass.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 18,
                  background: "var(--surface)",
                  display: "grid",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {pass.holderName}
                    </div>
                    <div className="td-muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {pass.type}
                      {pass.contactPhone ? ` · ${pass.contactPhone}` : ""}
                      {pass.peopleCount > 1 ? ` · ${pass.peopleCount} people` : ""}
                    </div>
                    {pass.purpose ? (
                      <div
                        className="td-muted"
                        style={{ fontSize: 13, marginTop: 6 }}
                      >
                        {pass.purpose}
                      </div>
                    ) : null}
                  </div>
                  <StatusBadge
                    tone={
                      pass.status === "ACTIVE"
                        ? "green"
                        : pass.status === "USED"
                          ? "gray"
                          : pass.status === "CANCELLED"
                            ? "red"
                            : "amber"
                    }
                  >
                    {pass.status}
                  </StatusBadge>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 220px) 1fr",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg)",
                      borderRadius: 16,
                      padding: 12,
                      display: "grid",
                      justifyItems: "center",
                      gap: 10,
                    }}
                  >
                    <img
                      src={buildPassQrUrl(pass.qrToken, resident?.workspaceSlug)}
                      alt={`QR code for ${pass.holderName}`}
                      style={{ width: 160, height: 160, borderRadius: 12 }}
                    />
                    <div className="td-muted" style={{ fontSize: 12 }}>
                      Scan from the estate Gate Console
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          background: "var(--bg)",
                          borderRadius: 12,
                          padding: "12px 14px",
                        }}
                      >
                        <div className="td-muted" style={{ fontSize: 11 }}>
                          ACCESS CODE
                        </div>
                        <code
                          style={{
                            display: "inline-block",
                            marginTop: 6,
                            fontSize: 18,
                            fontWeight: 800,
                            letterSpacing: 2,
                          }}
                        >
                          {pass.accessCode}
                        </code>
                      </div>
                      <div
                        style={{
                          background: "var(--bg)",
                          borderRadius: 12,
                          padding: "12px 14px",
                        }}
                      >
                        <div className="td-muted" style={{ fontSize: 11 }}>
                          EXIT CODE
                        </div>
                        <code
                          style={{
                            display: "inline-block",
                            marginTop: 6,
                            fontSize: 18,
                            fontWeight: 800,
                            letterSpacing: 2,
                          }}
                        >
                          {pass.exitCode}
                        </code>
                      </div>
                    </div>

                    <div className="td-muted" style={{ fontSize: 12 }}>
                      Created {new Date(pass.createdAt).toLocaleString("en-NG")}
                    </div>
                    <div className="td-muted" style={{ fontSize: 12 }}>
                      Valid from {new Date(pass.validFrom).toLocaleString("en-NG")}
                    </div>
                    <div className="td-muted" style={{ fontSize: 12 }}>
                      Valid until {new Date(pass.validUntil).toLocaleString("en-NG")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResidentPortalShell>
  );
}
