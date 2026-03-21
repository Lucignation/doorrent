import type { ReactNode } from "react";
import type { BadgeTone } from "../../types/app";

interface StatusBadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export default function StatusBadge({
  tone = "gray",
  children,
}: StatusBadgeProps) {
  const map = {
    green: "green",
    red: "red",
    amber: "amber",
    blue: "blue",
    gray: "gray",
    gold: "gold",
  };

  return <span className={`badge badge-${map[tone] || "gray"}`}>{children}</span>;
}
