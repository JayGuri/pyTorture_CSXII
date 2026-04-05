import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLeads, fetchLiveAndRingingSessions } from "../../lib/forYouApi.js";
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

function tierFromClassification(c) {
  if (c === "Hot") return "hot";
  if (c === "Warm") return "warm";
  return "cold";
}

function labelFromTier(tier) {
  if (tier === "hot") return "High";
  if (tier === "warm") return "Medium";
  return "Low";
}

function maskCaller(phone) {
  const p = String(phone || "").replace(/\s/g, "");
  if (p.length < 5) return p || "Unknown";
  return `${p.slice(0, 4)} •••• ${p.slice(-2)}`;
}

export default function LeadsMatrixPage() {
  const [loadState, setLoadState] = useState("loading");
  const [apiLeads, setApiLeads] = useState([]);
  const [apiLive, setApiLive] = useState([]);
  const [leadsError, setLeadsError] = useState(null);
  const [liveError, setLiveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLeadsError(null);
      setLiveError(null);

      let leads = [];
      try {
        const leadsRes = await fetchLeads(1, 100);
        if (!cancelled) leads = leadsRes.data || [];
      } catch (e) {
        if (!cancelled) setLeadsError(e.message || "Failed to load leads");
      }

      let live = [];
      try {
        const rows = await fetchLiveAndRingingSessions();
        if (!cancelled) live = rows || [];
      } catch (e) {
        if (!cancelled) setLiveError(e.message || "Failed to load live sessions");
      }

      if (cancelled) return;
      setApiLeads(leads);
      setApiLive(live);
      setLoadState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const backendUnreachable = loadState === "ready" && leadsError != null;

  const liveAsRows = useMemo(() => {
    return apiLive.map((s) => {
      const tier = "warm";
      return {
        id: `session-${s.id}`,
        name: `Live · ${maskCaller(s.caller_phone)}`,
        tier,
        score: 55,
        intent: s.language_detected ? `Lang: ${s.language_detected}` : "Live",
        financialReadiness: String(s.status || "active"),
        timelineUrgency: "In progress",
        lastTouch: s.created_at,
        live: true,
      };
    });
  }, [apiLive]);

  const completedRows = useMemo(() => {
    return apiLeads.map((l) => {
      const tier = tierFromClassification(l.classification);
      return {
        id: l.id,
        name: l.name,
        tier,
        score: l.lead_score ?? 0,
        intent: labelFromTier(tier),
        financialReadiness: labelFromTier(tier),
        timelineUrgency: formatWhen(l.updated_at || l.created_at),
        lastTouch: l.updated_at || l.created_at,
        live: false,
      };
    });
  }, [apiLeads]);

  const merged = useMemo(() => {
    const map = new Map();
    for (const r of completedRows) map.set(r.id, { ...r, live: r.live ?? false });
    for (const r of liveAsRows) map.set(r.id, r);
    return Array.from(map.values()).sort(
      (a, b) =>
        tierOrder(a.tier) - tierOrder(b.tier) || (Number(b.score) || 0) - (Number(a.score) || 0),
    );
  }, [completedRows, liveAsRows]);

  const columns = [
    { key: "hot", title: "Hot", subtitle: "70 – 100", rows: merged.filter((r) => r.tier === "hot") },
    { key: "warm", title: "Warm", subtitle: "40 – 69", rows: merged.filter((r) => r.tier === "warm") },
    { key: "cold", title: "Cold", subtitle: "0 – 39", rows: merged.filter((r) => r.tier === "cold") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">
          Lead routing matrix
        </h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Leads grouped by priority (Hot, Warm, Cold). Anyone on a live call appears under the tier that best matches their signals.
        </p>
        {backendUnreachable ? (
          <p className="mt-2 text-[0.82rem] text-amber-900">
            Leads API unreachable: {leadsError}. Matrix shows live sessions only if that request succeeded, otherwise
            the board is empty.
          </p>
        ) : null}
        {loadState === "ready" && liveError ? (
          <p className="mt-1 text-[0.8rem] text-amber-800">Live sessions: {liveError} (live column empty).</p>
        ) : null}
      </div>

      {loadState === "loading" ? (
        <p className="text-[0.9rem] text-fateh-muted">Loading matrix…</p>
      ) : null}

      {loadState === "ready" ? (
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
                  No leads in this tier.
                </li>
              ) : (
                col.rows.map((r) => (
                  <li key={r.id} className="rounded-lg border border-fateh-border/80 bg-fateh-paper/40 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-fateh-ink">{r.name}</p>
                        <p className="mt-1 text-[0.72rem] text-fateh-muted">
                          Last touch · {formatWhen(r.lastTouch)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-fateh-serif text-xl font-semibold text-fateh-accent tabular-nums">
                          {r.score}
                        </p>
                        {r.live ? (
                          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            Live
                          </p>
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
                      <Link
                        to="/admin/briefs"
                        className="mt-3 inline-block text-[0.72rem] font-semibold text-fateh-gold hover:underline"
                      >
                        Open intelligence brief →
                      </Link>
                    ) : (
                      <Link
                        to="/admin/live"
                        className="mt-3 inline-block text-[0.72rem] font-semibold text-fateh-gold hover:underline"
                      >
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
      ) : null}
    </div>
  );
}
