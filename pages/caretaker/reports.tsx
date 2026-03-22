import { useEffect, useState } from "react";
import CaretakerPortalShell from "../../components/auth/CaretakerPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import BarChart from "../../components/ui/BarChart";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useCaretakerPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface ChartPoint {
  label: string;
  value: number;
  display: string;
}

interface BreakdownRow {
  name: string;
  revenue: string;
  percent: number;
  color: string;
}

interface CaretakerReportsResponse {
  summary: {
    ytdRevenue: string;
    averageOccupancy: string;
    activeLandlords: string;
    overdueTenants: string;
  };
  collectionSeries: ChartPoint[];
  occupancySeries: ChartPoint[];
  revenueByLandlord: BreakdownRow[];
  revenueByProperty: BreakdownRow[];
}

export default function CaretakerReportsPage() {
  const { caretakerSession } = useCaretakerPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [reportData, setReportData] = useState<CaretakerReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const caretakerToken = caretakerSession?.token;

    if (!caretakerToken) {
      return;
    }

    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<CaretakerReportsResponse>(
          "/caretaker/reports",
          {
            token: caretakerToken,
          },
        );

        if (!cancelled) {
          setReportData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load caretaker reports.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [caretakerSession?.token, dataRefreshVersion]);

  return (
    <>
      <PageMeta title="DoorRent — Caretaker Reports" urlPath="/caretaker/reports" />
      <CaretakerPortalShell topbarTitle="Reports" breadcrumb="Workspace → Reports">
        <PageHeader
          title="Caretaker Reports"
          description={
            reportData
              ? "Cross-landlord reporting for the properties and notices under your care."
              : loading
                ? "Loading caretaker reports..."
                : error || "Reports are unavailable."
          }
        />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div
          className="stats-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}
        >
          <div className="stat-card accent-gold">
            <div className="stat-label">YTD Revenue</div>
            <div className="stat-value">{reportData?.summary.ytdRevenue ?? "—"}</div>
            <div className="stat-sub">Across assigned properties</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Occupancy</div>
            <div className="stat-value">{reportData?.summary.averageOccupancy ?? "—"}</div>
            <div className="stat-sub">Average occupancy rate</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Landlords</div>
            <div className="stat-value">{reportData?.summary.activeLandlords ?? "0"}</div>
            <div className="stat-sub">Active assignments</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Overdue Tenants</div>
            <div className="stat-value">{reportData?.summary.overdueTenants ?? "0"}</div>
            <div className="stat-sub">Needs action</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Collection Trend</div>
                <div className="card-subtitle">Monthly receipts across your scope</div>
              </div>
            </div>
            <div className="card-body">
              <BarChart data={reportData?.collectionSeries ?? []} accent="gold" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Occupancy Trend</div>
                <div className="card-subtitle">Recent occupancy movement</div>
              </div>
            </div>
            <div className="card-body">
              <BarChart data={reportData?.occupancySeries ?? []} accent="blue" />
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Revenue by Landlord</div>
            </div>
            <div className="card-body">
              {(reportData?.revenueByLandlord ?? []).map((item) => (
                <div key={item.name} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <span style={{ color: "var(--ink2)" }}>{item.revenue}</span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(item.percent, 100)}%`, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Revenue by Property</div>
            </div>
            <div className="card-body">
              {(reportData?.revenueByProperty ?? []).map((item) => (
                <div key={item.name} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <span style={{ color: "var(--ink2)" }}>{item.revenue}</span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(item.percent, 100)}%`, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CaretakerPortalShell>
    </>
  );
}
