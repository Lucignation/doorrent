import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import BarChart from "../../components/ui/BarChart";
import PageHeader from "../../components/ui/PageHeader";
import {
  landlordCollection,
  landlordNav,
  landlordOccupancyTrend,
  landlordRevenueByProperty,
  landlordUser,
} from "../../data/landlord";

export default function LandlordReportsPage() {
  return (
    <>
      <PageMeta title="DoorRent — Reports" />
      <AppShell
        user={landlordUser}
        topbarTitle="Reports"
        breadcrumb="Dashboard → Reports"
        navSections={landlordNav}
      >
        <PageHeader
          title="Reports & Analytics"
          description="Portfolio performance insights"
          actions={[
            { label: "Export PDF", variant: "secondary" },
            { label: "Export CSV", variant: "secondary" },
          ]}
        />

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
          <div className="stat-card accent-gold">
            <div className="stat-label">YTD Revenue</div>
            <div className="stat-value">₦8.4M</div>
            <div className="stat-sub stat-up">↑ 18% vs 2025</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Avg Occupancy</div>
            <div className="stat-value">91%</div>
            <div className="stat-sub">Q1 2026</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Renewal Rate</div>
            <div className="stat-value">82%</div>
            <div className="stat-sub">Last 12 months</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Avg Collection Time</div>
            <div className="stat-value">3.2 days</div>
            <div className="stat-sub">From due date</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Monthly Rent Collection</div>
                <div className="card-subtitle">₦M collected per month</div>
              </div>
            </div>
            <div className="card-body">
              <BarChart data={landlordCollection} accent="gold" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Occupancy Rate Trend</div>
                <div className="card-subtitle">% occupied per month</div>
              </div>
            </div>
            <div className="card-body">
              <BarChart data={landlordOccupancyTrend} accent="blue" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Revenue by Property</div>
          </div>
          <div className="card-body">
            {landlordRevenueByProperty.map((item) => (
              <div key={item.name} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: "var(--ink2)" }}>{item.revenue}</span>
                </div>
                <div className="progress">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(item.percent * 3, 100)}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    </>
  );
}
