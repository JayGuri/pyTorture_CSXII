import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NavLink = ({ href, children, index }) => {
  return (
    <motion.a
      href={href}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.8,
        delay: 0.1 * index,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative group px-4 py-2"
    >
      <span className="text-[10px] font-black tracking-[0.4em] text-brand-graphite/80 group-hover:text-brand-gold transition-colors duration-500 uppercase">
        {children}
      </span>
      <motion.div className="absolute bottom-0 left-4 right-4 h-[1px] bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </motion.a>
  );
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-700 px-8 lg:px-24 py-8 ${
        scrolled ?
          "bg-white/95 backdrop-blur-2xl py-5 border-b border-brand-gold/15 shadow-sm"
        : "bg-white/5 border-b border-brand-obsidian/5"
      }`}
    >
      {/* Accent Line */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent" />

      <div className="max-w-[1920px] mx-auto flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="flex items-center gap-4 group cursor-pointer"
        >
          <div className="w-10 h-10 bg-brand-gold-bright rounded-full flex items-center justify-center group-hover:rotate-[360deg] transition-transform duration-1000">
            <span className="text-white font-black text-xl font-outfit">F</span>
          </div>
          <span className="text-xl font-black tracking-[-0.05em] text-brand-obsidian uppercase font-outfit group-hover:text-brand-gold-bright transition-colors">
            FATEH
          </span>
        </motion.div>

        <div className="hidden lg:flex items-center gap-8">
          <NavLink href="#" index={0}>
            Experience
          </NavLink>
          <NavLink href="#" index={1}>
            Institutions
          </NavLink>
          <NavLink href="#" index={2}>
            Legacy
          </NavLink>
          <NavLink href="#" index={3}>
            Connect
          </NavLink>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="ml-8 px-8 py-3 rounded-full bg-brand-obsidian/5 border border-brand-obsidian/10 text-[10px] font-black tracking-[0.3em] text-brand-obsidian uppercase hover:bg-brand-obsidian hover:text-white transition-all duration-500 backdrop-blur-md"
          >
            INQUIRE NOW
          </motion.button>
        </div>

        <div className="lg:hidden">
          <div className="w-8 h-[2px] bg-brand-obsidian mb-2" />
          <div className="w-8 h-[2px] bg-brand-obsidian" />
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
