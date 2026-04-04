import React from "react";
import { motion } from "framer-motion";

const QUOTES = [
  {
    quote:
      "From one mark short in TOEFL reading to a band 9 in IELTS and an offer from a UK top-ten university in 22 days: three intense months, and Senior Counsellor Nabeel made it work.",
    attr: "UK top-ten university",
  },
  {
    quote:
      "I lost my IELTS scorecard two days before the visa filing window, waited fifteen days for a replacement, and coordinated across Delhi, Chennai and Chandigarh. Senior Counsellor Anjali still helped me secure a €9,000 scholarship.",
    attr: "Ireland · €9,000 scholarship",
  },
  {
    quote:
      "Fateh made Ireland far smoother than it could have been. They were always a text or call away. I am very grateful for the support.",
    attr: "Manali Dixit · UCD Michael Smurfit, Ireland",
  },
  {
    quote:
      "What I value most is clarity. No pressure, no gimmicks. I had visited other consultancies before Fateh; the difference in how I felt here was night and day. Thank you, Chandrasekhar sir.",
    attr: "UK university",
  },
];

const Testimonials = () => {
  return (
    <section className="relative overflow-hidden px-6 py-20 text-fateh-paper md:px-10 lg:py-28">
      {/* Layered background: depth without noise */}
      <div
        className="pointer-events-none absolute inset-0 bg-fateh-ink"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 20% 0%, rgba(200, 164, 90, 0.12), transparent 55%),
            radial-gradient(ellipse 60% 45% at 100% 30%, rgba(26, 53, 96, 0.35), transparent 50%),
            radial-gradient(ellipse 70% 40% at 50% 100%, rgba(200, 164, 90, 0.08), transparent 45%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto mb-14 max-w-[1920px]">
        <p className="text-[0.72rem] uppercase tracking-[0.18em] text-fateh-gold-light">Student stories</p>
        <h2 className="mt-3 max-w-[32ch] font-fateh-serif text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight normal-case">
          Real journeys, real counsellors, real outcomes.
        </h2>
      </div>
      <div className="relative z-10 mx-auto grid max-w-[1920px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-7">
        {QUOTES.map((t, i) => (
          <motion.blockquote
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/12 bg-white/6 p-8 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-sm transition hover:border-fateh-gold/20 hover:bg-white/8 md:p-9"
          >
            <p className="font-fateh-serif text-[1.08rem] leading-[1.72] text-white/92 md:text-[1.12rem] normal-case">
              &ldquo;{t.quote}&rdquo;
            </p>
            <footer className="mt-6 border-t border-white/10 pt-5 text-[0.78rem] font-medium uppercase tracking-widest text-fateh-gold-light/95">
              {t.attr}
            </footer>
          </motion.blockquote>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
