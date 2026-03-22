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

export default function TenantNoticesPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [noticeData, setNoticeData] = useState<TenantNoticesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pendingNoticeId, setPendingNoticeId] = useState("");

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadNotices() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantNoticesResponse>("/tenant/notices", {
          token: tenantToken,
        });

        if (!cancelled) {
          setNoticeData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your notices.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotices();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, tenantSession?.token]);

  const visibleNotices = useMemo(() => {
    if (filter === "unread") {
      return (noticeData?.notices ?? []).filter((notice) => !notice.read);
    }

    return noticeData?.notices ?? [];
  }, [filter, noticeData?.notices]);

  async function markAsRead(noticeId: string) {
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
      showToast("Notice marked as read", "success");
      refreshData();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Notice could not be updated.",
        "error",
      );
    } finally {
      setPendingNoticeId("");
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
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
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
                style={notice.read ? undefined : { borderLeft: "3px solid var(--accent)" }}
              >
                <div className="card-body">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
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
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
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
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                        {notice.title}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                        {notice.body}
                      </div>
                      {!notice.read ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          style={{ marginTop: 12 }}
                          onClick={() => markAsRead(notice.id)}
                          disabled={pendingNoticeId === notice.id}
                        >
                          {pendingNoticeId === notice.id ? "Updating..." : "Mark as read"}
                        </button>
                      ) : null}
                    </div>
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
      </TenantPortalShell>
    </>
  );
}
