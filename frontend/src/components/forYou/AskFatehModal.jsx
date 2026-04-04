import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { askFatehAgent } from "../../lib/fatehAgent";

export default function AskFatehModal({ open, onClose }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text: "Hi — I'm Fateh's study-abroad assistant. Ask about visas, deadlines, fees, or shortlisting. I'll clarify what I can; your human counsellor handles anything official.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(t);
  }, [open, messages, loading]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const reply = await askFatehAgent(text, { signal: ac.signal });
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Something went wrong. Try again.");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I couldn't reach the advisor service just now. Please retry in a moment or book a counselling call from the hero section.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div key="ask-fateh" className="contents">
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-80 bg-fateh-ink/55 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ask-fateh-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-90 flex max-h-[min(560px,85vh)] w-[min(440px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-fateh-gold/25 bg-fateh-paper shadow-[0_32px_100px_-24px_rgba(11,14,26,0.45)]"
          >
            <div className="flex items-center justify-between border-b border-fateh-border/90 bg-fateh-ink px-5 py-4 text-fateh-paper">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fateh-gold/20 text-fateh-gold-light">
                  <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <div>
                  <h2 id="ask-fateh-title" className="font-fateh-serif text-lg font-semibold normal-case">
                    Ask Fateh
                  </h2>
                  <p className="text-[0.65rem] uppercase tracking-wider text-white/45">Doubts &amp; clarifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed normal-case ${
                      msg.role === "user"
                        ? "bg-fateh-accent text-white"
                        : "border border-fateh-border/80 bg-white text-fateh-ink"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-fateh-border/80 bg-white px-4 py-3 text-sm text-fateh-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-fateh-gold" />
                    Thinking…
                  </div>
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="border-t border-fateh-border/60 bg-red-50 px-5 py-2 text-xs text-red-800">{error}</p>
            ) : null}

            <div className="border-t border-fateh-border/90 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Type your question…"
                  className="min-w-0 flex-1 rounded-xl border border-fateh-border bg-white px-4 py-3 text-sm text-fateh-ink outline-none ring-fateh-gold/30 placeholder:text-fateh-muted focus:ring-2"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-fateh-gold px-4 py-3 text-fateh-ink transition hover:bg-fateh-gold-light disabled:opacity-40"
                >
                  <Send className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
              <p className="mt-2 text-[0.65rem] text-fateh-muted normal-case">
                Not legal or immigration advice — confirm with your counsellor and official sources.
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
