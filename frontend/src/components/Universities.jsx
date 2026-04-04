import React from "react";
import { motion } from "framer-motion";

const IRELAND = [
  "University College Dublin (UCD)",
  "Trinity College Dublin (TCD)",
  "University College Cork",
  "University of Limerick",
  "Dublin City University",
];

const UK = [
  "The University of Manchester",
  "University of Bath",
  "University of Bristol",
  "University of Glasgow",
  "University of Leicester",
];

const Universities = () => {
  return (
    <section id="universities" className="bg-fateh-paper px-6 py-20 md:px-10 lg:py-24">
      <div className="mx-auto mb-12 flex max-w-[1920px] flex-col justify-between gap-6 lg:mb-14 lg:flex-row lg:items-end">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.18em] text-fateh-gold">Our Partners</p>
          <h2 className="mt-3 max-w-[26ch] font-fateh-serif text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-tight text-fateh-ink normal-case">
            Top universities across Ireland and the United Kingdom.
          </h2>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-0.5 bg-fateh-border md:grid-cols-2">
        {[
          { label: "Ireland", list: IRELAND },
          { label: "United Kingdom", list: UK },
        ].map(({ label, list }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-fateh-paper p-10"
          >
            <div className="mb-6 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.15em] text-fateh-gold">
              <span className="h-px w-6 bg-fateh-gold" />
              {label}
            </div>
            <ul className="flex flex-col gap-3">
              {list.map((name) => (
                <li
                  key={name}
                  className="flex items-center justify-between border-b border-fateh-border pb-3 font-fateh-serif text-[1.1rem] text-fateh-ink last:border-0 last:pb-0 normal-case"
                >
                  {name}
                  <span className="text-fateh-gold" aria-hidden>
                    →
                  </span>
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
