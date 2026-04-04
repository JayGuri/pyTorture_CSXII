/**
 * Shared programme data for For you, comparison, deadlines, and cost breakdowns.
 * Amounts are indicative; counsellors confirm against official notices.
 */

export const INR_BUFFER = 100_000; // ±1 lakh comfort band on totals

export const PROGRAMS = [
  {
    id: "ucd-mfe",
    title: "MSc Financial Economics",
    school: "University College Dublin",
    country: "Ireland",
    countryCode: "IE",
    currency: "EUR",
    tuitionYear: 24000,
    livingYear: 14500,
    otherFeesYear: 3200,
    intake: "September 2026",
    match: 96,
    tag: "Strong finance profile",
    accent: "from-fateh-gold/90 to-amber-600/50",
    deadlines: [
      { id: "ucd-mfe-app", label: "UCD — MSc Financial Economics application", date: "2026-06-30", type: "application" },
      { id: "ucd-mfe-dep", label: "UCD — deposit & acceptance", date: "2026-07-20", type: "deposit" },
      { id: "ucd-mfe-visa", label: "UCD — visa document pack target", date: "2026-08-05", type: "visa" },
    ],
  },
  {
    id: "tcd-mba",
    title: "MSc Business Analytics",
    school: "Trinity College Dublin",
    country: "Ireland",
    countryCode: "IE",
    currency: "EUR",
    tuitionYear: 22500,
    livingYear: 15000,
    otherFeesYear: 2800,
    intake: "September 2026",
    match: 92,
    tag: "STEM pathway",
    accent: "from-fateh-accent/80 to-fateh-gold/40",
    deadlines: [
      { id: "tcd-mba-app", label: "TCD — MSc Business Analytics application", date: "2026-06-15", type: "application" },
      { id: "tcd-mba-sch", label: "TCD — scholarship consideration deadline", date: "2026-05-01", type: "scholarship" },
      { id: "tcd-mba-dep", label: "TCD — fee deposit", date: "2026-07-31", type: "deposit" },
    ],
  },
  {
    id: "bath-mm",
    title: "MSc Management",
    school: "University of Bath",
    country: "United Kingdom",
    countryCode: "GB",
    currency: "GBP",
    tuitionYear: 28000,
    livingYear: 12000,
    otherFeesYear: 2500,
    intake: "October 2026",
    match: 89,
    tag: "UK Russell Group",
    accent: "from-fateh-gold/70 to-fateh-accent/50",
    deadlines: [
      { id: "bath-mm-app", label: "Bath — MSc Management application", date: "2026-06-30", type: "application" },
      { id: "bath-mm-cas", label: "Bath — CAS / visa timeline checkpoint", date: "2026-08-15", type: "visa" },
    ],
  },
];

