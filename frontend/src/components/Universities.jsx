import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const IRELAND = [
  { name: "University College Dublin (UCD)", url: "https://www.ucd.ie" },
  { name: "Trinity College Dublin (TCD)", url: "https://www.tcd.ie" },
  { name: "University College Cork", url: "https://www.ucc.ie" },
  { name: "University of Limerick", url: "https://www.ul.ie" },
  { name: "Dublin City University", url: "https://www.dcu.ie" },
];

const UK = [
  { name: "The University of Manchester", url: "https://www.manchester.ac.uk" },
  { name: "University of Bath", url: "https://www.bath.ac.uk" },
  { name: "University of Bristol", url: "https://www.bristol.ac.uk" },
  { name: "University of Glasgow", url: "https://www.gla.ac.uk" },
  { name: "University of Leicester", url: "https://www.le.ac.uk" },
];

const Universities = () => {
  return (
    <section
      id="universities"
      className="relative overflow-hidden px-6 pt-20 md:px-10 lg:pt-24"
    >
      <div className="relative z-10 mx-auto mb-12 flex max-w-[1920px] flex-col justify-between gap-6 lg:mb-14 lg:flex-row lg:items-end">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-fateh-gold">
            Our partners
          </p>
          <h2 className="mt-3 max-w-[30ch] font-fateh-serif text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-tight text-fateh-ink normal-case">
            Strong relationships with leading universities in Ireland and the UK.
          </h2>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-fateh-ink/65 normal-case">
            Tap a name to open the official university site in a new tab.
          </p>
        </div>
      </div>
      <div className="relative z-10 mx-auto grid max-w-[1920px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {[
          { label: "Ireland", list: IRELAND },
          { label: "United Kingdom", list: UK },
        ].map(({ label, list }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/50 bg-white/55 p-8 shadow-[0_20px_50px_-24px_rgba(11,14,26,0.18)] ring-1 ring-fateh-ink/5 backdrop-blur-md transition hover:shadow-[0_24px_55px_-22px_rgba(11,14,26,0.22)] md:p-9"
          >
            <div className="mb-6 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.15em] text-fateh-gold">
              <span className="h-px w-6 bg-fateh-gold" />
              {label}
            </div>
            <ul className="flex flex-col gap-0">
              {list.map(({ name, url }) => (
                <li key={name} className="border-b border-fateh-ink/[0.08] last:border-0">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-start justify-between gap-3 py-3.5 font-fateh-serif text-[1.05rem] leading-snug text-fateh-ink transition hover:text-fateh-accent md:text-[1.1rem]"
                  >
                    <span className="normal-case">{name}</span>
                    <ExternalLink
                      className="mt-0.5 h-4 w-4 shrink-0 text-fateh-gold/70 opacity-70 transition group-hover/link:opacity-100"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Universities;
