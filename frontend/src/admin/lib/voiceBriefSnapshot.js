/**
 * Parses counsellor_brief JSON from the voice pipeline (LeadSnapshot / model_dump)
 * and merges with flat leads columns for admin display.
 *
 * Backend: backend/src/models/types.py — LeadSnapshot, ExtractedData
 */

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Full voice snapshot stored in counsellor_brief by orchestrator.
 */
export function getVoiceSnapshot(lead) {
  const b = lead?.counsellor_brief;
  if (!isPlainObject(b)) return null;
  if (b.onboarding_queue != null && b.extracted_data == null) return null;
  if (b.extracted_data != null && isPlainObject(b.extracted_data)) return b;
  if (b.session_id != null && b.lead_score != null) return b;
  return null;
}

/** onboarding_queue.py overwrites counsellor_brief with { onboarding_queue: ... } */
export function getOnboardingQueuePayload(lead) {
  const b = lead?.counsellor_brief;
  if (!isPlainObject(b) || b.onboarding_queue == null) return null;
  return b.onboarding_queue;
}

export function nestedLeadScore(snapshot) {
  const ls = snapshot?.lead_score;
  if (!isPlainObject(ls)) return null;
  return ls;
}

export function coerceNum(v, fallback = 0) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Prefer CRM columns; fill from snapshot.lead_score when missing or zero. */
export function mergedScores(lead, snapshot) {
  const snap = nestedLeadScore(snapshot);
  const fromSnap = (k) => coerceNum(snap?.[k], NaN);
  const pick = (crmVal, snapKey) => {
    const c = coerceNum(crmVal, NaN);
    if (Number.isFinite(c) && c > 0) return c;
    const s = fromSnap(snapKey);
    return Number.isFinite(s) ? s : 0;
  };

  const total =
    coerceNum(lead?.lead_score, NaN) > 0
      ? coerceNum(lead.lead_score, 0)
      : coerceNum(snap?.total, 0);

  return {
    total,
    intent: pick(lead?.intent_score, "intent_seriousness"),
    financialReadiness: pick(lead?.financial_score, "financial_readiness"),
    timelineUrgency: pick(lead?.timeline_score, "timeline_urgency"),
    classification: lead?.classification || snap?.classification || null,
  };
}

export function mergedCompleteness(lead, snapshot) {
  const pctFromLead = coerceNum(lead?.data_completeness, NaN);
  if (Number.isFinite(pctFromLead) && pctFromLead > 0) return pctFromLead;
  return coerceNum(snapshot?.data_completeness_pct, 0);
}

