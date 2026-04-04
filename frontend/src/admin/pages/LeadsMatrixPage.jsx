import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { LEAD_MATRIX_ROWS, LIVE_CONVERSATIONS } from "../data/mockData.js";
import TierBadge from "../components/TierBadge.jsx";

function tierOrder(t) {
  if (t === "hot") return 0;
  if (t === "warm") return 1;
  return 2;
}

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

export default function LeadsMatrixPage() {
  const liveAsRows = useMemo(
    () =>
      LIVE_CONVERSATIONS.map((l) => ({
        id: l.id,
        name: l.studentName,
        tier:
          l.leadScore >= 70 ? "hot" : l.leadScore >= 40 ? "warm" : "cold",
        score: l.leadScore,
        intent: l.intent,
        financialReadiness: l.financialReadiness,
        timelineUrgency: l.timelineUrgency,
        lastTouch: l.startedAt,
        live: true,
      })),
    [],
  );

  const merged = useMemo(() => {
    const map = new Map();
    for (const r of LEAD_MATRIX_ROWS) map.set(r.id, { ...r, live: false });
    for (const r of liveAsRows) map.set(r.id, r);
    return Array.from(map.values()).sort((a, b) => tierOrder(a.tier) - tierOrder(b.tier) || b.score - a.score);
  }, [liveAsRows]);

  const columns = [
    { key: "hot", title: "Hot", subtitle: "70 – 100", rows: merged.filter((r) => r.tier === "hot") },
    { key: "warm", title: "Warm", subtitle: "40 – 69", rows: merged.filter((r) => r.tier === "warm") },
    { key: "cold", title: "Cold", subtitle: "0 – 39", rows: merged.filter((r) => r.tier === "cold") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Lead routing matrix</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          CRM-style board classifying leads by composite score. Tier rules: Hot (70–100), Warm (40–69), Cold (0–39), driven by intent,
          financial readiness, and timeline urgency.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {columns.map((col) => (
          <section
            key={col.key}
            className="flex flex-col rounded-xl border border-fateh-border/90 bg-white/90 shadow-[0_20px_50px_-30px_rgba(11,14,26,0.18)]"
          >
            <header className="border-b border-fateh-border/80 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-fateh-serif text-lg font-semibold text-fateh-ink">{col.title}</h2>
                <TierBadge tier={col.key} />
              </div>
              <p className="mt-1 text-[0.78rem] text-fateh-muted">{col.subtitle}</p>
            </header>
            <ul className="flex flex-1 flex-col gap-3 p-4">
              {col.rows.length === 0 ? (
                <li className="rounded-lg border border-dashed border-fateh-border bg-fateh-paper/50 px-4 py-8 text-center text-[0.85rem] text-fateh-muted">
                  No leads in this tier (demo).
                </li>
              ) : (
                col.rows.map((r) => (
                  <li key={r.id} className="rounded-lg border border-fateh-border/80 bg-fateh-paper/40 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-fateh-ink">{r.name}</p>
                        <p className="mt-1 text-[0.72rem] text-fateh-muted">Last touch · {formatWhen(r.lastTouch)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-fateh-serif text-xl font-semibold text-fateh-accent tabular-nums">{r.score}</p>
                        {r.live ? (
                          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-emerald-700">Live</p>
                        ) : null}
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.78rem]">
                      <div>
                        <dt className="text-fateh-muted">Intent</dt>
                        <dd className="font-medium text-fateh-ink">{r.intent}</dd>
                      </div>
                      <div>
                        <dt className="text-fateh-muted">Funds</dt>
                        <dd className="font-medium text-fateh-ink">{r.financialReadiness}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-fateh-muted">Timeline</dt>
                        <dd className="font-medium text-fateh-ink">{r.timelineUrgency}</dd>
                      </div>
                    </dl>
                    {!r.live ? (
                      <Link to="/admin/briefs" className="mt-3 inline-block text-[0.72rem] font-semibold text-fateh-gold hover:underline">
                        Open intelligence brief →
                      </Link>
                    ) : (
                      <Link to="/admin/live" className="mt-3 inline-block text-[0.72rem] font-semibold text-fateh-gold hover:underline">
                        Watch live session →
                      </Link>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
