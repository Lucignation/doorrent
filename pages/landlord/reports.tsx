import { useEffect, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import BarChart from "../../components/ui/BarChart";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

interface ChartPoint {
  label: string;
  value: number;
  display: string;
}

interface RevenueBreakdownRow {
  name: string;
  revenue: string;
  percent: number;
  color: string;
}

interface LandlordReportsResponse {
  summary: {
    ytdRevenue: string;
    averageOccupancy: string;
    renewalRate: string;
    averageCollectionTime: string;
  };
  collectionSeries: ChartPoint[];
  occupancySeries: ChartPoint[];
  revenueByProperty: RevenueBreakdownRow[];
}

export default function LandlordReportsPage() {
  const { landlordSession } = useLandlordPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [reportData, setReportData] = useState<LandlordReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const landlordToken = landlordSession?.token;

    if (!landlordToken) {
      return;
    }

    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordReportsResponse>("/landlord/reports", {
          token: landlordToken,
        });

        if (!cancelled) {
          setReportData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your reports.",
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
  }, [dataRefreshVersion, landlordSession?.token]);

  return (
    <>
      <PageMeta title="DoorRent — Reports" urlPath="/landlord/reports" />
      <LandlordPortalShell topbarTitle="Reports" breadcrumb="Dashboard → Reports">
        <PageHeader
          title="Reports & Analytics"
          description={
            reportData
              ? "Portfolio performance insights across rent collection, occupancy, and property revenue."
              : loading
                ? "Loading portfolio reports..."
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
            <div className="stat-sub">Confirmed this year</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Avg Occupancy</div>
            <div className="stat-value">{reportData?.summary.averageOccupancy ?? "—"}</div>
            <div className="stat-sub">Across your active portfolio</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Renewal Rate</div>
            <div className="stat-value">{reportData?.summary.renewalRate ?? "—"}</div>
            <div className="stat-sub">Based on upcoming renewals</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Collection Time</div>
            <div className="stat-value">{reportData?.summary.averageCollectionTime ?? "—"}</div>
            <div className="stat-sub">Average rent collection speed</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Monthly Rent Collection</div>
                <div className="card-subtitle">Live monthly payment totals</div>
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
                <div className="card-subtitle">Recent occupancy performance</div>
              </div>
            </div>
            <div className="card-body">
              <BarChart data={reportData?.occupancySeries ?? []} accent="blue" />
            </div>
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
            {!reportData?.revenueByProperty.length ? (
              <div style={{ color: "var(--ink2)" }}>
                {loading ? "Loading revenue breakdown..." : "No report data yet."}
              </div>
            ) : null}
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
