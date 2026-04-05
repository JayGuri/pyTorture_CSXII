import React, { useEffect, useMemo, useState } from "react";
import { fetchLeads } from "../../lib/forYouApi.js";
import TranscriptSidebar from "../components/TranscriptSidebar.jsx";

function maskCaller(phone) {
  const p = String(phone || "").replace(/\s/g, "");
  if (p.length < 5) return p || "—";
  return `${p.slice(0, 4)} •••• ${p.slice(-2)}`;
}

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
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export default function LiveConversationsPage() {
  const [loadState, setLoadState] = useState("loading");
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [scoreFilter, setScoreFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const res = await fetchLeads(1, 100);
        if (cancelled) return;

        const leads = res.data || [];
        const callRows = [];

        // Flatten all calls from all leads
        leads.forEach((lead) => {
          if (lead.calls && Array.isArray(lead.calls)) {
            lead.calls.forEach((call) => {
              callRows.push({
                id: `${call.call_sid}`,
                callSid: call.call_sid,
                studentName: lead.name || `Caller ${maskCaller(lead.phone)}`,
                phoneMasked: maskCaller(lead.phone),
                startedAt: call.started_at,
                agentPersona: `Call · ${call.status || "completed"}`,
                leadScore: lead.lead_score || null,
                intent: call.language || "—",
                financialReadiness: "—",
                timelineUrgency: "—",
                duration: call.duration_seconds,
                lastSnippet: `${call.call_sid} · ${formatDuration(call.duration_seconds)}`,
                transcript: lead.memory?.messages || [],
                callStarted: call.started_at,
                callEnded: call.ended_at,
              });
            });
          }
        });

        // Sort by started_at descending (newest first)
        callRows.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

        setAllRows(callRows);
        setRows(callRows);
        setLoadState("ready");
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load calls");
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
    return "Call history from leads. Click any call to view its transcript.";
  }, []);

  // Apply lead score and date filters
  useEffect(() => {
    let filtered = [...allRows];

    // Filter by lead score
    if (scoreFilter !== "all") {
      filtered = filtered.filter((row) => {
        const score = row.leadScore || 0;
        switch (scoreFilter) {
          case "high":
            return score >= 70;
          case "medium":
            return score >= 40 && score < 70;
          case "low":
            return score < 40;
          default:
            return true;
        }
      });
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date();
      let filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(filterDate.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(filterDate.getMonth() - 1);
          break;
        default:
          filterDate = null;
      }

      if (filterDate) {
        filtered = filtered.filter((row) => {
          const rowDate = new Date(row.startedAt);
          return rowDate >= filterDate;
        });
      }
    }

    setRows(filtered);
  }, [scoreFilter, dateFilter, allRows]);

  const filteredTranscript = useMemo(() => {
    if (!selectedCall || !selectedCall.transcript) return [];
    const transcript = Array.isArray(selectedCall.transcript) ? selectedCall.transcript : [];

    if (transcript.length === 0) return [];

    const startTime = selectedCall.callStarted
      ? new Date(selectedCall.callStarted).getTime()
      : null;
    const endTime = selectedCall.callEnded
      ? new Date(selectedCall.callEnded).getTime()
      : Date.now();

    // If no valid time range, return all messages
    if (!startTime) return transcript;

    // Filter by timestamp if available, otherwise return all
    const filtered = transcript.filter((line) => {
      if (!line.timestamp) return true; // Include if no timestamp
      const lineTime = new Date(line.timestamp).getTime();
      return lineTime >= startTime && lineTime <= endTime;
    });

    return filtered.length > 0 ? filtered : transcript; // Fall back to all if none match
  }, [selectedCall]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">
          Live conversations
        </h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">{subtitle}</p>
        {error ? <p className="mt-2 text-[0.82rem] text-amber-900">API error: {error}</p> : null}
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted mb-2">
              Lead Score
            </p>
            <div className="flex gap-2">
              {[
                { value: "all", label: "All" },
                { value: "high", label: "High (70+)" },
                { value: "medium", label: "Medium (40-69)" },
                { value: "low", label: "Low (<40)" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScoreFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition ${
                    scoreFilter === opt.value
                      ? "bg-fateh-gold text-fateh-ink"
                      : "border border-fateh-border/70 bg-fateh-paper/40 hover:border-fateh-gold/35"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted mb-2">
              Date
            </p>
            <div className="flex gap-2">
              {[
                { value: "all", label: "All Time" },
                { value: "today", label: "Today" },
                { value: "week", label: "Last 7 Days" },
                { value: "month", label: "Last 30 Days" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition ${
                    dateFilter === opt.value
                      ? "bg-fateh-gold text-fateh-ink"
                      : "border border-fateh-border/70 bg-fateh-paper/40 hover:border-fateh-gold/35"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[0.75rem] font-medium text-fateh-muted">
            {rows.length} call{rows.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-fateh-border/90 bg-white/95 shadow-[0_24px_60px_-30px_rgba(11,14,26,0.22)]">
        <div className="overflow-x-auto">
          <table className="min-w-[880px] w-full border-collapse text-left text-[0.88rem]">
            <thead>
              <tr className="border-b border-fateh-border bg-fateh-paper/80 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-fateh-muted">
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Session</th>
                <th className="px-5 py-4">Duration</th>
                <th className="px-5 py-4">Language</th>
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4 text-right">Lead score</th>
              </tr>
            </thead>
            <tbody>
              {loadState === "loading" ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-fateh-muted">
                    Loading calls…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[0.9rem] text-fateh-muted">
                    No calls found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedCall(row)}
                    className="border-b border-fateh-border/80 last:border-0 cursor-pointer hover:bg-fateh-gold-pale/30 transition"
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-fateh-ink">{row.studentName}</p>
                          <p className="text-[0.78rem] text-fateh-muted">{row.phoneMasked}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-fateh-muted">
                      <p className="font-medium text-fateh-ink">{row.callSid}</p>
                      <p className="mt-1 max-w-[280px] text-[0.78rem] leading-snug">{row.lastSnippet}</p>
                    </td>
                    <td className="px-5 py-4 align-top text-fateh-ink font-medium">
                      {formatDuration(row.duration)}
                    </td>
                    <td className="px-5 py-4 align-top text-fateh-ink">{row.intent}</td>
                    <td className="px-5 py-4 align-top text-fateh-ink">{formatWhen(row.startedAt)}</td>
                    <td className="px-5 py-4 align-top text-right">
                      <span className="text-[0.9rem] text-fateh-ink font-semibold tabular-nums">
                        {row.leadScore ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-fateh-border bg-fateh-gold-pale/25 px-5 py-4 text-[0.82rem] text-fateh-muted">
        <span className="font-medium text-fateh-ink">Note:</span> Click any call to view its transcript in the sidebar.
      </div>

      <TranscriptSidebar
        call={selectedCall}
        transcript={filteredTranscript}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
}
