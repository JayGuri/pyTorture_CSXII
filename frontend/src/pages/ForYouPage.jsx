import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Search,
  Trash2,
  GraduationCap,
  Calendar,
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
  Edit3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useForYouDashboard } from "../hooks/useForYouDashboard";
import AskFatehSidebar from "../components/forYou/AskFatehSidebar";
import UniversityMap from "../components/forYou/UniversityMap";
import StaggeredMenu from "../components/StaggeredMenu/StaggeredMenu";
import {
  PROGRAMS,
  allProgramDeadlines,
  SAVED_SCENARIOS,
  INR_BUFFER,
} from "../data/forYouPrograms";
import { FOR_YOU_MENU_ITEMS } from "../data/forYouNavItems";
import { fetchEurGbpInrSpot } from "../lib/exchangeRates";
import { googleCalendarUrl } from "../lib/googleCalendar";
import {
  getTopUniversities,
  getScholarshipsForIndians,
  getCitiesByCountry,
  buildForYouDashboard,
} from "../lib/knowledgeBase";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function ForYouPage() {
  const { user } = useAuth();
  const location = useLocation();
  const first = user?.name?.split(" ")[0] || "there";

  // Fetch dashboard from backend
  const {
    dashboard,
    leadProfile,
    recommendations,
    insights,
    loading: dashboardLoading,
    error: dashboardError,
    refresh,
    updateCompleteness,
  } = useForYouDashboard(user?.sessionId, user?.email, !!user);

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
  const [spot, setSpot] = useState({
    loading: false,
    error: null,
    eurInr: null,
    gbpInr: null,
    date: null,
    source: null,
  });
  const [bottomReached, setBottomReached] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const bottomSentinelRef = useRef(null);
  const scenariosRef = useRef(null);

  const displayPrograms = useMemo(() => {
    if (!recommendations?.universities?.length) return PROGRAMS;

    return recommendations.universities
      .map((uni, idx) => {
        // Find matching mock program for visual styling (accent, etc.)
        const mock = PROGRAMS[idx % PROGRAMS.length];
        const topCourse = uni.courses?.[0] || {};

        return {
          ...mock, // Inherit dummy fields
          id: uni.id,
          title: uni.courseTitle || topCourse.name || "Master's Programme",
          school: uni.full_name || uni.short_name,
          city: uni.city,
          country: uni.country,
          currency:
            uni.currency ||
            (uni.country?.toLowerCase() === "uk" ? "GBP" : "EUR"),
          match: 100 - (uni.qs_rank_2026 / 10 || idx * 3 + 2),
          intake: topCourse.intake || "September 2026",
          tag: uni.subject_strengths?.[0] || "High employability",
          tuitionYear: uni.tuitionYear || topCourse.fee_gbp || 25000,
          livingYear: uni.livingYear || 12000,
          otherFeesYear: uni.otherFeesYear || 1500,
          mapLat: uni.latitude,
          mapLng: uni.longitude,
        };
      })
      .slice(0, 6);
  }, [recommendations?.universities]);

  const selected = useMemo(
    () =>
      displayPrograms.find((p) => p.id === selectedId) || displayPrograms[0],
    [displayPrograms, selectedId],
  );
  const deadlines = useMemo(() => allProgramDeadlines(), []);

  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const classification =
    leadProfile?.assessment_classification ||
    leadProfile?.classification ||
    "Tier_3";

  // Map of UK/Ireland University coordinates
  const UNIVERSITY_COORDINATES = {
    ucl: { lat: 51.5246, lng: -0.134 },
    university_college_london: { lat: 51.5246, lng: -0.134 },
    imperial_college_london: { lat: 51.4988, lng: -0.1749 },
    lse: { lat: 51.5144, lng: -0.1166 },
    london_school_of_economics_and_political_science: { lat: 51.5144, lng: -0.1166 },
    kings_college_london: { lat: 51.5115, lng: -0.116 },
    kcl: { lat: 51.5115, lng: -0.116 },
    university_of_edinburgh: { lat: 55.9442, lng: -3.1883 },
    university_of_manchester: { lat: 53.4668, lng: -2.2339 },
    university_of_warwick: { lat: 52.3793, lng: -1.5615 },
    university_of_bristol: { lat: 51.4584, lng: -2.603 },
    university_of_birmingham: { lat: 52.4508, lng: -1.9305 },
    university_of_glasgow: { lat: 55.8721, lng: -4.2882 },
    university_of_southampton: { lat: 50.9346, lng: -1.396 },
    university_of_leeds: { lat: 53.8067, lng: -1.555 },
    university_of_sheffield: { lat: 53.3814, lng: -1.4883 },
    university_of_nottingham: { lat: 52.9365, lng: -1.1926 },
    trinity_college_dublin: { lat: 53.3441, lng: -6.2544 },
    university_college_dublin: { lat: 53.3083, lng: -6.2241 },
    university_of_galway: { lat: 53.2792, lng: -9.0601 },
    university_college_cork: { lat: 51.8921, lng: -8.4933 },
    university_of_limerick: { lat: 52.6739, lng: -8.5721 },
    dublin_city_university: { lat: 53.3851, lng: -6.257 },
    university_of_leicester: { lat: 52.6215, lng: -1.1242 },
    queens_university_belfast: { lat: 54.5847, lng: -5.9351 },
    university_of_reading: { lat: 51.442, lng: -0.942 },
    university_of_aberdeen: { lat: 57.1648, lng: -2.1005 },
    university_of_surrey: { lat: 51.2435, lng: -0.5898 },
    university_of_strathclyde: { lat: 55.8622, lng: -4.2444 },
    university_of_dundee: { lat: 56.4582, lng: -2.9818 },
    university_of_st_andrews: { lat: 56.3392, lng: -2.7937 },
    university_of_essex: { lat: 51.8776, lng: 0.9442 },
    university_of_heriot_watt: { lat: 55.9103, lng: -3.3213 },
    university_of_ulster: { lat: 55.1501, lng: -6.6713 },
    university_of_northumbria: { lat: 54.9781, lng: -1.6063 },
    maynooth_university: { lat: 53.3846, lng: -6.5991 },
    royal_college_of_surgeons_in_ireland: { lat: 53.339, lng: -6.2625 },
    tudublin: { lat: 53.3541, lng: -6.2785 },
    technological_university_dublin: { lat: 53.3541, lng: -6.2785 },
  };

  const mapMarkers = useMemo(() => {
    return displayPrograms.map((prog) => {
      const uniId =
        prog.school?.toLowerCase().replace(/\s+/g, "_") ||
        prog.id?.toLowerCase().replace(/\s+/g, "_") ||
        "default";

      const coords = UNIVERSITY_COORDINATES[uniId] ||
        UNIVERSITY_COORDINATES[prog.id?.toLowerCase()] || {
          lat: prog.mapLat || prog.latitude || 53.3498,
          lng: prog.mapLng || prog.longitude || -6.2603,
        };

      return {
        id: prog.id,
        name: prog.school || prog.university,
        lat: coords.lat,
        lng: coords.lng,
        title: prog.school,
        sub: `${prog.city || prog.location} · ${prog.title}`,
      };
    });
  }, [displayPrograms]);

  const inrPerUnit = useMemo(() => {
    if (!selected?.currency) return null;
    if (selected.currency === "EUR") return spot.eurInr;
    if (selected.currency === "GBP") return spot.gbpInr;
    return null;
  }, [selected.currency, spot.eurInr, spot.gbpInr]);

  const spotAbortRef = useRef(null);

  const fetchSpotRates = useCallback(() => {
    spotAbortRef.current?.abort();
    const ac = new AbortController();
    spotAbortRef.current = ac;
    setSpot((s) => ({ ...s, loading: true, error: null }));
    fetchEurGbpInrSpot(ac.signal)
      .then((r) => {
        setSpot({
          loading: false,
          error: null,
          eurInr: r.eurInr,
          gbpInr: r.gbpInr,
          date: r.date,
          source: r.source,
        });
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        const errorMsg = e?.message || "Could not load exchange rates.";
        console.error("[ForYouPage] FX fetch error:", errorMsg, e);
        setSpot({
          loading: false,
          error: errorMsg,
          eurInr: null,
          gbpInr: null,
          date: null,
          source: null,
        });
      });
  }, []);

  useEffect(() => {
    fetchSpotRates();
    return () => spotAbortRef.current?.abort();
  }, [fetchSpotRates]);

  useEffect(() => {
    const hash = location.hash?.replace(/^#/, "");
    if (!hash) return undefined;
    const t = window.setTimeout(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, [location.hash, location.pathname]);

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
    if (
      !selected ||
      typeof inrPerUnit !== "number" ||
      !Number.isFinite(inrPerUnit)
    )
      return null;
    const subtotalForeign =
      selected.tuitionYear + selected.livingYear + selected.otherFeesYear;
    const subtotalInr = subtotalForeign * inrPerUnit;
    const low = Math.max(0, subtotalInr - INR_BUFFER);
    const high = subtotalInr + INR_BUFFER;
    return {
      subtotalForeign,
      subtotalInr,
      low,
      high,
      tuitionInr: selected.tuitionYear * inrPerUnit,
      livingInr: selected.livingYear * inrPerUnit,
      otherInr: selected.otherFeesYear * inrPerUnit,
    };
  }, [selected, inrPerUnit]);

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
      setResumeError(
        "Please upload a PDF, DOC, or DOCX file (max 10MB for this demo).",
      );
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
    () =>
      compareIds
        .map((id) => displayPrograms.find((p) => p.id === id))
        .filter(Boolean),
    [compareIds, displayPrograms],
  );

  const scrollToId = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!scenariosOpen) return undefined;
    const id = window.setTimeout(() => {
      scenariosRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
    return () => clearTimeout(id);
  }, [scenariosOpen]);

  // Show loading state while fetching dashboard
  if (dashboardLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-fateh-paper pb-32 pt-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-fateh-gold/30 border-t-fateh-gold" />
          <p className="mt-4 text-fateh-gold">
            Loading your personalized dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if dashboard fetch failed
  if (dashboardError) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-fateh-paper pb-32 pt-8 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle
            className="h-12 w-12 mx-auto text-red-400 mb-4"
            strokeWidth={1.5}
          />
          <p className="text-lg font-semibold text-white mb-2">
            Could not load dashboard
          </p>
          <p className="text-sm text-fateh-muted mb-6">{dashboardError}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-fateh-gold px-6 py-3 text-sm font-semibold uppercase text-fateh-ink hover:bg-fateh-gold-light transition"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-fateh-paper pb-32 pt-8">
      <StaggeredMenu
        isFixed
        position="left"
        items={FOR_YOU_MENU_ITEMS}
        displaySocials={false}
        displayItemNumbering
        changeMenuColorOnOpen={false}
        colors={["#0b0e1a", "#1a3560", "#c8a45a"]}
        accentColor="#c8a45a"
        menuButtonColor="#0b0e1a"
      />
      <AskFatehSidebar open={askOpen} onClose={() => setAskOpen(false)} />

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
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
        aria-hidden
      />

      {/* Hero */}
      <header
        id="fy-overview"
        className="relative scroll-mt-28 overflow-hidden border-b border-fateh-gold/15 bg-fateh-ink text-fateh-paper lg:scroll-mt-24"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_0%,rgba(200,164,90,0.07)_45%,transparent_65%)]" />
        <div className="pointer-events-none absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-fateh-gold/12 blur-[100px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-fateh-accent/25 blur-[90px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-20">
          <div className="grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
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
                Courses, comparisons, deadlines, visa prep, scholarships, and
                live cost conversion — structured so you can act without
                guesswork.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                {[
                  {
                    k: "Matches",
                    v: String(
                      recommendations?.universities?.length || PROGRAMS.length,
                    ),
                  },
                  { k: "Shortlist", v: "3" },
                  {
                    k: "Profile",
                    v:
                      leadProfile?.data_completeness > 80 ? "Complete"
                      : leadProfile?.data_completeness > 40 ? "Building"
                      : "Starting",
                  },
                ].map((chip) => (
                  <div
                    key={chip.k}
                    className="rounded-lg border border-white/10 bg-white/6 px-5 py-3 backdrop-blur-md"
                  >
                    <p className="text-[0.6rem] uppercase tracking-[0.18em] text-fateh-gold/80">
                      {chip.k}
                    </p>
                    <p className="mt-1 font-fateh-serif text-2xl font-semibold text-white">
                      {chip.v}
                    </p>
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
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-fateh-gold-light">
                Snapshot
              </p>
              <p className="mt-4 font-fateh-serif text-xl font-semibold leading-snug text-white normal-case">
                Ireland &amp; UK · PG · 2026 intake
              </p>
              <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-white/45">Next milestone</span>
                  <span className="font-medium text-fateh-gold-light">
                    Counselling call
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-fateh-gold to-fateh-gold-light"
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${leadProfile?.data_completeness || (user?.preliminaryCallDone ? 72 : 38)}%`,
                    }}
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
            {!user?.preliminaryCallDone ?
              <p className="max-w-2xl text-sm leading-relaxed text-fateh-gold-light/95 normal-case">
                <span className="font-semibold text-fateh-gold">
                  Next step:
                </span>{" "}
                complete your free counselling &amp; intro call — we&apos;ll
                sync this hub with live notes and refine every tile below
                automatically.
              </p>
            : <p className="inline-flex items-center gap-2 text-sm text-emerald-200/95 normal-case">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Intro call logged — recommendations and reminders are aligned to
                your profile.
              </p>
            }
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
                to="/for-you/schedule"
                className="inline-flex items-center gap-2 rounded-lg bg-fateh-gold px-6 py-3 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-fateh-ink transition hover:bg-fateh-gold-light"
              >
                <CalendarPlus className="h-4 w-4" strokeWidth={2} />
                Schedule
              </Link>
            </div>
          </motion.div>
        </div>
      </header>


      {/* Quick actions */}
      <div
        id="fy-actions"
        className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-10 sm:px-6 md:scroll-mt-24 lg:max-w-6xl lg:px-8"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {[
            {
              label: "Ask Fateh",
              Icon: MessageCircle,
              sub: "AI chat",
              onClick: () => setAskOpen(true),
            },
            {
              label: "Compare",
              Icon: GitCompare,
              sub: "Up to 3 courses",
              onClick: () => scrollToId("fy-compare"),
            },
            {
              label: "Deadlines",
              Icon: CalendarPlus,
              sub: "Reminders",
              onClick: () => scrollToId("fy-deadlines"),
            },
            {
              label: "Scholarships",
              Icon: Landmark,
              sub: "Full catalogue",
              href: "/for-you/scholarships",
            },
            {
              label: "Schedule",
              Icon: Calendar,
              sub: "Consultations",
              href: "/for-you/schedule",
            },
            {
              label: "Explore site",
              Icon: Compass,
              sub: "Programmes",
              href: "/",
            },
            {
              label: "Boost profile",
              Icon: Zap,
              sub: "CV upload",
              onClick: () => scrollToId("fy-profile"),
            },
          ].map(({ label, Icon, sub, onClick, href }, i) => {
            const inner = (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fateh-gold/12 text-fateh-gold transition group-hover:bg-fateh-gold group-hover:text-fateh-ink">
                  <Icon className="h-5 w-5" strokeWidth={1.35} />
                </div>
                <span className="mt-3 text-sm font-semibold text-fateh-ink normal-case">
                  {label}
                </span>
                <span className="text-xs text-fateh-muted normal-case">
                  {sub}
                </span>
              </>
            );
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                {href ?
                  <Link
                    to={href}
                    className="group flex h-full flex-col items-start rounded-xl border border-fateh-border/90 bg-white/90 p-4 text-left shadow-sm backdrop-blur-sm transition hover:border-fateh-gold/40 hover:shadow-md md:p-5"
                  >
                    {inner}
                  </Link>
                : <button
                    type="button"
                    onClick={onClick}
                    className="group flex h-full w-full flex-col items-start rounded-xl border border-fateh-border/90 bg-white/90 p-4 text-left shadow-sm backdrop-blur-sm transition hover:border-fateh-gold/40 hover:shadow-md md:p-5"
                  >
                    {inner}
                  </button>
                }
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-10 sm:px-6 md:gap-12 md:py-14 lg:px-8"
      >
        {/* Courses + focus */}
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <motion.section
            id="fy-courses"
            variants={item}
            className="scroll-mt-28 rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-[0_20px_60px_-28px_rgba(11,14,26,0.18)] backdrop-blur-sm md:p-9 lg:col-span-8 lg:scroll-mt-24"
          >
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">
                  Recommended
                </p>
                <h2 className="mt-2 font-fateh-serif text-2xl font-semibold text-fateh-ink md:text-3xl normal-case">
                  Courses matched to you
                </h2>
              </div>
              <span className="rounded-full bg-fateh-gold-pale/80 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-fateh-ink/70">
                Select · compare · cost
              </span>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-3 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
              {displayPrograms.map((c, idx) => {
                const inCompare = compareIds.includes(c.id);
                const isSelected = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    className={`group relative min-w-[260px] shrink-0 overflow-hidden rounded-xl border bg-fateh-paper/90 text-left shadow-sm transition md:min-w-0 ${
                      isSelected ?
                        "border-fateh-gold ring-2 ring-fateh-gold/30"
                      : "border-fateh-border/70 hover:border-fateh-gold/45 hover:shadow-xl"
                    }`}
                  >
                    <div
                      className={`h-1.5 w-full bg-linear-to-r ${c.accent}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        setActiveMarkerId(c.id);
                      }}
                      className="w-full p-6 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <BookOpen
                          className="h-5 w-5 text-fateh-gold"
                          strokeWidth={1.35}
                        />
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
                          transition={{
                            duration: 0.9,
                            delay: 0.15 + idx * 0.1,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />
                      </div>
                      <h3 className="mt-5 font-fateh-serif text-lg font-semibold leading-snug text-fateh-ink normal-case transition group-hover:text-fateh-accent md:text-xl">
                        {c.title}
                      </h3>
                      <p className="mt-1 text-sm text-fateh-muted normal-case">
                        {c.school}
                      </p>
                      <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-fateh-gold">
                        {c.intake}
                      </p>
                      <p className="mt-2 text-xs text-fateh-muted normal-case">
                        {c.tag}
                      </p>
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
                          inCompare ?
                            "bg-fateh-ink text-fateh-gold-light"
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
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-fateh-ink/10 bg-fateh-ink p-7 text-fateh-paper shadow-[0_32px_80px_-28px_rgba(11,14,26,0.45)] md:p-8 lg:col-span-4 lg:sticky lg:top-28 lg:self-start"
          >
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">
                Focus
              </p>
              <h2 className="mt-3 font-fateh-serif text-2xl font-semibold normal-case">
                Your shortlist DNA
              </h2>
            </div>
            <ul className="mt-8 space-y-0">
              {[
                {
                  Icon: GraduationCap,
                  t: "Primary track",
                  d: "Postgraduate · Business & analytics",
                },
                { Icon: MapPin, t: "Regions", d: "Ireland · United Kingdom" },
                {
                  Icon: Coins,
                  t: "Scholarships",
                  d: "India schemes · university merit",
                },
              ].map((row, i) => (
                <li
                  key={row.t}
                  className={`flex gap-4 py-5 ${i < 2 ? "border-b border-white/10" : ""}`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fateh-gold/15 text-fateh-gold-light ring-1 ring-fateh-gold/25">
                    <row.Icon className="h-5 w-5" strokeWidth={1.35} />
                  </div>
                  <div>
                    <p className="font-semibold text-white normal-case">
                      {row.t}
                    </p>
                    <p className="mt-1 text-sm text-white/50 normal-case">
                      {row.d}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>

        {/* Comparison */}
        <motion.section
          id="fy-compare"
          variants={item}
          className="scroll-mt-28 rounded-2xl border border-fateh-accent/20 bg-linear-to-br from-fateh-ink via-[#12182a] to-fateh-ink p-7 text-fateh-paper shadow-xl md:p-9 lg:scroll-mt-24"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">
                Comparison
              </p>
              <h2 className="mt-2 font-fateh-serif text-2xl font-semibold normal-case md:text-3xl">
                Universities side-by-side
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/50 normal-case">
                Add up to three courses. Costs are indicative; lifestyle rows
                use reference city climate and great-circle distance from Delhi
                (planning aid only).
              </p>
            </div>
            {compareIds.length > 0 ?
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-xs font-semibold uppercase tracking-wider text-fateh-gold-light underline-offset-4 hover:underline"
              >
                Clear all
              </button>
            : null}
          </div>

          {comparePrograms.length >= 2 ?
            <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="w-44 p-4 font-semibold text-fateh-gold-light normal-case">
                      Factor
                    </th>
                    {comparePrograms.map((p, idx) => (
                      <th
                        key={p.id}
                        className="min-w-[260px] p-6 text-left normal-case bg-fateh-ink/40 first:rounded-tl-2xl last:rounded-tr-2xl border-x border-white/10"
                      >
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <BookOpen
                            className="h-5 w-5 text-fateh-gold"
                            strokeWidth={1.35}
                          />
                          <span className="flex items-center gap-1 rounded-full bg-fateh-gold/15 px-2.5 py-1 text-[0.65rem] font-bold text-fateh-gold-light border border-fateh-gold/25">
                            {p.match}% Match
                          </span>
                        </div>
                        <div className="h-1.25 w-full overflow-hidden rounded-full bg-white/10 mb-5 text-[0]">
                          <motion.div
                            className="h-full rounded-full bg-linear-to-r from-fateh-gold to-fateh-gold-light"
                            initial={{ width: 0 }}
                            animate={{ width: `${p.match}%` }}
                            transition={{
                              duration: 1,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          />
                        </div>
                        <h3 className="font-fateh-serif text-lg font-semibold text-white leading-snug">
                          {p.title}
                        </h3>
                        <p className="mt-1 text-xs text-white/45 font-medium mb-5">
                          {p.school}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleCompare(p.id)}
                          className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-[0.65rem] font-bold uppercase tracking-widest bg-white/10 text-white/80 hover:bg-white/20 transition group"
                        >
                          <Trash2 className="h-3 w-3 text-white/40 group-hover:text-red-400" />
                          Remove
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {[
                    { k: "University", fn: (p) => p.school },
                    { k: "City", fn: (p) => p.city },
                    { k: "Country", fn: (p) => p.country },
                    { k: "Intake", fn: (p) => p.intake },
                    {
                      k: "Weather & climate",
                      fn: (p) => p.weatherSummary,
                    },
                    {
                      k: "Distance from Delhi (approx.)",
                      fn: (p) =>
                        `${p.distanceFromDelhiKm.toLocaleString("en-IN")} km (great circle)`,
                    },
                    { k: "Typical flight time", fn: (p) => p.typicalFlightHrs },
                    { k: "Living cost (tier)", fn: (p) => p.livingCostTier },
                    {
                      k: "Post-study work (summary)",
                      fn: (p) => p.postStudyWorkSummary,
                    },
                    { k: "Currency", fn: (p) => p.currency },
                    {
                      k: "Tuition (yr)",
                      fn: (p) =>
                        `${p.currency === "EUR" ? "€" : "£"}${p.tuitionYear.toLocaleString()}`,
                    },
                    {
                      k: "Living (est.)",
                      fn: (p) =>
                        `${p.currency === "EUR" ? "€" : "£"}${p.livingYear.toLocaleString()}`,
                    },
                    {
                      k: "Other fees",
                      fn: (p) =>
                        `${p.currency === "EUR" ? "€" : "£"}${p.otherFeesYear.toLocaleString()}`,
                    },
                    {
                      k: "Year-one subtotal",
                      fn: (p) =>
                        `${p.currency === "EUR" ? "€" : "£"}${(p.tuitionYear + p.livingYear + p.otherFeesYear).toLocaleString()}`,
                    },
                    { k: "Profile match", fn: (p) => `${p.match}%` },
                  ].map((row) => (
                    <tr
                      key={row.k}
                      className="border-b border-white/5 align-top"
                    >
                      <td className="p-4 text-xs font-semibold uppercase tracking-wider text-white/45">
                        {row.k}
                      </td>
                      {comparePrograms.map((p) => (
                        <td
                          key={p.id}
                          className="p-4 text-[0.8125rem] leading-relaxed normal-case"
                        >
                          {row.fn(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          : <div className="mt-8 rounded-xl border border-dashed border-white/20 bg-white/5 px-6 py-12 text-center">
              <GitCompare
                className="mx-auto h-10 w-10 text-fateh-gold/60"
                strokeWidth={1.25}
              />
              <p className="mt-4 text-sm font-medium text-white/70 normal-case">
                Add at least two courses to compare
              </p>
              <p className="mt-1 text-xs text-white/40 normal-case">
                Use the Compare button on each course card.
              </p>
            </div>
          }
        </motion.section>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Deadlines */}
          <motion.section
            id="fy-deadlines"
            variants={item}
            className="scroll-mt-28 rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-lg md:p-9 lg:scroll-mt-24"
          >
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">
                  Deadlines
                </p>
                <h2 className="mt-2 font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">
                  Reminders
                </h2>
                <p className="mt-2 text-sm text-fateh-muted normal-case">
                  Pulled from your recommended universities. Sync any row to
                  Google Calendar.
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
                      <p className="font-semibold text-fateh-ink normal-case">
                        {d.label}
                      </p>
                      <p className="mt-1 text-xs text-fateh-muted normal-case">
                        {d.date} · {d.school}
                      </p>
                    </div>
                    {cal ?
                      <a
                        href={cal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-fateh-gold/40 bg-fateh-gold/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-fateh-ink transition hover:bg-fateh-gold/20"
                      >
                        <CalendarPlus
                          className="h-4 w-4 text-fateh-gold"
                          strokeWidth={1.5}
                        />
                        Google Calendar
                      </a>
                    : null}
                  </li>
                );
              })}
            </ul>
          </motion.section>

          {/* Financial clarity */}
          <motion.section
            id="fy-budget"
            variants={item}
            className="scroll-mt-28 rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-[0_24px_70px_-30px_rgba(11,14,26,0.18)] backdrop-blur-sm md:p-9 lg:scroll-mt-24"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fateh-gold/30 bg-fateh-gold/10">
                <Landmark
                  className="h-6 w-6 text-fateh-gold"
                  strokeWidth={1.35}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">
                  Financial clarity
                </p>
                <h2 className="mt-1 font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">
                  Year-one requirement:{" "}
                  <span className="text-fateh-gold-dark italic">
                    {selected.school}
                  </span>
                </h2>
                <p className="mt-2 text-sm text-fateh-muted normal-case">
                  Tied to the course you select below. INR uses a live ECB-based
                  rate; we add ±₹1,00,000 buffer bands on the total.
                </p>
              </div>
            </div>

            <label className="relative mt-8 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-fateh-muted">
                Course for costing
              </span>
              <div className="relative mt-2">
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-fateh-border bg-white py-3.5 pl-4 pr-10 text-sm font-medium text-fateh-ink outline-none ring-fateh-gold/25 focus:ring-2"
                >
                  {displayPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {p.school}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fateh-muted"
                  strokeWidth={2}
                />
              </div>
            </label>

            {spot.loading && !spot.eurInr ?
              <div className="mt-8 flex items-center gap-3 rounded-xl border border-fateh-border/80 bg-fateh-paper/80 px-4 py-6 text-sm text-fateh-muted">
                <RefreshCw
                  className="h-5 w-5 animate-spin text-fateh-gold"
                  strokeWidth={1.5}
                />
                Fetching live ECB reference rates (EUR &amp; GBP → INR)…
              </div>
            : spot.error ?
              <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex gap-3">
                  <AlertCircle
                    className="h-5 w-5 shrink-0 text-red-700"
                    strokeWidth={1.5}
                  />
                  <div>
                    <p className="text-sm font-semibold text-red-900 normal-case">
                      Could not load exchange rates
                    </p>
                    <p className="mt-1 text-xs text-red-800/90 normal-case">
                      {spot.error}
                    </p>
                    <button
                      type="button"
                      onClick={() => fetchSpotRates()}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-fateh-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            : <div className="mt-8 space-y-5">
                {spot.eurInr != null && spot.gbpInr != null ?
                  <div className="rounded-xl border border-fateh-gold/30 bg-fateh-gold-pale/40 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold">
                        Live spot (INR)
                      </p>
                      <button
                        type="button"
                        onClick={() => fetchSpotRates()}
                        className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-fateh-accent hover:text-fateh-ink"
                      >
                        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                        Refresh
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-fateh-border/80 bg-white/90 px-4 py-3">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-fateh-muted">
                          1 EUR equals
                        </p>
                        <p className="mt-1 font-fateh-serif text-2xl font-semibold text-fateh-ink">
                          {spot.eurInr.toFixed(4)}{" "}
                          <span className="text-base font-sans font-medium text-fateh-muted">
                            INR
                          </span>
                        </p>
                      </div>
                      <div className="rounded-lg border border-fateh-border/80 bg-white/90 px-4 py-3">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-fateh-muted">
                          1 GBP equals
                        </p>
                        <p className="mt-1 font-fateh-serif text-2xl font-semibold text-fateh-ink">
                          {spot.gbpInr.toFixed(4)}{" "}
                          <span className="text-base font-sans font-medium text-fateh-muted">
                            INR
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-fateh-muted leading-relaxed normal-case">
                      ECB reference date{" "}
                      <span className="font-medium text-fateh-ink">
                        {spot.date || "—"}
                      </span>
                      {spot.source ? ` · ${spot.source}` : ""}. Bank and card
                      rates include spreads — use this as a planning midpoint.
                    </p>
                    <p className="mt-2 text-xs text-fateh-muted normal-case">
                      Selected course uses{" "}
                      <span className="font-semibold text-fateh-ink">
                        {selected.currency}
                      </span>{" "}
                      → INR at{" "}
                      <span className="font-semibold text-fateh-ink">
                        {inrPerUnit != null ? inrPerUnit.toFixed(4) : "—"}
                      </span>{" "}
                      for the breakdown below.
                    </p>
                  </div>
                : null}

                {financial ?
                  <>
                    <div className="rounded-xl border border-fateh-border/90 bg-linear-to-br from-fateh-paper to-fateh-gold-pale/25 p-5">
                      <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold">
                        Year-one fees (local currency)
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-fateh-ink">
                        <li className="flex justify-between normal-case">
                          <span className="text-fateh-muted">Tuition</span>
                          <span className="font-medium">
                            {selected.currency === "EUR" ? "€" : "£"}
                            {selected.tuitionYear.toLocaleString()}
                          </span>
                        </li>
                        <li className="flex justify-between normal-case">
                          <span className="text-fateh-muted">
                            Living (estimate)
                          </span>
                          <span className="font-medium">
                            {selected.currency === "EUR" ? "€" : "£"}
                            {selected.livingYear.toLocaleString()}
                          </span>
                        </li>
                        <li className="flex justify-between normal-case">
                          <span className="text-fateh-muted">
                            Fees &amp; misc
                          </span>
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
                      <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold-light">
                        Converted to INR (same live rate)
                      </p>
                      <p className="mt-1 text-xs text-white/45 normal-case">
                        1 {selected.currency} ={" "}
                        {inrPerUnit != null ? inrPerUnit.toFixed(4) : "—"} INR ·
                        ECB date {spot.date || "—"}
                      </p>
                      <ul className="mt-4 space-y-2 text-sm">
                        <li className="flex justify-between text-white/75 normal-case">
                          <span>Tuition</span>
                          <span className="font-medium text-white">
                            {formatInr(financial.tuitionInr)}
                          </span>
                        </li>
                        <li className="flex justify-between text-white/75 normal-case">
                          <span>Living</span>
                          <span className="font-medium text-white">
                            {formatInr(financial.livingInr)}
                          </span>
                        </li>
                        <li className="flex justify-between text-white/75 normal-case">
                          <span>Fees &amp; misc</span>
                          <span className="font-medium text-white">
                            {formatInr(financial.otherInr)}
                          </span>
                        </li>
                        <li className="flex justify-between border-t border-white/10 pt-3 font-fateh-serif text-lg font-semibold text-fateh-gold-light normal-case">
                          <span>Central estimate</span>
                          <span>{formatInr(financial.subtotalInr)}</span>
                        </li>
                      </ul>
                      <div className="mt-5 rounded-lg bg-white/5 px-4 py-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-fateh-gold-light/90">
                          Planning band (± ₹1,00,000 on total)
                        </p>
                        <p className="mt-2 font-fateh-serif text-xl font-semibold text-white normal-case">
                          {formatInr(financial.low)} —{" "}
                          {formatInr(financial.high)}
                        </p>
                        <p className="mt-2 text-xs text-white/45 leading-relaxed normal-case">
                          Covers typical FX drift and small fee changes.
                          Official invoices and award letters always win.
                        </p>
                      </div>
                    </div>
                  </>
                : <p className="text-sm text-fateh-muted normal-case">
                    Rates loaded — pick a course to see the INR breakdown.
                  </p>
                }
              </div>
            }
          </motion.section>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Visa help */}
          <motion.section
            id="fy-visa"
            variants={item}
            className="scroll-mt-28 rounded-2xl border border-fateh-gold/25 bg-linear-to-br from-white via-fateh-paper to-fateh-gold-pale/35 p-7 shadow-lg md:p-9 lg:scroll-mt-24"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fateh-gold/35 bg-fateh-gold/12">
                <Plane className="h-6 w-6 text-fateh-gold" strokeWidth={1.35} />
              </div>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">
                  Visa help
                </p>
                <h2 className="font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case md:text-3xl">
                  Passport &amp; travel history
                </h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-fateh-muted normal-case">
              A clear scan of your passport bio page helps us check validity,
              blank pages, and name consistency. Strong travel history (stamps,
              prior visas) often supports credibility — upload a single PDF or
              image pack for counsellor review.
            </p>
            {passportError ?
              <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 normal-case">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={1.5}
                />
                {passportError}
              </div>
            : null}
            <label
              className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition ${
                passportDrag ?
                  "border-fateh-gold bg-fateh-gold/10"
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
              <span className="mt-3 text-sm font-semibold text-fateh-ink normal-case">
                Passport bio page / travel scans
              </span>
              <span className="mt-1 text-xs text-fateh-muted normal-case">
                PDF, JPG, PNG · demo upload (browser only)
              </span>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => onPassportFile(e.target.files?.[0])}
              />
            </label>
            {passportFile ?
              <p className="mt-4 text-sm text-fateh-accent normal-case">
                Received{" "}
                <span className="font-semibold text-fateh-ink">
                  {passportFile}
                </span>{" "}
                — your counsellor will map this to the visa checklist.
              </p>
            : !passportError ?
              <p className="mt-4 text-xs text-fateh-muted normal-case">
                No file uploaded yet.
              </p>
            : null}
          </motion.section>

          {/* Scholarships teaser */}
          <motion.section
            id="fy-scholarships-teaser"
            variants={item}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-fateh-accent/20 bg-fateh-ink p-7 text-fateh-paper shadow-xl md:p-9"
          >
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">
                Scholarships
              </p>
              <h2 className="mt-2 font-fateh-serif text-2xl font-semibold normal-case md:text-3xl">
                India · university · bilateral
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/50 normal-case">
                Full detail page with eligibility bullets, award bands, and how
                to apply — filter by likely eligible, India schemes, or
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
        </div>

        {/* Map — OpenStreetMap */}
        <motion.section
          id="fy-map"
          variants={item}
          className="scroll-mt-28 overflow-hidden rounded-2xl border border-fateh-border/80 bg-fateh-ink text-fateh-paper shadow-xl lg:scroll-mt-24"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-7 py-6 md:px-9">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">
                Geography
              </p>
              <h2 className="mt-2 font-fateh-serif text-2xl font-semibold normal-case">
                Campus locations
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/45 normal-case">
                Real map data via OpenStreetMap. Pins use each university&apos;s
                approximate campus coordinates.
              </p>
            </div>
          </div>
          <div className="isolate bg-[#1a2336] p-3 md:p-4">
            <UniversityMap
              markers={mapMarkers}
              activeMarkerId={activeMarkerId}
            />
          </div>
          <div className="grid gap-px bg-white/15 sm:grid-cols-3">
            {displayPrograms.slice(0, 3).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveMarkerId(p.id);
                  setSelectedId(p.id);
                  scrollToId("fy-map");
                }}
                className="bg-fateh-ink/95 px-5 py-5 transition hover:bg-white/4 text-left group border-r border-white/5 last:border-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-fateh-gold" />
                    <span className="text-[0.62rem] font-bold text-fateh-gold-light uppercase tracking-wider">
                      {p.match}% Match
                    </span>
                  </div>
                  <Search className="h-3.5 w-3.5 text-white/20 group-hover:text-fateh-gold transition-colors" />
                </div>
                <p className="font-fateh-serif text-base font-semibold text-white normal-case group-hover:text-fateh-gold transition-colors">
                  {p.school}
                </p>
                <p className="mt-1 text-[0.65rem] text-white/40 normal-case flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {p.location || p.city}
                </p>
              </button>
            ))}
          </div>
        </motion.section>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Programme detail — synced to selection */}
          <motion.section
            id="fy-programme"
            variants={item}
            className="scroll-mt-28 rounded-2xl border border-fateh-gold/25 bg-linear-to-br from-white via-fateh-paper to-fateh-gold-pale/40 p-7 shadow-lg md:p-9 lg:scroll-mt-24"
          >
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">
              Selection
            </p>
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
                  <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-muted">
                    {x.k}
                  </p>
                  <p className="mt-3 font-fateh-serif text-xl font-semibold text-fateh-ink normal-case">
                    {x.t}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-fateh-muted normal-case">
                    {x.b}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Resume */}
          <motion.section
            id="fy-profile"
            variants={item}
            className="scroll-mt-28 overflow-hidden rounded-2xl border border-fateh-gold/20 bg-fateh-ink p-7 text-fateh-paper shadow-2xl md:p-9 lg:scroll-mt-24"
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fateh-gold/35 bg-fateh-gold/10">
                  <FileText
                    className="h-6 w-6 text-fateh-gold-light"
                    strokeWidth={1.35}
                  />
                </div>
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold-light">
                    Resume
                  </p>
                  <h2 className="font-fateh-serif text-2xl font-semibold normal-case md:text-3xl">
                    Enrich your profile
                  </h2>
                </div>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/50 normal-case">
              Upload a PDF or Word file — we&apos;ll extract skills, education,
              and interests to refine matches (wire your parser API here).
            </p>

            {resumeError ?
              <div className="mt-6 flex gap-3 rounded-xl border border-red-400/40 bg-red-950/40 px-4 py-4">
                <AlertCircle
                  className="h-5 w-5 shrink-0 text-red-300"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-sm font-semibold text-red-100 normal-case">
                    Upload not accepted
                  </p>
                  <p className="mt-1 text-xs text-red-200/90 normal-case">
                    {resumeError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setResumeError(null)}
                    className="mt-3 text-xs font-semibold uppercase tracking-wider text-fateh-gold-light underline-offset-4 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            : null}

            <label
              className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 transition ${
                dragOver ?
                  "border-fateh-gold bg-fateh-gold/10 shadow-[0_0_40px_-10px_rgba(200,164,90,0.5)]"
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
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-fateh-gold/15 text-fateh-gold-light ring-2 ring-fateh-gold/20"
              >
                <Upload className="h-7 w-7" strokeWidth={1.35} />
              </motion.div>
              <span className="mt-5 text-sm font-semibold text-white normal-case">
                Drop your CV here or browse
              </span>
              <span className="mt-1 text-xs text-white/40">
                PDF, DOC, DOCX · max 10MB (client demo)
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf"
                className="sr-only"
                onChange={(e) => simulateParse(e.target.files?.[0])}
              />
            </label>

            {resumeFile && !resumeError ?
              <p className="mt-5 text-sm text-fateh-gold-light normal-case">
                Processing{" "}
                <span className="font-semibold text-white">{resumeFile}</span>…
              </p>
            : !resumeFile && !resumeError ?
              <p className="mt-5 text-xs text-white/35 normal-case">
                No résumé on file — upload to unlock skill tags (demo).
              </p>
            : null}

            {parsedSkills ?
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 rounded-xl border border-fateh-gold/25 bg-fateh-gold/[0.07] p-6"
              >
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-fateh-gold-light">
                  Detected highlights
                </p>
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
            : resumeFile && !parsedSkills && !resumeError ?
              <div className="mt-8 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/50 normal-case">
                Parsing your file… if this hangs, re-upload or try another
                format.
              </div>
            : null}
          </motion.section>
        </div>
      </motion.div>

      {/* Saved scenarios — revealed only after bottom sentinel fires + user clicks */}
      <div
        ref={scenariosRef}
        className="mx-auto max-w-6xl px-5 md:px-6 lg:px-8"
      >
        {scenariosOpen ?
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-8"
          >
            <section className="rounded-2xl border border-fateh-border/80 bg-white/95 p-7 shadow-lg md:p-9">
              <div className="flex items-center gap-3">
                <Layers
                  className="h-8 w-8 text-fateh-gold"
                  strokeWidth={1.25}
                />
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-fateh-gold">
                    Saved scenarios
                  </p>
                  <h2 className="font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">
                    Plans on file
                  </h2>
                </div>
              </div>
              <ul className="mt-8 space-y-4">
                {SAVED_SCENARIOS.map((sc) => (
                  <li
                    key={sc.id}
                    className="rounded-xl border border-fateh-border/70 bg-fateh-paper/90 p-5"
                  >
                    <p className="font-fateh-serif text-lg font-semibold text-fateh-ink normal-case">
                      {sc.name}
                    </p>
                    <p className="mt-2 text-sm text-fateh-muted normal-case">
                      {sc.summary}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wider text-fateh-gold">
                      {sc.focus}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </motion.div>
        : null}
      </div>

      {/* Bottom sentinel + reveal control */}
      <div
        ref={bottomSentinelRef}
        className="mx-auto h-px w-full max-w-6xl lg:px-8"
        aria-hidden
      />

      {bottomReached && !scenariosOpen ?
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
      : null}

      {scenariosOpen ?
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 justify-center px-4">
          <button
            type="button"
            onClick={() => setScenariosOpen(false)}
            className="rounded-full border border-white/20 bg-fateh-ink/90 px-5 py-2.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm transition hover:text-white"
          >
            Hide scenarios
          </button>
        </div>
      : null}
    </div>
  );
}
