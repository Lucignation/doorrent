import type { ReactNode } from "react";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import type { ModalId } from "../../types/app";
import SignaturePad from "./SignaturePad";

function ModalFrame({
  modalId,
  size,
  title,
  children,
  footer,
}: {
  modalId: ModalId;
  size?: "modal-lg" | "modal-xl";
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { activeModal, closeModal } = usePrototypeUI();
  const open = activeModal === modalId;

  return (
    <div
      className={`modal-overlay ${open ? "open" : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <div className={`modal ${size || ""}`}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button type="button" className="modal-close" onClick={closeModal}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function PrototypeOverlays() {
  const { closeModal, showToast, toasts } = usePrototypeUI();

  return (
    <>
      <ModalFrame
        modalId="add-property"
        size="modal-lg"
        title="Add New Property"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                closeModal();
                showToast("Property created successfully", "success");
              }}
            >
              Create Property
            </button>
          </>
        )}
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Property Name *</label>
            <input className="form-input" placeholder="e.g. Lekki Gardens Estate" />
          </div>
          <div className="form-group">
            <label className="form-label">Property Type *</label>
            <select className="form-input" defaultValue="Residential">
              <option>Residential</option>
              <option>Commercial</option>
              <option>Mixed Use</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Full Address *</label>
          <input className="form-input" placeholder="Street address" />
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">City *</label>
            <input className="form-input" placeholder="Lagos" />
          </div>
          <div className="form-group">
            <label className="form-label">State *</label>
            <input className="form-input" placeholder="Lagos State" />
          </div>
          <div className="form-group">
            <label className="form-label">Total Floors</label>
            <input className="form-input" type="number" placeholder="e.g. 4" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" placeholder="Brief description of the property…" />
        </div>
        <div className="form-group">
          <label className="form-label">Amenities</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input type="checkbox" defaultChecked /> 24/7 Security
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input type="checkbox" defaultChecked /> Parking
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input type="checkbox" /> Swimming Pool
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input type="checkbox" defaultChecked /> Generator
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input type="checkbox" /> Gym
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input type="checkbox" defaultChecked /> Borehole
            </label>
          </div>
        </div>
      </ModalFrame>

      <ModalFrame
        modalId="add-tenant"
        size="modal-lg"
        title="Add New Tenant"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                closeModal();
                showToast("Tenant added & invite sent", "success");
              }}
            >
              Add Tenant
            </button>
          </>
        )}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Personal Information
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input className="form-input" placeholder="First name" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input className="form-input" placeholder="Last name" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-input" type="email" placeholder="tenant@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input className="form-input" placeholder="+234 800 000 0000" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ID Type</label>
              <select className="form-input" defaultValue="National ID">
                <option>National ID</option>
                <option>International Passport</option>
                <option>Driver&apos;s License</option>
                <option>Voter&apos;s Card</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ID Number</label>
              <input className="form-input" placeholder="ID number" />
            </div>
          </div>
        </div>
        <div className="form-divider" />
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Unit Assignment & Lease
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Property *</label>
              <select className="form-input" defaultValue="Lekki Gardens Estate">
                <option>Lekki Gardens Estate</option>
                <option>VI Towers</option>
                <option>Ikoyi Residences</option>
                <option>Yaba Court</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit *</label>
              <select className="form-input" defaultValue="B2 — 2 Bed (₦180,000/mo)">
                <option>B2 — 2 Bed (₦180,000/mo)</option>
                <option>C1 — 1 Bed (₦120,000/mo)</option>
                <option>D3 — 3 Bed (₦280,000/mo)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Lease Start Date *</label>
              <input className="form-input" type="date" defaultValue="2026-04-01" />
            </div>
            <div className="form-group">
              <label className="form-label">Lease End Date *</label>
              <input className="form-input" type="date" defaultValue="2027-03-31" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rent Amount (₦) *</label>
              <input className="form-input" type="number" placeholder="180000" />
            </div>
            <div className="form-group">
              <label className="form-label">Deposit Amount (₦)</label>
              <input className="form-input" type="number" placeholder="360000" />
            </div>
          </div>
        </div>
        <div className="form-divider" />
        <div className="checkbox-wrap" style={{ marginBottom: 8 }}>
          <input type="checkbox" id="send-invite" defaultChecked />
          <label htmlFor="send-invite">Send portal invitation email to tenant</label>
        </div>
        <div className="checkbox-wrap">
          <input type="checkbox" id="gen-agreement" defaultChecked />
          <label htmlFor="gen-agreement">Generate tenancy agreement from template</label>
        </div>
      </ModalFrame>

      <ModalFrame
        modalId="send-notice"
        title="Send Notice"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                closeModal();
                showToast("Notice sent to 24 tenants", "success");
              }}
            >
              Send Notice
            </button>
          </>
        )}
      >
        <div className="form-group">
          <label className="form-label">Notice Type *</label>
          <select className="form-input" defaultValue="Rent Increase Notice">
            <option>Rent Increase Notice</option>
            <option>Vacate Notice</option>
            <option>General Announcement</option>
            <option>Maintenance Notice</option>
            <option>Rent Reminder</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Recipients *</label>
          <select className="form-input" defaultValue="All Tenants (24)">
            <option>All Tenants (24)</option>
            <option>Lekki Gardens — All Tenants (8)</option>
            <option>VI Towers — All Tenants (9)</option>
            <option>Specific Tenant…</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Subject *</label>
          <input className="form-input" defaultValue="Rent Increase Notice — Q3 2026" />
        </div>
        <div className="form-group">
          <label className="form-label">Message *</label>
          <textarea
            className="form-input"
            style={{ minHeight: 120 }}
            defaultValue={`Dear Tenant,

We wish to inform you that effective from July 1, 2026, your monthly rent will be adjusted in line with current market rates.

Please contact us if you have any questions.

DoorRent Property Management`}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Delivery Method</label>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" defaultChecked /> Email
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" defaultChecked /> SMS
            </label>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Schedule</label>
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="radio" name="sched" defaultChecked /> Send Now
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="radio" name="sched" /> Schedule for Later
            </label>
          </div>
        </div>
      </ModalFrame>

      <ModalFrame
        modalId="sign-agreement"
        size="modal-lg"
        title="Review & Sign Agreement"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                closeModal();
                showToast("Agreement signed successfully", "success");
              }}
            >
              Sign Agreement
            </button>
          </>
        )}
      >
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, marginBottom: 20, fontSize: 13, lineHeight: 1.8, maxHeight: 280, overflowY: "auto" }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, textAlign: "center" }}>TENANCY AGREEMENT</div>
          <p>This Tenancy Agreement is entered into on <strong>April 1, 2026</strong>, between <strong>Babatunde Adeyemi</strong> (&quot;Landlord&quot;) and <strong>Amaka Obi</strong> (&quot;Tenant&quot;).</p>
          <br />
          <p><strong>1. PROPERTY:</strong> The Landlord agrees to let and the Tenant agrees to take on tenancy the property known as Unit A3, Lekki Gardens Estate, Lekki Phase 1, Lagos.</p>
          <br />
          <p><strong>2. TERM:</strong> The tenancy shall commence on April 1, 2026 and expire on March 31, 2027 (12 months).</p>
          <br />
          <p><strong>3. RENT:</strong> The Tenant shall pay a monthly rent of ₦150,000 (One Hundred and Fifty Thousand Naira) payable in advance on the 1st of each month.</p>
          <br />
          <p><strong>4. DEPOSIT:</strong> A security deposit of ₦300,000 has been paid and will be refunded at the end of tenancy subject to satisfactory inspection.</p>
          <br />
          <p><strong>5. USE OF PROPERTY:</strong> The property shall be used solely as a private residential dwelling and for no other purpose.</p>
        </div>
        <div className="form-group">
          <label className="form-label">Your Signature *</label>
          <SignaturePad />
        </div>
        <div className="checkbox-wrap">
          <input type="checkbox" id="agree-check" />
          <label htmlFor="agree-check">I have read and agree to the terms of this tenancy agreement</label>
        </div>
      </ModalFrame>

      <ModalFrame
        modalId="notifications"
        title="Notifications"
        footer={(
          <div className="card-footer" style={{ width: "100%", padding: 0, border: "none", background: "transparent" }}>
            <span style={{ fontSize: 12, color: "var(--ink3)" }}>5 notifications</span>
            <button type="button" className="btn btn-ghost btn-xs">
              Mark all read
            </button>
          </div>
        )}
      >
        <div style={{ padding: 0 }}>
          <div className="timeline" style={{ padding: "0 20px" }}>
            {[
              ["var(--red)", "Tunde Adeola — Rent Overdue", "₦150,000 rent is 21 days overdue on Unit B1, Lekki Gardens", "2h ago"],
              ["var(--amber)", "Emeka Nwosu — Lease Expiring", "Lease expires in 25 days. Send renewal notice.", "5h ago"],
              ["var(--green)", "Payment Received — Chidinma Eze", "₦320,000 received for Unit 5A, Ikoyi Residences", "1d ago"],
              ["var(--accent)", "Agreement Signed — Kelechi Dike", "Tenancy agreement for Unit 3B has been signed", "2d ago"],
              ["var(--accent)", "New Tenant Portal Access", "Ngozi Adichie activated their tenant portal account", "3d ago"],
            ].map(([color, title, description, time]) => (
              <div key={`${title}-${time}`} className="timeline-item">
                <div className="timeline-dot" style={{ background: color }} />
                <div className="timeline-content">
                  <div className="timeline-title">{title}</div>
                  <div className="timeline-desc">{description}</div>
                </div>
                <div className="timeline-time">{time}</div>
              </div>
            ))}
          </div>
        </div>
      </ModalFrame>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone === "default" ? "" : toast.tone}`.trim()}>
            <span style={{ fontSize: 16 }}>
              {toast.tone === "success" ? "✓" : toast.tone === "error" ? "✕" : toast.tone === "info" ? "ℹ" : "·"}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
