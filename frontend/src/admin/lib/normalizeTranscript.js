/**
 * Normalize call_sessions.transcript (jsonb) into { role: 'agent'|'student', text } lines for admin UI.
 */

export function normalizeTranscript(raw) {
  if (raw == null) return [];

  let arr = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return raw.trim() ? [{ role: "student", text: raw.trim() }] : [];
    }
  }

  if (!Array.isArray(arr)) return [];

  return arr
    .map((line) => {
      const roleRaw = String(line.role || line.speaker || "").toLowerCase();
      let role = "student";
      if (
        roleRaw === "assistant" ||
        roleRaw === "agent" ||
        roleRaw === "ai" ||
        roleRaw === "model" ||
        roleRaw === "system"
      ) {
        role = "agent";
      }
      const text = line.text ?? line.content ?? line.message ?? "";
      return { role, text: String(text) };
    })
    .filter((l) => l.text.trim());
}
