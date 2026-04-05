import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { apiContactEmail } from "../lib/userContact.js";
import {
  PAID_PLANS,
  STARTER_PLAN,
  SUBSCRIPTION_TIERS,
  tierEntitlements,
  normalizeSubscription,
} from "../lib/subscriptionPlans.js";
import { getRazorpayKeyId, loadRazorpayScript } from "../lib/loadRazorpay.js";

function GoldCheck() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="mt-0.5 shrink-0" aria-hidden>
      <path
        d="M1 5l3.5 3.5L11 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-fateh-gold"
      />
    </svg>
  );
}

function planFeatures(tierId) {
  const e = tierEntitlements(tierId);
  const lines = [];
  if (e.counsellingSessionsIncluded === Infinity) {
    lines.push("Unlimited counselling sessions");
  } else {
    lines.push(`${e.counsellingSessionsIncluded} counselling session${e.counsellingSessionsIncluded === 1 ? "" : "s"} included`);
  }
  if (e.sopReviewsIncluded === Infinity) {
    lines.push("Unlimited SOP / personal statement reviews");
  } else if (e.sopReviewsIncluded > 0) {
    lines.push(`Up to ${e.sopReviewsIncluded} SOP reviews`);
  } else {
    lines.push("SOP reviews — upgrade to Guided or Unlimited");
  }
  lines.push(e.visaCounselling ? "Visa counselling with your counsellor" : "Visa self-serve tools on your hub; human visa counselling on upgrade");
  lines.push("For you hub, Ask Fateh, voice agent, scholarships & cost tools");
  return lines;
}

export default function SubscriptionSection() {
  const { user, setSubscription } = useAuth();
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rzpReady, setRzpReady] = useState(false);

  const sub = normalizeSubscription(user);
  const currentTierLabel = tierEntitlements(sub.tier).label;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setStatsVisible(true);
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRazorpayScript().then((ok) => {
      if (!cancelled) setRzpReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCheckout = useCallback(
    (plan) => {
      setError(null);
      setSuccess(null);

      if (!user || user.role === "admin") {
        setError("Please sign in with a student account to upgrade.");
        navigate("/login", { state: { from: "/" } });
        return;
      }

      const key = getRazorpayKeyId();
      if (!key) {
        setError("Razorpay is not configured. Add VITE_RAZORPAY_KEY_ID to your environment.");
        return;
      }
      if (!rzpReady || !window.Razorpay) {
        setError("Payment script not ready. Refresh the page and try again.");
        return;
      }

      const contact = apiContactEmail(user);
      const displayName = user.name || "Student";

      setLoading(true);
      const options = {
        key,
        amount: plan.checkoutAmountPaise,
        currency: "INR",
        name: "Fateh Education",
        description: `${plan.name} — ${plan.period}`,
        prefill: {
          email: contact.includes("@") ? contact : "",
          contact: user.phone || "",
          name: displayName,
        },
        theme: { color: "#0b0e1a" },
        handler: (response) => {
          setLoading(false);
          const paymentId = response?.razorpay_payment_id;
          setSuccess(`${plan.name} activated. Payment ref: ${paymentId || "ok"}.`);
          setSubscription({
            tier: plan.key,
            lastPaymentId: paymentId || null,
            updatedAt: new Date().toISOString(),
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (res) => {
          const msg =
            res?.error?.description || res?.error?.reason || "Payment was declined.";
          setError(msg);
          setLoading(false);
        });
        rzp.open();
      } catch (err) {
        setError(err?.message || "Could not open checkout.");
        setLoading(false);
      }
    },
    [user, navigate, rzpReady, setSubscription],
  );

  const onStarterClick = () => {
    setError(null);
    setSuccess(null);
    if (user && user.role !== "admin") {
      setSubscription({ tier: SUBSCRIPTION_TIERS.STARTER, updatedAt: new Date().toISOString() });
      setSuccess("You're on Starter — one counselling session is included when you book.");
    } else {
      setSuccess("Starter includes one counselling session. Sign in to save your tier.");
    }
  };

  const allPlans = [
    { ...STARTER_PLAN, featured: false, paid: false },
    ...PAID_PLANS.map((p) => ({ ...p, paid: true })),
  ];

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="scroll-mt-24 border-t border-fateh-border bg-fateh-ink text-white"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
        <div className="mb-12 text-center">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.35em] text-fateh-gold/80">Pricing</p>
          <h3 className="mt-4 font-fateh-serif text-3xl font-semibold text-white md:text-4xl">Three ways to work with us</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/50">
            Prices shown are ₹0, ₹999, and ₹2,999 per month. For demos, Razorpay checkout charges ₹1 so you can test the flow safely.
            Use test keys from the Razorpay dashboard; verify payments on your server before going live.
          </p>
          {user && user.role !== "admin" ? (
            <p className="mx-auto mt-4 max-w-2xl rounded-lg border border-fateh-gold/25 bg-fateh-gold/10 px-4 py-2.5 text-sm text-fateh-gold-light">
              Your plan: <span className="font-semibold text-white">{currentTierLabel}</span>
              <span className="text-white/50"> — upgrades save here and on your For you hub.</span>
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="mb-8 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-8 rounded-lg border border-fateh-gold/40 bg-fateh-gold/10 px-4 py-3 text-center text-sm text-fateh-gold-light">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {allPlans.map((plan, idx) => {
            const tierId = plan.key;
            const features = planFeatures(tierId);
            const isCurrent = user && user.role !== "admin" && sub.tier === tierId;

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 24 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                className={[
                  "relative flex flex-col border bg-fateh-ink/80 p-8 backdrop-blur-sm",
                  plan.featured ? "border-fateh-gold/60 md:-translate-y-1 md:shadow-xl md:shadow-fateh-gold/10" : "border-white/10",
                ].join(" ")}
              >
                {plan.badge ? (
                  <div className="absolute right-0 top-0 bg-fateh-gold px-3 py-1.5">
                    <span className="font-mono text-[0.52rem] font-bold uppercase tracking-[0.2em] text-fateh-ink">
                      {plan.badge}
                    </span>
                  </div>
                ) : null}
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.3em] text-fateh-gold/90">{plan.headline}</p>
                <p className="mt-2 font-fateh-serif text-2xl font-semibold text-white">{plan.name}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-fateh-serif text-4xl font-semibold text-white">{plan.priceDisplay}</span>
                  {plan.period !== "forever" ? (
                    <span className="text-sm text-white/40">/ {plan.period}</span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/55">{plan.description}</p>
                <div className="my-6 h-px bg-white/10" />
                <ul className="flex flex-1 flex-col gap-3">
                  {features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm leading-snug text-white/70">
                      <GoldCheck />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={loading && plan.paid}
                  onClick={() => {
                    if (plan.paid) openCheckout(plan);
                    else onStarterClick();
                  }}
                  className={[
                    "mt-8 w-full py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition",
                    plan.featured
                      ? "bg-fateh-gold text-fateh-ink hover:bg-fateh-gold-light"
                      : "border border-white/20 text-white hover:border-fateh-gold hover:bg-white/5",
                    isCurrent ? "opacity-80" : "",
                  ].join(" ")}
                >
                  {isCurrent ? "Current plan" : loading && plan.paid ? "Opening…" : plan.cta}
                </button>
                {!user ? (
                  <Link
                    to="/login"
                    className="mt-3 block text-center text-[0.72rem] text-fateh-gold-light/90 underline-offset-2 hover:underline"
                  >
                    Sign in to save your plan
                  </Link>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