/** Flattened reminders across all recommended programmes */
export function allProgramDeadlines() {
  const rows = [];
  for (const p of PROGRAMS) {
    for (const d of p.deadlines) {
      rows.push({
        ...d,
        programTitle: p.title,
        school: p.school,
        country: p.country,
      });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export const OUTCOME_STORIES = [
  {
    id: "s1",
    courseIds: ["ucd-mfe"],
    headline: "Dublin → front-office analytics",
    name: "R. Mehta",
    region: "Mumbai",
    year: "2024",
    blurb:
      "Finance undergrad, two internships. Chose UCD MFE for quant depth; now in a graduate programme with a global bank in Dublin.",
  },
  {
    id: "s2",
    courseIds: ["tcd-mba", "ucd-mfe"],
    headline: "Analytics offer after TCD capstone",
    name: "K. Nair",
    region: "Bengaluru",
    year: "2023",
    blurb:
      "Switched from general management to business analytics at Trinity; capstone with an Irish fintech led directly to a full-time data role.",
  },
  {
    id: "s3",
    courseIds: ["bath-mm"],
    headline: "UK management intake, consulting track",
    name: "A. Khan",
    region: "Delhi NCR",
    year: "2025",
    blurb:
      "Bath MSc Management plus society leadership; secured spring insight and summer internship with a strategy boutique in London.",
  },
];

export const SAVED_SCENARIOS = [
  {
    id: "plan-a",
    name: "Plan A — Ireland flagship",
    summary: "UCD MFE primary, TCD analytics backup, shared visa timeline.",
    focus: "EU post-study work · euro-denominated budget",
  },
  {
    id: "plan-b",
    name: "Plan B — UK + Ireland mix",
    summary: "Bath Management + TCD safety; stress-test GBP vs EUR funding.",
    focus: "Graduate route vs Stamp 2 · FX sensitivity",
  },
];

/**
 * Scholarships dataset for /for-you/scholarships (India, university, blended).
 * Eligibility flags are simplified for demo; replace with rules engine later.
 */
export const SCHOLARSHIPS = [
  {
    id: "gos-i-ie",
    name: "Government of Ireland — International Education Scholarships",
    source: "india_eligible",
    region: "Ireland",
    type: "Government",
    amountNote: "€10,000 stipend + fee waiver (varies by year)",
    eligibility: [
      "Non-EU student with an offer from an Irish HEI on the approved list",
      "Strong academic record (typically 1st class or equivalent)",
      "Evidence of leadership, research, or community impact",
      "Application usually opens Dec–Feb prior to intake",
    ],
    applyVia: "Irish HEA / host institution nomination — confirm current call on education.ie",
    youMayQualify: true,
  },
  {
    id: "fulbright-nehru",
    name: "Fulbright-Nehru Master's Fellowships",
    source: "india",
    region: "United States pathway",
    type: "Government / bilateral",
    amountNote: "Tuition support + living allowance (cohort-specific)",
    eligibility: [
      "Indian citizenship; bachelor's with strong academic record",
      "Relevant work or research experience where required",
      "IELTS/TOEFL per programme; return commitment clauses",
      "Annual window — check USIEF India portal for exact dates",
    ],
    applyVia: "https://www.usief.org.in — USIEF India",
    youMayQualify: false,
  },
  {
    id: "national-overseas",
    name: "National Overseas Scholarship (SC / tribes / semi-nomadic)",
    source: "india",
    region: "Global",
    type: "Government of India",
    amountNote: "Tuition + maintenance as per scheme norms",
    eligibility: [
      "Belonging to eligible categories per Social Justice Ministry guidelines",
      "Age and income caps apply; master's/PhD in approved fields",
      "Must secure admission abroad first in many cycles",
    ],
    applyVia: "Ministry of Social Justice & Empowerment — annual notification",
    youMayQualify: false,
  },
  {
    id: "padho-pardesh",
    name: "Padho Pardesh (interest subsidy for minority students)",
    source: "india",
    region: "Global",
    type: "Government scheme",
    amountNote: "Interest subsidy on education loan (not a cash award)",
    eligibility: [
      "Eligible minority community as per scheme definition",
      "Income ceiling; loan from scheduled banks under IBA model",
      "Admission to approved overseas programme",
    ],
    applyVia: "Nodal bank / Ministry of Minority Affairs circulars",
    youMayQualify: false,
  },
  {
    id: "ucd-global-excellence",
    name: "UCD Global Excellence Scholarship",
    source: "university",
    region: "Ireland",
    type: "University — UCD",
    amountNote: "Up to 100% or partial tuition (tiered by merit)",
    eligibility: [
      "Non-EU fee status with UCD postgraduate offer",
      "Outstanding academic achievement; competitive pool",
      "Separate scholarship application or auto-consideration per faculty rules",
    ],
    applyVia: "UCD Global office — check programme-specific scholarship page",
    youMayQualify: true,
  },
  {
    id: "tcd-pg-scholarship",
    name: "Trinity Postgraduate Taught Scholarship",
    source: "university",
    region: "Ireland",
    type: "University — Trinity",
    amountNote: "€2,000–€5,000 tuition reduction (indicative bands)",
    eligibility: [
      "Offer holder for eligible taught master's",
      "Academic merit; some faculties add statement or portfolio",
      "Deadlines often earlier than programme close — see TCD registry",
    ],
    applyVia: "Trinity College Dublin Scholarships portal",
    youMayQualify: true,
  },
  {
    id: "bath-deans",
    name: "University of Bath — Dean's Award for MSc candidates",
    source: "university",
    region: "United Kingdom",
    type: "University — Bath",
    amountNote: "Partial fee discount (merit-based, limited)",
    eligibility: [
      "International offer holder for School of Management programmes",
      "First-class equivalent or strong GPA; competitive statement",
      "No separate application in some years — verify current policy",
    ],
    applyVia: "Bath School of Management admissions & funding pages",
    youMayQualify: true,
  },
  {
    id: "commonwealth-masters",
    name: "Commonwealth Master's Scholarships (FCDO)",
    source: "india_eligible",
    region: "United Kingdom",
    type: "UK government",
    amountNote: "Full funding package for selected candidates",
    eligibility: [
      "Indian citizenship; cannot ordinarily study in the UK without award",
      "First degree 2:1 equivalent; development impact narrative",
      "Highly competitive; annual nomination route via nominating agency",
    ],
    applyVia: "ACU / CSC online application — check India nominating body",
    youMayQualify: false,
  },
];
