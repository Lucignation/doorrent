import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { CardIcon } from "../../components/ui/Icons";
import PageHeader from "../../components/ui/PageHeader";
import { tenantNav, tenantUser } from "../../data/tenant";

export default function TenantPayPage() {
  const { showToast } = usePrototypeUI();
  return (
    <>
      <PageMeta title="DoorRent — Pay Rent" />
      <AppShell
        user={tenantUser}
        topbarTitle="Pay Rent"
        breadcrumb="Dashboard → Pay Rent"
        navSections={tenantNav}
      >
        <PageHeader
          title="Pay Rent"
          description="Secure payment via Paystack"
        />

        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Payment Summary</div>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>Property</span>
                <span style={{ fontWeight: 500 }}>Lekki Gardens Estate</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>Unit</span>
                <span style={{ fontWeight: 500 }}>A3 — 2 Bedroom</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>Period</span>
                <span style={{ fontWeight: 500 }}>April 2026</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--ink2)" }}>Due Date</span>
                <span style={{ fontWeight: 500 }}>April 1, 2026</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", marginTop: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Total Due</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                  ₦150,000
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Payment Amount</div>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div
                  onClick={() => showToast("Enter partial amount below", "info")}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: "2px solid var(--accent)",
                    borderRadius: "var(--radius-sm)",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "var(--accent-light)",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                    Full Payment
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                    ₦150,000
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: 12,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)" }}>
                    Partial Payment
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink2)" }}>
                    Custom
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₦)</label>
                <input className="form-input" type="number" defaultValue={150000} />
              </div>
            </div>
          </div>

          <button type="button" className="btn btn-primary btn-full" style={{ padding: 14, fontSize: 15 }} onClick={() => showToast("Redirecting to Paystack checkout…", "info")}>
            <CardIcon />
            Pay ₦150,000 via Paystack
          </button>
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--ink3)" }}>
            🔒 Secured by Paystack · Your payment info is encrypted
          </div>
        </div>
      </AppShell>
    </>
  );
}
