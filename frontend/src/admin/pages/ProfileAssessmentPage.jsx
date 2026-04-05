import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Gauge, RefreshCw, Search } from "lucide-react";
import {
  fetchLeads,
  fetchLead,
  updateLeadCompleteness,
} from "../../lib/forYouApi.js";
import {
  coerceNum,
  getVoiceSnapshot,
  mergedScores,
  mergedCompleteness,
} from "../lib/voiceBriefSnapshot.js";
import TierBadge from "../components/TierBadge.jsx";

function tierFromClassification(c) {
  if (c === "Hot") return "hot";
  if (c === "Warm") return "warm";
  return "cold";
}

function round0(n) {
  return Math.round(Number(n) || 0);
}

function listScore(lead) {
  return round0(coerceNum(lead?.lead_score, 0));
}

/**
 * Operational routing copy for counsellors — not student-facing.
 */
function routingNotes(lead, scores, completeness) {
  const tier = String(scores.classification || lead?.classification || "Cold");
  const lines = [];
  if (tier === "Hot") {
    lines.push(
      "High-priority queue: keep SLA tight and confirm next concrete step (call, shortlist, or application task).",
    );
  } else if (tier === "Warm") {
    lines.push(
      "Warm: one clear CTA per touch — programme shortlist, intake year, or budget band — before pushing applications.",
    );
  } else {
    lines.push(
      "Cold: invest in discovery (goals, geography, budget realism) before senior counsellor or application work.",
    );
  }
  if (completeness < 40) {
    lines.push(
      "CRM record is thin — capture intake year, funding posture, and visa intent on the next live touch.",
    );
  } else if (completeness < 75) {
    lines.push(
      "Usable profile — close gaps on finance, transcripts, or deadlines before hand-off to applications.",
    );
  } else {
    lines.push(
      "Depth is enough to move into shortlist refinement or formal application planning.",
    );
  }
  if (scores.intent < 40) {
    lines.push(
      "Intent score low — validate alternatives and timeline before committing heavy research time.",
    );
  }
  if (scores.timelineUrgency >= 70) {
    lines.push(
      "Timeline urgency high — foreground deadlines and document checklist in every outbound.",
    );
  }
  if (scores.financialReadiness < 35) {
    lines.push(
      "Financial readiness weak — map scholarships, living costs, and part-time rules early.",
    );
  }
  return lines;
}

