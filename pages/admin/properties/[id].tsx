import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminPortalShell from "../../../components/auth/AdminPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { useAdminPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import type { BadgeTone, TableColumn } from "../../../types/app";

interface UnitRow {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  tenantName: string | null;
  tenantEmail: string | null;
}

interface PropertyDetail {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  createdAt: string;
  landlord: {
    id: string;
    name: string;
    companyName: string;
    email: string;
  };
  totalUnits: number;
  occupiedUnits: number;
  occupancyPercent: number;
  annualRevenue: string;
  units: UnitRow[];
}

function unitStatusTone(status: string): BadgeTone {
  if (status === "occupied") return "green";
  if (status === "vacant") return "gray";
  if (status === "maintenance") return "blue";
  if (status === "expiring") return "amber";
  return "red";
}

export default function AdminPropertyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { adminSession } = useAdminPortalSession();
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = adminSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest<PropertyDetail>(`/admin/properties/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load property.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, adminSession?.token]);

  const unitColumns: TableColumn<UnitRow>[] = [
    {
      key: "unitNumber",
      label: "Unit",
      render: (row) => <span style={{ fontWeight: 600 }}>{row.unitNumber}</span>,
    },
    { key: "type", label: "Type" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={unitStatusTone(row.status)}>{row.status}</StatusBadge>
      ),
    },
    {
      key: "tenantName",
      label: "Tenant",
      render: (row) =>
        row.tenantName ? (
          <div>
            <div style={{ fontWeight: 500 }}>{row.tenantName}</div>
            <div className="td-muted" style={{ fontSize: 12 }}>{row.tenantEmail}</div>
          </div>
        ) : (
          <span className="td-muted">—</span>
        ),
    },
  ];

  if (loading) {
    return (
      <AdminPortalShell topbarTitle="Properties" breadcrumb="Dashboard → Properties → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading property...</div>
      </AdminPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <AdminPortalShell topbarTitle="Properties" breadcrumb="Dashboard → Properties → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Property not found."}</div>
      </AdminPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent Admin — ${detail.name}`} urlPath={`/admin/properties/${detail.id}`} />
      <AdminPortalShell topbarTitle="Properties" breadcrumb="Dashboard → Properties → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/admin/properties")}
          >
            ← Back to Properties
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{detail.name}</h1>
          <div style={{ color: "var(--ink2)", fontSize: 14, marginTop: 4 }}>
            {detail.type} · {detail.address}
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
          <div className="stat-card accent-blue">
            <div className="stat-label">Total Units</div>
            <div className="stat-value">{detail.totalUnits}</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Occupied Units</div>
            <div className="stat-value">{detail.occupiedUnits}</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Occupancy Rate</div>
            <div className="stat-value">{detail.occupancyPercent}%</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Annual Revenue</div>
            <div className="stat-value">{detail.annualRevenue}</div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Property Info</div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Location</div>
                  <div style={{ fontWeight: 500 }}>{detail.city}, {detail.state}</div>
                </div>
                <div>
                  <div className="td-muted" style={{ fontSize: 12 }}>Type</div>
                  <div style={{ fontWeight: 500 }}>{detail.type}</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="td-muted" style={{ fontSize: 12 }}>Created</div>
                <div style={{ fontWeight: 500 }}>{detail.createdAt}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Landlord</div>
            </div>
            <div className="card-body">
              <div style={{ fontWeight: 600 }}>{detail.landlord.companyName}</div>
              <div className="td-muted">{detail.landlord.name}</div>
              <div className="td-muted">{detail.landlord.email}</div>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => void router.push(`/admin/landlords/${detail.landlord.id}`)}
                >
                  View Landlord Profile →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Units</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={unitColumns}
              rows={detail.units}
              emptyMessage="No units found."
            />
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
