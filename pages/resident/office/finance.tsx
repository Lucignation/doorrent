import { type FormEvent, useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../../components/auth/ResidentPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../../context/TenantSessionContext";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { apiRequest } from "../../../lib/api";
import { formatEstateCurrency } from "../../../lib/estate-preview";

interface FinanceLedgerRow {
  residentId: string;
  fullName: string;
  houseNumber: string | null;
  residentType: string;
  phone: string | null;
  email: string | null;
  duesStartDate: string | null;
  lastPaidAt: string | null;
  nextDueDate: string | null;
  outstandingBalance: number;
  totalPaid: number;
  status: string;
}

interface FinanceOverviewResponse {
  officeAccess: {
    offices: Array<{ id: string; position: string }>;
    permissions: string[];
  };
  charges: Array<{
    id: string;
    title: string;
    amount: number;
    frequency: string;
    billingBasis: string;
    status: string;
    notes?: string | null;
  }>;
  ledger: FinanceLedgerRow[];
}

const initialChargeForm = {
  id: "",
  title: "",
  amount: "",
  frequency: "YEARLY",
  billingBasis: "UNIT_BASED",
  status: "ACTIVE",
  notes: "",
};

const initialLedgerForm = {
  residentId: "",
  duesStartDate: "",
  lastPaidAt: "",
  note: "",
};

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-NG");
}

