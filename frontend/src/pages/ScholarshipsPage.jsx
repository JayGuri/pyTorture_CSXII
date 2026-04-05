import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Building2, Flag, Filter, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAllScholarships } from "../hooks/useForYouDashboard";
import { apiContactEmail } from "../lib/userContact.js";
import { SCHOLARSHIPS as STATIC_SCHOLARSHIPS } from "../data/forYouPrograms";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "eligible", label: "Likely eligible" },
  { id: "india", label: "India schemes" },
  { id: "university", label: "University" },
];

export default function ScholarshipsPage() {
  const { user } = useAuth();
  const { scholarships: backendScholarships, loading } = useAllScholarships(
    user?.sessionId,
    apiContactEmail(user),
  );
  const [filter, setFilter] = useState("eligible");

  const normalizedScholarships = useMemo(() => {
    if (backendScholarships && backendScholarships.length > 0) {
      return backendScholarships.map((s, idx) => ({
        id: s.id || `scholar-${idx}`,
        name: s.name || s.title,
        region: s.country || s.region || "International",
        type: s.funding_level === "full" ? "Fully Funded" : "Tuition Award",
        amountNote: s.amount_note || "Varies by academic merit",
        eligibility: s.eligibility_list || s.requirements || ["India resident", "Academic merit"],
        applyVia: s.apply_via || "Fateh counsellor assistance",
        source: s.source || (s.india_specific ? "india" : "university"),
        youMayQualify: s.match_score > 30,
      }));
    }
    return STATIC_SCHOLARSHIPS;
  }, [backendScholarships]);

  const rows = useMemo(() => {
    return normalizedScholarships.filter((s) => {
      if (filter === "eligible") return s.youMayQualify;
      if (filter === "india") return s.source === "india" || s.source === "india_eligible";
      if (filter === "university") return s.source === "university";
      return true;
    });
  }, [filter, normalizedScholarships]);

  return (
    <div className="relative min-h-screen bg-fateh-paper pb-24 pt-24 md:pt-28">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-50"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(ellipse 50% 40% at 0% 0%, rgba(200, 164, 90, 0.12), transparent),
            radial-gradient(ellipse 40% 35% at 100% 20%, rgba(26, 53, 96, 0.07), transparent)`,
        }}
      />

      <div className="mx-auto max-w-4xl px-6 md:px-10">
        <Link
          to="/for-you"
          className="inline-flex items-center gap-2 text-sm font-medium text-fateh-accent transition hover:text-fateh-gold"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to For you
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-fateh-gold/35 bg-fateh-gold-pale/60 px-4 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-fateh-ink/80">
            <Sparkles className="h-3.5 w-3.5 text-fateh-gold" strokeWidth={1.5} />
            Scholarships
          </div>
          <h1 className="mt-4 font-fateh-serif text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight text-fateh-ink normal-case">
            Funding catalogue
          </h1>
          <p className="mt-4 max-w-2xl text-fateh-muted leading-relaxed normal-case">
            A structured view of India-side schemes, university awards, and cross-border programmes. Amounts and windows
            change yearly — always verify the official notice and your offer letter before planning cash flow.
          </p>
        </motion.header>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fateh-muted">
            <Filter className="h-3.5 w-3.5" strokeWidth={1.5} />
            View
          </span>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                filter === f.id
                  ? "bg-fateh-ink text-fateh-gold-light"
                  : "border border-fateh-border bg-white text-fateh-muted hover:border-fateh-gold/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-fateh-gold" strokeWidth={1.5} />
            <p className="mt-4 text-sm text-fateh-muted normal-case italic">Personalizing funding options for your profile...</p>
          </div>
        ) : (
          <ul className="mt-10 space-y-6">
            {rows.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.35) }}
                className="overflow-hidden rounded-2xl border border-fateh-border/90 bg-white/95 shadow-sm"
              >
                <div className="border-b border-fateh-border/70 bg-linear-to-r from-fateh-gold-pale/50 to-transparent px-6 py-4 md:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fateh-gold/15 text-fateh-gold">
                        <Award className="h-5 w-5" strokeWidth={1.35} />
                      </span>
                      <div>
                        <h2 className="font-fateh-serif text-xl font-semibold text-fateh-ink normal-case md:text-2xl">
                          {s.name}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-fateh-ink/5 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-fateh-muted">
                            <Flag className="h-3 w-3" strokeWidth={1.5} />
                            {s.region}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-fateh-accent/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-fateh-accent">
                            <Building2 className="h-3 w-3" strokeWidth={1.5} />
                            {s.type}
                          </span>
                          {s.youMayQualify ? (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-900">
                              Top Match
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-5 px-6 py-6 md:px-8 md:py-8">
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold">Award (indicative)</p>
                    <p className="mt-1 text-sm font-medium text-fateh-ink leading-relaxed normal-case">{s.amountNote}</p>
                  </div>
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold">Eligibility criteria</p>
                    <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-fateh-muted leading-relaxed">
                      {Array.isArray(s.eligibility) ? s.eligibility.map((line) => (
                        <li key={line} className="normal-case">
                          {line}
                        </li>
                      )) : <li className="normal-case">{s.eligibility}</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold">How to apply</p>
                    <p className="mt-2 text-sm text-fateh-ink leading-relaxed normal-case">{s.applyVia}</p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}

        {rows.length === 0 ? (
          <p className="mt-12 rounded-xl border border-dashed border-fateh-border bg-white/80 px-6 py-10 text-center text-sm text-fateh-muted normal-case">
            No scholarships in this filter. Choose another tab or speak with your counsellor for a bespoke search.
          </p>
        ) : null}

        <p className="mt-12 text-center text-xs text-fateh-muted leading-relaxed normal-case">
          Fateh does not guarantee eligibility. Use this page as a research brief; final decisions rest with funders and universities.
        </p>
      </div>
    </div>
  );
}
