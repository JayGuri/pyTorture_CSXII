import React from "react";
import { motion } from "framer-motion";

const QUOTES = [
  {
    quote:
      "With 1 mark less than required in the reading section of TOEFL to scoring a perfect 9 in IELTS and receiving the offer letter in 22 days from a UK Top 10 university — three stressful months, but all went well with the help of Senior Counsellor Nabeel.",
    attr: "UK Top 10 University",
  },
  {
    quote:
      "Losing my IELTS scorecard 2 days before filing for visa, waiting 15 days for a new one — coordinating between Delhi, Chennai and Chandigarh — and still managed to get a 9,000 Euro scholarship with help from Senior Counsellor Anjali.",
    attr: "Ireland — 9,000 Euro Scholarship",
  },
  {
    quote:
      "Fateh Education made my journey to Ireland a lot smoother than it could have been. They were always a text or phone call away to answer any query I had. I'm extremely grateful for the support.",
    attr: "Manali Dixit — UCD Michael Smurfit, Ireland",
  },
  {
    quote:
      "The main thing I love about Fateh is their clarity. They are not trying to trap you or brainwash you. Before selecting Fateh I visited various consultancies — the satisfaction I received here is unmatched. Thank you Chandrasekhar sir.",
    attr: "UK University",
  },
];

const Testimonials = () => {
  return (
    <section className="bg-fateh-ink px-6 py-20 text-fateh-paper md:px-10 lg:py-24">
      <div className="mx-auto mb-14 max-w-[1920px]">
        <p className="text-[0.72rem] uppercase tracking-[0.18em] text-fateh-gold-light">Student Stories</p>
        <h2 className="mt-3 max-w-[28ch] font-fateh-serif text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight normal-case">
          Real journeys. Real counsellors. Real results.
        </h2>
      </div>
      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-8 md:grid-cols-2">
        {QUOTES.map((t, i) => (
          <motion.blockquote
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="border border-white/12 p-8"
          >
            <p className="font-fateh-serif text-[1.15rem] leading-[1.7] text-white/85 italic normal-case">
              &ldquo;{t.quote}&rdquo;
            </p>
            <footer className="mt-6 text-[0.78rem] uppercase tracking-[0.1em] text-fateh-gold">{t.attr}</footer>
          </motion.blockquote>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
