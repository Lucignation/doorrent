import { useEffect, useState } from "react";
import CaretakerPortalShell from "../../components/auth/CaretakerPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import NotificationFeed, {
  type NotificationFeedItem,
} from "../../components/ui/NotificationFeed";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useCaretakerPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface CaretakerNotificationsResponse {
  summary: {
    total: number;
    unread: number;
  };
  items: NotificationFeedItem[];
}

export default function CaretakerNotificationsPage() {
  const { caretakerSession } = useCaretakerPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [notificationData, setNotificationData] =
    useState<CaretakerNotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const caretakerToken = caretakerSession?.token;

    if (!caretakerToken) {
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<CaretakerNotificationsResponse>(
          "/caretaker/notifications",
          {
            token: caretakerToken,
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
              : "We could not load caretaker notifications.",
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
  }, [caretakerSession?.token, dataRefreshVersion]);

  return (
    <>
      <PageMeta
        title="DoorRent — Caretaker Notifications"
        urlPath="/caretaker/notifications"
      />
      <CaretakerPortalShell
        topbarTitle="Notifications"
        breadcrumb="Workspace → Notifications"
      >
        <PageHeader
          title="Notifications"
          description={
            notificationData
              ? `${notificationData.summary.unread} unread update(s) across your assigned landlords`
              : loading
                ? "Loading caretaker notifications..."
                : error || "Notifications are unavailable."
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
            <div className="stat-label">Total Alerts</div>
            <div className="stat-value">{notificationData?.summary.total ?? 0}</div>
            <div className="stat-sub">Across assigned portfolios</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Unread</div>
            <div className="stat-value">{notificationData?.summary.unread ?? 0}</div>
            <div className="stat-sub">Needs action</div>
          </div>
        </div>

        <NotificationFeed
          items={notificationData?.items ?? []}
          emptyMessage={loading ? "Loading notifications..." : "No notifications yet."}
        />
      </CaretakerPortalShell>
    </>
  );
}
