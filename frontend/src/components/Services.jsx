import React from "react";
import { motion } from "framer-motion";

const SERVICES = [
  {
    n: "01",
    title: "University & Course Selection",
    desc: "Personalised match based on your profile, aspirations and budget — across 120+ partner universities.",
  },
  {
    n: "02",
    title: "Application Assistance",
    desc: "SOP, LOR, documentation — crafted with two decades of experience in what actually gets students admitted.",
  },
  {
    n: "03",
    title: "Scholarship Guidance",
    desc: "Access to 50–100% scholarships including Government of Ireland awards worth up to €10,000 stipend.",
  },
  {
    n: "04",
    title: "Visa Processing",
    desc: "A 99% visa success rate backed by expert documentation review and financial planning with 10+ year specialists.",
  },
  {
    n: "05",
    title: "IELTS / PTE Training",
    desc: "Award-winning coaching from Cambridge ESOL–recognised trainers. From 1 mark short to a perfect 9 band.",
  },
  {
    n: "06",
    title: "Post-Landing Support",
    desc: "Forex, ticketing, accommodation, arrival orientation and a network of seniors who've been through it all.",
  },
];

const Services = () => {
  return (
    <section id="services" className="px-6 py-20 md:px-10 lg:py-24">
      <div className="mx-auto max-w-[1920px]">
        <h2 className="mt-3 mb-12 max-w-[32ch] font-fateh-serif text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-tight text-fateh-ink normal-case lg:mb-16">
          End-to-end support for your entire study abroad journey.
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <motion.article
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="border border-white/40 bg-white/40 p-8 shadow-sm backdrop-blur-md"
            >
              <div className="font-fateh-serif text-5xl font-semibold leading-none text-fateh-gold/80">
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
