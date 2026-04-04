import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  GraduationCap,
  MapPin,
  Calculator,
  FileText,
  ChevronRight,
  BookOpen,
  Coins,
  ArrowUpRight,
  Upload,
  Compass,
  Target,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const RECOMMENDED = [
  {
    title: "MSc Financial Economics",
    school: "University College Dublin",
    match: 96,
    intake: "September 2026",
    tag: "Strong finance profile",
    accent: "from-fateh-gold/90 to-amber-600/50",
  },
  {
    title: "MSc Business Analytics",
    school: "Trinity College Dublin",
    match: 92,
    intake: "September 2026",
    tag: "STEM pathway",
    accent: "from-fateh-accent/80 to-fateh-gold/40",
  },
  {
    title: "MSc Management",
    school: "University of Bath",
    match: 89,
    intake: "October 2026",
    tag: "UK Russell Group",
    accent: "from-fateh-gold/70 to-fateh-accent/50",
  },
];

const SHORTLIST = [
  { name: "UCD", city: "Dublin", country: "Ireland", lat: 32, lng: 62 },
  { name: "TCD", city: "Dublin", country: "Ireland", lat: 38, lng: 58 },
  { name: "Manchester", city: "Manchester", country: "UK", lat: 48, lng: 28 },
];

const QUICK_ACTIONS = [
  { label: "Refine goals", Icon: Target, sub: "Update focus" },
  { label: "Compare fees", Icon: Calculator, sub: "Side by side" },
  { label: "Explore unis", Icon: Compass, sub: "From site" },
  { label: "Boost profile", Icon: Zap, sub: "CV & skills" },
];

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

