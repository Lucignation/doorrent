import { useEffect, useMemo, useState } from "react";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import DataTable from "../../components/ui/DataTable";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type { AdminLandlordRow, BadgeTone, TableColumn } from "../../types/app";

interface AdminLandlordsResponse {
  count: number;
  summary: {
    active: number;
    trial: number;
    suspended: number;
  };
  landlords: Array<AdminLandlordRow & { id: string; companyName: string }>;
}

function planTone(plan: AdminLandlordRow["plan"]): BadgeTone {
  if (plan === "Enterprise") {
    return "gold";
  }

  if (plan === "Pro") {
    return "blue";
  }

  return "gray";
}

function statusTone(status: AdminLandlordRow["status"]): BadgeTone {
  if (status === "active") {
    return "green";
  }

  if (status === "trial") {
    return "amber";
  }

  return "red";
}

export default function AdminLandlordsPage() {
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const { adminSession } = useAdminPortalSession();
  const [landlordData, setLandlordData] = useState<AdminLandlordsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    if (!adminSession?.token) {
      return;
    }

    const adminToken = adminSession.token;
    let cancelled = false;

    async function loadLandlords() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      if (plan) {
        params.set("plan", plan);
      }

      if (state) {
        params.set("state", state);
      }

      try {
        const { data } = await apiRequest<AdminLandlordsResponse>(
          `/admin/landlords${params.toString() ? `?${params.toString()}` : ""}`,
          {
            token: adminToken,
          },
        );

        if (!cancelled) {
          setLandlordData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load landlord accounts.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLandlords();

    return () => {
      cancelled = true;
    };
  }, [adminSession?.token, dataRefreshVersion, plan, search, state, status]);

  const landlordColumns: TableColumn<AdminLandlordRow & { id: string; companyName: string }>[] =
    useMemo(
      () => [
        {
          key: "landlord",
          label: "Landlord",
          render: (row) => (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="tenant-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                {row.landlord
                  .split(" ")
                  .map((word) => word[0])
                  .join("")}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{row.landlord}</div>
                <div className="td-muted">{row.companyName}</div>
              </div>
            </div>
          ),
        },
        { key: "email", label: "Email" },
        {
          key: "plan",
          label: "Plan",
          render: (row) => <StatusBadge tone={planTone(row.plan)}>{row.plan}</StatusBadge>,
        },
        { key: "properties", label: "Properties" },
        { key: "tenants", label: "Tenants" },
        { key: "mrr", label: "MRR" },
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
            <div style={{ display: "flex", gap: 4 }}>
              <button type="button" className="btn btn-ghost btn-xs">
                View
              </button>
              <button
                type="button"
                className={`btn ${row.status === "suspended" ? "btn-secondary" : "btn-danger"} btn-xs`}
                onClick={() =>
                  showToast(
                    row.status === "suspended"
                      ? "Activation controls can be added next"
                      : "Suspension controls can be added next",
                    "info",
                  )
                }
              >
                {row.status === "suspended" ? "Activate" : "Suspend"}
              </button>
            </div>
          ),
        },
      ],
      [showToast],
    );

  const description = landlordData
    ? `${landlordData.count} landlords on the platform`
    : loading
      ? "Loading landlord accounts..."
      : error || "No landlord accounts found.";

  return (
    <>
      <PageMeta title="DoorRent — Landlord Management" />
      <AdminPortalShell
        topbarTitle="Landlord Management"
        breadcrumb="Dashboard → Landlord Management"
      >
        <PageHeader
          title="Landlord Management"
          description={description}
          actions={[
            { label: "Export CSV", variant: "secondary" },
            {
              label: "+ Add Landlord",
              toastMessage: "Use landlord registration from the portal or add a new admin-managed flow next.",
              toastTone: "info",
              variant: "primary",
            },
          ]}
        />

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              placeholder="Search landlords..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TRIAL">Trial</option>
          </select>
          <select
            className="filter-select"
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
          >
            <option value="">All Plans</option>
            <option value="STARTER">Starter</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
          <input
            className="filter-select"
            placeholder="State"
            value={state}
            onChange={(event) => setState(event.target.value)}
          />
        </div>

        <div className="card">
          <DataTable
            columns={landlordColumns}
            rows={landlordData?.landlords ?? []}
            emptyMessage={loading ? "Loading landlords..." : "No landlords found."}
          />
          <div className="pagination">
            <span>
              {loading
                ? "Loading landlords..."
                : `Showing ${landlordData?.landlords.length ?? 0} of ${landlordData?.count ?? 0} landlords`}
            </span>
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
