import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import EstatePortalShell from "../../../components/auth/EstatePortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import DataTable from "../../../components/ui/DataTable";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { useEstateAdminPortalSession } from "../../../context/TenantSessionContext";
import { apiRequest } from "../../../lib/api";
import type { EstateDashboardData } from "../../../lib/estate-preview";
import type { TableColumn } from "../../../types/app";

type ResidenceRow = EstateDashboardData["residences"][number];
type ResidentRow = EstateDashboardData["residents"][number];

const initialResidentForm = {
  id: "",
  fullName: "",
  email: "",
  phone: "",
  residentType: "TENANT",
  status: "ACTIVE",
  duesStartDate: "",
  lastPaidAt: "",
};

export default function EstateHouseDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast, dataRefreshVersion } = usePrototypeUI();
  const { estateAdminSession } = useEstateAdminPortalSession();
  const token = estateAdminSession?.token;

  const [house, setHouse] = useState<ResidenceRow | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [residentForm, setResidentForm] = useState(initialResidentForm);
  const [savingResident, setSavingResident] = useState(false);

  async function loadData() {
    if (!token || !id) return;
    setLoading(true);
    try {
      const { data } = await apiRequest<EstateDashboardData>("/estate/dashboard", { token });
      const found = (data.residences ?? []).find((r) => r.id === id);
      setHouse(found ?? null);
      // Filter residents by houseNumber match
      const houseResidents = (data.residents ?? []).filter((r) => found && r.houseNumber === found.houseNumber);
      setResidents(houseResidents);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load house.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, id, dataRefreshVersion]);

  function fillResidentForm(r: ResidentRow) {
    setResidentForm({
      id: r.id,
      fullName: r.fullName,
      email: r.email ?? "",
      phone: r.phone ?? "",
      residentType: r.residentType,
      status: r.status,
      duesStartDate: "",
      lastPaidAt: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveResident(event: FormEvent) {
    event.preventDefault();
    if (!token || !house) return;
    setSavingResident(true);
    try {
      const body = {
        residenceId: house.id,
        fullName: residentForm.fullName,
        email: residentForm.email || undefined,
        phone: residentForm.phone || undefined,
        residentType: residentForm.residentType,
        status: residentForm.status,
        duesStartDate: residentForm.duesStartDate || undefined,
        lastPaidAt: residentForm.lastPaidAt || undefined,
      };
      if (residentForm.id) {
        await apiRequest(`/estate/residents/${residentForm.id}`, { method: "PATCH", token, body });
        showToast("Resident updated.", "success");
      } else {
        await apiRequest("/estate/residents", { method: "POST", token, body });
        showToast("Resident added.", "success");
      }
      setResidentForm(initialResidentForm);
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save resident.", "error");
    } finally {
      setSavingResident(false);
    }
  }

  async function handleDeleteResident(residentId: string, name: string) {
    if (!token || !confirm(`Remove "${name}" from this house?`)) return;
    try {
      await apiRequest(`/estate/residents/${residentId}`, { method: "DELETE", token });
      showToast("Resident removed.", "success");
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove resident.", "error");
    }
  }

  const residentColumns = useMemo<TableColumn<ResidentRow>[]>(() => [
    { key: "fullName", label: "Name", render: (r) => <strong>{r.fullName}</strong> },
    { key: "residentType", label: "Type", render: (r) => <StatusBadge tone="blue">{r.residentType}</StatusBadge> },
    { key: "phone", label: "Phone", render: (r) => <span className="td-muted">{r.phone ?? "—"}</span> },
    { key: "email", label: "Email", render: (r) => <span className="td-muted">{r.email ?? "—"}</span> },
    {
      key: "canAccessResidentPortal",
      label: "Portal access",
      render: (r) => <StatusBadge tone={r.canAccessResidentPortal ? "green" : "gray"}>{r.canAccessResidentPortal ? "Yes" : "No"}</StatusBadge>,
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "ACTIVE" ? "green" : "gray"}>{r.status}</StatusBadge> },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => fillResidentForm(r)}>Edit</button>
          <button type="button" className="btn btn-ghost btn-xs estate-danger" onClick={() => void handleDeleteResident(r.id, r.fullName)}>Remove</button>
        </div>
      ),
    },
  ], [token]);

  return (
    <EstatePortalShell topbarTitle="House Detail" breadcrumb="Houses & Residents">
      <PageMeta title={house ? `${house.houseNumber} — Estate` : "House — Estate"} />
      <div style={{ marginBottom: 8 }}>
        <Link href="/estate/houses" className="btn btn-secondary btn-sm">← All Houses</Link>
      </div>
      <PageHeader
        title={house ? `House ${house.houseNumber}` : "House"}
        description={house ? [house.block ? `Block ${house.block}` : null, house.label, house.ownerName].filter(Boolean).join(" · ") : ""}
      />

      {loading && !house ? (
        <div className="empty-state"><p>Loading house details…</p></div>
      ) : house ? (
        <>
          {/* House info cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Owner</div>
              <div className="stat-value" style={{ fontSize: 16 }}>{house.ownerName ?? "—"}</div>
              {house.ownerPhone ? <div className="stat-sub">{house.ownerPhone}</div> : null}
            </div>
            <div className="stat-card">
              <div className="stat-label">Occupants</div>
              <div className="stat-value">{house.occupantsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Billing</div>
              <div className="stat-value" style={{ fontSize: 14 }}>{house.billingBasis === "UNIT_BASED" ? "Per house" : "Per resident"}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Status</div>
              <div className="stat-value" style={{ fontSize: 14 }}>{house.status}</div>
            </div>
          </div>

          {/* Access codes */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)", marginBottom: 6 }}>ENTRY CODE</div>
                <code style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, background: "var(--bg)", padding: "8px 16px", borderRadius: 8, display: "inline-block" }}>{house.accessCode}</code>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)", marginBottom: 6 }}>EXIT CODE</div>
                <code style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, background: "var(--bg)", padding: "8px 16px", borderRadius: 8, display: "inline-block" }}>{house.exitCode}</code>
              </div>
            </div>
          </div>

          {/* Add/edit resident form */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{residentForm.id ? "Edit Resident" : "Add Resident"}</h3>
              <form onSubmit={handleSaveResident} className="estate-form-grid">
                <label>Full name <input className="form-input" value={residentForm.fullName} onChange={(e) => setResidentForm((f) => ({ ...f, fullName: e.target.value }))} required /></label>
                <label>Phone <input className="form-input" type="tel" value={residentForm.phone} onChange={(e) => setResidentForm((f) => ({ ...f, phone: e.target.value }))} /></label>
                <label>
                  Email
                  <input
                    className="form-input"
                    type="email"
                    value={residentForm.email}
                    onChange={(e) => setResidentForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="resident@example.com"
                    required
                  />
                  <div className="td-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Residents sign in with a 6-digit email code or magic link, not a password.
                  </div>
                </label>
                <label>Resident type
                  <select className="form-input" value={residentForm.residentType} onChange={(e) => setResidentForm((f) => ({ ...f, residentType: e.target.value }))}>
                    <option value="TENANT">Tenant</option>
                    <option value="OWNER">Owner</option>
                    <option value="OCCUPANT">Occupant</option>
                  </select>
                </label>
                <label>Status
                  <select className="form-input" value={residentForm.status} onChange={(e) => setResidentForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <label>Dues start date
                  <input className="form-input" type="date" value={residentForm.duesStartDate} onChange={(e) => setResidentForm((f) => ({ ...f, duesStartDate: e.target.value }))} />
                </label>
                <label>Last paid date
                  <input className="form-input" type="date" value={residentForm.lastPaidAt} onChange={(e) => setResidentForm((f) => ({ ...f, lastPaidAt: e.target.value }))} />
                </label>
                <div className="estate-form-actions estate-form-wide">
                  <button type="submit" className="btn btn-primary" disabled={savingResident}>{savingResident ? "Saving…" : residentForm.id ? "Update Resident" : "Add Resident"}</button>
                  {residentForm.id ? <button type="button" className="btn btn-secondary" onClick={() => setResidentForm(initialResidentForm)}>Cancel</button> : null}
                </div>
              </form>
            </div>
          </div>

          {/* Residents table */}
          <div className="card">
            <div className="card-header"><strong>Residents in this house</strong></div>
            <DataTable columns={residentColumns} rows={residents} loading={loading} emptyMessage="No residents recorded for this house." />
          </div>

          {house.notes ? (
            <div className="card" style={{ marginTop: 24 }}>
              <div className="card-body">
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)", marginBottom: 6 }}>NOTES</div>
                <p style={{ fontSize: 14, color: "var(--ink2)", margin: 0 }}>{house.notes}</p>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card">
          <div className="card-body" style={{ color: "var(--red)" }}>House not found. <Link href="/estate/houses">Back to houses</Link></div>
        </div>
      )}
    </EstatePortalShell>
  );
}