export default function ForYouPage() {
  const { user } = useAuth();
  const first = user?.name?.split(" ")[0] || "there";

  const [tuition, setTuition] = useState(24000);
  const [living, setLiving] = useState(14000);
  const [scholarshipPct, setScholarshipPct] = useState(15);
  const [resumeFile, setResumeFile] = useState(null);
  const [parsedSkills, setParsedSkills] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const totals = useMemo(() => {
    const sub = tuition + living;
    const off = Math.round((tuition * scholarshipPct) / 100);
    return { sub, off, grand: sub - off };
  }, [tuition, living, scholarshipPct]);

  const scholarshipDeg = scholarshipPct * 3.6;

  const simulateParse = (file) => {
    setResumeFile(file?.name || null);
    setParsedSkills(null);
    if (!file) return;
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-fateh-paper pb-24 pt-24 md:pt-28">
      {/* Ambient */}
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
                Everything tailored to your profile — courses, campuses, costs, and skills — in one immersive space.
                Tap any card to explore; your counsellor sees the same picture.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                {[
                  { k: "Matches", v: "12" },
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
                <span className="font-semibold text-fateh-gold">Next step:</span> complete your free counselling &
                intro call — we&apos;ll sync this hub with Twilio notes and refine every tile below automatically.
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm text-emerald-200/95 normal-case">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Intro call logged — recommendations and budget weights are live for your profile.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {QUICK_ACTIONS.map(({ label, Icon, sub }, i) => (
            <motion.button
              key={label}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              className="group flex flex-col items-start rounded-xl border border-fateh-border/90 bg-white/90 p-4 text-left shadow-sm backdrop-blur-sm transition hover:border-fateh-gold/40 hover:shadow-md md:p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fateh-gold/12 text-fateh-gold transition group-hover:bg-fateh-gold group-hover:text-fateh-ink">
                <Icon className="h-5 w-5" strokeWidth={1.35} />
              </div>
              <span className="mt-3 text-sm font-semibold text-fateh-ink normal-case">{label}</span>
              <span className="text-xs text-fateh-muted normal-case">{sub}</span>
            </motion.button>
          ))}
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
              Live ranking
            </span>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-3 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {RECOMMENDED.map((c, idx) => (
              <motion.button
                key={c.title}
                type="button"
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="group relative min-w-[260px] shrink-0 overflow-hidden rounded-xl border border-fateh-border/70 bg-fateh-paper/90 text-left shadow-sm transition hover:border-fateh-gold/45 hover:shadow-xl md:min-w-0"
              >
                <div className={`h-1.5 w-full bg-linear-to-r ${c.accent}`} />
                <div className="p-6">
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
                </div>
              </motion.button>
            ))}
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
              { Icon: Coins, t: "Scholarships", d: "Gov. of Ireland · merit pathways" },
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

        {/* Budget */}
        <motion.section
          variants={item}
          className="rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-[0_24px_70px_-30px_rgba(11,14,26,0.18)] backdrop-blur-sm md:p-9 lg:col-span-5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fateh-gold/30 bg-fateh-gold/10">
              <Calculator className="h-6 w-6 text-fateh-gold" strokeWidth={1.35} />
            </div>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Budget lab</p>
              <h2 className="mt-1 font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">Year-one estimate</h2>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div
              className="relative h-32 w-32 shrink-0 rounded-full p-1"
              style={{
                background: `conic-gradient(from -90deg, rgba(200,164,90,0.95) 0deg ${scholarshipDeg}deg, rgba(224,217,206,0.35) ${scholarshipDeg}deg 360deg)`,
              }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-fateh-paper">
                <p className="text-[0.6rem] font-bold uppercase tracking-wider text-fateh-muted">Aid</p>
                <p className="font-fateh-serif text-2xl font-semibold text-fateh-ink">{scholarshipPct}%</p>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-5 normal-case">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-fateh-muted">Tuition</span>
                <input
                  type="range"
                  min="15000"
                  max="45000"
                  step="500"
                  value={tuition}
                  onChange={(e) => setTuition(Number(e.target.value))}
                  className="mt-2 w-full accent-fateh-gold"
                />
                <span className="text-sm font-medium text-fateh-ink">€{tuition.toLocaleString()}</span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-fateh-muted">Living &amp; misc</span>
                <input
                  type="range"
                  min="8000"
                  max="24000"
                  step="500"
                  value={living}
                  onChange={(e) => setLiving(Number(e.target.value))}
                  className="mt-2 w-full accent-fateh-gold"
                />
                <span className="text-sm font-medium text-fateh-ink">€{living.toLocaleString()}</span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-fateh-muted">Scholarship on tuition</span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={scholarshipPct}
                  onChange={(e) => setScholarshipPct(Number(e.target.value))}
                  className="mt-2 w-full accent-fateh-gold"
                />
              </label>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-fateh-border/90 bg-linear-to-br from-fateh-paper to-fateh-gold-pale/25 p-5">
            <div className="flex justify-between text-sm text-fateh-muted">
              <span>Subtotal</span>
              <span className="font-medium text-fateh-ink">€{totals.sub.toLocaleString()}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-fateh-gold">
              <span>Scholarship offset</span>
              <span className="font-semibold">−€{totals.off.toLocaleString()}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-fateh-border/80 pt-4 font-fateh-serif text-xl font-semibold text-fateh-ink">
              <span>Indicative total</span>
              <span>€{totals.grand.toLocaleString()}</span>
            </div>
            <p className="mt-3 text-[0.7rem] leading-relaxed text-fateh-muted">
              Illustrative — your counsellor confirms against official fees and award letters.
            </p>
          </div>
        </motion.section>

        {/* Programme */}
        <motion.section
          variants={item}
          className="rounded-2xl border border-fateh-gold/25 bg-linear-to-br from-white via-fateh-paper to-fateh-gold-pale/40 p-7 shadow-lg md:p-9 lg:col-span-6"
        >
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">Selection</p>
          <h2 className="mt-2 font-fateh-serif text-2xl font-semibold text-fateh-ink md:text-3xl normal-case">
            Course &amp; university focus
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                k: "Course",
                t: "MSc Business Analytics",
                b: "Quant & ML for business, industry capstone — aligned with fintech and data-led roles you mentioned.",
              },
              {
                k: "University",
                t: "Trinity College Dublin",
                b: "Triple-accredited school, strong EU & UK graduate outcomes, diverse international cohort.",
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
            Upload a PDF or Word file — we&apos;ll extract skills, education, and interests to refine matches (wire
            your parser API here).
          </p>

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
              if (f && /\.(pdf|doc|docx)$/i.test(f.name)) simulateParse(f);
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

          {resumeFile ? (
            <p className="mt-5 text-sm text-fateh-gold-light normal-case">
              Processing <span className="font-semibold text-white">{resumeFile}</span>…
            </p>
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
          ) : null}
        </motion.section>
      </motion.div>
    </div>
  );
}
