import React from "react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-brand-ivory pt-16 pb-12 px-8 lg:px-24 border-t border-brand-obsidian/5 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-brand-gold/10 blur-[200px] rounded-full -translate-x-1/4 -translate-y-1/4 -z-10" />

      <div className="max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 mb-16">
          {/* Left: Lead Gen */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              className="flex items-center gap-4 mb-12"
            >
              <div className="h-[1px] w-12 bg-brand-gold" />
              <p className="text-[10px] font-bold tracking-[0.5em] text-brand-gold uppercase">
                ADMISSIONS PROTOCOL
              </p>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-[12vw] lg:text-8xl font-black tracking-[-0.05em] text-brand-obsidian uppercase leading-[0.85] mb-16"
            >
              READY <br />
              TO <span className="text-brand-gold-muted italic">LEAD?</span>
            </motion.h2>

            <form id="lead-form" className="space-y-12 max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="group relative">
                  <p className="text-[10px] font-black tracking-[0.3em] text-brand-gold-muted mb-4">
                    FULL NAME
                  </p>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full bg-transparent border-b border-brand-obsidian/10 py-4 text-[10px] font-bold tracking-[0.4em] focus:outline-none focus:border-brand-gold-muted transition-colors duration-700 placeholder:text-brand-graphite/40 uppercase text-brand-obsidian"
                  />
                </div>

                <div className="group relative">
                  <p className="text-[10px] font-black tracking-[0.3em] text-brand-gold-muted mb-4">
                    EMAIL ADDRESS
                  </p>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full bg-transparent border-b border-brand-obsidian/10 py-4 text-[10px] font-bold tracking-[0.4em] focus:outline-none focus:border-brand-gold-muted transition-colors duration-700 placeholder:text-brand-graphite/40 uppercase text-brand-obsidian"
                  />
                </div>

                <div className="group relative">
                  <p className="text-[10px] font-black tracking-[0.3em] text-brand-gold-muted mb-4">
                    PHONE NUMBER
                  </p>
                  <input
                    type="tel"
                    placeholder="Enter your number"
                    className="w-full bg-transparent border-b border-brand-obsidian/10 py-4 text-[10px] font-bold tracking-[0.4em] focus:outline-none focus:border-brand-gold-muted transition-colors duration-700 placeholder:text-brand-graphite/40 uppercase text-brand-obsidian"
                  />
                </div>

                <div className="group relative">
                  <p className="text-[10px] font-black tracking-[0.3em] text-brand-gold-muted mb-4">
                    CITY OF ORIGIN
                  </p>
                  <input
                    type="text"
                    placeholder="Enter your city"
                    className="w-full bg-transparent border-b border-brand-obsidian/10 py-4 text-[10px] font-bold tracking-[0.4em] focus:outline-none focus:border-brand-gold-muted transition-colors duration-700 placeholder:text-brand-graphite/40 uppercase text-brand-obsidian"
                  />
                </div>
              </div>

              <div className="pt-8">
                <motion.button
                  whileHover={{ x: 20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="group flex items-center gap-8 text-[10px] font-black tracking-[0.5em] uppercase text-brand-obsidian hover:text-brand-gold-muted transition-colors duration-700 bg-brand-gold-muted py-6 px-12 rounded-sm"
                >
                  REQUEST A CALLBACK
                  <div className="w-16 h-[1px] bg-brand-obsidian group-hover:bg-brand-gold-muted transition-all duration-700" />
                </motion.button>
              </div>
            </form>
          </div>

          {/* Right: Branding & Regions */}
          <div className="flex flex-col justify-between items-start lg:items-end text-left lg:text-right">
            <div>
              <h1 className="text-6xl font-black tracking-[-0.05em] text-brand-obsidian uppercase leading-none mb-4 font-outfit">
                FATEH
              </h1>
              <p className="text-[10px] font-bold tracking-[0.6em] text-brand-gold uppercase mb-16">
                EDITORIAL EDUCATION
              </p>

              <div className="space-y-12 mt-24">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.4em] text-brand-silt uppercase mb-4">
                    Strategic Regions
                  </p>
                  <p className="text-sm font-medium text-brand-graphite tracking-tight leading-relaxed max-w-xs lg:ml-auto uppercase">
                    New Delhi / Dublin / London / Chandigarh / Pune / Chennai /
                    Bangalore
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold tracking-[0.4em] text-brand-obsidian/20 uppercase mb-4">
                    Connect
                  </p>
                  <div className="flex flex-wrap justify-start lg:justify-end gap-x-8 gap-y-4">
                    {["INSTAGRAM", "TWITTER", "LINKEDIN", "VOGUE"].map(
                      (social) => (
                        <a
                          key={social}
                          href={`#${social}`}
                          className="text-[10px] font-bold tracking-[0.4em] text-brand-graphite hover:text-brand-obsidian transition-colors duration-500"
                        >
                          {social}
                        </a>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-brand-obsidian/5 flex flex-col md:flex-row justify-between items-center gap-12">
          <p className="text-[9px] font-medium tracking-[0.4em] text-brand-silt uppercase">
            © 2026 FATEH ADVISORS • CRAFTED FOR VISIONARIES
          </p>
          <div className="flex gap-12">
            <a
              href="#privacy"
              className="text-[9px] font-medium tracking-[0.4em] text-brand-silt uppercase hover:text-brand-obsidian transition-colors duration-500"
            >
              Legal
            </a>
            <a
              href="#terms"
              className="text-[9px] font-medium tracking-[0.4em] text-brand-silt uppercase hover:text-brand-obsidian transition-colors duration-500"
            >
              Privacy
            </a>
            <a
              href="#terms"
              className="text-[9px] font-medium tracking-[0.4em] text-brand-silt uppercase hover:text-brand-obsidian transition-colors duration-500"
            >
              Cookie Protocol
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
