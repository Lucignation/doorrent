import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import { tenantNotices } from "../../data/tenant";

export default function TenantNoticesPage() {
  return (
    <>
      <PageMeta title="DoorRent — Notices" />
      <TenantPortalShell topbarTitle="Notices" breadcrumb="Dashboard → Notices">
        <PageHeader title="Notices" description="Messages from your landlord" />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tenantNotices.map((notice) => (
            <div
              key={notice.title}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className={`badge badge-${notice.badge}`} style={{ fontSize: 10 }}>
                        {notice.type}
                      </span>
                      {!notice.read ? (
                        <span
                          style={{
                            background: "var(--accent)",
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 8,
                          }}
                        >
                          NEW
                        </span>
                      ) : null}
                      <span style={{ fontSize: 11, color: "var(--ink3)", marginLeft: "auto" }}>
                        {notice.date}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "var(--ink)" }}>
                      {notice.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                      {notice.body}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </TenantPortalShell>
    </>
  );
}
