import React from "react";
import clsx from "clsx";

const TIER_STYLES = {
  hot: "bg-rose-500/12 text-rose-800 ring-1 ring-rose-200/90",
  warm: "bg-amber-500/12 text-amber-900 ring-1 ring-amber-200/90",
  cold: "bg-slate-500/10 text-slate-700 ring-1 ring-slate-200/90",
};

export default function TierBadge({ tier, className }) {
  const t = String(tier || "").toLowerCase();
  const label = t === "hot" ? "Hot" : t === "warm" ? "Warm" : t === "cold" ? "Cold" : tier;
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
        TIER_STYLES[t] || "bg-fateh-gold-pale text-fateh-ink ring-1 ring-fateh-border",
        className,
      )}
    >
      {label}
    </span>
  );
}
