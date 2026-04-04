import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import PasswordField from "../components/auth/PasswordField";
import { sanitizeFullNameInput, validateEmail, validateFullName, validateNewPassword } from "../lib/formValidation";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const nameRes = validateFullName(name);
    if (!nameRes.ok) {
      setError(nameRes.error);
      return;
    }
    const emailRes = validateEmail(email);
    if (!emailRes.ok) {
      setError(emailRes.error);
      return;
    }
    const passRes = validateNewPassword(password);
    if (!passRes.ok) {
      setError(passRes.error);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const res = signup(nameRes.value, emailRes.value, password);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    navigate("/for-you", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-fateh-paper px-6 pb-24 pt-28 sm:pt-32 md:pt-36">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(ellipse 65% 40% at 20% 0%, rgba(200, 164, 90, 0.16), transparent),
            radial-gradient(ellipse 45% 35% at 95% 60%, rgba(11, 14, 26, 0.05), transparent)`,
        }}
      />
      <div className="relative mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="scroll-mt-32"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-fateh-gold">Join</p>
          <h1 className="mt-3 font-fateh-serif text-3xl font-semibold leading-tight text-fateh-ink md:text-[2.35rem] normal-case">
            Create your account
          </h1>
          <p className="mt-4 text-[0.98rem] leading-relaxed text-fateh-muted normal-case">
            One profile for counselling, your journey, and your personalised dashboard.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-10 rounded-lg border border-fateh-border/90 bg-white/95 p-8 shadow-[0_24px_60px_-24px_rgba(11,14,26,0.18)] backdrop-blur-sm md:p-10"
        >
          <div className="mb-8 h-px w-full bg-linear-to-r from-transparent via-fateh-gold/40 to-transparent" aria-hidden />
          <form onSubmit={handleSubmit} className="space-y-5 normal-case" noValidate>
            {error ? (
              <p className="rounded-md border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            <div>
              <label htmlFor="su-name" className="mb-2 block text-[0.72rem] uppercase tracking-[0.12em] text-fateh-muted">
                Full name
              </label>
              <input
                id="su-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(sanitizeFullNameInput(e.target.value))}
                required
                maxLength={80}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/60 px-4 py-3 text-fateh-ink outline-none transition focus:border-fateh-gold focus:ring-1 focus:ring-fateh-gold/30"
                placeholder="As on your passport"
              />
              <p className="mt-1.5 text-[0.7rem] text-fateh-muted">Letters and spaces only (plus . &apos; -)</p>
            </div>
            <div>
              <label htmlFor="su-email" className="mb-2 block text-[0.72rem] uppercase tracking-[0.12em] text-fateh-muted">
                Email
              </label>
              <input
                id="su-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.replace(/\s/g, "").slice(0, 254))}
                required
                maxLength={254}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/60 px-4 py-3 text-fateh-ink outline-none transition focus:border-fateh-gold focus:ring-1 focus:ring-fateh-gold/30"
                placeholder="you@example.com"
              />
            </div>
            <PasswordField
              id="su-pass"
              label="Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 128))}
              autoComplete="new-password"
              placeholder="8+ chars, letter & number"
              minLength={8}
            />
            <PasswordField
              id="su-confirm"
              label="Confirm password"
              name="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.slice(0, 128))}
              autoComplete="new-password"
              placeholder="Repeat password"
              minLength={8}
            />
            <p className="text-[0.7rem] leading-relaxed text-fateh-muted">
              Password: 8–128 characters, at least one letter and one number, standard keyboard symbols only.
            </p>
            <button
              type="submit"
              className="w-full rounded-sm bg-fateh-ink py-3.5 text-[0.82rem] font-medium uppercase tracking-[0.08em] text-fateh-paper shadow-sm transition hover:bg-fateh-accent"
            >
              Sign up
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-fateh-muted normal-case">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-fateh-gold underline-offset-2 hover:underline">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