export function completenessFieldCount(snapshot) {
  const n = snapshot?.data_completeness;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function formatEmotionalFromSnapshot(es) {
  if (!isPlainObject(es)) return null;
  const parts = [];
  const a = es.anxiety ?? es.Anxiety;
  const c = es.confidence ?? es.Confidence;
  const u = es.urgency ?? es.Urgency;
  if (a != null && a !== "") parts.push(`Anxiety: ${a}`);
  if (c != null && c !== "") parts.push(`Confidence: ${c}`);
  if (u != null && u !== "") parts.push(`Urgency: ${u}`);
  return parts.length ? parts.join(" · ") : null;
}

export function personaDisplay(lead, snapshot) {
  const p = lead?.persona_type;
  if (typeof p === "string" && p.trim()) return humanizePersona(p);
  const sp = snapshot?.persona;
  if (typeof sp === "string" && sp.trim()) return humanizePersona(sp);
  return "—";
}

function humanizePersona(s) {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function pickVal(snapVal, leadVal, format = (x) => x) {
  const hasSnap =
    snapVal !== undefined &&
    snapVal !== null &&
    snapVal !== "" &&
    !(Array.isArray(snapVal) && snapVal.length === 0);
  const hasLead =
    leadVal !== undefined &&
    leadVal !== null &&
    leadVal !== "" &&
    !(Array.isArray(leadVal) && leadVal.length === 0);
  const raw = hasSnap ? snapVal : hasLead ? leadVal : null;
  if (raw === null || raw === undefined) return null;
  return format(raw);
}

/**
 * Rows for "Student profile" tiles — merged ExtractedData + leads row.
 */
export function buildMergedProfileTiles(lead, snapshot) {
  const ex = snapshot?.extracted_data;
  const loc = isPlainObject(ex?.location) ? ex.location : {};
  const edu = isPlainObject(ex?.education) ? ex.education : {};
  const pref = isPlainObject(ex?.preferences) ? ex.preferences : {};
  const test = isPlainObject(ex?.test_status) ? ex.test_status : {};
  const fin = isPlainObject(ex?.financial) ? ex.financial : {};
  const tl = isPlainObject(ex?.timeline) ? ex.timeline : {};

  const fmtCountries = (x) => (Array.isArray(x) ? x.join(", ") : String(x));
  const fmtBool = (x) => (typeof x === "boolean" ? (x ? "Yes" : "No") : String(x));

  const rows = [
    { group: "Identity", label: "Name", value: pickVal(ex?.name, lead?.name) },
    { group: "Identity", label: "Phone", value: pickVal(ex?.phone, lead?.phone) },
    { group: "Identity", label: "Email", value: pickVal(ex?.email, lead?.email) },
    {
      group: "Location",
      label: "City / location",
      value: pickVal(loc.city, lead?.location),
    },
    {
      group: "Education",
      label: "Level",
      value: pickVal(edu.level, lead?.education_level),
    },
    { group: "Education", label: "Field", value: pickVal(edu.field, lead?.field) },
    {
      group: "Education",
      label: "Institution",
      value: pickVal(edu.institution, lead?.institution),
    },
    {
      group: "Education",
      label: "GPA / %",
      value: pickVal(edu.gpa_percentage, lead?.gpa, (x) => String(x)),
    },
    {
      group: "Goals",
      label: "Target countries",
      value: pickVal(pref.target_countries, lead?.target_countries, fmtCountries),
    },
    {
      group: "Goals",
      label: "Course interest",
      value: pickVal(pref.course_interest, lead?.course_interest),
    },
    {
      group: "Goals",
      label: "Intake timing",
      value: pickVal(pref.intake_timing, lead?.intake_timing),
    },
    {
      group: "English tests",
      label: "Exam & score",
      value: (() => {
        const et = test.exam_type;
        const sc = test.score;
        if (et && sc != null) return `${et}: ${sc}`;
        const i = lead?.ielts_score;
        const p = lead?.pte_score;
        if (i != null) return `IELTS: ${i}`;
        if (p != null) return `PTE: ${p}`;
        if (test.stage && test.stage !== "not_started") return `Stage: ${test.stage}`;
        return null;
      })(),
    },
    {
      group: "Financial",
      label: "Budget range",
      value: pickVal(fin.budget_range, lead?.budget_range),
    },
    {
      group: "Financial",
      label: "Budget status",
      value: pickVal(fin.budget_status, lead?.budget_status),
    },
    {
      group: "Financial",
      label: "Scholarship interest",
      value: pickVal(fin.scholarship_interest, lead?.scholarship_interest, fmtBool),
    },
    {
      group: "Planning",
      label: "Application stage",
      value: pickVal(tl.application_stage, lead?.application_stage),
    },
  ];

  return rows.filter((r) => r.value != null && r.value !== "");
}

export function buildCounsellorScanSummary(lead, snapshot) {
  const brief = lead?.counsellor_brief;
  if (typeof brief === "string" && brief.trim()) return brief.trim();

  if (!snapshot) {
    const ob = getOnboardingQueuePayload(lead);
    if (ob != null) {
      return "Voice snapshot was replaced by onboarding queue data. See the onboarding notice below; CRM columns still hold the latest lead fields.";
    }
    return "No structured voice snapshot in counsellor_brief. Use the merged profile and database sections below.";
  }

  const lines = [];
  const ex = snapshot.extracted_data || {};
  const name = ex.name || lead.name;
  if (name) lines.push(`Lead: ${name}`);

  const countries =
    (ex.preferences?.target_countries?.length && ex.preferences.target_countries.join(", ")) ||
    (Array.isArray(lead.target_countries) && lead.target_countries.join(", ")) ||
    null;
  if (countries) lines.push(`Targets: ${countries}`);

  const course = ex.preferences?.course_interest || lead.course_interest;
  if (course) lines.push(`Program interest: ${course}`);

  const intake = ex.preferences?.intake_timing || lead.intake_timing;
  if (intake) lines.push(`Intake: ${intake}`);

  const pct = snapshot.data_completeness_pct;
  const cnt = snapshot.data_completeness;
  if (pct != null || cnt != null) {
    const bits = [];
    if (pct != null) bits.push(`${pct}% complete`);
    if (cnt != null) bits.push(`${cnt}/12 fields captured in voice model`);
    lines.push(bits.join(" · "));
  }

  if (snapshot.session_id) lines.push(`Session: ${snapshot.session_id.slice(0, 8)}…`);

  return lines.length > 0 ? lines.join("\n") : "Voice snapshot present; see profile tiles for extracted fields.";
}

export function snapshotMeta(snapshot) {
  if (!snapshot) return null;
  return {
    sessionId: snapshot.session_id || null,
    timestamp: snapshot.timestamp || null,
    completenessPct: snapshot.data_completeness_pct ?? null,
    completenessCount: snapshot.data_completeness ?? null,
  };
}
