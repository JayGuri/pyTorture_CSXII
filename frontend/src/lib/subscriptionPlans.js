/**
 * Fateh subscription tiers + entitlement limits.
 * List prices on cards: ₹0 / ₹999 / ₹2,999. Razorpay checkout uses `checkoutAmountPaise` (₹1 demo = 100 paise).
 *
 * Production note: verify payments on your backend (Orders API + webhook) before
 * granting paid entitlements. This file + AuthContext store tier client-side for UX.
 */

/** @typedef {'starter' | 'guided' | 'elite'} SubscriptionTierId */

export const SUBSCRIPTION_TIERS = {
  STARTER: "starter",
  GUIDED: "guided",
  ELITE: "elite",
};

/** Default for new accounts */
export function defaultSubscription() {
  return {
    tier: SUBSCRIPTION_TIERS.STARTER,
    counsellingSessionsUsed: 0,
    sopReviewsUsed: 0,
    lastPaymentId: null,
    updatedAt: null,
  };
}

/** Merge stored user.subscription with defaults */
export function normalizeSubscription(user) {
  const d = defaultSubscription();
  if (!user?.subscription || typeof user.subscription !== "object") return { ...d };
  return {
    ...d,
    ...user.subscription,
    tier: user.subscription.tier || d.tier,
  };
}

/**
 * Limits per tier. `null` or `Infinity` means unlimited where checked with `>=`.
 */
/** Remaining included counselling sessions (Infinity for unlimited). */
export function counsellingSessionsRemaining(user) {
  const sub = normalizeSubscription(user);
  const { counsellingSessionsIncluded } = tierEntitlements(sub.tier);
  const used = sub.counsellingSessionsUsed || 0;
  if (counsellingSessionsIncluded === Infinity) return Infinity;
  return Math.max(0, counsellingSessionsIncluded - used);
}

/** Remaining SOP review slots (0 on Starter until you ship SOP UI). */
export function sopReviewsRemaining(user) {
  const sub = normalizeSubscription(user);
  const { sopReviewsIncluded } = tierEntitlements(sub.tier);
  const used = sub.sopReviewsUsed || 0;
  if (sopReviewsIncluded === Infinity) return Infinity;
  return Math.max(0, sopReviewsIncluded - used);
}

export function tierEntitlements(tier) {
  switch (tier) {
    case SUBSCRIPTION_TIERS.GUIDED:
      return {
        counsellingSessionsIncluded: 5,
        sopReviewsIncluded: 5,
        visaCounselling: true,
        label: "Guided",
      };
    case SUBSCRIPTION_TIERS.ELITE:
      return {
        counsellingSessionsIncluded: Infinity,
        sopReviewsIncluded: Infinity,
        visaCounselling: true,
        label: "Unlimited",
      };
    default:
      return {
        counsellingSessionsIncluded: 1,
        sopReviewsIncluded: 0,
        visaCounselling: false,
        label: "Starter",
      };
  }
}

/** ₹1 demo charge in paise (both paid tiers). Card still shows ₹999 / ₹2,999. */
export const DEMO_CHECKOUT_PAISE = 100;

/** Razorpay checkout plans (paid tiers only) */
export const PAID_PLANS = [
  {
    key: SUBSCRIPTION_TIERS.GUIDED,
    name: "Guided",
    headline: "Serious applicants",
    priceDisplay: "₹999",
    checkoutAmountPaise: DEMO_CHECKOUT_PAISE,
    period: "per month",
    description:
      "Five full counselling sessions, up to five SOP reviews, and structured visa guidance with your counsellor.",
    featured: true,
    badge: "POPULAR",
    cta: "Upgrade to Guided",
  },
  {
    key: SUBSCRIPTION_TIERS.ELITE,
    name: "Unlimited",
    headline: "Full concierge",
    priceDisplay: "₹2,999",
    checkoutAmountPaise: DEMO_CHECKOUT_PAISE,
    period: "per month",
    description:
      "Unlimited counselling sessions, unlimited SOP support, visa counselling, and priority handling across your journey.",
    featured: false,
    cta: "Go Unlimited",
  },
];

export const STARTER_PLAN = {
  key: SUBSCRIPTION_TIERS.STARTER,
  name: "Starter",
  headline: "Try Fateh",
  priceDisplay: "₹0",
  period: "forever",
  description: "One counselling session to align on goals and next steps. Perfect to get started.",
  cta: "Stay on Starter",
};

/**
 * Every capability that exists (or is planned) in the student app.
 * Use this table to map features → tiers in product; entitlement checks use tierEntitlements + usage counters.
 *
 * integrated: already in the codebase (UI or API hook).
 * enforcement: whether we currently block by tier (mostly "none" until you wire guards).
 */
