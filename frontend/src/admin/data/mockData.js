/**
 * Rich demo payloads for the PS-1 counsellor console until backend wiring exists.
 * Shapes mirror the intended API: live sessions, CRM tiers, intelligence briefs, KB ops.
 */

export const LIVE_CONVERSATIONS = [
  {
    id: "live-1",
    studentName: "Meera K.",
    phoneMasked: "+91 •••• ••89",
    startedAt: "2026-04-04T09:12:00+05:30",
    agentPersona: "Fateh Voice — UK UG",
    leadScore: 78,
    intent: "High",
    financialReadiness: "Strong",
    timelineUrgency: "Sep 2026",
    lastSnippet: "Student asked about Russell Group scholarships and part-time work caps.",
  },
  {
    id: "live-2",
    studentName: "Arjun P.",
    phoneMasked: "+91 •••• ••21",
    startedAt: "2026-04-04T09:18:00+05:30",
    agentPersona: "Fateh Voice — Masters Ireland",
    leadScore: 52,
    intent: "Medium",
    financialReadiness: "Exploring",
    timelineUrgency: "Jan 2027",
    lastSnippet: "Comparing Trinity vs UCD for Data Science; parent will join next call.",
  },
  {
    id: "live-3",
    studentName: "Sana R.",
    phoneMasked: "+91 •••• ••07",
    startedAt: "2026-04-04T09:05:00+05:30",
    agentPersona: "Fateh Voice — Canada PGWP",
    leadScore: 91,
    intent: "Very high",
    financialReadiness: "Funded",
    timelineUrgency: "May 2026",
    lastSnippet: "Wants Ontario stream; discussed SDS vs non-SDS pathways.",
  },
];

/** 12 mandatory extraction fields (personal, academic, financial, timeline). */
export const MANDATORY_FIELD_KEYS = [
  { key: "fullName", label: "Full name", group: "Personal" },
  { key: "primaryPhone", label: "Primary phone", group: "Personal" },
  { key: "email", label: "Email", group: "Personal" },
  { key: "targetCountry", label: "Target country", group: "Academic" },
  { key: "programInterest", label: "Program interest", group: "Academic" },
  { key: "currentEducationLevel", label: "Current education level", group: "Academic" },
  { key: "englishTestStatus", label: "English test status", group: "Academic" },
  { key: "budgetRangeInr", label: "Budget range (INR)", group: "Financial" },
  { key: "scholarshipInterest", label: "Scholarship interest", group: "Financial" },
  { key: "fundingSource", label: "Funding source", group: "Financial" },
  { key: "intakeTimeline", label: "Intake timeline", group: "Timeline" },
  { key: "decisionMakerInvolvement", label: "Decision-maker involvement", group: "Timeline" },
];

function buildExtracted(id) {
  const base = {
    fullName: "Rohan Verma",
    primaryPhone: "+91 98765 43210",
    email: "rohan.verma.example@gmail.com",
    targetCountry: "United Kingdom",
    programInterest: "MSc Finance",
    currentEducationLevel: "B.Com final year",
    englishTestStatus: "IELTS booked — 18 Apr 2026",
    budgetRangeInr: "28–35 Lakh",
    scholarshipInterest: "High — merit + uni bursaries",
    fundingSource: "Family savings + partial education loan",
    intakeTimeline: "September 2026",
    decisionMakerInvolvement: "Father joins financial discussion; student drives shortlist",
  };
  if (id === "call-2") {
    return {
      ...base,
      fullName: "Ananya Iyer",
      email: "ananya.iyer.example@gmail.com",
      targetCountry: "Ireland",
      programInterest: "MSc Computer Science",
      budgetRangeInr: "22–26 Lakh",
      intakeTimeline: "January 2027",
      englishTestStatus: "Duolingo 125 — valid",
    };
  }
  if (id === "call-3") {
    return {
      ...base,
      fullName: "Kabir Shah",
      targetCountry: "Canada",
      programInterest: "PG Diploma + PR pathway",
      budgetRangeInr: "18–22 Lakh",
      intakeTimeline: "May 2026",
      englishTestStatus: "PTE — awaiting results",
    };
  }
  return base;
}

