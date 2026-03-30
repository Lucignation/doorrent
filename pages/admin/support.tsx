import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminSupportPage() {
  return (
    <>
      <PageMeta title="DoorRent — Support Center" />
      <AdminPortalShell topbarTitle="Support Center" breadcrumb="Dashboard → Support Center">
        <PageHeader
          title="Support Center"
          description="Manage landlord and tenant support requests"
        />

        <div className="card">
          <div className="card-body" style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink2)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎫</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)", marginBottom: 8 }}>
              Support ticketing coming soon
            </div>
            <div style={{ fontSize: 14 }}>
              Integrated helpdesk for managing landlord and tenant support requests will appear here.
            </div>
            <div style={{ marginTop: 20 }}>
              <a
                href="mailto:support@usedoorrent.com"
                className="btn btn-secondary btn-sm"
              >
                Email support@usedoorrent.com
              </a>
            </div>
          </div>
        </div>
      </AdminPortalShell>
    </>
  );
}
