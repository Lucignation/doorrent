import { useEffect, useMemo, useState } from "react";
import EstatePortalShell from "../../components/auth/EstatePortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useEstateAdminPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone, TableColumn } from "../../types/app";

type AuditLogRow = {
  id: string;
  timestamp: string;
  createdAt: string;
  actorType: "LANDLORD" | "TEAM_MEMBER" | "SYSTEM" | string;
  actorName: string;
  actorRole: string | null;
  module: string;
  moduleLabel: string;
  action: string;
  actionLabel: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  summary: string | null;
};

type AuditResponse = {
  summary: {
    total: number;
    modules: Array<{ value: string; label: string }>;
    actorTypes: Array<{ value: string; label: string }>;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  logs: AuditLogRow[];
};

function actorTone(actorType: AuditLogRow["actorType"]): BadgeTone {
  if (actorType === "LANDLORD") return "green";
  if (actorType === "TEAM_MEMBER") return "blue";
  if (actorType === "RESIDENT_OFFICE") return "gold";
  if (actorType === "SYSTEM") return "amber";
  return "gray";
}

function actorLabel(actorType: AuditLogRow["actorType"]) {
  if (actorType === "LANDLORD") return "Estate admin";
  if (actorType === "TEAM_MEMBER") return "Team member";
  if (actorType === "RESIDENT_OFFICE") return "Resident office";
  if (actorType === "SYSTEM") return "System";
  return actorType;
}

export default function EstateAuditPage() {
  const { estateAdminSession } = useEstateAdminPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actorTypeFilter, setActorTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setPage(1); }, [query, moduleFilter, actorTypeFilter]);

  useEffect(() => {
    const token = estateAdminSession?.token;
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const search = new URLSearchParams();
        if (query.trim()) search.set("search", query.trim());
        if (moduleFilter) search.set("module", moduleFilter);
        if (actorTypeFilter) search.set("actorType", actorTypeFilter);
        search.set("page", String(page));
        search.set("pageSize", "25");
        const { data } = await apiRequest<AuditResponse>(`/estate/audit?${search.toString()}`, { token });
        if (!cancelled) setAuditData(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load audit log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [actorTypeFilter, dataRefreshVersion, estateAdminSession?.token, moduleFilter, page, query]);

  const columns = useMemo<TableColumn<AuditLogRow>[]>(() => [
    {
      key: "timestamp",
      label: "When",
      render: (row) => (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{row.timestamp}</span>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>{new Date(row.createdAt).toLocaleString("en-NG")}</span>
        </div>
      ),
    },
    {
      key: "actor",
      label: "Who",
      render: (row) => (
        <div style={{ display: "grid", gap: 6 }}>
          <IdentityCell primary={row.actorName} secondary={row.actorRole ?? undefined} />
          <StatusBadge tone={actorTone(row.actorType)}>{actorLabel(row.actorType)}</StatusBadge>
        </div>
      ),
    },
    {
      key: "module",
      label: "Module",
      render: (row) => (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{row.moduleLabel}</span>
          <span className="td-muted" style={{ fontSize: 11 }}>{row.module}</span>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{row.actionLabel}</span>
          <code style={{ fontSize: 11, background: "var(--bg)", padding: "2px 6px", borderRadius: 6, width: "fit-content" }}>{row.action}</code>
        </div>
      ),
    },
    {
      key: "target",
      label: "Target",
      render: (row) => (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{row.targetLabel ?? "Estate"}</span>
          <span className="td-muted" style={{ fontSize: 11 }}>{row.targetType}{row.targetId ? ` · ${row.targetId.slice(-8)}` : ""}</span>
        </div>
      ),
    },
    {
      key: "summary",
      label: "Summary",
      render: (row) => <span className="td-muted">{row.summary ?? row.actionLabel}</span>,
    },
  ], []);

  const pagination = auditData?.pagination;

  return (
    <EstatePortalShell topbarTitle="Audit Log" breadcrumb="Audit Log">
      <PageMeta title="Audit Log — Estate" />
      <PageHeader
        title="Audit Log"
        description={
          auditData ? `${auditData.pagination.total} estate activity events recorded`
            : loading ? "Loading audit log…" : error || "Audit log unavailable."
        }
      />

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 1.5fr) 1fr 1fr" }}>
            <input
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor, action, target, or summary"
            />
            <select className="form-input" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="">All modules</option>
              {(auditData?.summary.modules ?? []).map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select className="form-input" value={actorTypeFilter} onChange={(e) => setActorTypeFilter(e.target.value)}>
              <option value="">All actors</option>
              {(auditData?.summary.actorTypes ?? []).map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={auditData?.logs ?? []}
          loading={loading}
          loadingMessage="Loading audit log…"
          emptyMessage="No audit events found."
        />
      </div>

      {pagination ? (
        <div className="card" style={{ marginTop: 16, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div className="td-muted" style={{ fontSize: 13 }}>
            {pagination.total === 0 ? "No events" : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total}`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" disabled={pagination.page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} type="button">Previous</button>
            <button className="btn btn-secondary btn-sm" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} type="button">Next</button>
          </div>
        </div>
      ) : null}
    </EstatePortalShell>
  );
}
