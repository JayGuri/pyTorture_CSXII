import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const HOME_HASH_LINKS = [
  { label: "About", to: "/#mission" },
  { label: "Universities", to: "/#universities" },
  { label: "Services", to: "/#services" },
  { label: "Team", to: "/#leadership" },
];

function navModeForPath(pathname) {
  if (pathname !== "/") return "light";
  const hero = document.getElementById("hero");
  if (!hero) return "light";
  const heroBottom = hero.getBoundingClientRect().bottom;
  if (heroBottom <= 80) return "light";
  if (window.scrollY > 40) return "heroDark";
  return "top";
}

const Navbar = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mode, setMode] = useState("light");

  useEffect(() => {
    const onScroll = () => setMode(navModeForPath(location.pathname));
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  const isLight = mode === "light" || location.pathname !== "/";
  const isHeroDark = mode === "heroDark" && location.pathname === "/";

  const navClass = isLight
    ? "border-fateh-border bg-fateh-paper/94 backdrop-blur-[14px]"
    : isHeroDark
      ? "border-fateh-gold/20 bg-fateh-ink/88 backdrop-blur-[16px]"
      : "border-transparent bg-transparent";

  const logoClass = isLight ? "text-fateh-ink" : "text-white";
  const linkClass = isLight ? "text-fateh-muted hover:text-fateh-gold" : "text-white/65 hover:text-fateh-gold";
  const subtleClass = isLight ? "text-fateh-muted hover:text-fateh-ink" : "text-white/55 hover:text-fateh-gold";

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-[200] border-b px-4 py-4 transition-colors duration-500 md:px-8 lg:px-12 ${navClass}`}
    >
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className={`font-fateh-serif text-xl font-semibold tracking-wide transition-colors md:text-2xl ${logoClass}`}
        >
          Fateh <span className="text-fateh-gold">Education</span>
        </Link>

        <ul className="hidden list-none items-center gap-6 lg:flex xl:gap-8">
          {HOME_HASH_LINKS.map(({ label, to }) => (
            <li key={to}>
              <Link to={to} className={`text-[0.8rem] uppercase tracking-[0.07em] transition-colors ${linkClass}`}>
                {label}
              </Link>
            </li>
          ))}
          {isAuthenticated ? (
            <li>
              <Link
                to="/for-you"
                className={`text-[0.8rem] uppercase tracking-[0.07em] transition-colors ${
                  location.pathname === "/for-you" ? "text-fateh-gold" : linkClass
                }`}
              >
                For you
              </Link>
            </li>
          ) : null}
        </ul>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/for-you"
                className={`lg:hidden text-[0.65rem] font-semibold uppercase tracking-[0.1em] transition ${
                  location.pathname === "/for-you" ? "text-fateh-gold" : subtleClass
                }`}
              >
                For you
              </Link>
              <span className={`hidden max-w-[140px] truncate text-xs font-medium normal-case sm:inline md:max-w-[180px] ${subtleClass}`}>
                {user?.name}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className={`rounded-sm border px-3 py-2 text-[0.65rem] font-medium uppercase tracking-[0.08em] transition md:px-4 md:text-[0.72rem] ${
                  isLight
                    ? "border-fateh-border text-fateh-muted hover:border-fateh-gold hover:text-fateh-gold"
                    : "border-white/25 text-white/75 hover:border-fateh-gold hover:text-fateh-gold"
                }`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`rounded-sm px-3 py-2 text-[0.65rem] font-medium uppercase tracking-[0.08em] transition md:px-4 md:text-[0.72rem] ${
                  isLight ? "text-fateh-ink hover:text-fateh-gold" : "text-white/85 hover:text-fateh-gold"
                }`}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className={`rounded-sm border px-3 py-2 text-[0.65rem] font-medium uppercase tracking-[0.08em] transition md:px-4 md:text-[0.72rem] ${
                  isLight
                    ? "border-fateh-border text-fateh-ink hover:border-fateh-gold"
                    : "border-white/30 text-white hover:border-fateh-gold"
                }`}
              >
                Sign up
              </Link>
            </>
          )}
          <Link
            to="/#register"
            className="rounded-sm bg-fateh-gold px-3 py-2 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-fateh-ink transition hover:bg-fateh-gold-light md:px-5 md:py-2.5 md:text-[0.72rem]"
          >
            <span className="hidden sm:inline">Free Counselling</span>
            <span className="sm:hidden">Counsel</span>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
