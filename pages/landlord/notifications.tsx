import { useEffect, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import NotificationFeed, {
  type NotificationFeedItem,
} from "../../components/ui/NotificationFeed";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface LandlordNotificationsResponse {
  summary: {
    total: number;
    unread: number;
  };
  items: NotificationFeedItem[];
}

export default function LandlordNotificationsPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [notificationData, setNotificationData] =
    useState<LandlordNotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const landlordToken = landlordSession?.token;

    if (!landlordToken) {
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordNotificationsResponse>(
          "/landlord/notifications",
          {
            token: landlordToken,
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
              : "We could not load notifications.",
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
  }, [dataRefreshVersion, landlordSession?.token]);

  const description = notificationData
    ? `${notificationData.summary.unread} unread operational alert(s) in your workspace`
    : loading
      ? "Loading landlord notifications..."
      : error || "Notifications are unavailable.";

  return (
    <>
      <PageMeta title="DoorRent — Notifications" urlPath="/landlord/notifications" />
      <LandlordPortalShell
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
            <div className="stat-label">Total Alerts</div>
            <div className="stat-value">{notificationData?.summary.total ?? 0}</div>
            <div className="stat-sub">Recent landlord activity</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Unread</div>
            <div className="stat-value">{notificationData?.summary.unread ?? 0}</div>
            <div className="stat-sub">Needs follow-up</div>
          </div>
        </div>

        <NotificationFeed
          items={notificationData?.items ?? []}
          emptyMessage={loading ? "Loading notifications..." : "No notifications yet."}
        />
      </LandlordPortalShell>
    </>
  );
}
