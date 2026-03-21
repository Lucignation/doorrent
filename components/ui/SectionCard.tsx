import Link from "next/link";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  children: ReactNode;
}

export default function SectionCard({
  title,
  subtitle,
  actionLabel,
  actionHref,
  children,
}: SectionCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
        </div>
        {actionLabel && actionHref ? (
          <Link href={actionHref} className="btn btn-ghost btn-xs">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}
