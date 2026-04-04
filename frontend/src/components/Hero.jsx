import React from "react";
import { motion } from "framer-motion";

const SPLINE_URL = "https://prod.spline.design/BKyywyDXMNC-CP9y/scene.splinecode";

function HeroSpline() {
  return (
    <div className="relative h-full min-h-[50vh] w-full overflow-hidden lg:min-h-0">
      <spline-viewer
        url={SPLINE_URL}
        logo="false"
        style={{ width: "100%", height: "100%", minHeight: "100%", display: "block" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-2 w-[min(220px,40vw)] bg-linear-to-r from-fateh-ink to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-20 h-[4.25rem] w-52 max-w-[42vw] rounded-tl-sm bg-fateh-ink shadow-[-8px_0_32px_12px_#0b0e1a]"
        aria-hidden
      />
    </div>
  );
}

const Hero = () => {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative grid min-h-screen overflow-hidden bg-fateh-ink lg:grid-cols-[52%_48%]"
    >
      <div className="relative z-10 flex flex-col justify-center px-8 pb-12 pt-28 lg:px-14 lg:pb-16 lg:pl-16 lg:pr-10 lg:pt-28 xl:pl-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-7 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.2em] text-fateh-gold"
        >
          <span className="h-px w-10 shrink-0 bg-fateh-gold" />
          Abroad Education Consultants Since 2004
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="font-fateh-serif text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.01em] text-white normal-case"
        >
          Conquer Your
          <em className="mt-1 block font-fateh-serif text-fateh-gold italic">Dream University</em>
          <span className="mt-1 block">in UK &amp; Ireland</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 max-w-[38ch] text-base font-light leading-[1.85] text-white/55"
        >
          Expert admission guidance led by an IIM Calcutta alumnus — from university selection to your
          first day on campus and beyond.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mt-10 flex flex-wrap gap-8 gap-y-6"
        >
          <div>
            <div className="font-fateh-serif text-[2.4rem] font-semibold leading-none text-white">
              40K+
            </div>
            <div className="mt-1 text-[0.72rem] uppercase tracking-[0.07em] text-white/40">
              Dreams Conquered
            </div>
          </div>
          <div className="w-px self-stretch bg-white/12" aria-hidden />
          <div>
            <div className="font-fateh-serif text-[2.4rem] font-semibold leading-none text-white">
              99%
            </div>
            <div className="mt-1 text-[0.72rem] uppercase tracking-[0.07em] text-white/40">
              Visa Success
            </div>
          </div>
          <div className="w-px self-stretch bg-white/12" aria-hidden />
          <div>
            <div className="font-fateh-serif text-[2.4rem] font-semibold leading-none text-white">
              120+
            </div>
            <div className="mt-1 text-[0.72rem] uppercase tracking-[0.07em] text-white/40">
              Universities
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 flex flex-wrap gap-4"
        >
          <button
            type="button"
            onClick={() => scrollTo("register")}
            className="rounded-sm bg-fateh-gold px-8 py-3.5 text-[0.82rem] font-medium uppercase tracking-[0.09em] text-fateh-ink transition hover:bg-fateh-gold-light"
          >
            Book Free Counselling
          </button>
          <button
            type="button"
            onClick={() => scrollTo("universities")}
            className="rounded-sm border border-white/25 px-8 py-3.5 text-[0.82rem] uppercase tracking-[0.09em] text-white/80 transition hover:border-fateh-gold hover:text-fateh-gold"
          >
            Explore Universities
          </button>
        </motion.div>
      </div>

      <div className="relative min-h-[50vh] lg:min-h-0">
        <HeroSpline />
      </div>
    </section>
  );
};

export default Hero;
