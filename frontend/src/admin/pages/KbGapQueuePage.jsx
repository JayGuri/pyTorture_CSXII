import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { KB_GAP_QUEUE_SEED } from "../data/mockData.js";

export default function KbGapQueuePage() {
  const { showToast = () => {} } = useOutletContext() ?? {};
  const [items, setItems] = useState(() => KB_GAP_QUEUE_SEED.map((x) => ({ ...x })));

  const pending = items.filter((i) => i.status === "pending");
  const resolved = items.filter((i) => i.status !== "pending");

  const act = (id, status) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    showToast(
      status === "approved"
        ? "Answer approved — queued for KB ingest & embedding regeneration (simulated)."
        : "Answer rejected — retained for counsellor follow-up only.",
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">KB gap queue</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Student questions the AI could not answer on-call, with the post-call agent&apos;s researched draft. Approve to promote into the
          knowledge base; reject to keep it out of production retrieval.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">Pending review ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-fateh-border bg-fateh-paper/50 px-6 py-10 text-center text-[0.9rem] text-fateh-muted">
            Queue clear — outstanding gaps will appear here after calls.
          </p>
        ) : (
          <ul className="space-y-5">
            {pending.map((g) => (
              <li key={g.id} className="rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fateh-muted">Student question</p>
                <p className="mt-2 font-fateh-serif text-lg font-semibold text-fateh-ink">{g.question}</p>
                <p className="mt-2 text-[0.78rem] text-fateh-muted">Linked call · {g.callId}</p>
                <div className="mt-5 rounded-lg border border-fateh-border/80 bg-fateh-paper/40 p-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fateh-muted">Researched answer (draft)</p>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-fateh-ink">{g.researchedAnswer}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => act(g.id, "approved")}
                    className="rounded-sm bg-fateh-gold px-5 py-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fateh-ink transition hover:bg-fateh-gold-light"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => act(g.id, "rejected")}
                    className="rounded-sm border border-fateh-border bg-white px-5 py-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fateh-ink transition hover:bg-fateh-paper"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">Recently resolved</h2>
          <ul className="divide-y divide-fateh-border/80 rounded-xl border border-fateh-border/90 bg-white/90">
            {resolved.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="max-w-xl text-[0.88rem] font-medium text-fateh-ink">{g.question}</p>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
                    g.status === "approved" ? "bg-emerald-500/12 text-emerald-800" : "bg-slate-500/10 text-slate-700",
                  ].join(" ")}
                >
                  {g.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
