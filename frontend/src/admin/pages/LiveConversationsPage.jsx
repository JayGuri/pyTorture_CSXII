import React, { useEffect, useMemo, useState } from "react";
import { fetchLiveAndRingingSessions } from "../../lib/forYouApi.js";

function maskCaller(phone) {
  const p = String(phone || "").replace(/\s/g, "");
  if (p.length < 5) return p || "—";
  return `${p.slice(0, 4)} •••• ${p.slice(-2)}`;
}

export default function LiveConversationsPage() {
  const [loadState, setLoadState] = useState("loading");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const sessions = await fetchLiveAndRingingSessions();
        if (cancelled) return;
        setRows(
          (sessions || []).map((s) => ({
            id: s.id,
            studentName: `Caller ${maskCaller(s.caller_phone)}`,
            phoneMasked: maskCaller(s.caller_phone),
            startedAt: s.created_at,
            agentPersona: `Voice · ${s.status || "active"}`,
            leadScore: null,
            intent: s.language_detected || "—",
            financialReadiness: "—",
            timelineUrgency: "—",
            lastSnippet: s.caller_phone
              ? `Caller ${maskCaller(s.caller_phone)} · session ${s.id.slice(0, 8)}…`
              : "Active voice session",
          })),
        );
        setLoadState("ready");
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load sessions");
          setRows([]);
          setLoadState("ready");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtitle = useMemo(() => {
    return "Rows from GET /api/dashboard/active-sessions (ringing + active). No demo feed — if the API returns an empty list, the table is empty.";
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">
          Live conversations
        </h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">{subtitle}</p>
        {error ? <p className="mt-2 text-[0.82rem] text-amber-900">API error: {error}</p> : null}
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
              {loadState === "loading" ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-fateh-muted">
                    Loading sessions…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[0.9rem] text-fateh-muted">
                    No active or ringing sessions from the API.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
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
                      <span className="text-[0.9rem] text-fateh-muted tabular-nums">—</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-fateh-border bg-fateh-gold-pale/25 px-5 py-4 text-[0.82rem] text-fateh-muted">
        <span className="font-medium text-fateh-ink">Note:</span> Rolling scores require the API to attach lead
        data to sessions; this table only reflects what active-sessions returns.
      </div>
    </div>
  );
}
