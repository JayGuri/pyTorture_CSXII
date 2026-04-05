import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { fetchLead, fetchLeads } from "../../lib/forYouApi.js";
import TierBadge from "../components/TierBadge.jsx";
import { enrichLeadWithKb } from "../lib/enrichLeadWithKb.js";
import { getPopulatedLeadFieldRows } from "../lib/leadSchemaFields.js";
import {
  buildBriefViewModel,
  SCORE_BREAKDOWN_LABELS,
} from "../lib/leadDetailViewModel.js";

function formatDuration(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return "—";
  const n = Number(sec);
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}m ${s}s`;
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return String(iso);
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
  const t = call.transcript || [];
  for (const line of t) {
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

const API_SCORE_DENOM = 100;

function scoreBarWidth(value, denom) {
  const v = Number(value) || 0;
  return `${Math.min(100, (v / denom) * 100)}%`;
}

export default function CallBriefsPage() {
  const [listMode, setListMode] = useState("loading");
  const [apiSummaries, setApiSummaries] = useState([]);
  const [selectedApiId, setSelectedApiId] = useState(null);
  const [apiDetail, setApiDetail] = useState(null);
  const [apiDetailLoading, setApiDetailLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [selectedCallSid, setSelectedCallSid] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setConnectionError(null);
      try {
        const res = await fetchLeads(1, 100);
        const rows = res.data || [];
        if (cancelled) return;
        setApiSummaries(rows);
        setListMode("api");
        setSelectedApiId(rows[0]?.id ?? null);
      } catch (e) {
        if (!cancelled) {
          setListMode("offline");
          setApiSummaries([]);
          setSelectedApiId(null);
          setConnectionError(e.message || "Could not reach the API");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (listMode !== "api" || !selectedApiId) return undefined;
    let cancelled = false;
    setApiDetailLoading(true);
    setDetailError(null);
    fetchLead(selectedApiId)
      .then((data) => {
        if (!cancelled) {
          setApiDetail(data);
          setApiDetailLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setApiDetail(null);
          setApiDetailLoading(false);
          setDetailError(e.message || "Failed to load lead detail");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [listMode, selectedApiId]);

  const apiVm = useMemo(
    () => (apiDetail ? buildBriefViewModel(apiDetail) : null),
    [apiDetail],
  );

  const kb = useMemo(
    () => (apiDetail ? enrichLeadWithKb(apiDetail) : null),
    [apiDetail],
  );

  const populatedDbRows = useMemo(
    () => (apiDetail ? getPopulatedLeadFieldRows(apiDetail) : []),
    [apiDetail],
  );

  const profileByGroup = useMemo(() => {
    const tiles = apiVm?.mergedProfileTiles;
    if (!tiles?.length) return {};
    return tiles.reduce((acc, row) => {
      const g = row.group || "Other";
      if (!acc[g]) acc[g] = [];
      acc[g].push(row);
      return acc;
    }, {});
  }, [apiVm]);

  const backendLive = listMode === "api";
  const isApi = backendLive && apiVm != null;
  const selected = apiVm;
  const scoreDenom = API_SCORE_DENOM;

  const calls = useMemo(() => {
    if (!apiDetail?.calls) return [];
    return Array.isArray(apiDetail.calls) ? apiDetail.calls : [];
  }, [apiDetail]);

  const selectedCall = useMemo(
    () => calls.find((c) => c.call_sid === selectedCallSid),
    [calls, selectedCallSid]
  );

  const filteredTranscript = useMemo(() => {
    const transcript = apiVm?.transcript || [];
    if (!selectedCall || !selectedCall.started_at) return transcript;

    const startTime = new Date(selectedCall.started_at).getTime();
    const endTime = selectedCall.ended_at
      ? new Date(selectedCall.ended_at).getTime()
      : Date.now();

    return transcript.filter((line) => {
      if (!line.timestamp) return false;
      const lineTime = new Date(line.timestamp).getTime();
      return lineTime >= startTime && lineTime <= endTime;
    });
  }, [apiVm?.transcript, selectedCall]);

  const transcriptPayload = useMemo(
    () =>
      apiVm
        ? {
            studentName: apiVm.studentName,
            id: apiVm.id,
            endedAt: selectedCall?.ended_at || apiVm.endedAt,
            durationSec: selectedCall?.duration_seconds || apiVm.durationSec,
            transcript: filteredTranscript,
          }
        : {
            studentName: "",
            id: "",
            endedAt: null,
            durationSec: null,
            transcript: [],
          },
    [apiVm, selectedCall, filteredTranscript],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">
          Counsellor intelligence briefs
        </h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Data comes only from the backend: <span className="font-medium text-fateh-ink/90">call_sessions</span>{" "}
          and <span className="font-medium text-fateh-ink/90">leads</span> via{" "}
          <code className="text-fateh-ink/80">GET /api/leads</code> and{" "}
          <code className="text-fateh-ink/80">GET /api/leads/:id</code>. Knowledge-base panels still read static
          JSON in the repo (not generated demo people).
        </p>
        {connectionError ? (
          <p className="mt-2 text-[0.82rem] text-amber-900">
            Cannot reach the API: {connectionError}. Start the backend (e.g. uvicorn on port 8000) to load briefs.
          </p>
        ) : null}
        {backendLive ? (
          <p className="mt-2 text-[0.78rem] text-fateh-muted">Connected — showing Supabase-backed leads only.</p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <aside className="rounded-xl border border-fateh-border/90 bg-white/90 p-4 shadow-[0_20px_50px_-30px_rgba(11,14,26,0.18)]">
          <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">
            Leads (API)
          </p>
          <ul className="mt-3 space-y-2">
            {listMode === "loading" ? (
              <li className="px-2 py-6 text-center text-[0.85rem] text-fateh-muted">Loading…</li>
            ) : null}
            {listMode === "offline" ? (
              <li className="px-2 py-6 text-center text-[0.82rem] text-fateh-muted">
                API unavailable — no list to show.
              </li>
            ) : null}
            {backendLive && apiSummaries.length === 0 ? (
              <li className="px-2 py-6 text-center text-[0.82rem] text-fateh-muted">
                No leads returned from <code className="text-fateh-ink/80">GET /api/leads</code>.
              </li>
            ) : null}
            {backendLive
              ? apiSummaries.map((row) => {
                  const active = row.id === selectedApiId;
                  const tier =
                    row.classification === "Hot"
                      ? "hot"
                      : row.classification === "Warm"
                        ? "warm"
                        : "cold";
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedApiId(row.id)}
                        className={[
                          "flex w-full flex-col rounded-lg border px-3 py-3 text-left transition",
                          active
                            ? "border-fateh-gold/60 bg-fateh-gold-pale/50"
                            : "border-fateh-border/70 bg-fateh-paper/40 hover:border-fateh-gold/35",
                        ].join(" ")}
                      >
                        <span className="font-medium text-fateh-ink">{row.name}</span>
                        <span className="mt-1 text-[0.72rem] text-fateh-muted">
                          {formatWhen(row.updated_at || row.created_at)}
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-2">
                          <TierBadge tier={tier} />
                          <span className="font-fateh-serif text-lg font-semibold text-fateh-accent tabular-nums">
                            {row.lead_score ?? "—"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              : null}
          </ul>
        </aside>

        <div className="space-y-6">
          {listMode === "loading" ? (
            <p className="text-[0.9rem] text-fateh-muted">Loading leads…</p>
          ) : null}
          {listMode === "offline" ? (
            <div className="rounded-xl border border-fateh-border/90 bg-fateh-paper/50 px-6 py-10 text-center">
              <p className="text-[0.95rem] text-fateh-ink">Backend not reachable</p>
              <p className="mt-2 text-[0.85rem] text-fateh-muted">
                This page only shows data from your API. Start the server and refresh.
              </p>
            </div>
          ) : null}
          {backendLive && apiSummaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-fateh-border bg-fateh-paper/40 px-6 py-10 text-center">
              <p className="text-[0.95rem] text-fateh-ink">No leads in the database</p>
              <p className="mt-2 text-[0.85rem] text-fateh-muted">
                The API responded successfully but returned an empty list. Seed or create leads in Supabase to
                see briefs here.
              </p>
            </div>
          ) : null}
          {backendLive && selectedApiId && apiDetailLoading ? (
            <p className="text-[0.9rem] text-fateh-muted">Loading brief detail…</p>
          ) : null}
          {detailError ? (
            <p className="text-[0.82rem] text-amber-900">Could not load this lead: {detailError}</p>
          ) : null}
          {backendLive && selectedApiId && !apiDetailLoading && !apiDetail && !detailError ? (
            <p className="text-[0.9rem] text-fateh-muted">No lead detail loaded.</p>
          ) : null}

          {backendLive && apiVm && selected ? (
            <>
              {isApi && selected.onboardingQueue != null ? (
                <div className="rounded-xl border border-amber-300/80 bg-amber-50/90 px-5 py-4 text-[0.85rem] text-amber-950 shadow-sm">
                  <p className="font-semibold text-amber-900">Onboarding queue replaced the voice snapshot</p>
                  <p className="mt-1 text-[0.8rem] text-amber-900/85">
                    <code className="text-amber-950/90">counsellor_brief</code> now holds{" "}
                    <code className="text-amber-950/90">onboarding_queue</code> only. The merged profile below
                    still uses CRM columns plus any remaining snapshot data.
                  </p>
                  <pre className="mt-3 max-h-40 overflow-auto rounded-md border border-amber-200/80 bg-white/80 p-3 text-[0.72rem] leading-snug text-fateh-ink">
                    {JSON.stringify(selected.onboardingQueue, null, 2)}
                  </pre>
                </div>
              ) : null}

              <header className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">
                      Call record
                    </p>
                    <h2 className="mt-1 font-fateh-serif text-2xl font-semibold text-fateh-ink">
                      {selected.studentName}
                    </h2>
                    <p className="mt-1 text-[0.88rem] text-fateh-muted">
                      Ended {formatWhen(selected.endedAt)} · Duration{" "}
                      {formatDuration(selected.durationSec)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">
                      Overall lead score
                    </p>
                    <p className="font-fateh-serif text-4xl font-semibold text-fateh-accent tabular-nums">
                      {selected.overallScore}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <TierBadge tier={selected.tier} />
                    </div>
                  </div>
                </div>
              </header>

              <section className="rounded-xl border border-fateh-border/90 bg-fateh-accent/[0.04] px-6 py-5">
                <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">
                  Counsellor scan
                </h3>
                <p className="mt-3 whitespace-pre-line text-[0.92rem] leading-relaxed text-fateh-ink/90">
                  {selected.scanSummary}
                </p>
                {isApi && selected.snapshotMeta?.sessionId ? (
                  <p className="mt-3 text-[0.78rem] text-fateh-muted">
                    Voice session{" "}
                    <code className="rounded bg-white/60 px-1 text-fateh-ink/90">
                      {selected.snapshotMeta.sessionId}
                    </code>
                    {selected.snapshotMeta.timestamp ? (
                      <> · snapshot {formatWhen(selected.snapshotMeta.timestamp)}</>
                    ) : null}
                    {selected.completenessFieldCount != null ? (
                      <> · model fields filled: {selected.completenessFieldCount}/12</>
                    ) : null}
                  </p>
                ) : null}
              </section>

              {isApi ? (
                <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5 shadow-sm">
                  <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">
                    Student profile
                  </h3>
                  <p className="mt-1 text-[0.8rem] text-fateh-muted">
                    Merged from <span className="font-medium text-fateh-ink/80">leads</span> columns and{" "}
                    <span className="font-medium text-fateh-ink/80">counsellor_brief.extracted_data</span>{" "}
                    (voice). Prefer non-empty voice values, then CRM.
                  </p>
                  {Object.keys(profileByGroup).length === 0 ? (
                    <p className="mt-4 text-[0.88rem] text-fateh-muted">
                      No filled profile fields yet — check raw columns below or run a voice session that upserts
                      ExtractedData.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-6">
                      {Object.entries(profileByGroup).map(([group, rows]) => (
                        <div key={group}>
                          <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-fateh-muted">
                            {group}
                          </h4>
                          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {rows.map((r) => (
                              <div
                                key={`${group}-${r.label}`}
                                className="rounded-lg border border-fateh-border/70 bg-fateh-paper/40 px-4 py-3"
                              >
                                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-fateh-muted">
                                  {r.label}
                                </p>
                                <p className="mt-1 text-[0.88rem] font-medium text-fateh-ink wrap-break-word">
                                  {r.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5 shadow-sm">
                <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">
                  Counselling signals
                </h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-fateh-border/80 bg-fateh-paper/35 px-4 py-3">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                      Persona
                    </dt>
                    <dd className="mt-1 text-[0.88rem] font-medium text-fateh-ink">{selected.persona}</dd>
                  </div>
                  <div className="rounded-lg border border-fateh-border/80 bg-fateh-paper/35 px-4 py-3">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                      Emotional state
                    </dt>
                    <dd className="mt-1 text-[0.88rem] font-medium text-fateh-ink">{selected.emotionalState}</dd>
                  </div>
                  <div className="rounded-lg border border-fateh-border/80 bg-fateh-paper/35 px-4 py-3">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                      Unresolved objections
                    </dt>
                    <dd className="mt-1 text-[0.88rem] text-fateh-ink">
                      {selected.unresolvedObjections.length === 0 ? (
                        <span className="text-fateh-muted">None recorded</span>
                      ) : (
                        <ul className="list-disc space-y-1 pl-4">
                          {selected.unresolvedObjections.map((o, idx) => (
                            <li key={`objection-${idx}-${String(o).slice(0, 24)}`}>{o}</li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              {isApi && kb && !kb.kbCountry ? (
                <section className="rounded-xl border border-dashed border-fateh-border bg-fateh-paper/40 px-6 py-5">
                  <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Knowledge base context</h3>
                  <p className="mt-2 text-[0.85rem] text-fateh-muted">
                    No <span className="font-medium text-fateh-ink/80">target_countries</span> value maps to UK,
                    Ireland, or UAE in the static KB. Set target countries on the lead (or in voice extraction) to
                    surface universities, scholarships, and living costs.
                  </p>
                </section>
              ) : null}

              {isApi && kb && kb.kbCountry ? (
                <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
                  <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">
                    Knowledge base context ({kb.kbCountry})
                  </h3>
                  <p className="mt-2 text-[0.82rem] text-fateh-muted">
                    Derived from <code className="text-fateh-ink/80">frontend/data/*.json</code> using
                    the lead&apos;s <span className="font-medium text-fateh-ink/90">target_countries</span>{" "}
                    and academic profile — same layer as{" "}
                    <code className="text-fateh-ink/80">src/lib/knowledgeBase.js</code>.
                  </p>
                  <div className="mt-5 grid gap-6 lg:grid-cols-3">
                    <div>
                      <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                        Top universities (KB)
                      </h4>
                      <ul className="mt-2 space-y-2 text-[0.82rem] text-fateh-ink">
                        {kb.topUniversities.map((u) => (
                          <li key={u.id} className="border-b border-fateh-border/40 pb-2 last:border-0">
                            <span className="font-medium">{u.short_name || u.full_name}</span>
                            <span className="text-fateh-muted"> · QS {u.qs_rank_2026 ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                        Scholarship matches (KB)
                      </h4>
                      <ul className="mt-2 space-y-2 text-[0.82rem] text-fateh-ink">
                        {kb.matchedScholarships.length === 0 ? (
                          <li className="text-fateh-muted">No matches for current filters.</li>
                        ) : (
                          kb.matchedScholarships.map((s) => (
                            <li key={s.id} className="border-b border-fateh-border/40 pb-2 last:border-0">
                              <span className="font-medium">{s.name || s.id}</span>
                              {s.funding_level ? (
                                <span className="text-fateh-muted"> · {s.funding_level}</span>
                              ) : null}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                        Cost of living — cities (KB)
                      </h4>
                      <ul className="mt-2 space-y-2 text-[0.82rem] text-fateh-ink">
                        {kb.costCities.map(({ city, monthly }) => (
                          <li key={city} className="border-b border-fateh-border/40 pb-2 last:border-0">
                            <span className="font-medium capitalize">{city}</span>
                            {monthly?.realistic != null ? (
                              <span className="text-fateh-muted">
                                {" "}
                                · ~{monthly.realistic}/mo (realistic tier)
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {kb.recommendedFromKb.length > 0 ? (
                    <div className="mt-6 border-t border-fateh-border/70 pt-5">
                      <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                        Stored recommendations resolved to KB records
                      </h4>
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2 text-[0.82rem]">
                        {kb.recommendedFromKb.map((u) => (
                          <li key={u.id} className="rounded-lg border border-fateh-border/60 bg-fateh-paper/30 px-3 py-2">
                            {u.full_name}
                            <span className="text-fateh-muted"> ({u.city})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
                  <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">
                    Score breakdown
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {Object.entries(selected.scoreBreakdown).map(([k, v]) => (
                      <li key={k}>
                        <div className="flex items-center justify-between text-[0.82rem]">
                          <span className="text-fateh-muted">
                            {SCORE_BREAKDOWN_LABELS[k] || k.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="font-semibold text-fateh-ink tabular-nums">{v}</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fateh-border/60">
                          <div
                            className="h-full rounded-full bg-fateh-gold"
                            style={{ width: scoreBarWidth(v, scoreDenom) }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
                  <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">
                    Recommended next actions
                  </h3>
                  {selected.nextActions.length === 0 ? (
                    <p className="mt-4 text-[0.88rem] text-fateh-muted">
                      No recommended actions on this record. The voice snapshot includes them when the pipeline
                      populates <code className="text-fateh-ink/80">recommended_actions</code>.
                    </p>
                  ) : (
                    <ol className="mt-4 list-decimal space-y-2 pl-5 text-[0.9rem] leading-relaxed text-fateh-ink">
                      {selected.nextActions.map((a, i) => (
                        <li key={`action-${i}`}>{a}</li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>

              {isApi && apiDetail ? (
                <details className="group rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-4 shadow-sm open:pb-5">
                  <summary className="cursor-pointer font-fateh-serif text-lg font-semibold text-fateh-ink list-none marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      Raw database columns
                      <span className="text-[0.72rem] font-normal text-fateh-muted">
                        ({populatedDbRows.length} populated)
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2 text-[0.78rem] text-fateh-muted">
                    Non-empty <span className="font-medium text-fateh-ink/75">leads</span> and{" "}
                    <span className="font-medium text-fateh-ink/75">call_sessions</span> fields only. Empty
                    columns are hidden to reduce noise.
                  </p>
                  {populatedDbRows.length === 0 ? (
                    <p className="mt-4 text-[0.88rem] text-fateh-muted">No populated scalar fields on this row.</p>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {populatedDbRows.map(({ key, label, group, display }) => (
                        <div
                          key={key}
                          className="rounded-lg border border-fateh-border/70 bg-fateh-paper/35 px-4 py-3"
                        >
                          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                            {group} · {label}
                          </p>
                          <p className="mt-1 text-[0.88rem] font-medium text-fateh-ink wrap-break-word">{display}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              ) : null}

              {calls.length > 0 && (
                <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
                  <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">
                    Call history
                  </h3>
                  <div className="mt-4 space-y-2">
                    {calls.map((call) => {
                      const active = call.call_sid === selectedCallSid;
                      const started = new Date(call.started_at);
                      const ended = call.ended_at ? new Date(call.ended_at) : null;
                      const duration = call.duration_seconds
                        ? formatDuration(call.duration_seconds)
                        : ended
                          ? formatDuration(
                              Math.floor(
                                (ended.getTime() - started.getTime()) / 1000
                              )
                            )
                          : "—";

                      return (
                        <button
                          key={call.call_sid}
                          type="button"
                          onClick={() =>
                            setSelectedCallSid(
                              active ? null : call.call_sid
                            )
                          }
                          className={[
                            "w-full rounded-lg border px-4 py-3 text-left transition",
                            active
                              ? "border-fateh-gold/60 bg-fateh-gold-pale/50"
                              : "border-fateh-border/70 bg-fateh-paper/40 hover:border-fateh-gold/35",
                          ].join(" ")}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-fateh-ink">
                                {call.call_sid}
                              </p>
                              <p className="mt-0.5 text-[0.78rem] text-fateh-muted">
                                {formatWhen(call.started_at)}
                              </p>
                            </div>
                            <div className="text-right text-[0.82rem]">
                              <p className="text-fateh-muted">
                                {call.language || "—"}
                              </p>
                              <p className="font-medium text-fateh-ink">
                                {duration}
                              </p>
                              <p
                                className={[
                                  "mt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em]",
                                  call.status === "active"
                                    ? "text-emerald-600"
                                    : "text-fateh-muted",
                                ].join(" ")}
                              >
                                {call.status || "completed"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-fateh-border/90 bg-white/95 px-6 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-fateh-serif text-lg font-semibold text-fateh-ink">
                      {selectedCall
                        ? `Call ${selectedCall.call_sid} transcript`
                        : "Full conversation transcript"}
                    </h3>
                    {selectedCall && (
                      <p className="mt-1 text-[0.78rem] text-fateh-muted">
                        Showing messages for this call only.{" "}
                        <button
                          type="button"
                          onClick={() => setSelectedCallSid(null)}
                          className="font-medium text-fateh-gold hover:underline"
                        >
                          Show all
                        </button>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadTranscriptTxt(transcriptPayload)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border border-fateh-border bg-fateh-paper/60 px-4 py-2.5 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-fateh-ink transition hover:border-fateh-gold hover:bg-fateh-gold-pale/50"
                  >
                    <Download className="h-4 w-4 text-fateh-gold" strokeWidth={2} aria-hidden />
                    Download .txt
                  </button>
                </div>
                {filteredTranscript.length === 0 ? (
                  <p className="mt-4 text-[0.88rem] text-fateh-muted">
                    {selectedCall
                      ? "No messages recorded for this call."
                      : "No transcript lines on this session yet (empty or unparsed call_sessions.transcript)."}
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {filteredTranscript.map((line, idx) => (
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
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
