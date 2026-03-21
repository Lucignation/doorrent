function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface IdentityCellProps {
  primary: string;
  secondary?: string;
}

export default function IdentityCell({ primary, secondary }: IdentityCellProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="tenant-avatar">{getInitials(primary)}</div>
      <div className="tenant-info">
        <div className="tenant-name">{primary}</div>
        {secondary ? <div className="tenant-email">{secondary}</div> : null}
      </div>
    </div>
  );
}
