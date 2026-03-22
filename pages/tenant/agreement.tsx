import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import PageHeader from "../../components/ui/PageHeader";
import { tenantAgreementTimeline } from "../../data/tenant";

export default function TenantAgreementPage() {
  const { openModal, showToast } = usePrototypeUI();
  return (
    <>
      <PageMeta title="DoorRent — My Agreement" />
      <TenantPortalShell topbarTitle="My Agreement" breadcrumb="Dashboard → My Agreement">
        <PageHeader
          title="My Agreement"
          description="Tenancy agreement for Unit A3, Lekki Gardens"
        />

        <div className="grid-2">
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Tenancy Agreement</div>
                  <div className="card-subtitle">Standard Residential · Version 2.1</div>
                </div>
                <span className="badge badge-amber">Awaiting Signature</span>
              </div>
              <div
                style={{
                  padding: 20,
                  background: "var(--bg)",
                  borderBottom: "1px solid var(--border)",
                  maxHeight: 340,
                  overflowY: "auto",
                  fontSize: 13,
                  lineHeight: 1.8,
                  color: "var(--ink2)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, textAlign: "center", color: "var(--ink)", marginBottom: 16 }}>
                  RESIDENTIAL TENANCY AGREEMENT
                </div>
                <p><strong>Date:</strong> April 1, 2026</p><br />
                <p><strong>Landlord:</strong> Babatunde Adeyemi (Lekki Property Holdings Ltd)</p>
                <p><strong>Tenant:</strong> Amaka Obi</p><br />
                <p><strong>1. PROPERTY:</strong> Unit A3, Lekki Gardens Estate, Lekki Phase 1, Lagos State, Nigeria.</p><br />
                <p><strong>2. TERM:</strong> 12 months commencing April 1, 2026 and ending March 31, 2027.</p><br />
                <p><strong>3. RENT:</strong> ₦150,000 per month, payable on the 1st of each month without demand.</p><br />
                <p><strong>4. DEPOSIT:</strong> Security deposit of ₦300,000 (equivalent to 2 months rent) held by Landlord.</p><br />
                <p><strong>5. USE:</strong> Residential purposes only. Sub-letting is prohibited without written consent.</p><br />
                <p><strong>6. UTILITIES:</strong> Tenant is responsible for all electricity (EKEDC) and water bills.</p><br />
                <p><strong>7. MAINTENANCE:</strong> Tenant shall maintain the property in good condition and promptly report damage.</p>
              </div>
              <div className="card-body">
                <button type="button" className="btn btn-primary btn-full" onClick={() => openModal("sign-agreement")}>
                  Review & Sign Agreement
                </button>
                <button type="button" className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={() => showToast("Agreement downloaded", "success")}>
                  ↓ Download PDF
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Agreement Status</div>
              </div>
              <div className="card-body">
                <div className="timeline">
                  {tenantAgreementTimeline.map((item) => (
                    <div key={item.label} className="timeline-item">
                      <div
                        className="timeline-dot"
                        style={{
                          background: item.done ? "var(--green)" : "var(--border2)",
                        }}
                      />
                      <div className="timeline-content">
                        <div
                          className="timeline-title"
                          style={item.done ? undefined : { color: "var(--ink3)" }}
                        >
                          {item.label}
                        </div>
                        <div className="timeline-desc">{item.description}</div>
                      </div>
                      <div className="timeline-time">{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
