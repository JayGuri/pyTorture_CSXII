import React from "react";
import { motion } from "framer-motion";
import {
  Award,
  GraduationCap,
  ShieldCheck,
  ScrollText,
  Building2,
  UsersRound,
} from "lucide-react";

const ITEMS = [
  {
    Icon: Award,
    title: "Best Agent of the Year — 4× in a Row",
    sub: "Awarded by Enterprise Ireland, the Government body of Ireland. A feat unmatched by any other consultant in India.",
  },
  {
    Icon: GraduationCap,
    title: "All 12 Irish Universities + Top UK Partners",
    sub: "Direct partnership with every Irish university and 120+ top UK institutions, including universities ranked in the global top 10.",
  },
  {
    Icon: ShieldCheck,
    title: "99% Visa Success Rate",
    sub: "Across 40,000+ students, our visa documentation expertise means approvals are the norm, not the exception.",
  },
  {
    Icon: ScrollText,
    title: "UCAS Accredited & British Council Member",
    sub: "Officially recognized by the bodies that govern UK higher education admissions worldwide.",
  },
  {
    Icon: Building2,
    title: "9 Pan-India Offices",
    sub: "Present in Ahmedabad, Bangalore, Chandigarh, Chennai, Delhi, Hyderabad, Mumbai and Pune — and growing.",
  },
  {
    Icon: UsersRound,
    title: "200+ Expert Team Members",
    sub: "Counsellors, visa specialists, forex experts, and post-landing support staff who go the extra mile.",
  },
];

function AchievementRow({ Icon, title, sub }) {
  return (
    <div className="flex gap-5 sm:gap-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-fateh-gold/25 bg-fateh-gold/10 text-fateh-gold-light sm:h-12 sm:w-12">
        <Icon className="h-5 w-5" strokeWidth={1.35} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="font-fateh-serif text-[1.08rem] font-semibold leading-snug text-white normal-case transition-colors lg:group-hover:text-fateh-gold-light sm:text-[1.12rem]">
          {title}
        </h3>
        <p className="mt-2 text-[0.875rem] leading-[1.65] text-white/48">{sub}</p>
      </div>
    </div>
  );
}

const Achievements = () => {
  return (
    <section className="bg-fateh-ink px-6 py-20 text-fateh-paper md:px-10 lg:py-28">
      <div className="mx-auto mb-14 max-w-[1920px] lg:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-fateh-gold-light">Recognition &amp; Awards</p>
          <h2 className="mt-4 font-fateh-serif text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.02em] normal-case">
            Two decades of trust, built one student at a time.
          </h2>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-white/45">
            Credentials and partnerships that back every conversation we have with families.
          </p>
        </motion.div>
      </div>
      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-px bg-white/8 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item, i) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            className="group bg-fateh-ink p-8 transition-colors duration-300 sm:p-9 md:p-10 lg:hover:bg-white/2"
          >
            <AchievementRow Icon={item.Icon} title={item.title} sub={item.sub} />
          </motion.article>
        ))}
      </div>
    </section>
  );
};

export default Achievements;
