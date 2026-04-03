import { useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
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
  if (actorType === "SYSTEM") return "amber";
  return "gray";
}

function actorLabel(actorType: AuditLogRow["actorType"]) {
  if (actorType === "LANDLORD") return "Landlord";
  if (actorType === "TEAM_MEMBER") return "Team member";
  if (actorType === "SYSTEM") return "System";
  return actorType;
}

export default function LandlordAuditPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actorTypeFilter, setActorTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [query, moduleFilter, actorTypeFilter]);

  useEffect(() => {
    const token = landlordSession?.token;

    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadAuditLogs() {
      setLoading(true);
      setError("");

      try {
        const search = new URLSearchParams();
        if (query.trim()) search.set("search", query.trim());
        if (moduleFilter) search.set("module", moduleFilter);
        if (actorTypeFilter) search.set("actorType", actorTypeFilter);
        search.set("page", String(page));
        search.set("pageSize", "25");

        const { data } = await apiRequest<AuditResponse>(
          `/landlord/audit?${search.toString()}`,
          { token },
        );

        if (!cancelled) {
          setAuditData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load the audit log.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [actorTypeFilter, dataRefreshVersion, landlordSession?.token, moduleFilter, page, query]);

  const description = auditData
    ? `${auditData.pagination.total} company activity event(s) recorded`
    : loading
      ? "Loading workspace audit log..."
      : error || "Audit log unavailable.";

  const columns = useMemo<TableColumn<AuditLogRow>[]>(
    () => [
      {
        key: "timestamp",
        label: "When",
        render: (row) => (
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
              {row.timestamp}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink3)" }}>
              {new Date(row.createdAt).toLocaleString("en-NG")}
            </span>
          </div>
        ),
      },
      {
        key: "actor",
        label: "Who",
        render: (row) => (
          <div style={{ display: "grid", gap: 6 }}>
            <IdentityCell primary={row.actorName} secondary={row.actorRole ?? undefined} />
            <div>
              <StatusBadge tone={actorTone(row.actorType)}>{actorLabel(row.actorType)}</StatusBadge>
            </div>
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
            <code style={{ fontSize: 11, background: "var(--bg)", padding: "2px 6px", borderRadius: 6, width: "fit-content" }}>
              {row.action}
            </code>
          </div>
        ),
      },
      {
        key: "target",
        label: "Target",
        render: (row) => (
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{row.targetLabel ?? "Workspace"}</span>
            <span className="td-muted" style={{ fontSize: 11 }}>
              {row.targetType}
              {row.targetId ? ` · ${row.targetId.slice(-8)}` : ""}
            </span>
          </div>
        ),
      },
      {
        key: "summary",
        label: "Summary",
        render: (row) => (
          <span className="td-muted">{row.summary ?? row.actionLabel}</span>
        ),
      },
    ],
    [],
  );

  const pagination = auditData?.pagination;

  return (
    <>
      <PageMeta title="DoorRent — Audit Log" urlPath="/landlord/audit" />
      <LandlordPortalShell topbarTitle="Audit Log" breadcrumb="Dashboard → Audit Log">
        <PageHeader title="Audit Log" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div className="stat-card accent-blue">
            <div className="stat-label">Recorded Events</div>
            <div className="stat-value">{auditData?.pagination.total ?? 0}</div>
            <div className="stat-sub">Workspace actions by landlord, staff, and automation</div>
          </div>
          <div className="stat-card accent-gold">
            <div className="stat-label">Visible Modules</div>
            <div className="stat-value">{auditData?.summary.modules.length ?? 0}</div>
            <div className="stat-sub">Properties, units, payments, settings, and more</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Visible Actors</div>
            <div className="stat-value">{auditData?.summary.actorTypes.length ?? 0}</div>
            <div className="stat-sub">Landlord, team members, and DoorRent automation</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "minmax(260px, 1.5fr) minmax(180px, 1fr) minmax(180px, 1fr)",
              }}
            >
              <input
                className="form-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search actor, action, target, or summary"
              />
              <select
                className="form-input"
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
              >
                <option value="">All modules</option>
                {(auditData?.summary.modules ?? []).map((module) => (
                  <option key={module.value} value={module.value}>
                    {module.label}
                  </option>
                ))}
              </select>
              <select
                className="form-input"
                value={actorTypeFilter}
                onChange={(event) => setActorTypeFilter(event.target.value)}
              >
                <option value="">All actors</option>
                {(auditData?.summary.actorTypes ?? []).map((actorType) => (
                  <option key={actorType.value} value={actorType.value}>
                    {actorType.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="td-muted" style={{ fontSize: 12 }}>
              Only landlord/company-side users can see this audit history.
            </div>
          </div>
        </div>

        <div className="card">
          <DataTable
            columns={columns}
            rows={auditData?.logs ?? []}
            loading={loading}
            loadingMessage="Refreshing workspace audit history..."
            emptyMessage={loading ? "Loading workspace audit log..." : "No audit events found for the current filter."}
          />
        </div>

        {pagination ? (
          <div
            className="card"
            style={{
              marginTop: 16,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div className="td-muted" style={{ fontSize: 13 }}>
              {pagination.total === 0
                ? "No audit events"
                : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total,
                  )} of ${pagination.total} events`}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() =>
                  setPage((current) => Math.min(pagination.totalPages, current + 1))
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </LandlordPortalShell>
    </>
  );
}
