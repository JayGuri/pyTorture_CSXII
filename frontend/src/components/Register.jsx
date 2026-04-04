import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import bg_image3 from "../assets/bg_image3.png";

const FEATURES = [
  "Personalised university & course shortlist",
  "Scholarship opportunities review",
  "Visa readiness check",
  "IELTS / PTE guidance",
  "Post-landing support overview",
];

const CENTRES = [
  "Ahmedabad",
  "Bangalore",
  "Chandigarh",
  "Chennai",
  "Delhi",
  "Hyderabad",
  "Mumbai",
  "Pune",
];

const Register = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section
      id="register"
      className="relative overflow-hidden px-6 py-20 bg-cover bg-center md:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-20 lg:py-24"
      style={{ backgroundImage: `url(${bg_image3})` }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-fateh-ink/75 via-fateh-ink/55 to-fateh-ink/70"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-10 mb-14 lg:mb-0"
      >
        <p className="text-[0.72rem] uppercase tracking-[0.18em] text-fateh-gold">
          Free Counselling
        </p>
        <h2 className="mt-3 font-fateh-serif text-[clamp(2rem,3.5vw,3.2rem)] font-semibold leading-tight text-fateh-paper normal-case">
          Book your session{" "}
          <span className="text-fateh-gold-light">with a Fateh expert</span> today.
        </h2>
        <p className="mt-6 text-[1.05rem] leading-[1.8] text-fateh-paper/95 normal-case">
          No fees. No obligation. Just honest, expert advice from a team that
          has conquered 40,000+ dreams.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {FEATURES.map((f) => (
            <li
              key={f}
              className="flex items-center gap-3 text-[0.9rem] text-fateh-paper/90 normal-case"
            >
              <span className="text-fateh-gold" aria-hidden>
                ✦
              </span>
              {f}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-white/10 bg-fateh-ink/95 p-8 text-fateh-paper shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-sm md:p-10"
      >
        <AnimatePresence mode="wait">
          {submitted ?
            <motion.div
              key="ok"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center"
            >
              <p className="font-fateh-serif text-2xl text-fateh-gold">
                Thank you
              </p>
              <p className="mt-3 text-sm text-white/55 normal-case">
                A Fateh counsellor will reach out to you shortly.
              </p>
            </motion.div>
          : <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="normal-case"
            >
              <h3 className="font-fateh-serif text-2xl font-semibold text-white">
                Register Now
              </h3>
              <p className="mt-2 text-[0.85rem] text-white/50">
                Free, no-obligation counselling session
              </p>

              {[
                {
                  id: "name",
                  label: "Full Name",
                  type: "text",
                  placeholder: "Your full name",
                },
                {
                  id: "email",
                  label: "Email Address",
                  type: "email",
                  placeholder: "you@example.com",
                },
                {
                  id: "mobile",
                  label: "Mobile Number",
                  type: "tel",
                  placeholder: "+91 00000 00000",
                },
                {
                  id: "city",
                  label: "City",
                  type: "text",
                  placeholder: "Your city",
                },
              ].map((field) => (
                <div key={field.id} className="mt-6">
                  <label
                    className="mb-2 block text-[0.75rem] uppercase tracking-[0.1em] text-white/50"
                    htmlFor={field.id}
                  >
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    required
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-white/15 bg-white/[0.08] px-4 py-3 text-[0.95rem] text-fateh-paper outline-none transition placeholder:text-white/35 focus:border-fateh-gold focus:ring-1 focus:ring-fateh-gold/30"
                  />
                </div>
              ))}

              <div className="mt-6">
                <label
                  className="mb-2 block text-[0.75rem] uppercase tracking-[0.1em] text-white/50"
                  htmlFor="centre"
                >
                  Nearest Fateh Centre
                </label>
                <select
                  id="centre"
                  name="centre"
                  className="w-full cursor-pointer appearance-none rounded-lg border border-white/15 bg-white/[0.08] px-4 py-3 text-[0.95rem] text-fateh-paper outline-none transition focus:border-fateh-gold focus:ring-1 focus:ring-fateh-gold/30"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select the nearest one
                  </option>
                  {CENTRES.map((c) => (
                    <option key={c} value={c} className="bg-fateh-ink">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="mt-8 w-full rounded-lg bg-fateh-gold py-4 text-[0.875rem] font-medium uppercase tracking-[0.08em] text-fateh-ink shadow-md shadow-fateh-gold/20 transition hover:bg-fateh-gold-light"
              >
                Book Free Counselling →
              </button>
            </motion.form>
          }
        </AnimatePresence>
      </motion.div>
    </section>
  );
};

export default Register;
