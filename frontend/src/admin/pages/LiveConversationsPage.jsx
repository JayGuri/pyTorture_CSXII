import React, { useEffect, useState } from "react";
import { LIVE_CONVERSATIONS } from "../data/mockData.js";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function LiveConversationsPage() {
  const [rows, setRows] = useState(() => LIVE_CONVERSATIONS.map((r) => ({ ...r })));

  useEffect(() => {
    const id = window.setInterval(() => {
      setRows((prev) =>
        prev.map((r) => {
          const delta = Math.round((Math.random() - 0.45) * 4);
          return { ...r, leadScore: clamp(r.leadScore + delta, 0, 100) };
        }),
      );
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Live conversations</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Real-time monitoring of AI–student voice sessions. Lead scores fluctuate slightly as intent, financial readiness, and timeline signals
          are re-scored (simulated refresh).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-fateh-border/90 bg-white/95 shadow-[0_24px_60px_-30px_rgba(11,14,26,0.22)]">
        <div className="overflow-x-auto">
          <table className="min-w-[880px] w-full border-collapse text-left text-[0.88rem]">
            <thead>
              <tr className="border-b border-fateh-border bg-fateh-paper/80 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Session</th>
                <th className="px-5 py-4">Intent</th>
                <th className="px-5 py-4">Financial</th>
                <th className="px-5 py-4">Timeline</th>
                <th className="px-5 py-4 text-right">Live score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-fateh-border/80 last:border-0">
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-55" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <div>
                        <p className="font-medium text-fateh-ink">{row.studentName}</p>
                        <p className="text-[0.78rem] text-fateh-muted">{row.phoneMasked}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top text-fateh-muted">
                    <p className="font-medium text-fateh-ink">{row.agentPersona}</p>
                    <p className="mt-1 max-w-[280px] text-[0.78rem] leading-snug">{row.lastSnippet}</p>
                  </td>
                  <td className="px-5 py-4 align-top text-fateh-ink">{row.intent}</td>
                  <td className="px-5 py-4 align-top text-fateh-ink">{row.financialReadiness}</td>
                  <td className="px-5 py-4 align-top text-fateh-ink">{row.timelineUrgency}</td>
                  <td className="px-5 py-4 align-top text-right">
                    <span className="font-fateh-serif text-2xl font-semibold text-fateh-accent tabular-nums">{row.leadScore}</span>
                    <p className="text-[0.65rem] uppercase tracking-[0.14em] text-fateh-muted">Rolling</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-fateh-border bg-fateh-gold-pale/25 px-5 py-4 text-[0.82rem] text-fateh-muted">
        <span className="font-medium text-fateh-ink">Routing preview:</span> scores ≥70 surface as Hot in the lead matrix, 40–69 as Warm, and
        under 40 as Cold — weighted by intent, financial readiness, and timeline urgency once your scoring service is live.
      </div>
    </div>
  );
}
