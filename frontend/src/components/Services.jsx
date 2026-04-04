import React from "react";
import { motion } from "framer-motion";

const SERVICES = [
  {
    n: "01",
    title: "University & course selection",
    desc: "Personalised match for your profile, goals and budget across 120+ partner universities.",
  },
  {
    n: "02",
    title: "Application assistance",
    desc: "SOPs, LORs and paperwork shaped by two decades of what actually wins offers.",
  },
  {
    n: "03",
    title: "Scholarship guidance",
    desc: "From partial awards to Government of Ireland schemes, including stipends up to €10,000 where applicable.",
  },
  {
    n: "04",
    title: "Visa processing",
    desc: "A 99% visa success rate with documentation and financial planning from seasoned specialists.",
  },
  {
    n: "05",
    title: "IELTS / PTE training",
    desc: "Cambridge ESOL–recognised trainers. Many students move from one mark short to a band 9.",
  },
  {
    n: "06",
    title: "Post-landing support",
    desc: "Forex, travel, housing and seniors who have already made the move.",
  },
];

const Services = () => {
  return (
    <section id="services" className="px-6 py-20 md:px-10 lg:py-24">
      <div className="mx-auto max-w-[1920px]">
        <h2 className="mt-3 mb-12 max-w-[36ch] font-fateh-serif text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-tight text-fateh-ink normal-case lg:mb-16">
          End-to-end support for your entire study abroad journey.
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {SERVICES.map((s, i) => (
            <motion.article
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/55 bg-white/50 p-8 shadow-[0_16px_40px_-20px_rgba(11,14,26,0.15)] ring-1 ring-fateh-ink/[0.04] backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-18px_rgba(11,14,26,0.2)]"
            >
              <div className="font-fateh-serif text-4xl font-semibold leading-none text-fateh-gold/85 md:text-[2.75rem]">
                {s.n}
              </div>
              <h3 className="mt-4 text-base font-semibold text-fateh-ink normal-case">
                {s.title}
              </h3>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-fateh-muted">
                {s.desc}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
