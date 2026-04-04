import React from "react";
import { motion } from "framer-motion";
import bg_image2 from "../assets/bg_image2.png";

const PILLARS = ["UK & Ireland focus", "Since 2004", "Independent advisors"];

const Mission = () => {
  return (
    <section
      id="mission"
      className="relative overflow-hidden"
      style={{
        backgroundImage: `url(${bg_image2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative mx-auto max-w-6xl px-6 py-20 md:px-10 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65 }}
            className="lg:col-span-4 lg:pr-6"
          >
            <div className="border-t-2 border-fateh-gold pt-8">
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-fateh-gold">
                Our Mission
              </p>
              <p className="mt-6 font-fateh-serif text-[1.65rem] leading-snug text-fateh-ink md:text-[1.85rem]">
                Clarity first. <span className="text-fateh-muted">Then the right next step.</span>
              </p>
            </div>
          </motion.aside>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="lg:col-span-8 lg:pl-4 xl:pl-8"
          >
            <h2 className="max-w-[22ch] font-fateh-serif text-[clamp(1.85rem,3.2vw,2.85rem)] font-semibold leading-[1.12] text-fateh-ink normal-case">
              We don&apos;t just get you admitted — we help you make the{" "}
              <em className="text-fateh-gold italic">right</em> choice.
            </h2>
            <p className="mt-8 max-w-2xl text-[1.06rem] leading-[1.9] text-fateh-muted">
              Provide intellectual opinion on anything related to studying in the UK and Ireland with
              utmost empathy — enabling students, parents and all stakeholders to arrive at a higher
              level of clarity, validate their hypotheses, and make informed decisions. Choosing to
              study abroad is often a once-in-a-lifetime decision. You deserve someone who truly cares.
            </p>
            <ul className="mt-10 flex flex-wrap gap-3">
              {PILLARS.map((p) => (
                <li
                  key={p}
                  className="rounded-full border border-fateh-border bg-white/90 px-4 py-2 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-fateh-ink/80 shadow-sm"
                >
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Mission;