export const COMPLETED_CALLS = [
  {
    id: "call-1",
    endedAt: "2026-04-04T08:42:00+05:30",
    durationSec: 842,
    studentName: "Rohan Verma",
    tier: "hot",
    overallScore: 84,
    scoreBreakdown: {
      intent: 30,
      financialReadiness: 24,
      timelineUrgency: 18,
      engagementQuality: 12,
    },
    persona: "Ambitious planner — detail-oriented",
    emotionalState: "Optimistic with mild anxiety on visa timelines",
    unresolvedObjections: ["Wants clarity on maintenance fund evidence for London", "Unsure if one-year MSc hurts PSW positioning"],
    nextActions: [
      "Call within 2 hours with a maintenance-fund checklist tailored to London.",
      "Share 2–3 MSc Finance shortlists with employed-graduate stats.",
      "Book a 20-minute counsellor slot for father to discuss loan structure.",
    ],
    scanSummary:
      "Strong UK MSc Finance intent, budget aligned, Sep 2026 intake. Student is engaged and moving fast; address maintenance proof and PSW narrative early to prevent stall.",
    transcript: [
      { role: "agent", text: "Hi Rohan, this is Fateh Education’s assistant. Shall we talk about your UK Masters plans?" },
      { role: "student", text: "Yes — I’m targeting September 2026 for MSc Finance. I’ve booked IELTS for mid-April." },
      { role: "agent", text: "Great. Which cities are you leaning toward, and what’s a comfortable total budget range for you and your family?" },
      { role: "student", text: "London is preferred if scholarships work. We’re thinking around thirty lakh all-in, maybe a small loan." },
      { role: "agent", text: "Noted. I’ll capture your scholarship interest and timeline urgency for your counsellor. Any concern on visa funds documentation?" },
      { role: "student", text: "A bit — especially what counts as proof for living costs in London." },
    ],
    extracted: buildExtracted("call-1"),
  },
  {
    id: "call-2",
    endedAt: "2026-04-03T19:10:00+05:30",
    durationSec: 612,
    studentName: "Ananya Iyer",
    tier: "warm",
    overallScore: 58,
    scoreBreakdown: {
      intent: 18,
      financialReadiness: 16,
      timelineUrgency: 12,
      engagementQuality: 12,
    },
    persona: "Research-led — compares options heavily",
    emotionalState: "Curious, not rushed",
    unresolvedObjections: ["Wants side-by-side Ireland vs UK total cost of ownership"],
    nextActions: [
      "Send Ireland vs UK TCO one-pager with her program vertical.",
      "Offer a short follow-up after Duolingo validity is double-checked in CRM.",
    ],
    scanSummary:
      "Warm Ireland CS lead; Jan 2027 intake. Needs comparative economics before committing; keep momentum with structured comparison rather than generic brochures.",
    transcript: [
      { role: "agent", text: "Hi Ananya, thanks for taking the call. Should we explore Ireland CS programs for 2027?" },
      { role: "student", text: "Yes. I’m comparing Ireland with the UK — mainly total cost and part-time work." },
    ],
    extracted: buildExtracted("call-2"),
  },
  {
    id: "call-3",
    endedAt: "2026-04-03T11:55:00+05:30",
    durationSec: 403,
    studentName: "Kabir Shah",
    tier: "cold",
    overallScore: 34,
    scoreBreakdown: {
      intent: 10,
      financialReadiness: 8,
      timelineUrgency: 8,
      engagementQuality: 8,
    },
    persona: "Explorer — early funnel",
    emotionalState: "Neutral / browsing",
    unresolvedObjections: ["Unclear if PG diploma or Masters is better for PR goals"],
    nextActions: [
      "Add to nurture: WhatsApp drip with Canada pathway explainer.",
      "Re-attempt voice in 5 days if no reply; tag as early-stage.",
    ],
    scanSummary:
      "Cold Canada pathway inquiry; budget moderate, timeline aggressive. Needs education on credential ladder before counsellor deep-dive.",
    transcript: [
      { role: "agent", text: "Hi Kabir — are you exploring Canada for May 2026?" },
      { role: "student", text: "Maybe diploma first? I’m still figuring out what’s best for PR." },
    ],
    extracted: buildExtracted("call-3"),
  },
];

export const LEAD_MATRIX_ROWS = COMPLETED_CALLS.map((c) => ({
  id: c.id,
  name: c.studentName,
  tier: c.tier,
  score: c.overallScore,
  intent: c.scoreBreakdown.intent >= 24 ? "High" : c.scoreBreakdown.intent >= 14 ? "Medium" : "Low",
  financialReadiness: c.tier === "hot" ? "Strong" : c.tier === "warm" ? "Moderate" : "Early",
  timelineUrgency: c.extracted.intakeTimeline,
  lastTouch: c.endedAt,
}));

export const KB_GAP_QUEUE_SEED = [
  {
    id: "gap-1",
    question: "Does UCL accept Duolingo for MSc Management 2026?",
    callId: "call-2",
    researchedAnswer:
      "UCL’s departmental English requirements vary by program. For 2026, MSc Management typically expects IELTS/TOEFL/PTE from the approved list; Duolingo is not generally listed as standard for this cohort. Verify on the program’s official English requirements page before promising.",
    status: "pending",
  },
  {
    id: "gap-2",
    question: "Can I switch from UK visitor visa to student without leaving?",
    callId: "call-1",
    researchedAnswer:
      "In most cases students apply for Student permission from outside the UK or follow Home Office rules for switching. Advising a specific route requires immigration counsel; counsellor should not confirm without case facts.",
    status: "pending",
  },
];

