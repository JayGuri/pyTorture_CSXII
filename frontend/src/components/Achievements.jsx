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
    title: "Enterprise Ireland: Best Agent of the Year (four years running)",
    sub: "Recognised by Ireland’s national trade and innovation agency. A track record no other consultant in India has matched.",
  },
  {
    Icon: GraduationCap,
    title: "All Irish universities, 120+ UK partners",
    sub: "Direct ties across Ireland and the UK, including institutions that rank among the world’s best.",
  },
  {
    Icon: ShieldCheck,
    title: "99% visa success",
    sub: "Across 40,000+ students, careful documentation has made approvals the norm.",
  },
  {
    Icon: ScrollText,
    title: "UCAS accredited · British Council member",
    sub: "Aligned with the bodies that shape UK admissions for international students.",
  },
  {
    Icon: Building2,
    title: "Nine offices across India",
    sub: "Ahmedabad, Bangalore, Chandigarh, Chennai, Delhi, Hyderabad, Mumbai and Pune, with room to grow.",
  },
  {
    Icon: UsersRound,
    title: "200+ people on your side",
    sub: "Counsellors, visa specialists, forex and post-landing teams who stay with you after you fly.",
  },
];

function AchievementRow({ Icon, title, sub }) {
  return (
    <div className="flex gap-5 sm:gap-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fateh-gold/12 text-fateh-gold-light shadow-inner ring-1 ring-fateh-gold/20 sm:h-12 sm:w-12">
        <Icon className="h-5 w-5" strokeWidth={1.35} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="font-fateh-serif text-[1.08rem] font-semibold leading-snug text-white normal-case transition-colors sm:text-[1.12rem] lg:group-hover:text-fateh-gold-light">
          {title}
        </h3>
        <p className="mt-2 text-[0.875rem] leading-[1.65] text-white/55">{sub}</p>
      </div>
    </div>
  );
}

const Achievements = () => {
  return (
    <section className="bg-fateh-ink px-6 py-20 text-fateh-paper md:px-10 lg:py-28">
      <div className="mx-auto mb-12 max-w-[1920px] lg:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-fateh-gold-light">Recognition &amp; awards</p>
          <h2 className="mt-4 font-fateh-serif text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.02em] normal-case">
            Two decades of trust, built one student at a time.
          </h2>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-white/50">
            Credentials and partnerships behind every conversation with families. No fluff, just what we can stand behind.
          </p>
        </motion.div>
      </div>
      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {ITEMS.map((item, i) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.35)] ring-1 ring-white/5 transition duration-300 hover:border-fateh-gold/25 hover:bg-white/[0.06] hover:shadow-[0_22px_55px_-18px_rgba(0,0,0,0.4)] sm:p-8"
          >
            <AchievementRow Icon={item.Icon} title={item.title} sub={item.sub} />
          </motion.article>
        ))}
      </div>
    </section>
  );
};

export default Achievements;
