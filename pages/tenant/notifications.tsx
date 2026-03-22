import { useEffect, useState } from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import NotificationFeed, {
  type NotificationFeedItem,
} from "../../components/ui/NotificationFeed";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";

interface TenantNotificationsResponse {
  summary: {
    total: number;
    unread: number;
  };
  items: NotificationFeedItem[];
}

export default function TenantNotificationsPage() {
  const { tenantSession } = useTenantPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [notificationData, setNotificationData] =
    useState<TenantNotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<TenantNotificationsResponse>(
          "/tenant/notifications",
          {
            token: tenantToken,
          },
        );

        if (!cancelled) {
          setNotificationData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your notifications.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, tenantSession?.token]);

  const description = notificationData
    ? `${notificationData.summary.unread} unread update(s) across notices, receipts, and agreement activity`
    : loading
      ? "Loading your latest activity..."
      : error || "No notifications are available.";

  return (
    <>
      <PageMeta title="DoorRent — Notifications" urlPath="/tenant/notifications" />
      <TenantPortalShell
        topbarTitle="Notifications"
        breadcrumb="Dashboard → Notifications"
      >
        <PageHeader title="Notifications" description={description} />

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
            <div className="stat-label">Total Notifications</div>
            <div className="stat-value">{notificationData?.summary.total ?? 0}</div>
            <div className="stat-sub">Recent portal activity</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Unread</div>
            <div className="stat-value">{notificationData?.summary.unread ?? 0}</div>
            <div className="stat-sub">Needs your attention</div>
          </div>
        </div>

        <NotificationFeed
          items={notificationData?.items ?? []}
          emptyMessage={loading ? "Loading notifications..." : "No notifications yet."}
        />
      </TenantPortalShell>
    </>
  );
}
