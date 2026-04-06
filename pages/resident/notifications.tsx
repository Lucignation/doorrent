import { useEffect, useState } from "react";
import ResidentPortalShell from "../../components/auth/ResidentPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { useResidentPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface ResidentNotification {
  id: string;
  title: string;
  body: string;
  category: string;
  tone: string;
  isRead: boolean;
  createdAt: string;
}

export default function ResidentNotificationsPage() {
  const { residentSession } = useResidentPortalSession();
  const token = residentSession?.token;

  const [notifications, setNotifications] = useState<ResidentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ notifications: ResidentNotification[] }>("/resident/notifications", { token })
      .then(({ data }) => setNotifications(data.notifications ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [token]);

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <ResidentPortalShell topbarTitle="Notifications" breadcrumb="Notifications">
      <PageMeta title="Notifications — Resident Portal" />
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread notification(s)` : "All caught up!"}
      />

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading notifications…</p></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state"><p>No notifications yet.</p></div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                background: n.isRead ? "transparent" : "var(--bg)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 14 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 4 }}>{n.body}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink3)", whiteSpace: "nowrap" }}>
                  {new Date(n.createdAt).toLocaleDateString("en-NG")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ResidentPortalShell>
  );
}