export const APPOINTMENTS = [
  {
    id: "appt-1",
    when: "2026-04-05T15:30:00+05:30",
    counsellor: "Neha Kapoor",
    student: "Rohan Verma",
    channel: "Video — Google Meet",
    bookedBy: "AI Voice Agent",
    notes: "Father may join last 10 minutes.",
  },
  {
    id: "appt-2",
    when: "2026-04-06T11:00:00+05:30",
    counsellor: "Arjun Mehta",
    student: "Sana R.",
    channel: "Phone",
    bookedBy: "AI Voice Agent",
    notes: "Follow-up on Ontario stream options.",
  },
];

export const NURTURE_TRACKS = [
  {
    id: "nur-1",
    student: "Kabir Shah",
    tier: "cold",
    stage: "Day 2 — intro message",
    lastSent: "2026-04-04T08:00:00+05:30",
    nextScheduled: "2026-04-06T08:00:00+05:30",
    incompleteSession: true,
    suggestedNext: "Send a short Canada pathway explainer (PGWP vs diploma). Offer a 10‑minute callback slot.",
  },
  {
    id: "nur-2",
    student: "Priya Nair",
    tier: "cold",
    stage: "Awaiting reply — Day 5",
    lastSent: "2026-04-02T10:00:00+05:30",
    nextScheduled: "2026-04-05T10:00:00+05:30",
    incompleteSession: true,
    suggestedNext: "One follow-up call; if no answer, pause drip and tag for next campaign.",
  },
  {
    id: "nur-3",
    student: "Rahul Menon",
    tier: "warm",
    stage: "Shortlist shared — follow-up",
    lastSent: "2026-04-03T14:00:00+05:30",
    nextScheduled: "2026-04-05T11:00:00+05:30",
    incompleteSession: false,
    suggestedNext: "Ask which two unis they want to shortlist for applications; book counsellor if parents need a call.",
  },
  {
    id: "nur-4",
    student: "Meera Krishnan",
    tier: "hot",
    stage: "Docs checklist sent",
    lastSent: "2026-04-04T09:30:00+05:30",
    nextScheduled: "2026-04-05T09:00:00+05:30",
    incompleteSession: false,
    suggestedNext: "Confirm IELTS date and bank statement format; nudge to upload transcripts in portal.",
  },
  {
    id: "nur-5",
    student: "Arjun Patel",
    tier: "warm",
    stage: "Fee quote requested",
    lastSent: "2026-04-01T16:00:00+05:30",
    nextScheduled: "2026-04-06T16:00:00+05:30",
    incompleteSession: false,
    suggestedNext: "Send Ireland vs UK cost one-pager and a single recommended intake (Sep 26 vs Jan 27).",
  },
  {
    id: "nur-6",
    student: "Sana Rizvi",
    tier: "hot",
    stage: "Counsellor call booked",
    lastSent: "2026-04-04T07:00:00+05:30",
    nextScheduled: "2026-04-07T15:30:00+05:30",
    incompleteSession: false,
    suggestedNext: "Pre-call brief: scholarship interest + budget band; remind 24h before with Meet link.",
  },
  {
    id: "nur-7",
    student: "Vikram Desai",
    tier: "cold",
    stage: "Voice dropped — re-engage",
    lastSent: "2026-03-28T11:00:00+05:30",
    nextScheduled: "2026-04-05T11:00:00+05:30",
    incompleteSession: true,
    suggestedNext: "WhatsApp: “Still exploring UK Masters?” + link to book intro call; max two pings then rest.",
  },
  {
    id: "nur-8",
    student: "Ananya Iyer",
    tier: "warm",
    stage: "Post-call — thank you",
    lastSent: "2026-04-04T18:00:00+05:30",
    nextScheduled: "2026-04-08T10:00:00+05:30",
    incompleteSession: false,
    suggestedNext: "Share programme PDFs discussed on call; ask for decision timeline by end of week.",
  },
];

export const ANALYTICS_SUMMARY = {
  callsLast30d: 1842,
  leadsHotPercent: 22,
  topQuestions: [
    { q: "How much will studying abroad cost in total?", count: 312 },
    { q: "What scholarships can I apply for?", count: 276 },
    { q: "Can I work part-time while I study?", count: 241 },
    { q: "How long can I stay after I graduate?", count: 198 },
    { q: "How long does the visa process usually take?", count: 176 },
    { q: "Which universities are best for my subject?", count: 162 },
    { q: "Do I need IELTS or is there another English test?", count: 148 },
    { q: "When should I apply for the next intake?", count: 134 },
    { q: "Can my parents join the counselling call?", count: 119 },
  ],
  conversionFunnel: [
    { stage: "Voice answered", value: 100 },
    { stage: "Qualified extract", value: 74 },
    { stage: "Counsellor booked", value: 41 },
    { stage: "Deposit / enrolment", value: 12 },
  ],
};
