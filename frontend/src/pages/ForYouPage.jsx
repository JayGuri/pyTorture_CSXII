import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  GraduationCap,
  MapPin,
  FileText,
  ChevronRight,
  BookOpen,
  Coins,
  ArrowUpRight,
  Upload,
  Compass,
  Target,
  Zap,
  MessageCircle,
  CalendarPlus,
  GitCompare,
  Landmark,
  Plane,
  RefreshCw,
  AlertCircle,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AskFatehModal from "../components/forYou/AskFatehModal";
import {
  PROGRAMS,
  allProgramDeadlines,
  OUTCOME_STORIES,
  SAVED_SCENARIOS,
  INR_BUFFER,
} from "../data/forYouPrograms";
import { fetchInrPerUnit } from "../lib/exchangeRates";
import { googleCalendarUrl } from "../lib/googleCalendar";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const SHORTLIST = [
  { name: "UCD", city: "Dublin", country: "Ireland", lat: 32, lng: 62 },
  { name: "TCD", city: "Dublin", country: "Ireland", lat: 38, lng: 58 },
  { name: "Manchester", city: "Manchester", country: "UK", lat: 48, lng: 28 },
];

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function ForYouPage() {
  const { user } = useAuth();
  const first = user?.name?.split(" ")[0] || "there";

  const [selectedId, setSelectedId] = useState(PROGRAMS[0]?.id ?? "");
  const [compareIds, setCompareIds] = useState(() => []);
  const [askOpen, setAskOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState(null);
  const [parsedSkills, setParsedSkills] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [passportFile, setPassportFile] = useState(null);
  const [passportError, setPassportError] = useState(null);
  const [passportDrag, setPassportDrag] = useState(false);
  const [fx, setFx] = useState({ loading: false, error: null, inrPerUnit: null, date: null, source: null });
  const [bottomReached, setBottomReached] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const bottomSentinelRef = useRef(null);
  const scenariosRef = useRef(null);

  const selected = useMemo(() => PROGRAMS.find((p) => p.id === selectedId) ?? PROGRAMS[0], [selectedId]);
  const deadlines = useMemo(() => allProgramDeadlines(), []);
  const storiesForCourse = useMemo(
    () => OUTCOME_STORIES.filter((s) => s.courseIds.includes(selected.id)),
    [selected.id],
  );

  useEffect(() => {
    if (!selected?.currency) return undefined;
    const ac = new AbortController();
    let cancelled = false;
    setFx((f) => ({ ...f, loading: true, error: null }));
    fetchInrPerUnit(selected.currency, ac.signal)
      .then(({ inrPerUnit, date, source }) => {
        if (!cancelled) setFx({ loading: false, error: null, inrPerUnit, date, source });
      })
      .catch((e) => {
        if (e.name === "AbortError" || cancelled) return;
        setFx({
          loading: false,
          error: e?.message || "Could not load exchange rates.",
          inrPerUnit: null,
          date: null,
          source: null,
        });
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selected.currency]);

  function retryFx() {
    if (!selected?.currency) return;
    const ac = new AbortController();
    setFx((f) => ({ ...f, loading: true, error: null }));
    fetchInrPerUnit(selected.currency, ac.signal)
      .then(({ inrPerUnit, date, source }) => {
        setFx({ loading: false, error: null, inrPerUnit, date, source });
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setFx({
          loading: false,
          error: e?.message || "Could not load exchange rates.",
          inrPerUnit: null,
          date: null,
          source: null,
        });
      });
  }

  useEffect(() => {
    const el = bottomSentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setBottomReached(true);
      },
      { root: null, rootMargin: "0px 0px 120px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const financial = useMemo(() => {
    if (!selected || !fx.inrPerUnit) return null;
    const subtotalForeign = selected.tuitionYear + selected.livingYear + selected.otherFeesYear;
    const subtotalInr = subtotalForeign * fx.inrPerUnit;
    const low = Math.max(0, subtotalInr - INR_BUFFER);
    const high = subtotalInr + INR_BUFFER;
    return {
      subtotalForeign,
      subtotalInr,
      low,
      high,
      tuitionInr: selected.tuitionYear * fx.inrPerUnit,
      livingInr: selected.livingYear * fx.inrPerUnit,
      otherInr: selected.otherFeesYear * fx.inrPerUnit,
    };
  }, [selected, fx.inrPerUnit]);

  const simulateParse = (file) => {
    setResumeError(null);
    if (!file) {
      setResumeFile(null);
      setParsedSkills(null);
      return;
    }
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setResumeFile(null);
      setParsedSkills(null);
      setResumeError("Please upload a PDF, DOC, or DOCX file (max 10MB for this demo).");
      return;
    }
    setResumeFile(file.name);
    setParsedSkills(null);
    window.setTimeout(() => {
      setParsedSkills([
        "Data analysis",
        "Stakeholder communication",
        "Python",
        "Financial modelling",
        "Leadership (society president)",
      ]);
    }, 900);
  };

  const onPassportFile = (file) => {
    setPassportError(null);
    if (!file) {
      setPassportFile(null);
      return;
    }
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
      setPassportFile(null);
      setPassportError("Use PDF, JPG, or PNG for passport or travel scans.");
      return;
    }
    setPassportFile(file.name);
  };

  function toggleCompare(id) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const comparePrograms = useMemo(
    () => compareIds.map((id) => PROGRAMS.find((p) => p.id === id)).filter(Boolean),
    [compareIds],
  );

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!scenariosOpen) return undefined;
    const id = window.setTimeout(() => {
      scenariosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(id);
  }, [scenariosOpen]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-fateh-paper pb-32 pt-24 md:pt-28">
      <AskFatehModal open={askOpen} onClose={() => setAskOpen(false)} />

      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.65]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(ellipse 55% 40% at 10% 0%, rgba(200, 164, 90, 0.14), transparent),
            radial-gradient(ellipse 45% 35% at 90% 15%, rgba(26, 53, 96, 0.08), transparent),
            radial-gradient(ellipse 50% 30% at 50% 100%, rgba(200, 164, 90, 0.06), transparent)`,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035]"
        style={{
          backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
        aria-hidden
      />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-fateh-gold/15 bg-fateh-ink text-fateh-paper">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,rgba(200,164,90,0.07)_45%,transparent_65%)]" />
        <div className="pointer-events-none absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-fateh-gold/12 blur-[100px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-fateh-accent/25 blur-[90px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-20">
          <div className="grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fateh-gold/35 bg-fateh-gold/[0.08] px-4 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-fateh-gold-light backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                For you
              </div>
              <h1 className="font-fateh-serif text-[clamp(2.1rem,4.8vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.02em] normal-case">
                {first}, your study-abroad
                <span className="mt-1 block bg-linear-to-r from-fateh-gold-light via-fateh-gold to-fateh-gold-light/80 bg-clip-text text-transparent">
                  command centre
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-[1.02rem] font-light leading-[1.75] text-white/55 normal-case">
                Courses, comparisons, deadlines, visa prep, scholarships, and live cost conversion — structured so you
                can act without guesswork.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                {[
                  { k: "Matches", v: String(PROGRAMS.length) },
                  { k: "Shortlist", v: "3" },
                  { k: "Profile", v: user?.preliminaryCallDone ? "Live" : "Growing" },
                ].map((chip) => (
                  <div
                    key={chip.k}
                    className="rounded-lg border border-white/10 bg-white/6 px-5 py-3 backdrop-blur-md"
                  >
                    <p className="text-[0.6rem] uppercase tracking-[0.18em] text-fateh-gold/80">{chip.k}</p>
                    <p className="mt-1 font-fateh-serif text-2xl font-semibold text-white">{chip.v}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="relative hidden min-h-[280px] rounded-2xl border border-fateh-gold/20 bg-linear-to-br from-white/10 to-white/2 p-6 backdrop-blur-md lg:block"
            >
              <div className="absolute -right-2 -top-2 h-24 w-24 rounded-full bg-fateh-gold/20 blur-2xl" />
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-fateh-gold-light">Snapshot</p>
              <p className="mt-4 font-fateh-serif text-xl font-semibold leading-snug text-white normal-case">
                Ireland &amp; UK · PG · 2026 intake
              </p>
              <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-white/45">Next milestone</span>
                  <span className="font-medium text-fateh-gold-light">Counselling call</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-fateh-gold to-fateh-gold-light"
                    initial={{ width: "38%" }}
                    animate={{ width: user?.preliminaryCallDone ? "72%" : "38%" }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-10"
          >
            {!user?.preliminaryCallDone ? (
              <p className="max-w-2xl text-sm leading-relaxed text-fateh-gold-light/95 normal-case">
                <span className="font-semibold text-fateh-gold">Next step:</span> complete your free counselling &amp;
                intro call — we&apos;ll sync this hub with live notes and refine every tile below automatically.
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm text-emerald-200/95 normal-case">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Intro call logged — recommendations and reminders are aligned to your profile.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAskOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-fateh-gold/50 bg-fateh-gold/15 px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-fateh-gold-light transition hover:bg-fateh-gold/25"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={2} />
                Ask Fateh
              </button>
              <Link
                to="/#register"
                className="inline-flex items-center gap-2 rounded-lg bg-fateh-gold px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-fateh-ink shadow-lg shadow-fateh-gold/20 transition hover:bg-fateh-gold-light"
              >
                Book counselling
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center rounded-lg border border-white/25 bg-white/5 px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white/85 transition hover:border-fateh-gold hover:text-fateh-gold"
              >
                Main site
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Quick actions */}
      <div className="mx-auto max-w-7xl px-6 pt-10 md:px-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {[
            { label: "Ask Fateh", Icon: MessageCircle, sub: "AI chat", onClick: () => setAskOpen(true) },
            { label: "Compare", Icon: GitCompare, sub: "Up to 3 courses", onClick: () => scrollToId("compare-mode") },
            { label: "Deadlines", Icon: CalendarPlus, sub: "Reminders", onClick: () => scrollToId("deadlines-section") },
            { label: "Scholarships", Icon: Landmark, sub: "Full list", onClick: () => scrollToId("scholarships-teaser") },
            { label: "Explore site", Icon: Compass, sub: "Programmes", href: "/" },
            { label: "Boost profile", Icon: Zap, sub: "CV upload", onClick: () => scrollToId("resume-section") },
          ].map(({ label, Icon, sub, onClick, href }, i) => {
            const inner = (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fateh-gold/12 text-fateh-gold transition group-hover:bg-fateh-gold group-hover:text-fateh-ink">
                  <Icon className="h-5 w-5" strokeWidth={1.35} />
                </div>
                <span className="mt-3 text-sm font-semibold text-fateh-ink normal-case">{label}</span>
                <span className="text-xs text-fateh-muted normal-case">{sub}</span>
              </>
            );
            return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              {href ? (
                <Link
                  to={href}
                  className="group flex h-full flex-col items-start rounded-xl border border-fateh-border/90 bg-white/90 p-4 text-left shadow-sm backdrop-blur-sm transition hover:border-fateh-gold/40 hover:shadow-md md:p-5"
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onClick}
                  className="group flex h-full w-full flex-col items-start rounded-xl border border-fateh-border/90 bg-white/90 p-4 text-left shadow-sm backdrop-blur-sm transition hover:border-fateh-gold/40 hover:shadow-md md:p-5"
                >
                  {inner}
                </button>
              )}
            </motion.div>
            );
          })}
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:gap-7 md:px-10 lg:grid-cols-12 lg:py-14"
      >
        {/* Courses */}
        <motion.section
          variants={item}
          className="rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-[0_28px_80px_-32px_rgba(11,14,26,0.2)] backdrop-blur-sm md:p-9 lg:col-span-8"
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Recommended</p>
              <h2 className="mt-2 font-fateh-serif text-2xl font-semibold text-fateh-ink md:text-3xl normal-case">
                Courses matched to you
              </h2>
            </div>
            <span className="rounded-full bg-fateh-gold-pale/80 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-fateh-ink/70">
              Select · compare · cost
            </span>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-3 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {PROGRAMS.map((c, idx) => {
              const inCompare = compareIds.includes(c.id);
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group relative min-w-[260px] shrink-0 overflow-hidden rounded-xl border bg-fateh-paper/90 text-left shadow-sm transition md:min-w-0 ${
                    isSelected ? "border-fateh-gold ring-2 ring-fateh-gold/30" : "border-fateh-border/70 hover:border-fateh-gold/45 hover:shadow-xl"
                  }`}
                >
                  <div className={`h-1.5 w-full bg-linear-to-r ${c.accent}`} />
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="w-full p-6 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <BookOpen className="h-5 w-5 text-fateh-gold" strokeWidth={1.35} />
                      <span className="flex items-center gap-1 rounded-full bg-fateh-ink px-2.5 py-1 text-[0.65rem] font-bold text-fateh-gold-light">
                        {c.match}%
                        <ArrowUpRight className="h-3 w-3 opacity-70" />
                      </span>
                    </div>
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-fateh-border/60">
                      <motion.div
                        className="h-full rounded-full bg-linear-to-r from-fateh-gold to-fateh-gold-light"
                        initial={{ width: 0 }}
                        animate={{ width: `${c.match}%` }}
                        transition={{ duration: 0.9, delay: 0.15 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <h3 className="mt-5 font-fateh-serif text-lg font-semibold leading-snug text-fateh-ink normal-case transition group-hover:text-fateh-accent md:text-xl">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-sm text-fateh-muted normal-case">{c.school}</p>
                    <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-fateh-gold">{c.intake}</p>
                    <p className="mt-2 text-xs text-fateh-muted normal-case">{c.tag}</p>
                  </button>
                  <div className="flex items-center justify-between border-t border-fateh-border/60 px-4 py-3">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-fateh-muted">
                      Compare
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompare(c.id);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                        inCompare
                          ? "bg-fateh-ink text-fateh-gold-light"
                          : "bg-fateh-gold-pale text-fateh-ink hover:bg-fateh-gold/30"
                      }`}
                    >
                      {inCompare ? "Added" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Focus panel */}
        <motion.aside
          variants={item}
          className="flex flex-col justify-between overflow-hidden rounded-2xl border border-fateh-ink/10 bg-fateh-ink p-7 text-fateh-paper shadow-[0_32px_80px_-28px_rgba(11,14,26,0.45)] md:p-8 lg:col-span-4"
        >
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">Focus</p>
            <h2 className="mt-3 font-fateh-serif text-2xl font-semibold normal-case">Your shortlist DNA</h2>
          </div>
          <ul className="mt-8 space-y-0">
            {[
              {
                Icon: GraduationCap,
                t: "Primary track",
                d: "Postgraduate · Business & analytics",
              },
              { Icon: MapPin, t: "Regions", d: "Ireland · United Kingdom" },
              { Icon: Coins, t: "Scholarships", d: "India schemes · university merit" },
            ].map((row, i) => (
              <li
                key={row.t}
                className={`flex gap-4 py-5 ${i < 2 ? "border-b border-white/10" : ""}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fateh-gold/15 text-fateh-gold-light ring-1 ring-fateh-gold/25">
                  <row.Icon className="h-5 w-5" strokeWidth={1.35} />
                </div>
                <div>
                  <p className="font-semibold text-white normal-case">{row.t}</p>
                  <p className="mt-1 text-sm text-white/50 normal-case">{row.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.aside>

        {/* Comparison */}
        <motion.section
          id="compare-mode"
          variants={item}
          className="rounded-2xl border border-fateh-accent/20 bg-linear-to-br from-fateh-ink via-[#12182a] to-fateh-ink p-7 text-fateh-paper shadow-xl md:p-9 lg:col-span-12"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">Comparison</p>
              <h2 className="mt-2 font-fateh-serif text-2xl font-semibold normal-case md:text-3xl">Side-by-side</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/50 normal-case">
                Add up to three courses from the cards above. Figures are indicative year-one totals in university currency.
              </p>
            </div>
            {compareIds.length > 0 ? (
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-xs font-semibold uppercase tracking-wider text-fateh-gold-light underline-offset-4 hover:underline"
              >
                Clear all
              </button>
            ) : null}
          </div>

          {comparePrograms.length >= 2 ? (
            <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="p-4 font-semibold text-fateh-gold-light normal-case">Course</th>
                    {comparePrograms.map((p) => (
                      <th key={p.id} className="p-4 font-fateh-serif text-base font-semibold text-white normal-case">
                        {p.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {[
                    { k: "University", fn: (p) => p.school },
                    { k: "Country", fn: (p) => p.country },
                    { k: "Intake", fn: (p) => p.intake },
                    { k: "Currency", fn: (p) => p.currency },
                    {
                      k: "Tuition (yr)",
                      fn: (p) => `${p.currency === "EUR" ? "€" : "£"}${p.tuitionYear.toLocaleString()}`,
                    },
                    {
                      k: "Living (est.)",
                      fn: (p) => `${p.currency === "EUR" ? "€" : "£"}${p.livingYear.toLocaleString()}`,
                    },
                    {
                      k: "Other fees",
                      fn: (p) => `${p.currency === "EUR" ? "€" : "£"}${p.otherFeesYear.toLocaleString()}`,
                    },
                    {
                      k: "Year-one subtotal",
                      fn: (p) =>
                        `${p.currency === "EUR" ? "€" : "£"}${(p.tuitionYear + p.livingYear + p.otherFeesYear).toLocaleString()}`,
                    },
                    { k: "Match", fn: (p) => `${p.match}%` },
                  ].map((row) => (
                    <tr key={row.k} className="border-b border-white/5">
                      <td className="p-4 text-xs font-semibold uppercase tracking-wider text-white/45">{row.k}</td>
                      {comparePrograms.map((p) => (
                        <td key={p.id} className="p-4 normal-case">
                          {row.fn(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-white/20 bg-white/5 px-6 py-12 text-center">
              <GitCompare className="mx-auto h-10 w-10 text-fateh-gold/60" strokeWidth={1.25} />
              <p className="mt-4 text-sm font-medium text-white/70 normal-case">Add at least two courses to compare</p>
              <p className="mt-1 text-xs text-white/40 normal-case">Use the Compare button on each course card.</p>
            </div>
          )}
        </motion.section>

        {/* Deadlines */}
        <motion.section
          id="deadlines-section"
          variants={item}
          className="rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-lg md:p-9 lg:col-span-7"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Deadlines</p>
              <h2 className="mt-2 font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">Reminders</h2>
              <p className="mt-2 text-sm text-fateh-muted normal-case">
                Pulled from your recommended universities. Sync any row to Google Calendar.
              </p>
            </div>
          </div>
          <ul className="space-y-3">
            {deadlines.map((d) => {
              const cal = googleCalendarUrl({
                title: d.label,
                details: `${d.programTitle} · ${d.school}\n\nAdded from Fateh For you.`,
                isoDate: d.date,
              });
              return (
                <li
                  key={d.id}
                  className="flex flex-col gap-3 rounded-xl border border-fateh-border/80 bg-fateh-paper/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-fateh-ink normal-case">{d.label}</p>
                    <p className="mt-1 text-xs text-fateh-muted normal-case">
                      {d.date} · {d.school}
                    </p>
                  </div>
                  {cal ? (
                    <a
                      href={cal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-fateh-gold/40 bg-fateh-gold/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-fateh-ink transition hover:bg-fateh-gold/20"
                    >
                      <CalendarPlus className="h-4 w-4 text-fateh-gold" strokeWidth={1.5} />
                      Google Calendar
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </motion.section>

        {/* Financial clarity */}
        <motion.section
          variants={item}
          className="rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-[0_24px_70px_-30px_rgba(11,14,26,0.18)] backdrop-blur-sm md:p-9 lg:col-span-5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fateh-gold/30 bg-fateh-gold/10">
              <Landmark className="h-6 w-6 text-fateh-gold" strokeWidth={1.35} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Financial clarity</p>
              <h2 className="mt-1 font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">Year-one requirement</h2>
              <p className="mt-2 text-sm text-fateh-muted normal-case">
                Tied to the course you select below. INR uses a live ECB-based rate; we add ±₹1,00,000 buffer bands on the total.
              </p>
            </div>
          </div>

          <label className="relative mt-8 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-fateh-muted">Course for costing</span>
            <div className="relative mt-2">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-fateh-border bg-white py-3.5 pl-4 pr-10 text-sm font-medium text-fateh-ink outline-none ring-fateh-gold/25 focus:ring-2"
              >
                {PROGRAMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.school}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fateh-muted" strokeWidth={2} />
            </div>
          </label>

          {fx.loading ? (
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-fateh-border/80 bg-fateh-paper/80 px-4 py-6 text-sm text-fateh-muted">
              <RefreshCw className="h-5 w-5 animate-spin text-fateh-gold" strokeWidth={1.5} />
              Fetching live {selected.currency} → INR…
            </div>
          ) : fx.error ? (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-700" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-semibold text-red-900 normal-case">Could not load exchange rate</p>
                  <p className="mt-1 text-xs text-red-800/90 normal-case">{fx.error}</p>
                  <button
                    type="button"
                    onClick={() => retryFx()}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-fateh-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : financial ? (
            <div className="mt-8 space-y-5">
              <div className="rounded-xl border border-fateh-border/90 bg-linear-to-br from-fateh-paper to-fateh-gold-pale/25 p-5">
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold">Local currency (year one)</p>
                <ul className="mt-3 space-y-2 text-sm text-fateh-ink">
                  <li className="flex justify-between normal-case">
                    <span className="text-fateh-muted">Tuition</span>
                    <span className="font-medium">
                      {selected.currency === "EUR" ? "€" : "£"}
                      {selected.tuitionYear.toLocaleString()}
                    </span>
                  </li>
                  <li className="flex justify-between normal-case">
                    <span className="text-fateh-muted">Living (estimate)</span>
                    <span className="font-medium">
                      {selected.currency === "EUR" ? "€" : "£"}
                      {selected.livingYear.toLocaleString()}
                    </span>
                  </li>
                  <li className="flex justify-between normal-case">
                    <span className="text-fateh-muted">Fees &amp; misc</span>
                    <span className="font-medium">
                      {selected.currency === "EUR" ? "€" : "£"}
                      {selected.otherFeesYear.toLocaleString()}
                    </span>
                  </li>
                  <li className="flex justify-between border-t border-fateh-border/80 pt-3 font-fateh-serif text-lg font-semibold normal-case">
                    <span>Subtotal</span>
                    <span>
                      {selected.currency === "EUR" ? "€" : "£"}
                      {financial.subtotalForeign.toLocaleString()}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-fateh-accent/15 bg-fateh-ink p-5 text-fateh-paper">
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold-light">Indian rupees (live)</p>
                <p className="mt-1 text-xs text-white/45 normal-case">
                  1 {selected.currency} = {fx.inrPerUnit.toFixed(4)} INR
                  {fx.date ? ` · ECB rate date ${fx.date}` : ""}
                  {fx.source ? ` · ${fx.source}` : ""}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex justify-between text-white/75 normal-case">
                    <span>Tuition</span>
                    <span className="font-medium text-white">{formatInr(financial.tuitionInr)}</span>
                  </li>
                  <li className="flex justify-between text-white/75 normal-case">
                    <span>Living</span>
                    <span className="font-medium text-white">{formatInr(financial.livingInr)}</span>
                  </li>
                  <li className="flex justify-between text-white/75 normal-case">
                    <span>Fees &amp; misc</span>
                    <span className="font-medium text-white">{formatInr(financial.otherInr)}</span>
                  </li>
                  <li className="flex justify-between border-t border-white/10 pt-3 font-fateh-serif text-lg font-semibold text-fateh-gold-light normal-case">
                    <span>Central estimate</span>
                    <span>{formatInr(financial.subtotalInr)}</span>
                  </li>
                </ul>
                <div className="mt-5 rounded-lg bg-white/5 px-4 py-3">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider text-fateh-gold-light/90">
                    Planning band (± ₹1,00,000)
                  </p>
                  <p className="mt-2 font-fateh-serif text-xl font-semibold text-white normal-case">
                    {formatInr(financial.low)} — {formatInr(financial.high)}
                  </p>
                  <p className="mt-2 text-xs text-white/45 leading-relaxed normal-case">
                    Use the band for FX movement and small fee changes. Official invoices and your award letter remain the source of truth.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </motion.section>

        {/* Visa help */}
        <motion.section
          variants={item}
          className="rounded-2xl border border-fateh-gold/25 bg-linear-to-br from-white via-fateh-paper to-fateh-gold-pale/35 p-7 shadow-lg md:p-9 lg:col-span-6"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fateh-gold/35 bg-fateh-gold/12">
              <Plane className="h-6 w-6 text-fateh-gold" strokeWidth={1.35} />
            </div>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Visa help</p>
              <h2 className="font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case md:text-3xl">Passport &amp; travel history</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-fateh-muted normal-case">
            A clear scan of your passport bio page helps us check validity, blank pages, and name consistency. Strong travel
            history (stamps, prior visas) often supports credibility — upload a single PDF or image pack for counsellor review.
          </p>
          {passportError ? (
            <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 normal-case">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              {passportError}
            </div>
          ) : null}
          <label
            className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition ${
              passportDrag
                ? "border-fateh-gold bg-fateh-gold/10"
                : "border-fateh-border hover:border-fateh-gold/50 hover:bg-fateh-gold/5"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setPassportDrag(true);
            }}
            onDragLeave={() => setPassportDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setPassportDrag(false);
              const f = e.dataTransfer.files?.[0];
              onPassportFile(f);
            }}
          >
            <Upload className="h-8 w-8 text-fateh-gold" strokeWidth={1.35} />
            <span className="mt-3 text-sm font-semibold text-fateh-ink normal-case">Passport bio page / travel scans</span>
            <span className="mt-1 text-xs text-fateh-muted normal-case">PDF, JPG, PNG · demo upload (browser only)</span>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => onPassportFile(e.target.files?.[0])}
            />
          </label>
          {passportFile ? (
            <p className="mt-4 text-sm text-fateh-accent normal-case">
              Received <span className="font-semibold text-fateh-ink">{passportFile}</span> — your counsellor will map this to the visa checklist.
            </p>
          ) : !passportError ? (
            <p className="mt-4 text-xs text-fateh-muted normal-case">No file uploaded yet.</p>
          ) : null}
        </motion.section>

        {/* Scholarships teaser */}
        <motion.section
          id="scholarships-teaser"
          variants={item}
          className="flex flex-col justify-between overflow-hidden rounded-2xl border border-fateh-accent/20 bg-fateh-ink p-7 text-fateh-paper shadow-xl md:p-9 lg:col-span-6"
        >
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">Scholarships</p>
            <h2 className="mt-2 font-fateh-serif text-2xl font-semibold normal-case md:text-3xl">India · university · bilateral</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/50 normal-case">
              Full detail page with eligibility bullets, award bands, and how to apply — filter by likely eligible, India schemes, or
              university awards.
            </p>
          </div>
          <Link
            to="/for-you/scholarships"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-fateh-gold px-6 py-3 text-center text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-fateh-ink transition hover:bg-fateh-gold-light"
          >
            Open scholarship catalogue
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </motion.section>

        {/* Outcome stories */}
        <motion.section
          variants={item}
          className="rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-lg md:p-9 lg:col-span-12"
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Outcomes</p>
              <h2 className="mt-2 font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">Stories near your pick</h2>
              <p className="mt-2 text-sm text-fateh-muted normal-case">
                Filtered by the course selected for financial clarity: <span className="font-medium text-fateh-ink">{selected.title}</span>
              </p>
            </div>
          </div>

          {storiesForCourse.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {storiesForCourse.map((s) => (
                <article
                  key={s.id}
                  className="rounded-xl border border-fateh-border/80 bg-fateh-paper/90 p-6 shadow-sm transition hover:border-fateh-gold/35 hover:shadow-md"
                >
                  <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold">{s.year} · {s.region}</p>
                  <h3 className="mt-3 font-fateh-serif text-lg font-semibold text-fateh-ink normal-case">{s.headline}</h3>
                  <p className="mt-2 text-xs text-fateh-muted normal-case">{s.name}</p>
                  <p className="mt-4 text-sm leading-relaxed text-fateh-muted normal-case">{s.blurb}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-fateh-border bg-fateh-paper/60 px-6 py-14 text-center">
              <Target className="mx-auto h-10 w-10 text-fateh-gold/50" strokeWidth={1.25} />
              <p className="mt-4 text-sm font-semibold text-fateh-ink normal-case">No curated stories for this course yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-fateh-muted leading-relaxed normal-case">
                We tag anonymised outcomes by programme. Ask your counsellor for peer examples, or select another recommended course to see matching stories.
              </p>
            </div>
          )}

          {fx.error && storiesForCourse.length > 0 ? (
            <p className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 normal-case">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              Live currency failed to load — financial figures may be stale; outcome stories above are still valid.
            </p>
          ) : null}
        </motion.section>

        {/* Map */}
        <motion.section
          variants={item}
          className="overflow-hidden rounded-2xl border border-fateh-border/80 bg-fateh-ink text-fateh-paper shadow-xl lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-7 py-6 md:px-9">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">Geography</p>
              <h2 className="mt-2 font-fateh-serif text-2xl font-semibold normal-case">Where you&apos;re aiming</h2>
            </div>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-[0.65rem] uppercase tracking-wider text-white/60">
              Interactive · v1
            </span>
          </div>
          <div className="relative aspect-16/10 min-h-[240px] overflow-hidden bg-[linear-gradient(165deg,#1a2336_0%,#0b0e1a_40%,#152238_100%)]">
            <div
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage: `linear-gradient(rgba(200,164,90,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,90,0.5) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
            <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
              <defs>
                <linearGradient id="mapLine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#c8a45a" stopOpacity="0" />
                  <stop offset="50%" stopColor="#c8a45a" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#c8a45a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d="M 62 32 Q 48 48 38 58"
                fill="none"
                stroke="url(#mapLine)"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
              <motion.path
                d="M 58 58 L 28 48"
                fill="none"
                stroke="url(#mapLine)"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
              />
            </svg>
            {SHORTLIST.map((u) => (
              <div
                key={u.name}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${u.lng}%`, top: `${u.lat}%` }}
              >
                <motion.span
                  className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-fateh-gold bg-fateh-ink shadow-[0_0_24px_rgba(200,164,90,0.75)]"
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-fateh-gold" />
                </motion.span>
                <span className="mt-2 whitespace-nowrap rounded-md bg-fateh-ink/95 px-2.5 py-1 text-[0.65rem] font-semibold text-fateh-gold-light ring-1 ring-fateh-gold/35 backdrop-blur-sm">
                  {u.name}
                </span>
              </div>
            ))}
          </div>
          <div className="grid gap-px bg-white/15 sm:grid-cols-3">
            {SHORTLIST.map((u) => (
              <div key={u.name} className="bg-fateh-ink/95 px-5 py-5 transition hover:bg-white/4">
                <p className="font-fateh-serif text-lg font-semibold text-white normal-case">{u.name}</p>
                <p className="mt-1 text-xs text-white/45 normal-case">
                  {u.city}, {u.country}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Programme detail — synced to selection */}
        <motion.section
          id="programme-focus"
          variants={item}
          className="rounded-2xl border border-fateh-gold/25 bg-linear-to-br from-white via-fateh-paper to-fateh-gold-pale/40 p-7 shadow-lg md:p-9 lg:col-span-5"
        >
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Selection</p>
          <h2 className="mt-2 font-fateh-serif text-2xl font-semibold text-fateh-ink md:text-3xl normal-case">
            Course &amp; university focus
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-1">
            {[
              {
                k: "Course",
                t: selected.title,
                b: "Mirrors the card and cost engine — your counsellor aligns narrative and electives with this pick.",
              },
              {
                k: "University",
                t: selected.school,
                b: `${selected.country} · ${selected.intake}. Check official registry pages for the latest module list and entry requirements.`,
              },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-xl border border-fateh-border/60 bg-white/85 p-6 shadow-sm backdrop-blur-sm transition hover:border-fateh-gold/35 hover:shadow-md"
              >
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-muted">{x.k}</p>
                <p className="mt-3 font-fateh-serif text-xl font-semibold text-fateh-ink normal-case">{x.t}</p>
                <p className="mt-3 text-sm leading-relaxed text-fateh-muted normal-case">{x.b}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Resume */}
        <motion.section
          id="resume-section"
          variants={item}
          className="overflow-hidden rounded-2xl border border-fateh-gold/20 bg-fateh-ink p-7 text-fateh-paper shadow-2xl md:p-9 lg:col-span-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fateh-gold/35 bg-fateh-gold/10">
                <FileText className="h-6 w-6 text-fateh-gold-light" strokeWidth={1.35} />
              </div>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">Resume</p>
                <h2 className="font-fateh-serif text-2xl font-semibold normal-case md:text-3xl">Enrich your profile</h2>
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/50 normal-case">
            Upload a PDF or Word file — we&apos;ll extract skills, education, and interests to refine matches (wire your parser API
            here).
          </p>

          {resumeError ? (
            <div className="mt-6 flex gap-3 rounded-xl border border-red-400/40 bg-red-950/40 px-4 py-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-300" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-red-100 normal-case">Upload not accepted</p>
                <p className="mt-1 text-xs text-red-200/90 normal-case">{resumeError}</p>
                <button
                  type="button"
                  onClick={() => setResumeError(null)}
                  className="mt-3 text-xs font-semibold uppercase tracking-wider text-fateh-gold-light underline-offset-4 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

          <label
            className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 transition ${
              dragOver
                ? "border-fateh-gold bg-fateh-gold/10 shadow-[0_0_40px_-10px_rgba(200,164,90,0.5)]"
                : "border-white/20 bg-white/3 hover:border-fateh-gold/50 hover:bg-fateh-gold/5"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) simulateParse(f);
            }}
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-fateh-gold/15 text-fateh-gold-light ring-2 ring-fateh-gold/20"
            >
              <Upload className="h-7 w-7" strokeWidth={1.35} />
            </motion.div>
            <span className="mt-5 text-sm font-semibold text-white normal-case">Drop your CV here or browse</span>
            <span className="mt-1 text-xs text-white/40">PDF, DOC, DOCX · max 10MB (client demo)</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="sr-only"
              onChange={(e) => simulateParse(e.target.files?.[0])}
            />
          </label>

          {resumeFile && !resumeError ? (
            <p className="mt-5 text-sm text-fateh-gold-light normal-case">
              Processing <span className="font-semibold text-white">{resumeFile}</span>…
            </p>
          ) : !resumeFile && !resumeError ? (
            <p className="mt-5 text-xs text-white/35 normal-case">No résumé on file — upload to unlock skill tags (demo).</p>
          ) : null}

          {parsedSkills ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-xl border border-fateh-gold/25 bg-fateh-gold/[0.07] p-6"
            >
              <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold-light">Detected highlights</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {parsedSkills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-white/15 bg-fateh-ink px-3.5 py-1.5 text-xs font-medium text-white/90"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : resumeFile && !parsedSkills && !resumeError ? (
            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/50 normal-case">
              Parsing your file… if this hangs, re-upload or try another format.
            </div>
          ) : null}
        </motion.section>

      </motion.div>

      {/* Saved scenarios — revealed only after bottom sentinel fires + user clicks */}
      <div ref={scenariosRef} className="mx-auto max-w-7xl px-6 md:px-10">
        {scenariosOpen ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
            <section className="rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-lg md:p-9">
              <div className="flex items-center gap-3">
                <Layers className="h-8 w-8 text-fateh-gold" strokeWidth={1.25} />
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Saved scenarios</p>
                  <h2 className="font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">Plans on file</h2>
                </div>
              </div>
              <ul className="mt-8 space-y-4">
                {SAVED_SCENARIOS.map((sc) => (
                  <li key={sc.id} className="rounded-xl border border-fateh-border/70 bg-fateh-paper/90 p-5">
                    <p className="font-fateh-serif text-lg font-semibold text-fateh-ink normal-case">{sc.name}</p>
                    <p className="mt-2 text-sm text-fateh-muted normal-case">{sc.summary}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wider text-fateh-gold">{sc.focus}</p>
                  </li>
                ))}
              </ul>
            </section>
          </motion.div>
        ) : null}
      </div>

      {/* Bottom sentinel + reveal control */}
      <div ref={bottomSentinelRef} className="mx-auto h-px w-full max-w-7xl" aria-hidden />

      {bottomReached && !scenariosOpen ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 justify-center px-4">
          <button
            type="button"
            onClick={() => setScenariosOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-fateh-gold/40 bg-fateh-ink px-6 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-fateh-gold-light shadow-[0_20px_50px_-12px_rgba(11,14,26,0.5)] transition hover:bg-fateh-accent"
          >
            <Layers className="h-4 w-4" strokeWidth={1.5} />
            Reveal saved scenarios
          </button>
        </div>
      ) : null}

      {scenariosOpen ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 justify-center px-4">
          <button
            type="button"
            onClick={() => setScenariosOpen(false)}
            className="rounded-full border border-white/20 bg-fateh-ink/90 px-5 py-2.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm transition hover:text-white"
          >
            Hide scenarios
          </button>
        </div>
      ) : null}
    </div>
  );
}