export const INTEGRATED_APP_CAPABILITIES = [
  {
    id: "auth_phone",
    label: "Sign in / sign up (mobile + password)",
    integrated: true,
    where: "LoginPage, SignupPage, AuthContext",
    enforcement: "none",
  },
  {
    id: "for_you_hub",
    label: "Personalised For you hub (courses, tiles, actions)",
    integrated: true,
    where: "ForYouPage",
    enforcement: "none",
  },
  {
    id: "dashboard_api",
    label: "Live recommendations from backend dashboard API",
    integrated: true,
    where: "useForYouDashboard, forYouApi",
    enforcement: "none",
  },
  {
    id: "program_compare",
    label: "Compare up to three programmes",
    integrated: true,
    where: "ForYouPage — compare section",
    enforcement: "none",
  },
  {
    id: "deadlines_reminders",
    label: "Deadline / intake reminders (UI)",
    integrated: true,
    where: "ForYouPage",
    enforcement: "none",
  },
  {
    id: "scholarships_hub",
    label: "Scholarships listing + filters",
    integrated: true,
    where: "ScholarshipsPage, ForYouPage teaser",
    enforcement: "none",
  },
  {
    id: "fx_calculator",
    label: "Live EUR/GBP → INR (Frankfurter) + cost scenarios",
    integrated: true,
    where: "ForYouPage, exchangeRates.js, admin refresh",
    enforcement: "none",
  },
  {
    id: "ask_fateh",
    label: "Ask Fateh AI chat (sidebar)",
    integrated: true,
    where: "AskFatehSidebar, fatehAgent.js",
    enforcement: "none",
  },
  {
    id: "voice_agent",
    label: "Voice agent session (Twilio / voice UI)",
    integrated: true,
    where: "VoiceAgent.jsx",
    enforcement: "none",
  },
  {
    id: "resume_upload",
    label: "Resume upload + skill parsing (UI)",
    integrated: true,
    where: "ForYouPage",
    enforcement: "none",
  },
  {
    id: "visa_docs_upload",
    label: "Visa / passport document upload section",
    integrated: true,
    where: "ForYouPage — #fy-visa",
    enforcement: "none",
  },
  {
    id: "schedule_booking",
    label: "Schedule / book counselling (UI + API hooks)",
    integrated: true,
    where: "SchedulePage, for_you schedule routes",
    enforcement: "none",
  },
  {
    id: "google_calendar_links",
    label: "Google Calendar compose links",
    integrated: true,
    where: "googleCalendar.js, CalendarPage (admin)",
    enforcement: "none",
  },
  {
    id: "intro_call_flag",
    label: "Intro counselling call completed flag (preliminaryCallDone)",
    integrated: true,
    where: "AuthContext, ForYouPage hero",
    enforcement: "none",
  },
  {
    id: "counselling_session_quota",
    label: "Counted human counselling sessions (tier limits)",
    integrated: false,
    where:
      "Increment subscription.counsellingSessionsUsed when a paid/booked session completes; use counsellingSessionsRemaining() to gate booking UI",
    enforcement: "planned",
  },
  {
    id: "sop_review_quota",
    label: "SOP / PS review rounds (tier limits)",
    integrated: false,
    where: "No dedicated SOP editor yet — add module then increment sopReviewsUsed",
    enforcement: "planned",
  },
  {
    id: "visa_counselling_human",
    label: "Dedicated visa counselling with counsellor (tier)",
    integrated: false,
    where: "Policy flag visaCounselling; operational booking",
    enforcement: "planned",
  },
  {
    id: "admin_console",
    label: "PS Console (admin)",
    integrated: true,
    where: "admin/*",
    enforcement: "role admin only",
  },
];

/** Suggested tier assignment for each capability (you can reshuffle freely). */
export const SUGGESTED_TIER_BY_CAPABILITY = {
  starter: [
    "auth_phone",
    "for_you_hub",
    "dashboard_api",
    "program_compare",
    "deadlines_reminders",
    "scholarships_hub",
    "fx_calculator",
    "ask_fateh",
    "voice_agent",
    "resume_upload",
    "visa_docs_upload",
    "schedule_booking",
    "google_calendar_links",
    "intro_call_flag",
    "counselling_session_quota", // capped at 1 when enforced
  ],
  guided: [
    "counselling_session_quota", // up to 5
    "sop_review_quota", // up to 5 when built
    "visa_counselling_human",
  ],
  elite: [
    "counselling_session_quota",
    "sop_review_quota",
    "visa_counselling_human",
  ],
};
