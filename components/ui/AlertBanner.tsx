import Link from "next/link";
import type { HighlightBanner } from "../../types/app";
import { InfoIcon } from "./Icons";

interface AlertBannerProps {
  tone?: HighlightBanner["tone"];
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function AlertBanner({
  tone = "red",
  title,
  description,
  actionLabel,
  actionHref,
}: AlertBannerProps) {
  return (
    <div className={`alert alert-${tone}`}>
      <InfoIcon />
      <div className="alert-content">
        <div className="alert-title">{title}</div>
        <div className="alert-desc">{description}</div>
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="alert-action">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
