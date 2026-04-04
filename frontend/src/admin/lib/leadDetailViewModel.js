import { normalizeTranscript } from "./normalizeTranscript.js";
import {
  getVoiceSnapshot,
  getOnboardingQueuePayload,
  mergedScores,
  mergedCompleteness,
  buildMergedProfileTiles,
  buildCounsellorScanSummary,
  snapshotMeta,
  personaDisplay,
  formatEmotionalFromSnapshot,
  completenessFieldCount,
} from "./voiceBriefSnapshot.js";

export function classificationToTier(c) {
  const x = String(c || "").toLowerCase();
  if (x === "hot") return "hot";
  if (x === "warm") return "warm";
  return "cold";
}

export function scoreBandLabel(score) {
  const s = Number(score);
  if (Number.isNaN(s)) return "—";
  if (s >= 70) return "High";
  if (s >= 40) return "Medium";
  return "Low";
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

/** Mis-placed full snapshot on unresolved_objections (legacy / bad writes). */
function legacySnapshotFromObjections(lead) {
  const u = lead?.unresolved_objections;
  if (!u || typeof u !== "object" || Array.isArray(u)) return null;
  if ("extracted_data" in u || ("session_id" in u && "lead_score" in u)) return u;
  return null;
}

function effectiveSnapshot(lead) {
  return getVoiceSnapshot(lead) || legacySnapshotFromObjections(lead);
}

function normalizeObjectionItems(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        if (typeof item.text === "string") return item.text;
        if (typeof item.objection === "string") return item.objection;
        if (typeof item.label === "string") return item.label;
        return safeText(item, `Item ${idx + 1}`);
      }
      return safeText(item, `Item ${idx + 1}`);
    });
  }
  if (typeof raw === "object") {
    const inner = raw.unresolved_objections;
    if (Array.isArray(inner)) return normalizeObjectionItems(inner);
    return [safeText(raw)];
  }
  return [safeText(raw)];
}

function unresolvedObjectionsFromLead(lead, snapshot) {
  const fromSnap = snapshot?.unresolved_objections;
  const fromLead = lead?.unresolved_objections;
  if (fromSnap != null) return normalizeObjectionItems(fromSnap);
  return normalizeObjectionItems(fromLead);
}

function nextActionsFromLead(lead, snapshot) {
  const raw = snapshot?.recommended_actions ?? lead?.recommended_actions;
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [safeText(raw)];
  return raw.map((a, i) => {
    if (typeof a === "string") return a;
    if (a && typeof a === "object") {
      if (typeof a.action === "string") return a.action;
      if (typeof a.text === "string") return a.text;
      return safeText(a, `Action ${i + 1}`);
    }
    return safeText(a, `Action ${i + 1}`);
  });
}

function emotionalMerged(lead, snapshot) {
  const fromSnap = formatEmotionalFromSnapshot(snapshot?.emotional_state);
  if (fromSnap) return fromSnap;
  const parts = [
    lead?.emotional_anxiety && `Anxiety: ${safeText(lead.emotional_anxiety, "")}`,
    lead?.emotional_confidence && `Confidence: ${safeText(lead.emotional_confidence, "")}`,
    lead?.emotional_urgency && `Urgency: ${safeText(lead.emotional_urgency, "")}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function singleCallSession(lead) {
  const s = lead?.call_sessions;
  if (Array.isArray(s)) return s[0] ?? null;
  return s ?? null;
}

/**
 * @param {object} lead — full row from GET /api/leads/:id
 */
export function buildBriefViewModel(lead) {
  const snapshot = effectiveSnapshot(lead);
  const session = singleCallSession(lead);
  const endedAt =
    session?.ended_at || lead?.updated_at || lead?.created_at || null;
  const durationSec =
    session?.duration_seconds != null ? session.duration_seconds : null;

  const scores = mergedScores(lead, snapshot);
  const classification = scores.classification || lead.classification;

  const exName = snapshot?.extracted_data?.name;
  const studentName = safeText(lead.name || exName, "Unknown");

  return {
    id: lead.id,
    source: "api",
    studentName,
    endedAt,
    durationSec,
    tier: classificationToTier(classification),
    overallScore: scores.total,
    scoreBreakdown: {
      intent: scores.intent,
      financialReadiness: scores.financialReadiness,
      timelineUrgency: scores.timelineUrgency,
      profileCompleteness: mergedCompleteness(lead, snapshot),
    },
    persona: personaDisplay(lead, snapshot),
    emotionalState: emotionalMerged(lead, snapshot),
    unresolvedObjections: unresolvedObjectionsFromLead(lead, snapshot),
    nextActions: nextActionsFromLead(lead, snapshot),
    scanSummary: buildCounsellorScanSummary(lead, snapshot),
    transcript: normalizeTranscript(session?.transcript),
    rawLead: lead,
    callSession: session,
    voiceSnapshot: snapshot,
    onboardingQueue: getOnboardingQueuePayload(lead),
    mergedProfileTiles: buildMergedProfileTiles(lead, snapshot),
    snapshotMeta: snapshotMeta(snapshot),
    completenessFieldCount: completenessFieldCount(snapshot),
  };
}

export const SCORE_BREAKDOWN_LABELS = {
  intent: "Intent",
  financialReadiness: "Financial readiness",
  timelineUrgency: "Timeline urgency",
  profileCompleteness: "Profile completeness (data)",
};
