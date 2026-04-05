import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Radio, Users, ClipboardList, AlertTriangle } from "lucide-react";
import { fetchDashboardOverview, fetchLeads, fetchLiveAndRingingSessions } from "../../lib/forYouApi.js";
import { KB_GAP_QUEUE_SEED } from "../data/mockData.js";

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

function StatCard({ label, value, hint, to, linkLabel }) {
  return (
    <div className="rounded-xl border border-fateh-border/90 bg-white/90 p-6 shadow-[0_20px_50px_-28px_rgba(11,14,26,0.2)]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-fateh-muted">{label}</p>
      <p className="mt-2 font-fateh-serif text-3xl font-semibold text-fateh-ink">{value}</p>
      {hint ? <p className="mt-2 text-[0.85rem] leading-relaxed text-fateh-muted">{hint}</p> : null}
      {to ? (
        <Link
          to={to}
          className="mt-4 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fateh-gold hover:text-fateh-gold-muted"
        >
          {linkLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [loadState, setLoadState] = useState("loading");
  const [connectionError, setConnectionError] = useState(null);
  const [calls, setCalls] = useState([]);
  const [overview, setOverview] = useState(null);
  const [totalLeads, setTotalLeads] = useState(0);

  const pendingGaps = KB_GAP_QUEUE_SEED.filter((g) => g.status === "pending").length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setConnectionError(null);
      try {
        const [ov, leadsRes] = await Promise.all([
          fetchDashboardOverview(),
          fetchLeads(1, 100),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setTotalLeads(leadsRes.pagination?.total ?? 0);

        // Extract and sort all calls
        const allCalls = [];
        (leadsRes.data || []).forEach((lead) => {
          if (lead.calls && Array.isArray(lead.calls)) {
            lead.calls.forEach((call) => {
              allCalls.push({
                callSid: call.call_sid,
                studentName: lead.name,
                startedAt: call.started_at,
                duration: call.duration_seconds,
                status: call.status,
              });
            });
          }
        });

        // Sort by started_at descending and take top 3
        allCalls.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
        setCalls(allCalls.slice(0, 3));

        setLoadState("ready");
      } catch (e) {
        if (!cancelled) {
          setConnectionError(e.message || "API unreachable");
          setOverview(null);
          setTotalLeads(0);
          setCalls([]);
          setLoadState("ready");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hotCount = overview?.hot ?? 0;
  const liveCount = calls.length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Overview</h1>
        <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Stats below use the backend when it responds: <code className="text-fateh-ink/80">/api/dashboard/overview</code>,{" "}
          <code className="text-fateh-ink/80">/api/leads</code>, and active sessions. KB gap queue counts are still local seed
          data until that endpoint exists.
        </p>
        {connectionError ? (
          <p className="mt-2 text-[0.82rem] text-amber-900">
            Could not load live metrics: {connectionError}. Start the API and refresh.
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recent calls"
          value={loadState === "loading" ? "…" : liveCount}
          hint="Top 3 most recent calls from leads."
          to="/admin/live"
          linkLabel="View all calls"
        />
        <StatCard
          label="Hot leads (7d)"
          value={loadState === "loading" ? "…" : hotCount}
          hint="From dashboard overview (class Hot, created in last 7 days)."
          to="/admin/leads"
          linkLabel="Lead matrix"
        />
        <StatCard
          label="KB gaps pending"
          value={pendingGaps}
          hint="Local seed only — wire to your KB gap API when ready."
          to="/admin/kb/gaps"
          linkLabel="Review queue"
        />
        <StatCard
          label="Leads (total)"
          value={loadState === "loading" ? "…" : totalLeads}
          hint="All lead rows from GET /api/leads pagination total."
          to="/admin/briefs"
          linkLabel="Open briefs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-fateh-border/90 bg-white/90 p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-fateh-gold" aria-hidden />
            <h2 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Recent calls</h2>
          </div>
          {loadState === "loading" ? (
            <p className="mt-5 text-[0.88rem] text-fateh-muted">Loading…</p>
          ) : calls.length === 0 ? (
            <p className="mt-5 text-[0.88rem] text-fateh-muted">No calls yet.</p>
          ) : (
            <ul className="mt-5 divide-y divide-fateh-border/80">
              {calls.map((call) => (
                <li key={call.callSid} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                  <div>
                    <p className="font-medium text-fateh-ink">{call.callSid}</p>
                    <p className="mt-0.5 text-[0.8rem] text-fateh-muted">
                      {call.studentName || "—"} · {call.status || "completed"} · {formatWhen(call.startedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-fateh-muted">Duration</p>
                    <p className="font-fateh-serif text-xl font-semibold text-fateh-muted">{formatDuration(call.duration)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/live"
            className="mt-2 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-fateh-gold hover:underline"
          >
            View all calls <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-fateh-border/90 bg-fateh-accent/[0.06] p-6">
            <div className="flex items-center gap-2 text-fateh-accent">
              <Users className="h-4 w-4" aria-hidden />
              <h2 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Counsellor handoff</h2>
            </div>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-fateh-muted">
              Briefs are built only from Supabase-backed leads and sessions. Open a lead to see merged voice snapshot + CRM
              fields.
            </p>
            <Link
              to="/admin/briefs"
              className="mt-4 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-fateh-accent hover:underline"
            >
              Open briefs <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-6">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <h2 className="font-fateh-serif text-lg font-semibold">Pipeline snapshot</h2>
            </div>
            {overview && !connectionError ? (
              <p className="mt-3 text-[0.88rem] leading-relaxed text-amber-950/80">
                Today&apos;s calls logged:{" "}
                <span className="font-semibold text-amber-950">{overview.todayCalls ?? 0}</span>. Leads in last 7 days —
                Hot <span className="font-semibold">{overview.hot}</span>, Warm{" "}
                <span className="font-semibold">{overview.warm}</span>, Cold{" "}
                <span className="font-semibold">{overview.cold}</span>. Hot share{" "}
                <span className="font-semibold">{overview.conversionRate ?? 0}%</span>.
              </p>
            ) : (
              <p className="mt-3 text-[0.88rem] leading-relaxed text-amber-950/80">
                Connect the API to see call and classification counts from <code className="text-amber-950">/overview</code>.
              </p>
            )}
            <Link to="/admin/analytics" className="mt-4 inline-flex text-[0.78rem] font-semibold text-amber-950/90 hover:underline">
              Deeper analytics →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
