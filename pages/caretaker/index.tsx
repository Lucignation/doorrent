import { useEffect, useState } from "react";
import CaretakerPortalShell from "../../components/auth/CaretakerPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useCaretakerPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { TableColumn } from "../../types/app";

interface AssignmentRow {
  id: string;
  landlordId: string;
  landlordName: string;
  serviceType: string;
  scopeLabel: string;
  properties: Array<{
    id: string;
    name: string;
  }>;
}

interface PaymentRow {
  id: string;
  landlordName: string;
  tenant: string;
  propertyUnit: string;
  amount: string;
  date: string;
  method: string;
}

interface UrgentTenantRow {
  id: string;
  landlordName: string;
  tenant: string;
  propertyUnit: string;
  status: "overdue" | "expiring";
  balance: string;
  leaseEnd: string;
}

interface NoticeRow {
  id: string;
  landlordName: string;
  subject: string;
  type: string;
  recipients: string;
  sent: string;
}

interface CaretakerOverviewResponse {
  caretaker: {
    id: string;
    organizationName: string;
    contactName: string;
  };
  summary: {
    landlordsCount: number;
    propertiesCount: number;
    occupiedUnitsCount: number;
    overdueTenantsCount: number;
    monthlyCollectionsFormatted: string;
    recentNoticeCount: number;
  };
  assignments: AssignmentRow[];
  recentPayments: PaymentRow[];
  urgentTenants: UrgentTenantRow[];
  recentNotices: NoticeRow[];
}

export default function CaretakerOverviewPage() {
  const { caretakerSession } = useCaretakerPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [overview, setOverview] = useState<CaretakerOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const caretakerToken = caretakerSession?.token;

    if (!caretakerToken) {
      return;
    }

    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<CaretakerOverviewResponse>(
          "/caretaker/overview",
          {
            token: caretakerToken,
          },
        );

        if (!cancelled) {
          setOverview(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your caretaker overview.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [caretakerSession?.token, dataRefreshVersion]);

  const assignmentColumns: TableColumn<AssignmentRow>[] = [
    { key: "landlordName", label: "Landlord" },
    { key: "serviceType", label: "Service Type" },
    { key: "scopeLabel", label: "Scope" },
    {
      key: "properties",
      label: "Properties",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {row.properties.slice(0, 3).map((property) => (
            <span key={property.id} className="tag">
              {property.name}
            </span>
          ))}
          {row.properties.length > 3 ? (
            <span className="tag">+{row.properties.length - 3} more</span>
          ) : null}
        </div>
      ),
    },
  ];

  const paymentColumns: TableColumn<PaymentRow>[] = [
    { key: "landlordName", label: "Landlord" },
    { key: "tenant", label: "Tenant" },
    { key: "propertyUnit", label: "Property / Unit" },
    { key: "amount", label: "Amount" },
    { key: "date", label: "Date" },
    { key: "method", label: "Method" },
  ];

  const urgentColumns: TableColumn<UrgentTenantRow>[] = [
    { key: "landlordName", label: "Landlord" },
    { key: "tenant", label: "Tenant" },
    { key: "propertyUnit", label: "Property / Unit" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={row.status === "overdue" ? "red" : "amber"}>
          {row.status === "overdue" ? "Overdue" : "Expiring"}
        </StatusBadge>
      ),
    },
    { key: "balance", label: "Balance" },
    { key: "leaseEnd", label: "Lease End" },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Caretaker Overview" urlPath="/caretaker" />
      <CaretakerPortalShell topbarTitle="Overview" breadcrumb="Workspace → Overview">
        <PageHeader
          title={overview?.caretaker.organizationName ?? "Caretaker Workspace"}
          description={
            overview
              ? `${overview.summary.landlordsCount} landlord workspace(s) and ${overview.summary.propertiesCount} assigned propert${overview.summary.propertiesCount === 1 ? "y" : "ies"}`
              : loading
                ? "Loading your caretaker overview..."
                : error || "Caretaker overview unavailable."
          }
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
          <div className="stat-card accent-blue">
            <div className="stat-label">Assigned Landlords</div>
            <div className="stat-value">{overview?.summary.landlordsCount ?? 0}</div>
            <div className="stat-sub">Active organizations</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Properties</div>
            <div className="stat-value">{overview?.summary.propertiesCount ?? 0}</div>
            <div className="stat-sub">Managed across your scope</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Collections (Month)</div>
            <div className="stat-value">
              {overview?.summary.monthlyCollectionsFormatted ?? "₦0"}
            </div>
            <div className="stat-sub">Confirmed payments</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Overdue Tenants</div>
            <div className="stat-value">{overview?.summary.overdueTenantsCount ?? 0}</div>
            <div className="stat-sub">Needs follow-up</div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Assignments</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={assignmentColumns}
                rows={overview?.assignments ?? []}
                emptyMessage={loading ? "Loading assignments..." : "No assignments yet."}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Notices</div>
            </div>
            <div className="card-body">
              <div className="timeline">
                {(overview?.recentNotices ?? []).map((notice) => (
                  <div key={notice.id} className="timeline-item">
                    <div className="timeline-dot" style={{ background: "var(--amber)" }} />
                    <div className="timeline-content">
                      <div className="timeline-title">{notice.subject}</div>
                      <div className="timeline-desc">
                        {notice.landlordName} · {notice.type} · {notice.recipients}
                      </div>
                    </div>
                    <div className="timeline-time">{notice.sent}</div>
                  </div>
                ))}
                {!overview?.recentNotices.length ? (
                  <div style={{ color: "var(--ink2)" }}>
                    {loading ? "Loading notices..." : "No recent notices."}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Payments</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={paymentColumns}
                rows={overview?.recentPayments ?? []}
                emptyMessage={loading ? "Loading payments..." : "No recent payments."}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Urgent Tenants</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={urgentColumns}
                rows={overview?.urgentTenants ?? []}
                emptyMessage={loading ? "Loading tenants..." : "No urgent tenants."}
              />
            </div>
          </div>
        </div>
      </CaretakerPortalShell>
    </>
  );
}
