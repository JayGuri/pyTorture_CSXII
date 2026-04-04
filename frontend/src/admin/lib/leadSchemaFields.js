/**
 * Display map for leads + nested call_sessions columns (Supabase schema).
 */

export const LEAD_SCHEMA_FIELD_ROWS = [
  { key: "id", label: "Lead ID", group: "Record" },
  { key: "session_id", label: "Session ID (FK)", group: "Record" },
  { key: "name", label: "Name", group: "Profile" },
  { key: "phone", label: "Phone", group: "Profile" },
  { key: "email", label: "Email", group: "Profile" },
  { key: "location", label: "Location", group: "Profile" },
  { key: "education_level", label: "Education level", group: "Academic" },
  { key: "field", label: "Field", group: "Academic" },
  { key: "institution", label: "Institution", group: "Academic" },
  { key: "gpa", label: "GPA", group: "Academic" },
  { key: "target_countries", label: "Target countries", group: "Academic" },
  { key: "course_interest", label: "Course interest", group: "Academic" },
  { key: "intake_timing", label: "Intake timing", group: "Academic" },
  { key: "ielts_score", label: "IELTS score", group: "Academic" },
  { key: "pte_score", label: "PTE score", group: "Academic" },
  { key: "budget_range", label: "Budget range", group: "Financial" },
  { key: "budget_status", label: "Budget status", group: "Financial" },
  { key: "scholarship_interest", label: "Scholarship interest", group: "Financial" },
  { key: "timeline", label: "Timeline", group: "Planning" },
  { key: "application_stage", label: "Application stage", group: "Planning" },
  { key: "persona_type", label: "Persona type", group: "Intelligence" },
  { key: "lead_score", label: "Lead score", group: "Scores" },
  { key: "intent_score", label: "Intent score", group: "Scores" },
  { key: "financial_score", label: "Financial score", group: "Scores" },
  { key: "timeline_score", label: "Timeline score", group: "Scores" },
  { key: "classification", label: "Classification", group: "Scores" },
  { key: "data_completeness", label: "Data completeness", group: "Scores" },
  { key: "emotional_anxiety", label: "Emotional — anxiety", group: "Signals" },
  { key: "emotional_confidence", label: "Emotional — confidence", group: "Signals" },
  { key: "emotional_urgency", label: "Emotional — urgency", group: "Signals" },
  { key: "callback_requested", label: "Callback requested", group: "Signals" },
  { key: "competitor_mentioned", label: "Competitor mentioned", group: "Signals" },
  { key: "ielts_upsell_flag", label: "IELTS upsell flag", group: "Signals" },
  { key: "counsellor_brief", label: "Counsellor brief", group: "Intelligence" },
  { key: "recommended_universities", label: "Recommended universities (stored)", group: "Intelligence" },
  { key: "unresolved_objections", label: "Unresolved objections (stored)", group: "Intelligence" },
  { key: "created_at", label: "Created at", group: "Record" },
  { key: "updated_at", label: "Updated at", group: "Record" },
  { key: "call_sessions.id", label: "Call session ID", group: "Call session" },
  { key: "call_sessions.twilio_call_sid", label: "Twilio call SID", group: "Call session" },
  { key: "call_sessions.caller_phone", label: "Caller phone", group: "Call session" },
  { key: "call_sessions.status", label: "Call status", group: "Call session" },
  { key: "call_sessions.language_detected", label: "Language detected", group: "Call session" },
  { key: "call_sessions.duration_seconds", label: "Duration (seconds)", group: "Call session" },
  { key: "call_sessions.created_at", label: "Call started", group: "Call session" },
  { key: "call_sessions.ended_at", label: "Call ended", group: "Call session" },
];

export function getLeadFieldValue(lead, dottedKey) {
  if (!lead) return "—";
  const parts = dottedKey.split(".");
  let cur = lead;
  for (const p of parts) {
    cur = cur?.[p];
  }
  if (cur === null || cur === undefined || cur === "") return "—";
  if (typeof cur === "boolean") return cur ? "Yes" : "No";
  if (Array.isArray(cur)) {
    if (cur.length === 0) return "—";
    if (cur.every((x) => typeof x !== "object")) return cur.join(", ");
    return JSON.stringify(cur);
  }
  if (typeof cur === "object") return JSON.stringify(cur);
  return String(cur);
}

/** Only rows with a real value — for collapsed "raw DB" view. */
export function getPopulatedLeadFieldRows(lead) {
  return LEAD_SCHEMA_FIELD_ROWS.map((row) => ({
    ...row,
    display: getLeadFieldValue(lead, row.key),
  })).filter(
    (r) =>
      r.display !== "—" &&
      r.key !== "counsellor_brief" &&
      r.key !== "unresolved_objections",
  );
}
