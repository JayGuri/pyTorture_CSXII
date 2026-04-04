import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { COMPLETED_CALLS, MANDATORY_FIELD_KEYS } from "../data/mockData.js";
import TierBadge from "../components/TierBadge.jsx";

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function formatWhen(iso) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function transcriptFilename(call) {
  const slug = String(call.studentName || "student")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `transcript-${call.id}-${slug || "call"}.txt`;
}

function buildTranscriptTxt(call) {
  const lines = [
    `Student: ${call.studentName}`,
    `Call ID: ${call.id}`,
    `Ended: ${call.endedAt}`,
    `Duration: ${formatDuration(call.durationSec)}`,
    "",
    "--- Transcript ---",
    "",
  ];
  for (const line of call.transcript) {
    const who = line.role === "agent" ? "AI agent" : "Student";
    lines.push(`${who}: ${line.text}`, "");
  }
  return lines.join("\n");
}

function downloadTranscriptTxt(call) {
  const text = buildTranscriptTxt(call);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = transcriptFilename(call);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CallBriefsPage() {
  const [selectedId, setSelectedId] = useState(COMPLETED_CALLS[0]?.id ?? null);
  const selected = useMemo(() => COMPLETED_CALLS.find((c) => c.id === selectedId) ?? COMPLETED_CALLS[0], [selectedId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Counsellor intelligence briefs</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Completed call outputs: full transcript (downloadable), twelve mandatory structured fields, overall score with breakdown, recommended next
          actions, and a sixty-second scan summary (persona, emotional tone, unresolved objections).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <aside className="rounded-xl border border-fateh-border/90 bg-white/90 p-4 shadow-[0_20px_50px_-30px_rgba(11,14,26,0.18)]">
          <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">Completed calls</p>
          <ul className="mt-3 space-y-2">
            {COMPLETED_CALLS.map((c) => {
              const active = c.id === selected.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={[
                      "flex w-full flex-col rounded-lg border px-3 py-3 text-left transition",
                      active
                        ? "border-fateh-gold/60 bg-fateh-gold-pale/50"
                        : "border-fateh-border/70 bg-fateh-paper/40 hover:border-fateh-gold/35",
                    ].join(" ")}
                  >
                    <span className="font-medium text-fateh-ink">{c.studentName}</span>
                    <span className="mt-1 text-[0.72rem] text-fateh-muted">{formatWhen(c.endedAt)}</span>
                    <span className="mt-2 flex items-center justify-between gap-2">
                      <TierBadge tier={c.tier} />
                      <span className="font-fateh-serif text-lg font-semibold text-fateh-accent tabular-nums">{c.overallScore}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="space-y-6">
          <header className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">Call record</p>
                <h2 className="mt-1 font-fateh-serif text-2xl font-semibold text-fateh-ink">{selected.studentName}</h2>
                <p className="mt-1 text-[0.88rem] text-fateh-muted">
                  Ended {formatWhen(selected.endedAt)} · Duration {formatDuration(selected.durationSec)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">Overall lead score</p>
                <p className="font-fateh-serif text-4xl font-semibold text-fateh-accent tabular-nums">{selected.overallScore}</p>
                <div className="mt-2 flex justify-end">
                  <TierBadge tier={selected.tier} />
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-xl border border-fateh-border/90 bg-fateh-accent/[0.04] px-6 py-5">
            <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">60-second scan</h3>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-fateh-ink/90">{selected.scanSummary}</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-fateh-border/80 bg-white/80 px-4 py-3">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">Persona</dt>
                <dd className="mt-1 text-[0.88rem] font-medium text-fateh-ink">{selected.persona}</dd>
              </div>
              <div className="rounded-lg border border-fateh-border/80 bg-white/80 px-4 py-3">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">Emotional state</dt>
                <dd className="mt-1 text-[0.88rem] font-medium text-fateh-ink">{selected.emotionalState}</dd>
              </div>
              <div className="rounded-lg border border-fateh-border/80 bg-white/80 px-4 py-3 sm:col-span-1">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">Unresolved objections</dt>
                <dd className="mt-1 text-[0.88rem] text-fateh-ink">
                  <ul className="list-disc space-y-1 pl-4">
                    {selected.unresolvedObjections.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
              <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Score breakdown</h3>
              <ul className="mt-4 space-y-3">
                {Object.entries(selected.scoreBreakdown).map(([k, v]) => (
                  <li key={k}>
                    <div className="flex items-center justify-between text-[0.82rem]">
                      <span className="capitalize text-fateh-muted">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                      <span className="font-semibold text-fateh-ink tabular-nums">{v}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fateh-border/60">
                      <div
                        className="h-full rounded-full bg-fateh-gold"
                        style={{ width: `${Math.min(100, (v / 30) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
              <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Recommended next actions</h3>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-[0.9rem] leading-relaxed text-fateh-ink">
                {selected.nextActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </section>
          </div>

          <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
            <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Structured extraction (12 fields)</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {MANDATORY_FIELD_KEYS.map(({ key, label, group }) => (
                <div key={key} className="rounded-lg border border-fateh-border/70 bg-fateh-paper/35 px-4 py-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                    {group} · {label}
                  </p>
                  <p className="mt-1 text-[0.88rem] font-medium text-fateh-ink">{selected.extracted[key]}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Full conversation transcript</h3>
              <button
                type="button"
                onClick={() => downloadTranscriptTxt(selected)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border border-fateh-border bg-fateh-paper/60 px-4 py-2.5 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-fateh-ink transition hover:border-fateh-gold hover:bg-fateh-gold-pale/50"
              >
                <Download className="h-4 w-4 text-fateh-gold" strokeWidth={2} aria-hidden />
                Download .txt
              </button>
            </div>
            <ul className="mt-4 space-y-3">
              {selected.transcript.map((line, idx) => (
                <li
                  key={idx}
                  className={[
                    "rounded-lg border px-4 py-3 text-[0.9rem] leading-relaxed",
                    line.role === "agent"
                      ? "border-fateh-border/80 bg-fateh-paper/50"
                      : "border-fateh-accent/20 bg-fateh-accent/[0.05]",
                  ].join(" ")}
                >
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fateh-muted">
                    {line.role === "agent" ? "AI agent" : "Student"}
                  </span>
                  <p className="mt-1 text-fateh-ink">{line.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
