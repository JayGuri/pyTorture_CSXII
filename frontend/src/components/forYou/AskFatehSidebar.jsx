import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { askFatehAgent } from "../../lib/fatehAgent";
import "./AskFatehSidebar.css";

export default function AskFatehSidebar({ open, onClose }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text: "Hi — I'm Fateh's study-abroad assistant. Ask about visas, deadlines, fees, or shortlisting. I'll clarify what I can; your human counsellor handles anything official.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [textLines, setTextLines] = useState(["Ask Fateh", "Close"]);

  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const iconRef = useRef(null);
  const textInnerRef = useRef(null);
  const listRef = useRef(null);
  const abortRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const busyRef = useRef(false);

  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const spinTweenRef = useRef(null);
  const textCycleAnimRef = useRef(null);

  // Setup initial GSAP state to match StaggeredMenu exactly
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;
      if (!panel || !icon || !textInner) return;

      let preLayers = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll(".afs-prelayer"));
      }
      preLayerElsRef.current = preLayers;

      // Start offscreen to the right (100)
      gsap.set([panel, ...preLayers], { xPercent: 100 });
      gsap.set(icon, { rotate: 0, transformOrigin: "50% 50%" });
      gsap.set(textInner, { yPercent: 0 });
    });
    return () => ctx.revert();
  }, []);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }

    // Capture individual elements for staggered reveal
    const titleLines = Array.from(panel.querySelectorAll(".afs-stagger-item"));

    // Initial state for content items (matches StaggeredMenu itemEls)
    if (titleLines.length) {
      gsap.set(titleLines, { yPercent: 140, rotate: 5, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });

    // 1. Pre-layers animation (the signature staggered sliding colors)
    layers.forEach((el, i) => {
      tl.fromTo(
        el,
        { xPercent: 100 },
        { xPercent: 0, duration: 0.55, ease: "power4.out" },
        i * 0.08,
      );
    });

    const lastTime = layers.length ? (layers.length - 1) * 0.08 : 0;
    const panelInsertTime = lastTime + 0.1;
    const panelDuration = 0.75;

    // 2. Main panel entrance
    tl.fromTo(
      panel,
      { xPercent: 100 },
      { xPercent: 0, duration: panelDuration, ease: "power4.out" },
      panelInsertTime,
    );

    // 3. Staggered reveal of header and chat elements
    if (titleLines.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.2;
      tl.to(
        titleLines,
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 1.1,
          ease: "power4.out",
          stagger: { each: 0.08, from: "start" },
        },
        itemsStart,
      );
    }

    openTlRef.current = tl;
    return tl;
  }, []);

  const playOpen = useCallback(() => {
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback("onComplete", () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    busyRef.current = true;
    openTlRef.current?.kill();
    openTlRef.current = null;

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const tl = gsap.timeline({
      onComplete: () => {
        busyRef.current = false;
      },
    });

    const titleLines = Array.from(panel.querySelectorAll(".afs-stagger-item"));

    // 1. Content exit (staggered reverse)
    if (titleLines.length) {
      tl.to(titleLines, {
        yPercent: 140,
        rotate: -5,
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        stagger: { each: 0.04, from: "end" },
      });
    }

    // 2. Main panel exit
    tl.to(
      panel,
      {
        xPercent: 100,
        duration: 0.5,
        ease: "power3.inOut",
      },
      "-=0.2",
    );

    // 3. Pre-layers exit (staggered reverse)
    if (layers.length) {
      layers
        .slice()
        .reverse()
        .forEach((layer, i) => {
          tl.to(
            layer,
            {
              xPercent: 100,
              duration: 0.45,
              ease: "power3.inOut",
            },
            "-=0.35",
          );
        });
    }

    closeTweenRef.current = tl;
  }, []);

  const animateIcon = useCallback((opening) => {
    const icon = iconRef.current;
    if (!icon) return;
    spinTweenRef.current?.kill();
    if (opening) {
      // Rotate 225deg to turn + into x (same as StaggeredMenu)
      spinTweenRef.current = gsap.to(icon, {
        rotate: 225,
        duration: 0.8,
        ease: "power4.out",
        overwrite: "auto",
      });
    } else {
      spinTweenRef.current = gsap.to(icon, {
        rotate: 0,
        duration: 0.35,
        ease: "power3.inOut",
        overwrite: "auto",
      });
    }
  }, []);

  const animateText = useCallback((opening) => {
    const inner = textInnerRef.current;
    if (!inner) return;
    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? "Ask Fateh" : "Close";
    const targetLabel = opening ? "Close" : "Ask Fateh";
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === "Ask Fateh" ? "Close" : "Ask Fateh";
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    setTextLines(seq);

    gsap.set(inner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: "power4.out",
    });
  }, []);

  // Control side effects based on 'open' prop change
  useEffect(() => {
    if (open) {
      playOpen();
      animateIcon(true);
      animateText(true);
    } else {
      playClose();
      animateIcon(false);
      animateText(false);
    }
  }, [open, playOpen, playClose, animateIcon, animateText]);

  // Chat Logic & Lifecycle
  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      // Maintain scroll position at bottom
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
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

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = "";
    };
  }, [open]);

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
      // Convert messages to { role, content } for the backend LLM
      const history = messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const reply = await askFatehAgent(text, {
        signal: ac.signal,
        history: history,
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
    <div className="ask-fateh-sidebar-wrapper" data-open={open || undefined}>
      <div
        className="ask-fateh-sidebar-overlay"
        onClick={onClose}
        style={{
          opacity: open ? 1 : 0,
          transition: "opacity 0.6s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* 3-layer staggering pre-layers (matches StaggeredMenu depth) */}
      <div ref={preLayersRef} className="afs-prelayers" aria-hidden="true">
        <div className="afs-prelayer" style={{ background: "#0b0e1a" }} />
        <div className="afs-prelayer" style={{ background: "#c8a45a" }} />
      </div>

      <header className="ask-fateh-sidebar-header" aria-label="Chat navigation">
        <button
          ref={toggleBtnRef}
          className="afs-toggle"
          aria-label={open ? "Close chat" : "Open chat"}
          onClick={onClose}
          type="button"
          style={{
            opacity: open ? 1 : 0,
            visibility: open ? "visible" : "hidden",
            transition: "opacity 0.4s ease 0.2s",
          }}
        >
          <span className="afs-toggle-textWrap" aria-hidden="true">
            <span ref={textInnerRef} className="afs-toggle-textInner">
              {textLines.map((l, i) => (
                <span className="afs-toggle-line" key={`${l}-${i}`}>
                  {l}
                </span>
              ))}
            </span>
          </span>
          <span ref={iconRef} className="afs-icon" aria-hidden="true">
            <span className="afs-icon-line" />
            <span className="afs-icon-line afs-icon-line-v" />
          </span>
        </button>
      </header>

      <aside ref={panelRef} className="ask-fateh-sidebar-panel">
        <div className="afs-panel-inner">
          <div className="afs-chat-header">
            <div className="afs-stagger-item">
              <h2 className="afs-chat-title">Ask Fateh</h2>
            </div>
            <div className="afs-stagger-item">
              <p className="afs-chat-subtitle">
                AI Advisor · Doubts & Clarifications
              </p>
            </div>
          </div>

          <div ref={listRef} className="afs-messages-container">
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
              <div
                className="afs-message-row afs-stagger-item"
                data-role="assistant"
              >
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
          </div>

          <div className="afs-input-area afs-stagger-item">
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
            <p className="afs-disclaimer">
              Not legal advice — confirm with your counsellor.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
