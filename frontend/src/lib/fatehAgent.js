/**
 * Ask Fateh — optional backend. Set VITE_FATEH_AGENT_URL to POST { message } and read { reply } or { message }.
 * Offline: short, helpful templated replies (not context-aware; no follow-up nudges in UI).
 */

function offlineReply(text) {
  const t = text.toLowerCase();
  if (/visa|passport|stamp|embassy/.test(t)) {
    return "For visa-specific steps, use the Visa help section on this page for passport upload and travel history. Your counsellor will align documentation with the latest embassy guidance.";
  }
  if (/scholar|fund|fee|loan|money|inr|budget/.test(t)) {
    return "Scholarships and cost breakdowns are on this hub: open Scholarships for eligibility detail, and Financial clarity for live INR conversion with a buffer band.";
  }
  if (/deadline|date|calendar|remind/.test(t)) {
    return "Recommended course deadlines are listed under Deadlines & reminders — you can add each to Google Calendar from there.";
  }
  if (/compare|which (uni|university|course)/.test(t)) {
    return "Use Comparison mode to put up to three recommended courses side by side — fees, intake, and region in one table.";
  }
  return "Thanks for reaching out. A Fateh advisor can go deeper on a counselling call. Meanwhile, browse Scholarships, Visa help, and Financial clarity on this page for structured answers.";
}

export async function askFatehAgent(userMessage, { signal } = {}) {
  const url = import.meta.env.VITE_FATEH_AGENT_URL;
  const trimmed = String(userMessage || "").trim();
  if (!trimmed) return "";

  if (url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
      signal,
    });
    if (!res.ok) throw new Error("Agent unavailable");
    const data = await res.json().catch(() => ({}));
    const reply = data.reply ?? data.message ?? data.text;
    if (typeof reply === "string" && reply.trim()) return reply.trim();
    throw new Error("Empty agent response");
  }

  await new Promise((r) => setTimeout(r, 450));
  return offlineReply(trimmed);
}
