import { useEffect, useMemo, useState } from "react";
import ResidentPortalShell from "../../../components/auth/ResidentPortalShell";
import PageMeta from "../../../components/layout/PageMeta";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useResidentPortalSession } from "../../../context/TenantSessionContext";
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
  ledger: FinanceLedgerRow[];
}

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
  const token = residentSession?.token;
  const [data, setData] = useState<FinanceOverviewResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<FinanceOverviewResponse>("/resident/office/finance", { token })
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
