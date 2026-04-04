import React from "react";
import { motion } from "framer-motion";

const LEADERS = [
  {
    name: "Suneet Singh Kochar",
    role: "Founder & Managing Director",
    bio: "A graduate of SRCC Delhi University and IIM Calcutta, Suneet interned with DSP Merrill Lynch and worked as a Relationship Manager with HSBC. Since 2001, he has been guiding students on international university admissions. He is widely quoted in the national press and credited with building the Ireland study-abroad market in India.",
  },
  {
    name: "Binti Kochar",
    role: "Co-Founder & Operations Head",
    bio: "Co-founded Fateh almost two decades ago and built the company from a 2-member team to over 200 members. She oversees day-to-day operations with a never-say-die attitude, and is an expert IELTS trainer and qualified interior designer — a rare blend of analytical rigour and creative vision.",
  },
];

const Leadership = () => {
  return (
    <section
      id="leadership"
      className="bg-fateh-paper px-6 py-20 md:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-[1920px]">
        <p className="text-[0.72rem] uppercase tracking-[0.18em] text-fateh-gold font-bold">
          Top Management
        </p>
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          {LEADERS.map((l, i) => (
            <motion.article
              key={l.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border border-fateh-border p-10"
            >
              <h3 className="font-fateh-serif text-2xl font-semibold text-fateh-ink normal-case">
                {l.name}
              </h3>
              <p className="mt-1 text-[0.78rem] uppercase tracking-[0.1em] text-fateh-gold">
                {l.role}
              </p>
              <p className="mt-5 text-[0.95rem] leading-[1.8] text-fateh-muted normal-case">
                {l.bio}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Leadership;
