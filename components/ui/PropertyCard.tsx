import type { PropertyPortfolioItem } from "../../types/app";

interface PropertyCardProps {
  property?: PropertyPortfolioItem;
  addNew?: boolean;
  onClick?: () => void;
}

export default function PropertyCard({
  property,
  addNew = false,
  onClick,
}: PropertyCardProps) {
  if (addNew) {
    return (
      <div
        className="property-card"
        onClick={onClick}
        style={{
          borderStyle: "dashed",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 240,
          gap: 10,
          background: "var(--surface2)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            color: "var(--ink3)",
          }}
        >
          +
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink2)" }}>
          Add New Property
        </div>
        <div style={{ fontSize: 12, color: "var(--ink3)" }}>
          Expand your portfolio
        </div>
      </div>
    );
  }

  if (!property) {
    return null;
  }

  return (
    <div className="property-card" onClick={onClick}>
      <div className="property-img">
        <div className="property-img-num">
          {String(property.index).padStart(2, "0")}
        </div>
        <div className="property-img-badge">{property.category}</div>
        <div>
          <div className="property-name">{property.name}</div>
          <div className="property-addr">{property.location}</div>
        </div>
      </div>
      <div className="property-occ-bar">
        <div className="property-occ-fill" style={{ width: `${property.occupancy}%` }} />
      </div>
      <div className="property-meta">
        <div className="property-stats">
          <div className="prop-stat">
            <strong>{property.units}</strong>
            <span>Units</span>
          </div>
          <div className="prop-stat">
            <strong>{property.occupied}</strong>
            <span>Occupied</span>
          </div>
          <div className="prop-stat">
            <strong>{property.monthly}</strong>
            <span>Yearly</span>
          </div>
        </div>
        <span
          className={`badge ${
            property.occupancy === 100
              ? "badge-green"
              : property.occupancy >= 80
                ? "badge-amber"
                : "badge-red"
          }`}
        >
          {property.occupancy}% full
        </span>
      </div>
    </div>
  );
}
