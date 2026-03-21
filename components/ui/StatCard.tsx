import Link from "next/link";
import type { AccentTone, StatItem } from "../../types/app";

function mapAccent(accent: AccentTone): AccentTone {
  if (accent === "red") {
    return "red";
  }

  if (accent === "blue") {
    return "blue";
  }

  if (accent === "amber") {
    return "amber";
  }

  if (accent === "gold") {
    return "gold";
  }

  return "green";
}

interface CardContentProps {
  label: string;
  value: string;
  subtext: string;
  icon?: string;
  accent: StatItem["accent"];
}

function CardContent({ label, value, subtext, icon, accent }: CardContentProps) {
  const tone = mapAccent(accent);

  return (
    <>
      {icon ? <div className={`stat-icon ${tone}`}>{icon}</div> : null}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{subtext}</div>
    </>
  );
}

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  accent = "green",
  href,
}: StatItem) {
  const accentClass = `accent-${mapAccent(accent)}`;

  if (href) {
    return (
      <Link href={href} className={`stat-card ${accentClass}`}>
        <CardContent
          label={label}
          value={value}
          subtext={subtext}
          icon={icon}
          accent={accent}
        />
      </Link>
    );
  }

  return (
    <div className={`stat-card ${accentClass}`}>
      <CardContent
        label={label}
        value={value}
        subtext={subtext}
        icon={icon}
        accent={accent}
      />
    </div>
  );
}
