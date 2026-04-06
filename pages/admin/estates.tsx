import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import DataTable from "../../components/ui/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import { SearchIcon } from "../../components/ui/Icons";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone, TableColumn } from "../../types/app";

interface EstateRow {
  id: string;
  estateName: string;
  ownerName: string;
  ownerEmail: string;
  workspaceSlug: string;
  properties: number;
  units: number;
  teamMembers: number;
  status: "active" | "trial" | "suspended";
  billing: string;
  betaStatus: string;
  betaEndsAt: string;
  joined: string;
}

interface AdminEstatesResponse {
  count: number;
  summary: {
    active: number;
    suspended: number;
    foundingBetaActive: number;
  };
  estates: EstateRow[];
}

interface CreatedEstateResponse {
  estate: {
    id: string;
    estateName: string;
    workspaceMode: "ESTATE_ADMIN";
    workspaceModeLabel: string;
    workspaceSlug: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string | null;
    status: string;
    betaStartsAt: string;
    betaEndsAt: string;
    temporaryPasswordExpiresAt: string;
    loginUrl: string;
  };
  credentials: {
    email: string;
    temporaryPassword: string;
    temporaryPasswordExpiresAt: string;
    workspaceIdentifier: string;
    loginUrl: string;
    emailDelivery: "sent" | "failed" | "skipped";
  };
}

type EstateStatusFilter = "" | "ACTIVE" | "SUSPENDED" | "TRIAL";

const INITIAL_FORM = {
  estateName: "",
  preferredSlug: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPhone: "",
  brandDisplayName: "",
  publicSupportEmail: "",
  publicSupportPhone: "",
  betaDurationDays: "90",
};

function statusTone(status: EstateRow["status"]): BadgeTone {
  if (status === "active") {
    return "green";
  }

  if (status === "trial") {
    return "amber";
  }

  return "red";
}

function deliveryTone(
  delivery: CreatedEstateResponse["credentials"]["emailDelivery"],
): BadgeTone {
  if (delivery === "sent") {
    return "green";
  }

  if (delivery === "failed") {
    return "red";
  }

  return "amber";
}

