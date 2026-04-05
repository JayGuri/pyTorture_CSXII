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

export async function askFatehAgent(userMessage, { signal, history = [] } = {}) {
  // Use backend if environment is set, otherwise default to relative path for current host
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const endpoint = `${baseUrl}/api/v1/for-you/ask-fateh`;
  
  const trimmed = String(userMessage || "").trim();
  if (!trimmed) return "";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: trimmed,
        history: history 
      }),
      signal,
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.reply || data.message || "I couldn't generate a reply.";
    }
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    console.error("AskFateh error:", e);
  }

  // Fallback to offline logic
  await new Promise((r) => setTimeout(r, 600));
  return offlineReply(trimmed);
}
