import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import "./AskFatehSidebar.css";

export default function SentinelSidebar({
  open,
  onClose,
  title,
  subtitle,
  headerExtra,
  children, // The messages / scrollable content
  footer,
  toggleLabel = "Ask Fateh",
  wrapperClass = "",
}) {
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const iconRef = useRef(null);
  const textInnerRef = useRef(null);
  const listRef = useRef(null);
  const busyRef = useRef(false);

  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const spinTweenRef = useRef(null);
  const textCycleAnimRef = useRef(null);
  
  const [textLines, setTextLines] = useState([toggleLabel]);

  // ── Initial GSAP state ──────────────────────────────────────────────────────
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

      gsap.set([panel, ...preLayers], { xPercent: 100 });
      gsap.set(icon, { rotate: 0, transformOrigin: "50% 50%" });
      gsap.set(textInner, { yPercent: 0 });
    });
    return () => ctx.revert();
  }, []);

  // ── Animation Controllers ──────────────────────────────────────────────────
  const animateIcon = useCallback((opening) => {
    const icon = iconRef.current;
    if (!icon) return;
    spinTweenRef.current?.kill();
    if (opening) {
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

    const currentLabel = opening ? toggleLabel : "Close";
    const targetLabel = opening ? "Close" : toggleLabel;
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === toggleLabel ? "Close" : toggleLabel;
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
  }, [toggleLabel]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }

    const staggerEls = Array.from(panel.querySelectorAll(".afs-stagger-item"));

    if (staggerEls.length) {
      gsap.set(staggerEls, { yPercent: 140, rotate: 5, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });

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

    tl.fromTo(
      panel,
      { xPercent: 100 },
      { xPercent: 0, duration: panelDuration, ease: "power4.out" },
      panelInsertTime,
    );

    if (staggerEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.2;
      tl.to(
        staggerEls,
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

    const staggerEls = Array.from(panel.querySelectorAll(".afs-stagger-item"));

    if (staggerEls.length) {
      tl.to(staggerEls, {
        yPercent: 140,
        rotate: -5,
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        stagger: { each: 0.04, from: "end" },
      });
    }

    tl.to(
      panel,
      { xPercent: 100, duration: 0.5, ease: "power3.inOut" },
      "-=0.2",
    );

    if (layers.length) {
      layers.slice().reverse().forEach((layer) => {
        tl.to(layer, { xPercent: 100, duration: 0.45, ease: "power3.inOut" }, "-=0.35");
      });
    }

    closeTweenRef.current = tl;
  }, []);

  // ── Sync ──────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
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

  // ── Auto-scroll content ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(t);
  }, [open, children]);

  return (
    <div className={`ask-fateh-sidebar-wrapper ${wrapperClass}`} data-open={open || undefined}>
      <div
        className="ask-fateh-sidebar-overlay"
        onClick={onClose}
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.6s ease",
        }}
      />

      <div ref={preLayersRef} className="afs-prelayers" aria-hidden="true">
        <div className="afs-prelayer" style={{ background: "#0b0e1a" }} />
        <div className="afs-prelayer" style={{ background: "#c8a45a" }} />
      </div>

      <header className="ask-fateh-sidebar-header">
        <button
          type="button"
          onClick={onClose}
          className="afs-toggle"
          aria-label={open ? "Close" : "Open"}
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
              <h2 className="afs-chat-title">{title}</h2>
            </div>
            <div className="afs-stagger-item">
              <p className="afs-chat-subtitle">{subtitle}</p>
            </div>
            {headerExtra && (
              <div className="afs-stagger-item">
                {headerExtra}
              </div>
            )}
          </div>

          <div ref={listRef} className="afs-messages-container">
            {children}
          </div>

          <div className="afs-stagger-item mt-auto">
            {footer}
          </div>
        </div>
      </aside>
    </div>
  );
}
