import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Radio, Users, ClipboardList, AlertTriangle } from "lucide-react";
import {
  LIVE_CONVERSATIONS,
  COMPLETED_CALLS,
  KB_GAP_QUEUE_SEED,
  ANALYTICS_SUMMARY,
} from "../data/mockData.js";

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
  const hot = COMPLETED_CALLS.filter((c) => c.tier === "hot").length;
  const pendingGaps = KB_GAP_QUEUE_SEED.filter((g) => g.status === "pending").length;
  const briefCount = COMPLETED_CALLS.length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Overview</h1>
        <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Priority surface for PS-1: live voice sessions, tiered leads, intelligence briefs, and KB gap review. Data below is simulated until your
          backend is connected.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live conversations"
          value={LIVE_CONVERSATIONS.length}
          hint="Active AI–student calls with rolling lead scores."
          to="/admin/live"
          linkLabel="Open live board"
        />
        <StatCard
          label="Hot leads (sample)"
          value={hot}
          hint="Scores 70–100 from intent, funds, and timeline."
          to="/admin/leads"
          linkLabel="Lead matrix"
        />
        <StatCard
          label="KB gaps pending"
          value={pendingGaps}
          hint="Student questions the agent could not answer."
          to="/admin/kb/gaps"
          linkLabel="Review queue"
        />
        <StatCard
          label="Intelligence briefs"
          value={briefCount}
          hint="Completed calls with transcripts and structured handoff."
          to="/admin/briefs"
          linkLabel="Open briefs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-fateh-border/90 bg-white/90 p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-fateh-gold" aria-hidden />
            <h2 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Right now</h2>
          </div>
          <ul className="mt-5 divide-y divide-fateh-border/80">
            {LIVE_CONVERSATIONS.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                <div>
                  <p className="font-medium text-fateh-ink">{row.studentName}</p>
                  <p className="mt-0.5 text-[0.8rem] text-fateh-muted">{row.agentPersona}</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-fateh-muted">Lead score</p>
                  <p className="font-fateh-serif text-xl font-semibold text-fateh-accent">{row.leadScore}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/admin/live"
            className="mt-2 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-fateh-gold hover:underline"
          >
            Monitor all live threads <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-fateh-border/90 bg-fateh-accent/[0.06] p-6">
            <div className="flex items-center gap-2 text-fateh-accent">
              <Users className="h-4 w-4" aria-hidden />
              <h2 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Counsellor handoff</h2>
            </div>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-fateh-muted">
              Every completed call produces a structured brief: transcript, twelve extraction fields, score breakdown, next actions, and a
              sixty-second scan summary.
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
            <p className="mt-3 text-[0.88rem] leading-relaxed text-amber-950/80">
              Last thirty days: <span className="font-semibold text-amber-950">{ANALYTICS_SUMMARY.callsLast30d}</span> voice calls logged.
              Hot-tier share <span className="font-semibold">{ANALYTICS_SUMMARY.leadsHotPercent}%</span> (demo cohort).
            </p>
            <Link to="/admin/analytics" className="mt-4 inline-flex text-[0.78rem] font-semibold text-amber-950/90 hover:underline">
              Deeper analytics →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
