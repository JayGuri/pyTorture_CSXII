import React from "react";
import { ANALYTICS_SUMMARY } from "../data/mockData.js";

export default function AnalyticsPage() {
  const maxQ = Math.max(...ANALYTICS_SUMMARY.topQuestions.map((x) => x.count), 1);
  const funnel = ANALYTICS_SUMMARY.conversionFunnel;
  const maxF = funnel[0]?.value ?? 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Call analytics</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          What students ask about most often, how busy the lines are, and how people move from first call toward enrolment — sample
          view until your analytics feed is connected.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm md:col-span-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fateh-muted">Calls (30 days)</p>
          <p className="mt-2 font-fateh-serif text-4xl font-semibold text-fateh-accent tabular-nums">
            {ANALYTICS_SUMMARY.callsLast30d.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm md:col-span-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fateh-muted">Hot lead share</p>
          <div className="mt-4 flex items-end gap-4">
            <p className="font-fateh-serif text-5xl font-semibold text-fateh-gold tabular-nums">{ANALYTICS_SUMMARY.leadsHotPercent}%</p>
            <p className="mb-2 text-[0.88rem] text-fateh-muted">of scored cohort in the last rolling window (sample).</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-fateh-border/70">
            <div className="h-full rounded-full bg-fateh-gold" style={{ width: `${ANALYTICS_SUMMARY.leadsHotPercent}%` }} />
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm">
        <h2 className="font-fateh-serif text-xl font-semibold text-fateh-ink">Most common student questions</h2>
        <ul className="mt-6 space-y-4">
          {ANALYTICS_SUMMARY.topQuestions.map((row) => (
            <li key={row.q}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.88rem]">
                <p className="max-w-2xl font-medium text-fateh-ink">{row.q}</p>
                <p className="tabular-nums text-fateh-muted">{row.count} mentions</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-fateh-border/60">
                <div
                  className="h-full rounded-full bg-fateh-accent/80"
                  style={{ width: `${(row.count / maxQ) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm">
        <h2 className="font-fateh-serif text-xl font-semibold text-fateh-ink">Lead conversion funnel</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {funnel.map((stage) => (
            <div key={stage.stage} className="rounded-lg border border-fateh-border/80 bg-fateh-paper/40 p-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fateh-muted">{stage.stage}</p>
              <p className="mt-2 font-fateh-serif text-2xl font-semibold text-fateh-ink tabular-nums">{stage.value}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-fateh-border/60">
                <div
                  className="h-full rounded-full bg-fateh-gold"
                  style={{ width: `${(stage.value / maxF) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
