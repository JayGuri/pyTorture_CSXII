import React from "react";
import { motion } from "framer-motion";
import bg_image1 from "../assets/bg_image1.png";

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
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-fateh-gold font-bold">
            Our Partners
          </p>
          <h2 className="mt-3 max-w-[26ch] font-fateh-serif text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-tight text-fateh-ink normal-case">
            Top universities across Ireland and the United Kingdom.
          </h2>
        </div>
      </div>
      <div className="relative z-10 mx-auto grid max-w-[1920px] grid-cols-1 overflow-hidden md:grid-cols-2">
        {[
          { label: "Ireland", list: IRELAND },
          { label: "United Kingdom", list: UK },
        ].map(({ label, list }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="border border-white/40 bg-white/40 p-10 shadow-sm backdrop-blur-md first:border-r"
          >
            <div className="mb-6 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.15em] text-fateh-gold">
              <span className="h-px w-6 bg-fateh-gold" />
              {label}
            </div>
            <ul className="flex flex-col gap-3">
              {list.map(({ name, url }) => (
                <li
                  key={name}
                  className="flex items-center justify-between border-b border-fateh-ink/10 pb-3 font-fateh-serif text-[1.1rem] text-fateh-ink last:border-0 last:pb-0 normal-case"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-fateh-serif text-[1.1rem] text-fateh-ink transition-colors hover:text-fateh-gold"
                  >
                    {name}
                  </a>
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
