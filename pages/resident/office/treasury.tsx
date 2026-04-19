import { type FormEvent, useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../../components/auth/ResidentPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../../context/TenantSessionContext";
import { usePrototypeUI } from "../../../context/PrototypeUIContext";
import { apiRequest } from "../../../lib/api";
import { formatEstateCurrency } from "../../../lib/estate-preview";

interface TreasuryExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  status: string;
  requestedByName?: string | null;
  incurredOn?: string | null;
  notes?: string | null;
}

interface TreasuryContribution {
  id: string;
  contributorName: string;
  amount: number;
  paidAt?: string | null;
  causeId: string;
}

interface TreasuryOverviewResponse {
  officeAccess: {
    offices: Array<{ id: string; position: string }>;
    permissions: string[];
  };
  summary: {
    billedThisCycle: number;
    duesCollected: number;
    contributionReserve: number;
    approvedExpenses: number;
    pendingExpenses: number;
    totalExpenses: number;
    outstandingDues: number;
    defaulters: number;
    reserveBalance: number;
  };
  expenses: TreasuryExpense[];
  contributions: TreasuryContribution[];
}

const initialExpenseForm = {
  id: "",
  title: "",
  category: "",
  amount: "",
  requestedByName: "",
  status: "PENDING",
  incurredOn: "",
  notes: "",
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

export default function ResidentOfficeTreasuryPage() {
  const { residentSession } = useResidentPortalSession();
  const { showToast } = usePrototypeUI();
  const token = residentSession?.token;
  const [data, setData] = useState<TreasuryOverviewResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);

  function loadTreasuryOverview(currentToken: string) {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<TreasuryOverviewResponse>("/resident/office/treasury", {
      token: currentToken,
    })
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
              : "Could not load the treasury overview.",
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

    return loadTreasuryOverview(token);
  }, [token]);

  const paidExpenses = useMemo(
    () =>
      (data?.expenses ?? []).filter(
        (expense) => expense.status === "APPROVED" || expense.status === "PAID",
      ),
    [data],
  );
  const displayedExpenses = useMemo(
    () =>
      data?.officeAccess.permissions.includes("finance_management")
        ? data.expenses
        : paidExpenses,
    [data, paidExpenses],
  );

  async function handleSaveExpense(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSaving(true);

    try {
      const body = {
        title: expenseForm.title,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        requestedByName: expenseForm.requestedByName || undefined,
        status: expenseForm.status,
        incurredOn: expenseForm.incurredOn || undefined,
        notes: expenseForm.notes || undefined,
      };

      if (expenseForm.id) {
        await apiRequest(`/resident/office/expenses/${expenseForm.id}`, {
          method: "PATCH",
          token,
          body,
        });
        showToast("Treasury expense updated.", "success");
      } else {
        await apiRequest("/resident/office/expenses", {
          method: "POST",
          token,
          body,
        });
        showToast("Treasury expense recorded.", "success");
      }

      setExpenseForm(initialExpenseForm);
      void loadTreasuryOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the treasury expense.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(expenseId: string, title: string) {
    if (!token || !window.confirm(`Delete treasury expense "${title}"?`)) {
      return;
    }

    try {
      await apiRequest(`/resident/office/expenses/${expenseId}`, {
        method: "DELETE",
        token,
      });
      showToast("Treasury expense deleted.", "success");
      void loadTreasuryOverview(token);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the treasury expense.",
        "error",
      );
    }
  }

  function fillExpenseForm(expense: TreasuryExpense) {
      setExpenseForm({
        id: expense.id,
        title: expense.title,
        category: expense.category,
        amount: String(expense.amount),
        requestedByName: expense.requestedByName ?? "",
        status: expense.status,
        incurredOn: expense.incurredOn ? expense.incurredOn.slice(0, 10) : "",
        notes: expense.notes ?? "",
      });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <ResidentPortalShell topbarTitle="Treasury Overview" breadcrumb="Office Treasury">
      <PageMeta title="Resident Office Treasury Overview" />
      <PageHeader
        title="Estate Treasury Overview"
        description="Finance office holders can monitor reserve position, paid contributions, and expense pressure without opening the full estate admin workspace."
      />

      {error ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
          </div>
        </div>
      ) : null}

      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}
      >
        <div className="stat-card">
          <div className="stat-label">Estimated Reserve</div>
          <div className="stat-value">
            {formatEstateCurrency(data?.summary.reserveBalance ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Dues Collected</div>
          <div className="stat-value">
            {formatEstateCurrency(data?.summary.duesCollected ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Contributions Received</div>
          <div className="stat-value">
            {formatEstateCurrency(data?.summary.contributionReserve ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding Dues</div>
          <div className="stat-value">
            {formatEstateCurrency(data?.summary.outstandingDues ?? 0)}
          </div>
          <div className="stat-sub">{data?.summary.defaulters ?? 0} resident(s) owing</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <strong>Finance Snapshot</strong>
        </div>
        <div className="card-body" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="td-muted" style={{ fontSize: 13 }}>
              This view is read-only. Reserve is estimated from paid resident dues plus paid contributions, minus approved or paid expenses already recorded in the estate workspace.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <StatusBadge tone="green">
                Billed this cycle: {formatEstateCurrency(data?.summary.billedThisCycle ?? 0)}
              </StatusBadge>
              <StatusBadge tone="amber">
                Pending expenses: {formatEstateCurrency(data?.summary.pendingExpenses ?? 0)}
              </StatusBadge>
              <StatusBadge tone="gray">
                Approved/Paid expenses: {formatEstateCurrency(data?.summary.approvedExpenses ?? 0)}
              </StatusBadge>
            </div>
          </div>
        </div>
      </div>

      {data?.officeAccess.permissions.includes("finance_management") ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <strong>{expenseForm.id ? "Edit Treasury Expense" : "Record Treasury Expense"}</strong>
          </div>
          <div className="card-body">
            <form
              onSubmit={handleSaveExpense}
              className="estate-form-grid"
            >
              <label>
                Title
                <input
                  className="form-input"
                  value={expenseForm.title}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Category
                <input
                  className="form-input"
                  value={expenseForm.category}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      category: event.target.value,
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
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Requested by
                <input
                  className="form-input"
                  value={expenseForm.requestedByName}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      requestedByName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Status
                <select
                  className="form-input"
                  value={expenseForm.status}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="PAID">Paid</option>
                </select>
              </label>
              <label>
                Incurred on
                <input
                  className="form-input"
                  type="date"
                  value={expenseForm.incurredOn}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      incurredOn: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="estate-form-wide">
                Notes
                <textarea
                  className="form-input"
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="estate-form-actions estate-form-wide">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? "Saving…"
                    : expenseForm.id
                      ? "Update Expense"
                      : "Record Expense"}
                </button>
                {expenseForm.id ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setExpenseForm(initialExpenseForm)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <div className="card">
          <div className="card-header">
            <strong>Recent Paid Contributions</strong>
          </div>
          {loading ? (
            <div className="card-body">
              <p style={{ margin: 0 }}>Loading treasury activity…</p>
            </div>
          ) : data?.contributions.length ? (
            <div>
              {data.contributions.slice(0, 8).map((contribution) => (
                <div
                  key={contribution.id}
                  style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong style={{ fontSize: 14 }}>{contribution.contributorName}</strong>
                    <span>{formatEstateCurrency(contribution.amount)}</span>
                  </div>
                  <div className="td-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Paid on {formatDate(contribution.paidAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-body">
              <p style={{ margin: 0 }}>No paid contribution records yet.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <strong>Recorded Expenses</strong>
          </div>
          {loading ? (
            <div className="card-body">
              <p style={{ margin: 0 }}>Loading expenses…</p>
            </div>
          ) : displayedExpenses.length ? (
            <div>
              {displayedExpenses.slice(0, 8).map((expense) => (
                <div
                  key={expense.id}
                  style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{expense.title}</strong>
                      <div className="td-muted" style={{ fontSize: 12 }}>
                        {expense.category} · {expense.requestedByName ?? "Requested internally"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div>{formatEstateCurrency(expense.amount)}</div>
                      <StatusBadge
                        tone={expense.status === "PAID" ? "green" : "amber"}
                      >
                        {expense.status}
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="td-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {formatDate(expense.incurredOn)}
                  </div>
                  {expense.notes ? (
                    <div className="td-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {expense.notes}
                    </div>
                  ) : null}
                  {data?.officeAccess.permissions.includes("finance_management") ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => fillExpenseForm(expense)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs estate-danger"
                        onClick={() => void handleDeleteExpense(expense.id, expense.title)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="card-body">
              <p style={{ margin: 0 }}>No approved or paid expenses recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </ResidentPortalShell>
  );
}