function ScoreBar({ value, max = 100 }) {
  const pct = Math.min(100, Math.max(0, (round0(value) / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-slate-200/90">
      <div
        className="h-full rounded bg-slate-600 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ProfileAssessmentPage() {
  const { showToast } = useOutletContext() || {};
  const [loadState, setLoadState] = useState("loading");
  const [leads, setLeads] = useState([]);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoad, setDetailLoad] = useState("idle");
  const [detailError, setDetailError] = useState(null);
  const [recalcBusy, setRecalcBusy] = useState(false);

  const reloadList = useCallback(async () => {
    setListError(null);
    try {
      const res = await fetchLeads(1, 200, null, null, { bypassCache: true });
      setLeads(res.data || []);
    } catch (e) {
      setListError(e.message || "Failed to load leads");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListError(null);
      try {
        const res = await fetchLeads(1, 200);
        if (!cancelled) setLeads(res.data || []);
      } catch (e) {
        if (!cancelled) setListError(e.message || "Failed to load leads");
      }
      if (!cancelled) setLoadState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError(null);
      return undefined;
    }
    setDetail(null);
    let cancelled = false;
    (async () => {
      setDetailLoad("loading");
      setDetailError(null);
      try {
        const row = await fetchLead(selectedId);
        if (!cancelled) setDetail(row);
      } catch (e) {
        if (!cancelled) {
          setDetailError(e.message || "Failed to load lead");
          setDetail(null);
        }
      }
      if (!cancelled) setDetailLoad("idle");
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        String(l.name || "")
          .toLowerCase()
          .includes(q) ||
        String(l.email || "")
          .toLowerCase()
          .includes(q),
    );
  }, [leads, search]);

  const snapshot = detail ? getVoiceSnapshot(detail) : null;
  const scores = detail ? mergedScores(detail, snapshot) : null;
  const completeness = detail ? mergedCompleteness(detail, snapshot) : 0;
  const notes =
    detail && scores ? routingNotes(detail, scores, completeness) : [];

  const handleRecalculate = async () => {
    if (!selectedId) return;
    setRecalcBusy(true);
    try {
      const updated = await updateLeadCompleteness(selectedId);
      setDetail(updated);
      showToast?.("Scores recalculated and saved.");
      await reloadList();
    } catch (e) {
      showToast?.(e.message || "Recalculate failed");
    } finally {
      setRecalcBusy(false);
    }
  };

  const handleReloadDetail = async () => {
    if (!selectedId) return;
    setDetailLoad("loading");
    setDetailError(null);
    try {
      const row = await fetchLead(selectedId, { bypassCache: true });
      setDetail(row);
    } catch (e) {
      setDetailError(e.message || "Failed to reload");
    } finally {
      setDetailLoad("idle");
    }
  };

  const tableRows =
    scores ?
      [
        { label: "Lead score", value: round0(scores.total), suffix: "/100" },
        { label: "Intent", value: round0(scores.intent), suffix: "/100" },
        { label: "Financial readiness", value: round0(scores.financialReadiness), suffix: "/100" },
        { label: "Timeline urgency", value: round0(scores.timelineUrgency), suffix: "/100" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-fateh-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-fateh-muted">
            Counsellor ops · internal
          </p>
          <h1 className="mt-1 font-fateh-serif text-2xl font-semibold text-fateh-ink md:text-3xl">
            Lead scoring &amp; profile depth
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fateh-muted">
            Pipeline scores and completeness live here only — not shown on the student &quot;For you&quot; hub.
          </p>
        </div>
        <button
          type="button"
          onClick={reloadList}
          className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-fateh-border bg-white px-3 py-2 text-[0.78rem] font-semibold text-fateh-ink shadow-sm transition hover:bg-fateh-paper"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh list
        </button>
      </div>

      {loadState === "ready" && listError ?
        <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-900">
          {listError}
        </div>
      : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <section className="flex min-h-[420px] flex-col rounded-lg border border-fateh-border bg-white shadow-sm">
          <div className="border-b border-fateh-border p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fateh-muted"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email"
                className="w-full rounded-md border border-fateh-border bg-fateh-paper/40 py-2 pl-9 pr-3 text-sm outline-none ring-fateh-gold/25 focus:ring-2"
              />
            </div>
            <p className="mt-2 text-[0.72rem] text-fateh-muted">
              {filtered.length} lead{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadState !== "ready" ?
              <p className="px-2 py-6 text-center text-sm text-fateh-muted">
                Loading…
              </p>
            : filtered.length === 0 ?
              <p className="px-2 py-6 text-center text-sm text-fateh-muted">
                No leads match.
              </p>
            : (
              <ul className="space-y-1">
                {filtered.map((l) => {
                  const active = l.id === selectedId;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(l.id)}
                        className={[
                          "flex w-full flex-col gap-1 rounded-md border px-3 py-2.5 text-left text-sm transition",
                          active ?
                            "border-slate-800 bg-slate-900 text-white"
                          : "border-transparent bg-fateh-paper/60 text-fateh-ink hover:border-fateh-border hover:bg-white",
                        ].join(" ")}
                      >
                        <span className="font-medium leading-snug">
                          {l.name || "Unnamed"}
                        </span>
                        <span
                          className={
                            active ? "text-white/70" : "text-fateh-muted"
                          }
                        >
                          {l.email || "—"}
                        </span>
                        <span className="flex flex-wrap items-center gap-2 pt-0.5">
                          <TierBadge
                            tier={tierFromClassification(l.classification)}
                            className={
                              active ? "bg-white/15! text-white! ring-white/25!" : ""
                            }
                          />
                          <span
                            className={
                              active ? "text-white/80" : "text-fateh-muted"
                            }
                          >
                            Score {listScore(l)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="min-h-[420px] rounded-lg border border-slate-200 bg-slate-50/80 shadow-inner">
          {!selectedId ?
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 px-6 text-center">
              <Gauge
                className="h-10 w-10 text-slate-400"
                strokeWidth={1.25}
                aria-hidden
              />
              <p className="text-sm font-medium text-slate-700">
                Select a lead to view scores
              </p>
              <p className="max-w-md text-xs leading-relaxed text-slate-500">
                Use this view before calls or hand-offs — tier, sub-scores, and
                completeness are counsellor signals only.
              </p>
            </div>
          : detailLoad === "loading" && !detail ?
            <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-600">
              Loading lead…
            </div>
          : detailError && !detail ?
            <div className="p-6 text-sm text-rose-800">{detailError}</div>
          : (
            <div className="flex flex-col gap-0 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-fateh-serif text-xl font-semibold text-slate-900">
                    {detail?.name || "Lead"}
                  </h2>
                  {scores ?
                    <TierBadge tier={tierFromClassification(scores.classification)} />
                  : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">{detail?.email || "—"}</p>
                {detail?.persona_type ?
                  <p className="mt-2 text-[0.72rem] uppercase tracking-[0.12em] text-slate-500">
                    Persona · {detail.persona_type}
                  </p>
                : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
                <button
                  type="button"
                  disabled={recalcBusy}
                  onClick={handleRecalculate}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {recalcBusy ? "Recalculating…" : "Recalculate scores"}
                </button>
                <button
                  type="button"
                  onClick={handleReloadDetail}
                  className="rounded border border-slate-300 bg-slate-100 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-800 transition hover:bg-slate-200"
                >
                  Hard reload
                </button>
              </div>
            </div>
          )}

          {selectedId && detail ?
            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b border-slate-200 p-5 md:border-r md:border-b-0">
                <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Score breakdown
                </h3>
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    CRM data completeness
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                    {round0(completeness)}%
                  </p>
                  <div className="mt-2">
                    <ScoreBar value={completeness} max={100} />
                  </div>
                </div>
                <table className="mt-5 w-full border-collapse text-sm">
                  <tbody>
                    {tableRows.map((m) => (
                      <tr
                        key={m.label}
                        className="border-t border-slate-200 first:border-t-0"
                      >
                        <td className="py-2.5 pr-3 text-slate-600">{m.label}</td>
                        <td className="py-2.5 text-right font-mono text-slate-900 tabular-nums">
                          {m.value}
                          {m.suffix}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-5">
                <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Routing notes
                </h3>
                <ul className="mt-4 list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-700">
                  {notes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          : null}
        </section>
      </div>
    </div>
  );
}
