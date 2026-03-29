import { useEffect, useMemo, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

interface TenantNoticeRow {
  id: string;
  icon: string;
  type: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  badge: "green" | "amber" | "red" | "blue" | "gold";
}

interface TenantNoticesResponse {
  summary: {
    total: number;
    unread: number;
  };
  notices: TenantNoticeRow[];
}

const PAGE_SIZE = 10;

export default function TenantNoticesPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [noticeData, setNoticeData] = useState<TenantNoticesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pendingNoticeId, setPendingNoticeId] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<TenantNoticeRow | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const tenantToken = tenantSession?.token;
    if (!tenantToken) return;

    let cancelled = false;

    async function loadNotices() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantNoticesResponse>("/tenant/notices", {
          token: tenantToken,
        });
        if (!cancelled) setNoticeData(data);
      } catch (requestError) {
        if (!cancelled)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your notices.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadNotices();
    return () => { cancelled = true; };
  }, [dataRefreshVersion, tenantSession?.token]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const filteredNotices = useMemo(() => {
    const all = noticeData?.notices ?? [];
    return filter === "unread" ? all.filter((n) => !n.read) : all;
  }, [filter, noticeData?.notices]);

  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / PAGE_SIZE));
  const visibleNotices = filteredNotices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function markAsRead(noticeId: string, silent = false) {
    if (!tenantSession?.token) {
      showToast("Tenant session missing. Please sign in again.", "error");
      return;
    }

    setPendingNoticeId(noticeId);

    try {
      await apiRequest<{ id: string; read: boolean }>(`/tenant/notices/${noticeId}/read`, {
        method: "POST",
        token: tenantSession.token,
      });
      if (!silent) showToast("Notice marked as read", "success");
      refreshData();
      // Update selectedNotice locally so modal reflects read state immediately
      setSelectedNotice((prev) => prev?.id === noticeId ? { ...prev, read: true } : prev);
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Notice could not be updated.",
        "error",
      );
    } finally {
      setPendingNoticeId("");
    }
  }

  function openNotice(notice: TenantNoticeRow) {
    // Set notice first, then auto-mark using the notice object directly (not state)
    setSelectedNotice(notice);
    if (!notice.read) {
      void markAsRead(notice.id, true);
    }
  }

  const description = noticeData
    ? `${noticeData.summary.unread} unread of ${noticeData.summary.total} notice(s)`
    : loading
      ? "Loading messages from your landlord..."
      : error || "No notices are available.";

  return (
    <>
      <PageMeta title="DoorRent — Notices" urlPath="/tenant/notices" />
      <TenantPortalShell topbarTitle="Notices" breadcrumb="Dashboard → Notices">
        <PageHeader title="Notices" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
          </div>
        ) : null}

        <div className="tabs">
          <div
            className={`tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Notices ({noticeData?.summary.total ?? 0})
          </div>
          <div
            className={`tab ${filter === "unread" ? "active" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Unread ({noticeData?.summary.unread ?? 0})
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visibleNotices.length ? (
            visibleNotices.map((notice) => (
              <div
                key={notice.id}
                className="card"
                onClick={() => openNotice(notice)}
                style={{
                  cursor: "pointer",
                  borderLeft: notice.read ? undefined : "3px solid var(--accent)",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 2px 12px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                }}
              >
                <div className="card-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {notice.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        <span className={`badge badge-${notice.badge}`}>{notice.type}</span>
                        {!notice.read ? (
                          <span
                            style={{
                              background: "var(--accent)",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            NEW
                          </span>
                        ) : null}
                        <span style={{ fontSize: 11, color: "var(--ink3)", marginLeft: "auto" }}>
                          {notice.date}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                        {notice.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--ink2)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {notice.body}
                      </div>
                    </div>
                    <div style={{ color: "var(--ink3)", fontSize: 18, flexShrink: 0 }}>›</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card">
              <div className="card-body" style={{ color: "var(--ink2)" }}>
                {loading ? "Loading notices..." : "No notices match this filter."}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: p === page ? "var(--accent)" : "var(--card)",
                  color: p === page ? "#fff" : "var(--ink)",
                  fontWeight: p === page ? 700 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </TenantPortalShell>

      {/* Detail modal */}
      {selectedNotice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
          }}
          onClick={() => setSelectedNotice(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 680,
              background: "var(--card)",
              borderRadius: "16px 16px 0 0",
              padding: "28px 28px 40px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 99,
                background: "var(--border)",
                margin: "0 auto 20px",
              }}
            />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {selectedNotice.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span className={`badge badge-${selectedNotice.badge}`}>{selectedNotice.type}</span>
                  {!selectedNotice.read ? (
                    <span
                      style={{
                        background: "var(--accent)",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      NEW
                    </span>
                  ) : null}
                  <span style={{ fontSize: 12, color: "var(--ink3)", marginLeft: "auto" }}>
                    {selectedNotice.date}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedNotice.title}</div>
              </div>
            </div>

            {/* Body */}
            <div
              style={{
                fontSize: 14,
                color: "var(--ink)",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                borderTop: "1px solid var(--border)",
                paddingTop: 16,
              }}
            >
              {selectedNotice.body}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              {!selectedNotice.read && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => markAsRead(selectedNotice.id)}
                  disabled={pendingNoticeId === selectedNotice.id}
                >
                  {pendingNoticeId === selectedNotice.id ? "Updating..." : "Mark as read"}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedNotice(null)}
                style={{ marginLeft: "auto" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
