import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const LINKS = [
  { label: "About", href: "#mission" },
  { label: "Universities", href: "#universities" },
  { label: "Services", href: "#services" },
  { label: "Team", href: "#leadership" },
];

/** @type {'top' | 'heroDark' | 'light'} */
function getNavMode() {
  const hero = document.getElementById("hero");
  if (!hero) return "light";
  const heroBottom = hero.getBoundingClientRect().bottom;
  if (heroBottom <= 80) return "light";
  if (window.scrollY > 40) return "heroDark";
  return "top";
}

const Navbar = () => {
  const [mode, setMode] = useState("top");

  useEffect(() => {
    const onScroll = () => setMode(getNavMode());
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLight = mode === "light";
  const isHeroDark = mode === "heroDark";

  const navClass = isLight
    ? "border-fateh-border bg-fateh-paper/94 backdrop-blur-[14px]"
    : isHeroDark
      ? "border-fateh-gold/20 bg-fateh-ink/88 backdrop-blur-[16px]"
      : "border-transparent bg-transparent";

  const logoClass = isLight ? "text-fateh-ink" : "text-white";
  const linkClass = isLight ? "text-fateh-muted hover:text-fateh-gold" : "text-white/65 hover:text-fateh-gold";

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-between border-b px-6 py-5 transition-colors duration-500 md:px-10 lg:px-12 ${navClass}`}
    >
      <a href="#hero" className={`font-fateh-serif text-2xl font-semibold tracking-wide transition-colors ${logoClass}`}>
        Fateh <span className="text-fateh-gold">Education</span>
      </a>

      <ul className="hidden list-none items-center gap-8 lg:flex">
        {LINKS.map(({ label, href }) => (
          <li key={href}>
            <a
              href={href}
              className={`text-[0.8rem] uppercase tracking-[0.07em] transition-colors ${linkClass}`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      <a
        href="#register"
        className="rounded-sm bg-fateh-gold px-5 py-2.5 text-[0.8rem] font-medium uppercase tracking-[0.08em] text-fateh-ink transition hover:bg-fateh-gold-light"
      >
        Free Counselling
      </a>
    </motion.nav>
  );
};

export default Navbar;
