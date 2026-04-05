import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, DEMO_ACCOUNTS_HINT } from "../context/AuthContext";
import PasswordField from "../components/auth/PasswordField";
import { validateLoginPhone, validateLoginPassword } from "../lib/formValidation";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/for-you";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const phoneRes = validateLoginPhone(phone);
    if (!phoneRes.ok) {
      setError(phoneRes.error);
      return;
    }
    const passRes = validateLoginPassword(password);
    if (!passRes.ok) {
      setError(passRes.error);
      return;
    }
    const res = login(phoneRes.value, password);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const isAdmin = res.user?.role === "admin";
    const requestedAdmin = typeof from === "string" && from.startsWith("/admin");
    if (isAdmin) {
      navigate(requestedAdmin ? from : "/admin/overview", { replace: true });
      return;
    }
    if (requestedAdmin) {
      navigate("/for-you", { replace: true });
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-fateh-paper px-6 pb-24 pt-28 sm:pt-32 md:pt-36">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(ellipse 70% 45% at 50% -15%, rgba(200, 164, 90, 0.18), transparent),
            radial-gradient(ellipse 50% 40% at 100% 50%, rgba(26, 53, 96, 0.06), transparent)`,
        }}
      />
      <div className="relative mx-auto max-w-md">
        <div className="scroll-mt-32">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-fateh-gold">Account</p>
          <h1 className="mt-3 font-fateh-serif text-3xl font-semibold leading-tight text-fateh-ink md:text-[2.35rem] normal-case">
            Welcome back
          </h1>
          <p className="mt-4 text-[0.98rem] leading-relaxed text-fateh-muted normal-case">
            Sign in to open your personalised <span className="font-medium text-fateh-ink">For you</span> hub.
          </p>
        </div>

        <div className="mt-10 rounded-lg border border-fateh-border/90 bg-white/95 p-8 shadow-[0_24px_60px_-24px_rgba(11,14,26,0.18)] backdrop-blur-sm md:p-10">
          <div className="mb-8 h-px w-full bg-linear-to-r from-transparent via-fateh-gold/40 to-transparent" aria-hidden />
          <form onSubmit={handleSubmit} className="space-y-6 normal-case" noValidate>
            {error ? (
              <p className="rounded-md border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            <div>
              <label htmlFor="login-phone" className="mb-2 block text-[0.72rem] uppercase tracking-[0.12em] text-fateh-muted">
                Mobile number
              </label>
              <input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20))}
                required
                maxLength={20}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/60 px-4 py-3 text-fateh-ink outline-none transition focus:border-fateh-gold focus:ring-1 focus:ring-fateh-gold/30"
                placeholder="e.g. 9876543210"
              />
            </div>
            <PasswordField
              id="login-password"
              label="Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 128))}
              autoComplete="current-password"
            />
            <button
              type="submit"
              className="w-full rounded-sm bg-fateh-gold py-3.5 text-[0.82rem] font-medium uppercase tracking-[0.08em] text-fateh-ink shadow-sm transition hover:bg-fateh-gold-light"
            >
              Log in
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-fateh-muted normal-case">
            No account?{" "}
            <Link to="/signup" className="font-medium text-fateh-gold underline-offset-2 hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-10 rounded-lg border border-dashed border-fateh-border bg-fateh-gold-pale/35 px-4 py-4 text-center text-[0.75rem] leading-relaxed text-fateh-muted normal-case">
          <span className="font-medium text-fateh-ink">Demo (mobile / password):</span> {DEMO_ACCOUNTS_HINT}
        </p>
      </div>
    </div>
  );
}
