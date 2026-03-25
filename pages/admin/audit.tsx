import { useEffect, useState } from "react";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone, TableColumn } from "../../types/app";

interface AuditRow {
  id: string;
  timestamp: string;
  actor: string;
  role: "landlord" | "tenant" | "super_admin";
  action: string;
  entity: string;
  ipAddress: string;
}

interface AuditResponse {
  count: number;
  logs: AuditRow[];
}

function roleTone(role: AuditRow["role"]): BadgeTone {
  if (role === "super_admin") return "red";
  if (role === "landlord") return "blue";
  return "gray";
}

export default function AdminAuditPage() {
  const { adminSession } = useAdminPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminSession?.token) return;
    const token = adminSession.token;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: result } = await apiRequest<AuditResponse>("/admin/audit", { token });
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load audit logs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [dataRefreshVersion, adminSession?.token]);

  const columns: TableColumn<AuditRow>[] = [
    { key: "timestamp", label: "Timestamp", render: (row) => <span style={{ fontSize: 11, color: "var(--ink3)", whiteSpace: "nowrap" }}>{row.timestamp}</span> },
    { key: "actor", label: "Actor", render: (row) => <IdentityCell primary={row.actor} /> },
    { key: "role", label: "Role", render: (row) => <StatusBadge tone={roleTone(row.role)}>{row.role}</StatusBadge> },
    {
      key: "action", label: "Action",
      render: (row) => <code style={{ fontSize: 11, background: "var(--bg)", padding: "2px 6px", borderRadius: 3 }}>{row.action}</code>,
    },
    { key: "entity", label: "Entity", render: (row) => <span className="td-muted">{row.entity}</span> },
    { key: "ipAddress", label: "IP", render: (row) => <span style={{ fontSize: 11, color: "var(--ink3)", fontFamily: "monospace" }}>{row.ipAddress}</span> },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Audit Logs" />
      <AdminPortalShell topbarTitle="Audit Logs" breadcrumb="Dashboard → Audit Logs">
        <PageHeader
          title="Audit Logs"
          description={data ? `${data.count} events recorded` : loading ? "Loading..." : error || "No audit events."}
          actions={[{ label: "Export CSV", variant: "secondary" }]}
        />

        {error ? (
          <div className="card">
            <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
          </div>
        ) : (
          <div className="card">
            <DataTable
              columns={columns}
              rows={data?.logs ?? []}
              emptyMessage={loading ? "Loading audit logs..." : "No audit events found."}
            />
          </div>
        )}
      </AdminPortalShell>
    </>
  );
}
