import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import CaretakerPortalShell from "../../../components/auth/CaretakerPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { useCaretakerPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import type { BadgeTone, TableColumn } from "../../../types/app";

interface UnitRow {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  tenantName: string | null;
  tenantEmail: string | null;
  leaseEnd: string | null;
  balanceAmount: number;
  balanceFormatted: string | null;
}

interface CaretakerPropertyDetail {
  id: string;
  name: string;
  address: string;
  type: string;
  landlordName: string;
  landlordCompany: string;
  landlordEmail: string;
  totalUnits: number;
  occupiedUnits: number;
  occupancyPercent: number;
  monthlyRevenue: string;
  units: UnitRow[];
}

function unitStatusTone(status: string): BadgeTone {
  if (status === "occupied") return "green";
  if (status === "vacant") return "gray";
  if (status === "maintenance") return "blue";
  if (status === "expiring") return "amber";
  return "red";
}

export default function CaretakerPropertyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { caretakerSession } = useCaretakerPortalSession();
  const [detail, setDetail] = useState<CaretakerPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = caretakerSession?.token;
    if (!token || !id || Array.isArray(id)) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest<CaretakerPropertyDetail>(`/caretaker/properties/${id}`, { token });
        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load property.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, caretakerSession?.token]);

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
            {row.tenantEmail ? (
              <div className="td-muted" style={{ fontSize: 12 }}>{row.tenantEmail}</div>
            ) : null}
          </div>
        ) : (
          <span className="td-muted">Vacant</span>
        ),
    },
    {
      key: "leaseEnd",
      label: "Lease End",
      render: (row) => (
        <span className="td-muted">{row.leaseEnd ?? "—"}</span>
      ),
    },
    {
      key: "balanceFormatted",
      label: "Balance",
      render: (row) =>
        row.balanceAmount > 0 ? (
          <span style={{ color: "var(--red)", fontWeight: 600 }}>{row.balanceFormatted}</span>
        ) : (
          <StatusBadge tone="green">None</StatusBadge>
        ),
    },
  ];

  if (loading) {
    return (
      <CaretakerPortalShell topbarTitle="Properties" breadcrumb="Workspace → Properties → Detail">
        <div style={{ padding: "40px 0", color: "var(--ink2)" }}>Loading property...</div>
      </CaretakerPortalShell>
    );
  }

  if (error || !detail) {
    return (
      <CaretakerPortalShell topbarTitle="Properties" breadcrumb="Workspace → Properties → Detail">
        <div style={{ padding: "40px 0", color: "var(--red)" }}>{error || "Property not found."}</div>
      </CaretakerPortalShell>
    );
  }

  return (
    <>
      <PageMeta title={`DoorRent — ${detail.name}`} urlPath={`/caretaker/properties/${detail.id}`} />
      <CaretakerPortalShell topbarTitle="Properties" breadcrumb="Workspace → Properties → Detail">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void router.push("/caretaker/properties")}
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
            <div className="stat-label">Occupied</div>
            <div className="stat-value">{detail.occupiedUnits}</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Occupancy</div>
            <div className="stat-value">{detail.occupancyPercent}%</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Monthly Revenue</div>
            <div className="stat-value">{detail.monthlyRevenue}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Landlord</div>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Company</div>
                <div style={{ fontWeight: 600 }}>{detail.landlordCompany}</div>
              </div>
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Name</div>
                <div style={{ fontWeight: 500 }}>{detail.landlordName}</div>
              </div>
              <div>
                <div className="td-muted" style={{ fontSize: 12 }}>Email</div>
                <div style={{ fontWeight: 500 }}>{detail.landlordEmail}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Units & Tenants</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DataTable
              columns={unitColumns}
              rows={detail.units}
              emptyMessage="No units found."
            />
          </div>
        </div>
      </CaretakerPortalShell>
    </>
  );
}