export default function ResidentOfficeFinancePage() {
  const { residentSession } = useResidentPortalSession();
  const { showToast } = usePrototypeUI();
  const token = residentSession?.token;
  const [data, setData] = useState<FinanceOverviewResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCharge, setSavingCharge] = useState(false);
  const [savingLedger, setSavingLedger] = useState(false);
  const [chargeForm, setChargeForm] = useState(initialChargeForm);
  const [ledgerForm, setLedgerForm] = useState(initialLedgerForm);

  function loadFinanceOverview(currentToken: string) {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<FinanceOverviewResponse>("/resident/office/finance", { token: currentToken })
      .then(({ data: response }) => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load the finance overview.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    return loadFinanceOverview(token);
  }, [token]);

  const totals = useMemo(() => {
    const rows = data?.ledger ?? [];
    return rows.reduce(
      (summary, row) => {
        summary.outstanding += row.outstandingBalance;
        summary.paid += row.totalPaid;

        if (row.outstandingBalance > 0) {
          summary.defaulters += 1;
        }

        return summary;
      },
      {
        outstanding: 0,
        paid: 0,
        defaulters: 0,
      },
    );
  }, [data]);

  function fillLedgerForm(row: FinanceLedgerRow) {
    setLedgerForm({
      residentId: row.residentId,
      duesStartDate: row.duesStartDate ? row.duesStartDate.slice(0, 10) : "",
      lastPaidAt: row.lastPaidAt ? row.lastPaidAt.slice(0, 10) : "",
      note: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillChargeForm(charge: NonNullable<FinanceOverviewResponse["charges"]>[number]) {
    setChargeForm({
      id: charge.id,
      title: charge.title,
      amount: String(charge.amount),
      frequency: charge.frequency,
      billingBasis: charge.billingBasis,
      status: charge.status,
      notes: charge.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveLedger(event: FormEvent) {
    event.preventDefault();

    if (!token || !ledgerForm.residentId) {
      return;
    }

    setSavingLedger(true);

    try {
      await apiRequest(`/resident/office/finance/ledger/${ledgerForm.residentId}`, {
        method: "PATCH",
        token,
        body: {
          duesStartDate: ledgerForm.duesStartDate || undefined,
          lastPaidAt: ledgerForm.lastPaidAt || undefined,
          note: ledgerForm.note || undefined,
        },
      });
      showToast("Resident dues ledger updated.", "success");
      setLedgerForm(initialLedgerForm);
      void loadFinanceOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the dues ledger.",
        "error",
      );
    } finally {
      setSavingLedger(false);
    }
  }

  async function handleSaveCharge(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSavingCharge(true);

    try {
      const body = {
        title: chargeForm.title,
        amount: Number(chargeForm.amount),
        frequency: chargeForm.frequency,
        billingBasis: chargeForm.billingBasis,
        status: chargeForm.status,
        notes: chargeForm.notes || undefined,
      };

      if (chargeForm.id) {
        await apiRequest(`/resident/office/charges/${chargeForm.id}`, {
          method: "PATCH",
          token,
          body,
        });
        showToast("Estate charge updated.", "success");
      } else {
        await apiRequest("/resident/office/charges", {
          method: "POST",
          token,
          body,
        });
        showToast("Estate charge created.", "success");
      }

      setChargeForm(initialChargeForm);
      void loadFinanceOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the estate charge.",
        "error",
      );
    } finally {
      setSavingCharge(false);
    }
  }

  async function handleDeleteCharge(chargeId: string, title: string) {
    if (!token || !window.confirm(`Delete estate charge "${title}"?`)) {
      return;
    }

    try {
      await apiRequest(`/resident/office/charges/${chargeId}`, {
        method: "DELETE",
        token,
      });
      showToast("Estate charge deleted.", "success");
      void loadFinanceOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the estate charge.",
        "error",
      );
    }
  }

  return (
    <ResidentPortalShell topbarTitle="Finance Overview" breadcrumb="Office Finance">
      <PageMeta title="Resident Office Finance Overview" />
      <PageHeader
        title="Estate Finance Overview"
        description="Active finance office holders can monitor resident dues coverage and outstanding balances."
      />

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <div
            className="stats-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginBottom: 24,
            }}
          >
            <div className="stat-card">
              <div className="stat-label">Residents Tracked</div>
              <div className="stat-value">{data.ledger.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Defaulters</div>
              <div className="stat-value">{totals.defaulters}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Outstanding</div>
              <div className="stat-value">
                {formatEstateCurrency(totals.outstanding)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recorded Paid</div>
              <div className="stat-value">{formatEstateCurrency(totals.paid)}</div>
            </div>
          </div>

          {data.officeAccess.permissions.includes("finance_management") ? (
            <div
              style={{
                display: "grid",
                gap: 24,
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                marginBottom: 24,
              }}
            >
              <div className="card">
                <div className="card-header">
                  <strong>{chargeForm.id ? "Edit Estate Charge" : "Create Estate Charge"}</strong>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSaveCharge} className="estate-form-grid">
                    <label>
                      Title
                      <input
                        className="form-input"
                        value={chargeForm.title}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      Amount
                      <input
                        className="form-input"
                        inputMode="numeric"
                        value={chargeForm.amount}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      Frequency
                      <select
                        className="form-input"
                        value={chargeForm.frequency}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            frequency: event.target.value,
                          }))
                        }
                      >
                        <option value="YEARLY">Yearly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="ONE_OFF">One-off</option>
                      </select>
                    </label>
                    <label>
                      Billing basis
                      <select
                        className="form-input"
                        value={chargeForm.billingBasis}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            billingBasis: event.target.value,
                          }))
                        }
                      >
                        <option value="UNIT_BASED">Unit based</option>
                        <option value="RESIDENT_BASED">Resident based</option>
                      </select>
                    </label>
                    <label>
                      Status
                      <select
                        className="form-input"
                        value={chargeForm.status}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </label>
                    <label className="estate-form-wide">
                      Notes
                      <textarea
                        className="form-input"
                        rows={2}
                        value={chargeForm.notes}
                        onChange={(event) =>
                          setChargeForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="estate-form-actions estate-form-wide">
                      <button type="submit" className="btn btn-primary" disabled={savingCharge}>
                        {savingCharge
                          ? "Saving…"
                          : chargeForm.id
                            ? "Update Charge"
                            : "Create Charge"}
                      </button>
                      {chargeForm.id ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setChargeForm(initialChargeForm)}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <strong>
                    {ledgerForm.residentId ? "Update Dues Ledger" : "Select Resident to Update Ledger"}
                  </strong>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSaveLedger} className="estate-form-grid">
                    <label className="estate-form-wide">
                      Resident
                      <select
                        className="form-input"
                        value={ledgerForm.residentId}
                        onChange={(event) =>
                          setLedgerForm((current) => ({
                            ...current,
                            residentId: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Select resident</option>
                        {data.ledger.map((row) => (
                          <option key={row.residentId} value={row.residentId}>
                            {row.fullName}
                            {row.houseNumber ? ` · House ${row.houseNumber}` : ""}
                            {row.residentType ? ` · ${row.residentType}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Dues start date
                      <input
                        className="form-input"
                        type="date"
                        value={ledgerForm.duesStartDate}
                        onChange={(event) =>
                          setLedgerForm((current) => ({
                            ...current,
                            duesStartDate: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Last paid date
                      <input
                        className="form-input"
                        type="date"
                        value={ledgerForm.lastPaidAt}
                        onChange={(event) =>
                          setLedgerForm((current) => ({
                            ...current,
                            lastPaidAt: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="estate-form-wide">
                      Note
                      <textarea
                        className="form-input"
                        rows={2}
                        value={ledgerForm.note}
                        onChange={(event) =>
                          setLedgerForm((current) => ({
                            ...current,
                            note: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="estate-form-actions estate-form-wide">
                      <button type="submit" className="btn btn-primary" disabled={savingLedger}>
                        {savingLedger ? "Saving…" : "Update Ledger"}
                      </button>
                      {ledgerForm.residentId ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setLedgerForm(initialLedgerForm)}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : null}

          {data.charges.length ? (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <strong>Estate Charges</strong>
              </div>
              <div className="card-body" style={{ display: "grid", gap: 14 }}>
                {data.charges.map((charge) => (
                  <div
                    key={charge.id}
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>{charge.title}</div>
                        <div className="td-muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {charge.frequency} · {charge.billingBasis}
                        </div>
                      </div>
                      <StatusBadge tone={charge.status === "ACTIVE" ? "green" : "gray"}>
                        {charge.status}
                      </StatusBadge>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <strong>{formatEstateCurrency(charge.amount)}</strong>
                      {data.officeAccess.permissions.includes("finance_management") ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => fillChargeForm(charge)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs estate-danger"
                            onClick={() => void handleDeleteCharge(charge.id, charge.title)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-header">
              <strong>Resident Dues Ledger</strong>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 14 }}>
              {data.ledger.map((row) => (
                <div
                  key={row.residentId}
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{row.fullName}</div>
                      <div className="td-muted" style={{ fontSize: 13, marginTop: 4 }}>
                        House {row.houseNumber ?? "—"} · {row.residentType}
                        {row.phone ? ` · ${row.phone}` : ""}
                      </div>
                    </div>
                    <StatusBadge
                      tone={row.outstandingBalance > 0 ? "amber" : "green"}
                    >
                      {row.outstandingBalance > 0 ? "OWING" : "CLEAR"}
                    </StatusBadge>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div className="td-muted" style={{ fontSize: 11 }}>DUES START</div>
                      <strong>{formatDate(row.duesStartDate)}</strong>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 11 }}>LAST PAID</div>
                      <strong>{formatDate(row.lastPaidAt)}</strong>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 11 }}>NEXT DUE</div>
                      <strong>{formatDate(row.nextDueDate)}</strong>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 11 }}>OUTSTANDING</div>
                      <strong>{formatEstateCurrency(row.outstandingBalance)}</strong>
                    </div>
                    <div>
                      <div className="td-muted" style={{ fontSize: 11 }}>TOTAL PAID</div>
                      <strong>{formatEstateCurrency(row.totalPaid)}</strong>
                    </div>
                  </div>
                  {data.officeAccess.permissions.includes("finance_management") ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => fillLedgerForm(row)}
                      >
                        Edit Ledger
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {loading ? (
        <div className="empty-state">
          <p>Loading estate finance overview…</p>
        </div>
      ) : null}
    </ResidentPortalShell>
  );
}
