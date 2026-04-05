import React from "react";
import { NURTURE_TRACKS } from "../data/mockData.js";
import TierBadge from "../components/TierBadge.jsx";

function formatWhen(iso) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function NurturePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Nurture tracking</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Students who need a light touch between calls: what stage they&apos;re in, when you last reached out, and a concrete
          suggestion for the next move. Hook this list to WhatsApp or email when your messaging tools are ready.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-fateh-border/90 bg-white/95 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border-collapse text-left text-[0.88rem]">
            <thead>
              <tr className="border-b border-fateh-border bg-fateh-paper/80 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Tier</th>
                <th className="px-5 py-4">Stage</th>
                <th className="px-5 py-4">Last sent</th>
                <th className="px-5 py-4">Next touch</th>
                <th className="px-5 py-4">Dropped call?</th>
                <th className="px-5 py-4 min-w-[220px]">Suggested next step</th>
              </tr>
            </thead>
            <tbody>
              {NURTURE_TRACKS.map((n) => (
                <tr key={n.id} className="border-b border-fateh-border/70 last:border-0">
                  <td className="px-5 py-4 font-medium text-fateh-ink">{n.student}</td>
                  <td className="px-5 py-4">
                    <TierBadge tier={n.tier} />
                  </td>
                  <td className="px-5 py-4 text-fateh-ink">{n.stage}</td>
                  <td className="px-5 py-4 text-fateh-muted">{formatWhen(n.lastSent)}</td>
                  <td className="px-5 py-4 text-fateh-muted">{formatWhen(n.nextScheduled)}</td>
                  <td className="px-5 py-4">
                    {n.incompleteSession ? (
                      <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-amber-900">
                        Yes
                      </span>
                    ) : (
                      <span className="text-fateh-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[0.82rem] leading-snug text-fateh-muted">
                    {n.suggestedNext || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
