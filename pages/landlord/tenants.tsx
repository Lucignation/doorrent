import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import { SearchIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type {
  BadgeTone,
  TableColumn,
  TenantInviteRow,
  TenantLedgerRow,
} from "../../types/app";

interface TenantInvitationRecord extends TenantInviteRow {
  id: string;
  billingSchedule?: string;
}

interface InvitationResponse {
  count: number;
  summary: {
    pending: number;
    completed: number;
    expired: number;
  };
  invitations: Array<{
    id: string;
    email: string;
    property: string;
    unit: string;
    rent: string;
    billingSchedule?: string;
    monthlyEquivalent?: string;
    leaseStart: string;
    leaseEnd: string;
    expiresAt: string;
    status: "pending" | "completed" | "expired";
  }>;
}

interface TenantRecord extends TenantLedgerRow {
  id: string;
  billingSchedule?: string;
}

interface TenantResponse {
  count: number;
  summary: {
    total: number;
    current: number;
    expiring: number;
    overdue: number;
    properties: number;
  };
  filters: {
    properties: Array<{ id: string; name: string }>;
    statuses: Array<{ value: string; label: string }>;
  };
  tenants: TenantRecord[];
}

function statusTone(status: TenantLedgerRow["status"]): BadgeTone {
  if (status === "current") {
    return "green";
  }

  if (status === "expiring") {
    return "amber";
  }

  return "red";
}

export default function LandlordTenantsPage() {
  const router = useRouter();
  const { dataRefreshVersion, openModal } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [tenantData, setTenantData] = useState<TenantResponse | null>(null);
  const [inviteData, setInviteData] = useState<InvitationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!landlordSession?.token) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

    async function loadTenantPage() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (propertyId) {
        params.set("propertyId", propertyId);
      }

      if (status) {
        params.set("status", status);
      }

      try {
        const [{ data: tenants }, { data: invitations }] = await Promise.all([
          apiRequest<TenantResponse>(
            `/landlord/tenants${params.toString() ? `?${params.toString()}` : ""}`,
            {
              token: landlordToken,
            },
          ),
          apiRequest<InvitationResponse>("/landlord/tenants/invitations", {
            token: landlordToken,
          }),
        ]);

        if (!cancelled) {
          setTenantData(tenants);
          setInviteData(invitations);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your tenant records.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTenantPage();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token, propertyId, search, status]);

  const tenantColumns: TableColumn<TenantRecord>[] = useMemo(
    () => [
      {
        key: "tenant",
        label: "Tenant",
        render: (row) => <IdentityCell primary={row.tenant} secondary={row.email} />,
      },
      { key: "unit", label: "Unit" },
      {
        key: "rent",
        label: "Rent",
        render: (row) => (
          <div>
            <span style={{ fontWeight: 600 }}>{row.billingSchedule ?? row.rent}</span>
            <div className="td-muted">
              Annual equivalent: {row.rent}
            </div>
          </div>
        ),
      },
      { key: "leaseEnd", label: "Lease End" },
      {
        key: "balance",
        label: "Balance",
        render: (row) =>
          row.balance === "—" ? (
            <StatusBadge tone="green">None</StatusBadge>
          ) : (
            <span style={{ color: "var(--red)", fontWeight: 600 }}>{row.balance}</span>
          ),
      },
      {
        key: "status",
        label: "Payment Status",
        render: (row) => (
          <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => void router.push(`/landlord/tenants/${row.id}`)}
            >
              View
            </button>
            {row.status === "overdue" ? (
              <button
                type="button"
                className="btn btn-danger btn-xs"
                onClick={() => openModal("send-notice")}
              >
                Remind
              </button>
            ) : null}
            {row.status === "expiring" ? (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => openModal("send-notice")}
              >
                Renew
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [openModal, router],
  );

  const inviteRows: TenantInvitationRecord[] = (inviteData?.invitations ?? []).map(
    (invitation) => ({
      id: invitation.id,
      email: invitation.email,
      property: invitation.property,
      unit: invitation.unit,
      rent: invitation.rent,
      billingSchedule: invitation.billingSchedule,
      monthlyEquivalent: invitation.monthlyEquivalent,
      lease: `${invitation.leaseStart} → ${invitation.leaseEnd}`,
      expires: invitation.expiresAt,
      status: invitation.status,
    }),
  );

  const inviteColumns: TableColumn<TenantInvitationRecord>[] = [
    { key: "email", label: "Invitee Email" },
    { key: "property", label: "Property" },
    { key: "unit", label: "Unit" },
    {
      key: "rent",
      label: "Rent",
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600 }}>{row.billingSchedule ?? row.rent}</span>
          <div className="td-muted">
            Annual equivalent: {row.rent}
          </div>
        </div>
      ),
    },
    { key: "lease", label: "Lease" },
    { key: "expires", label: "Invite Expires" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          tone={
            row.status === "completed"
              ? "green"
              : row.status === "expired"
                ? "red"
                : "amber"
          }
        >
          {row.status}
        </StatusBadge>
      ),
    },
  ];

  const description = tenantData
    ? `${tenantData.summary.total} active tenants · Invite links collect ID documents, guarantor details, and signatures before move-in`
    : loading
      ? "Loading your tenant ledger..."
      : error || "No tenant data available.";

  return (
    <>
      <PageMeta title="DoorRent — Tenants" />
      <LandlordPortalShell topbarTitle="Tenants" breadcrumb="Dashboard → Tenants">
        <PageHeader
          title="Tenants"
          description={description}
          actions={[
            { label: "Send Bulk Notice", modal: "send-notice", variant: "secondary" },
            { label: "+ Invite Tenant", modal: "add-tenant", variant: "primary" },
          ]}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Pending Onboarding Invites</div>
              <div className="card-subtitle">
                Landlords assign the property and unit, then tenants upload their ID, enter guarantor details, and sign before the landlord reviews.
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={inviteColumns}
              rows={inviteRows}
              emptyMessage={loading ? "Loading invites..." : "No pending invites."}
            />
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              className="search-input"
              placeholder="Search tenants..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          >
            <option value="">All Properties</option>
            {(tenantData?.filters.properties ?? []).map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All Status</option>
            {(tenantData?.filters.statuses ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <DataTable
            columns={tenantColumns}
            rows={tenantData?.tenants ?? []}
            emptyMessage={loading ? "Loading tenants..." : "No tenants found."}
          />
          <div className="pagination">
            <span>
              {loading
                ? "Loading tenants..."
                : `Showing ${tenantData?.tenants.length ?? 0} of ${tenantData?.count ?? 0} tenants`}
            </span>
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
