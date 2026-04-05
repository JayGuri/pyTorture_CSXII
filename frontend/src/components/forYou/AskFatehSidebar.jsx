import React, { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { askFatehAgent } from "../../lib/fatehAgent";
import SentinelSidebar from "./SentinelSidebar";

export default function AskFatehSidebar({ open, onClose }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi — I'm Fateh's study-abroad assistant. Ask about visas, deadlines, fees, or shortlisting. I'll clarify what I can; your human counsellor handles anything official.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

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
      const history = messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));
      const reply = await askFatehAgent(text, {
        signal: ac.signal,
        history,
      });
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Something went wrong. Try again.");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I couldn't reach the advisor service. Please book a counselling call in the main section.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SentinelSidebar
      open={open}
      onClose={onClose}
      title="Ask Fateh"
      subtitle="AI Advisor · Doubts & Clarifications"
      toggleLabel="Ask Fateh"
    >
      {/* Children: Messages */}
      {messages.map((msg, i) => (
        <div
          key={i}
          className="afs-message-row afs-stagger-item"
          data-role={msg.role}
        >
          <div className="afs-message-bubble">{msg.text}</div>
        </div>
      ))}
      
      {loading && (
        <div className="afs-message-row afs-stagger-item" data-role="assistant">
          <div className="afs-message-bubble inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#c8a45a]" />
            Thinking…
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 rounded-lg mx-6 mt-2 afs-stagger-item">
          {error}
        </div>
      )}

      {/* Footer: Input Area */}
      {/* Note: SentinelSidebar puts 'footer' prop in a stagger item at bottom */}
      {/* We can also just put the whole area here as part of the messages if we want it to scroll, 
          but usually the input is fixed. SentinelSidebar has a specific footer slot.
      */}
      <div className="afs-input-area mt-4 pb-4">
        <div className="afs-input-wrap">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type your question…"
            className="afs-input"
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            className="afs-send-btn"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="afs-disclaimer mt-2">
          Not legal advice — confirm with your counsellor.
        </p>
      </div>
    </SentinelSidebar>
  );
}