export default function AdminEstatesPage() {
  const router = useRouter();
  const { adminSession } = useAdminPortalSession();
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const [data, setData] = useState<AdminEstatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingEstateId, setRegeneratingEstateId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EstateStatusFilter>("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [createdEstate, setCreatedEstate] = useState<CreatedEstateResponse | null>(
    null,
  );

  useEffect(() => {
    if (!adminSession?.token) {
      return;
    }

    const token = adminSession.token;
    let cancelled = false;

    async function loadEstates() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      try {
        const { data: result } = await apiRequest<AdminEstatesResponse>(
          `/admin/estates${params.toString() ? `?${params.toString()}` : ""}`,
          {
            token,
          },
        );

        if (!cancelled) {
          setData(result);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load estate workspaces.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEstates();

    return () => {
      cancelled = true;
    };
  }, [adminSession?.token, dataRefreshVersion, search, status]);

  const estateColumns: TableColumn<EstateRow>[] = useMemo(
    () => [
      {
        key: "estate",
        label: "Estate",
        render: (row) => (
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 600 }}>{row.estateName}</div>
            <div className="td-muted">
              {row.workspaceSlug}.usedoorrent.com
            </div>
          </div>
        ),
      },
      {
        key: "owner",
        label: "Estate Admin",
        render: (row) => (
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 500 }}>{row.ownerName}</div>
            <div className="td-muted">{row.ownerEmail}</div>
          </div>
        ),
      },
      { key: "billing", label: "Billing" },
      {
        key: "beta",
        label: "Founding Beta",
        render: (row) => (
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 500 }}>{row.betaStatus}</div>
            <div className="td-muted">Ends {row.betaEndsAt}</div>
          </div>
        ),
      },
      {
        key: "footprint",
        label: "Footprint",
        render: (row) => (
          <div className="td-muted">
            {row.properties} compounds · {row.units} units · {row.teamMembers} staff
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
        ),
      },
      { key: "joined", label: "Joined" },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => void router.push(`/admin/landlords/${row.id}`)}
            >
              View
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => void handleRegenerateEstatePassword(row.id)}
              disabled={regeneratingEstateId === row.id}
            >
              {regeneratingEstateId === row.id ? "Regenerating..." : "New Password"}
            </button>
          </div>
        ),
      },
    ],
    [regeneratingEstateId, router],
  );

  async function handleCreateEstate() {
    if (!adminSession?.token) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: result, message } = await apiRequest<CreatedEstateResponse>(
        "/admin/estates",
        {
          method: "POST",
          token: adminSession.token,
          body: {
            estateName: form.estateName,
            preferredSlug: form.preferredSlug,
            adminFirstName: form.adminFirstName,
            adminLastName: form.adminLastName,
            adminEmail: form.adminEmail,
            adminPhone: form.adminPhone,
            brandDisplayName: form.brandDisplayName,
            publicSupportEmail: form.publicSupportEmail,
            publicSupportPhone: form.publicSupportPhone,
            betaDurationDays: Number(form.betaDurationDays || 90),
          },
        },
      );

      setCreatedEstate(result);
      setForm(INITIAL_FORM);
      setShowOnboarding(false);
      showToast(message || "Estate workspace onboarded successfully.", "success");

      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (status) {
        params.set("status", status);
      }

      const refreshed = await apiRequest<AdminEstatesResponse>(
        `/admin/estates${params.toString() ? `?${params.toString()}` : ""}`,
        {
          token: adminSession.token,
        },
      );
      setData(refreshed.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not onboard the estate workspace.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateEstatePassword(estateId: string) {
    if (!adminSession?.token) {
      return;
    }

    setRegeneratingEstateId(estateId);
    setError("");

    try {
      const { data: result, message } = await apiRequest<CreatedEstateResponse>(
        `/admin/estates/${estateId}/regenerate-password`,
        {
          method: "POST",
          token: adminSession.token,
        },
      );

      setCreatedEstate(result);
      showToast(message || "New estate admin password generated.", "success");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not generate a new estate admin password.",
      );
    } finally {
      setRegeneratingEstateId(null);
    }
  }

  return (
    <>
      <PageMeta title="DoorRent Admin — Estates" />
      <AdminPortalShell topbarTitle="Estates" breadcrumb="Dashboard → Estates">
        <PageHeader
          title="Estate Workspaces"
          description={
            data
              ? `${data.count} estate workspace${data.count === 1 ? "" : "s"} · ${data.summary.foundingBetaActive} on founding beta`
              : loading
                ? "Loading estate workspaces..."
                : error || "No estates onboarded yet."
          }
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowOnboarding((current) => !current)}
          >
            {showOnboarding ? "Hide Onboarding Form" : "Onboard Estate"}
          </button>
        </div>

        {showOnboarding ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Onboard Estate</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <label className="form-label">Estate Name</label>
                  <input
                    className="form-input"
                    value={form.estateName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        estateName: event.target.value,
                      }))
                    }
                    placeholder="Lekki Palm Court Residents Association"
                  />
                </div>
                <div>
                  <label className="form-label">Preferred Slug</label>
                  <input
                    className="form-input"
                    value={form.preferredSlug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        preferredSlug: event.target.value,
                      }))
                    }
                    placeholder="lekki"
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <label className="form-label">Estate Admin First Name</label>
                  <input
                    className="form-input"
                    value={form.adminFirstName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminFirstName: event.target.value,
                      }))
                    }
                    placeholder="Babatunde"
                  />
                </div>
                <div>
                  <label className="form-label">Estate Admin Last Name</label>
                  <input
                    className="form-input"
                    value={form.adminLastName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminLastName: event.target.value,
                      }))
                    }
                    placeholder="Adeyemi"
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <label className="form-label">Estate Admin Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminEmail: event.target.value,
                      }))
                    }
                    placeholder="admin@lekkiestate.ng"
                  />
                </div>
                <div>
                  <label className="form-label">Estate Admin Phone</label>
                  <input
                    className="form-input"
                    value={form.adminPhone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminPhone: event.target.value,
                      }))
                    }
                    placeholder="+234 801 234 5678"
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <label className="form-label">Brand Display Name</label>
                  <input
                    className="form-input"
                    value={form.brandDisplayName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        brandDisplayName: event.target.value,
                      }))
                    }
                    placeholder="Lekki Palm Court"
                  />
                </div>
                <div>
                  <label className="form-label">Founding Beta Days</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={365}
                    value={form.betaDurationDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        betaDurationDays: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <label className="form-label">Public Support Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.publicSupportEmail}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        publicSupportEmail: event.target.value,
                      }))
                    }
                    placeholder="support@lekkiestate.ng"
                  />
                </div>
                <div>
                  <label className="form-label">Public Support Phone</label>
                  <input
                    className="form-input"
                    value={form.publicSupportPhone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        publicSupportPhone: event.target.value,
                      }))
                    }
                    placeholder="+234 801 000 0000"
                  />
                </div>
              </div>

              <div className="form-help" style={{ marginTop: 16 }}>
                DoorRent will create this estate as an Enterprise workspace, activate
                founding beta immediately, and return a one-time temporary password
                for the estate admin.
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleCreateEstate()}
                  disabled={saving}
                >
                  {saving ? "Creating..." : "Create Estate Workspace"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOnboarding(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {createdEstate ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Estate Onboarding Credentials</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Estate</div>
                  <div style={{ fontWeight: 600 }}>{createdEstate.estate.estateName}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Workspace Type</div>
                  <div style={{ fontWeight: 600 }}>
                    {createdEstate.estate.workspaceModeLabel}
                  </div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Login Email</div>
                  <div style={{ fontWeight: 600 }}>{createdEstate.credentials.email}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Temporary Password</div>
                  <div style={{ fontWeight: 600 }}>
                    {createdEstate.credentials.temporaryPassword}
                  </div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Workspace Identifier</div>
                  <div style={{ fontWeight: 600 }}>
                    {createdEstate.credentials.workspaceIdentifier}
                  </div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Password Expires</div>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(
                      createdEstate.credentials.temporaryPasswordExpiresAt,
                    ).toLocaleString("en-NG")}
                  </div>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Email Delivery</div>
                  <div style={{ marginTop: 4 }}>
                    <StatusBadge tone={deliveryTone(createdEstate.credentials.emailDelivery)}>
                      {createdEstate.credentials.emailDelivery}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      void handleRegenerateEstatePassword(createdEstate.estate.id)
                    }
                    disabled={regeneratingEstateId === createdEstate.estate.id}
                  >
                    {regeneratingEstateId === createdEstate.estate.id
                      ? "Regenerating..."
                      : "Generate New Password"}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="td-muted" style={{ fontSize: 12 }}>Login URL</div>
                <a href={createdEstate.credentials.loginUrl} target="_blank" rel="noreferrer">
                  {createdEstate.credentials.loginUrl}
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              placeholder="Search estates..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={status}
            onChange={(event) => setStatus(event.target.value as EstateStatusFilter)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TRIAL">Trial</option>
          </select>
        </div>

        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Active Estates</div>
            <div className="stat-value">{data?.summary.active ?? "—"}</div>
            <div className="stat-sub">Live estate workspaces</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Founding Beta</div>
            <div className="stat-value">{data?.summary.foundingBetaActive ?? "—"}</div>
            <div className="stat-sub">Estates currently in beta</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Suspended</div>
            <div className="stat-value">{data?.summary.suspended ?? "—"}</div>
            <div className="stat-sub">Restricted estate workspaces</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Estate Workspace Directory</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={estateColumns}
              rows={data?.estates ?? []}
              emptyMessage={
                loading
                  ? "Loading estate workspaces..."
                  : error || "No estate workspaces found."
              }
            />
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
