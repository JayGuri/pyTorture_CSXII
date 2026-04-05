/**
 * For You Page API Service
 *
 * Handles all backend API calls for personalized recommendations,
 * lead profiles, and score calculations.
 */

import { withCache, deleteCacheKey, invalidateCachePrefix } from "./apiCache.js";

/**
 * Drop cached admin/leads data after mutations or when forcing a refresh.
 * @param {object} [opts]
 * @param {string|null} [opts.leadId] - Also clear GET /api/leads/:id
 * @param {boolean} [opts.overview] - Clear dashboard overview (default true)
 * @param {boolean} [opts.liveSessions] - Clear merged + per-status session cache (default true)
 * @param {boolean} [opts.forYou] - Clear cached For You dashboard GETs (default false)
 */
export function invalidateAdminApiCache(opts = {}) {
  const { leadId = null, overview = true, liveSessions = true, forYou = false } = opts;
  invalidateCachePrefix("leads:");
  if (leadId) deleteCacheKey(`lead:${leadId}`);
  if (overview) deleteCacheKey("dashboard:overview");
  if (liveSessions) {
    deleteCacheKey("live-sessions:merged");
    deleteCacheKey("active-sessions:active");
    deleteCacheKey("active-sessions:ringing");
  }
  if (forYou) invalidateCachePrefix("for-you:");
}

// Backend API URL from environment variables (required for Vercel deployment)
// Development (.env.local): VITE_API_BASE_URL=http://localhost:8000
// Production (.env.production): VITE_API_BASE_URL=https://your-backend.com
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/** Short TTLs keep admin views fresh while deduping rapid navigation. */
const TTL = {
  leadsList: 25_000,
  leadDetail: 35_000,
  dashboardOverview: 30_000,
  activeSessions: 12_000,
  liveMerged: 12_000,
  forYouDashboard: 20_000,
};

/**
 * Fetch complete For You dashboard with recommendations
 * @param {string} sessionId - Twilio session ID
 * @param {string} email - User email (fallback)
 * @returns {Promise<object>} Dashboard with lead profile, recommendations, insights
 */
/**
 * @param {object} [options]
 * @param {boolean} [options.bypassCache]
 */
export async function fetchForYouDashboard(sessionId, email, options = {}) {
  const { bypassCache = false } = options;
  const key = `for-you:dashboard:${sessionId || "-"}:${email || "-"}`;
  if (bypassCache) deleteCacheKey(key);

  return withCache(key, TTL.forYouDashboard, async () => {
    const params = new URLSearchParams();
    if (sessionId) params.append("session_id", sessionId);
    if (email) params.append("email", email);

    const response = await fetch(
      `${API_BASE}/api/v1/for-you/dashboard?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch For You dashboard");
    }

    return response.json();
  });
}

/**
 * Get lead profile without recommendations
 * @param {string} sessionId - Twilio session ID
 * @param {string} email - User email
 * @returns {Promise<object>} Lead profile data
 */
export async function fetchLeadProfile(sessionId, email) {
  const response = await fetch(`${API_BASE}/api/v1/for-you/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      email: email,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch lead profile");
  }

  return response.json();
}

/**
 * Get data completeness metrics and improvement suggestions
 * @param {string} leadId - Lead ID
 * @returns {Promise<object>} Completeness percentage and missing fields
 */
export async function fetchLeadCompleteness(leadId) {
  const response = await fetch(
    `${API_BASE}/api/v1/for-you/completeness/${leadId}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch completeness");
  }

  const data = await response.json();
  return data.data; // Extract the data field from response wrapper
}

/**
 * Calculate and update completeness scores
 * @param {string} leadId - Lead ID
 * @returns {Promise<object>} Updated lead with new scores
 */
export async function updateLeadCompleteness(leadId) {
  const response = await fetch(
    `${API_BASE}/api/v1/for-you/update-completeness/${leadId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update completeness");
  }

  const data = await response.json();
  invalidateAdminApiCache({ leadId, overview: false, liveSessions: false, forYou: true });
  return data.data; // Extract lead from response
}

/**
 * Save filtered recommendations to lead profile
 * @param {string} leadId - Lead ID
 * @param {array} universities - Filtered universities
 * @param {array} scholarships - Matched scholarships
 * @returns {Promise<object>} Updated lead record
 */
export async function saveRecommendations(leadId, universities, scholarships) {
  const params = new URLSearchParams();
  params.append("lead_id", leadId);
  if (universities) params.append("universities", JSON.stringify(universities));
  if (scholarships) params.append("scholarships", JSON.stringify(scholarships));

  const response = await fetch(
    `${API_BASE}/api/v1/for-you/save-recommendations?${params}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to save recommendations");
  }

  const data = await response.json();
  invalidateAdminApiCache({ leadId, overview: false, liveSessions: false, forYou: true });
  return data.data;
}

/**
 * Get personalized insights for a lead
 * @param {string} sessionId - Twilio session ID
 * @returns {Promise<object>} Insights with action items and warnings
 */
export async function fetchPersonalizedInsights(sessionId) {
  const response = await fetch(
    `${API_BASE}/api/v1/for-you/insights/${sessionId}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch insights");
  }

  return response.json();
}

/**
 * Get filtered universities based on lead profile
 * @param {string} sessionId - Twilio session ID
 * @param {array} universities - Optional pre-loaded universities
 * @returns {Promise<object>} Filtered and ranked universities
 */
export async function filterUniversities(sessionId, universities = null) {
  const params = new URLSearchParams();
  params.append("session_id", sessionId);
  if (universities) params.append("universities", JSON.stringify(universities));

  const response = await fetch(
    `${API_BASE}/api/v1/for-you/filter-universities?${params}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to filter universities");
  }

  const data = await response.json();
  return data.universities || [];
}

/**
 * Get matched scholarships based on lead profile
 * @param {string} sessionId - Twilio session ID
 * @param {array} scholarships - Optional pre-loaded scholarships
 * @returns {Promise<object>} Matched and ranked scholarships
 */
export async function matchScholarships(sessionId, scholarships = null) {
  const params = new URLSearchParams();
  params.append("session_id", sessionId);
  if (scholarships) params.append("scholarships", JSON.stringify(scholarships));

  const response = await fetch(
    `${API_BASE}/api/v1/for-you/match-scholarships?${params}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to match scholarships");
  }

  const data = await response.json();
  return data.scholarships || [];
}

/**
 * Get cost recommendations based on lead profile
 * @param {string} sessionId - Twilio session ID
 * @param {object} costData - Optional pre-loaded cost data
 * @returns {Promise<array>} Recommended cities with cost breakdowns
 */
export async function getCostRecommendations(sessionId, costData = null) {
  const params = new URLSearchParams();
  params.append("session_id", sessionId);
  if (costData) params.append("cost_data", JSON.stringify(costData));

  const response = await fetch(
    `${API_BASE}/api/v1/for-you/cost-recommendations?${params}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get cost recommendations");
  }

  const data = await response.json();
  return data.recommendations || [];
}

/**
 * Fetch admin dashboard metrics
 * @param {object} [options]
 * @param {boolean} [options.bypassCache]
 * @returns {Promise<object>} Dashboard overview with hot/warm/cold counts
 */
export async function fetchDashboardOverview(options = {}) {
  const { bypassCache = false } = options;
  const key = "dashboard:overview";
  if (bypassCache) deleteCacheKey(key);

  return withCache(key, TTL.dashboardOverview, async () => {
    const response = await fetch(`${API_BASE}/api/dashboard/overview`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch dashboard overview");
    }

    const data = await response.json();
    return data.data;
  });
}

/**
 * Fetch list of leads with pagination
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @param {string} classification - Filter by Hot/Warm/Cold
 * @param {string} search - Search by name or email
 * @param {object} [options]
 * @param {boolean} [options.bypassCache]
 * @returns {Promise<object>} Paginated leads with metadata
 */
export async function fetchLeads(page = 1, limit = 20, classification = null, search = null, options = {}) {
  const { bypassCache = false } = options;
  const key = `leads:${page}:${limit}:${classification ?? ""}:${search ?? ""}`;
  if (bypassCache) deleteCacheKey(key);

  return withCache(key, TTL.leadsList, async () => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    if (classification) params.append("classification", classification);
    if (search) params.append("search", search);

    const response = await fetch(`${API_BASE}/api/leads?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch leads");
    }

    return response.json();
  });
}

/**
 * Fetch a single lead with nested call_sessions (full schema fields).
 * @param {string} leadId - UUID
 * @param {object} [options]
 * @param {boolean} [options.bypassCache]
 * @returns {Promise<object>} Lead row including call_sessions
 */
export async function fetchLead(leadId, options = {}) {
  const { bypassCache = false } = options;
  const key = `lead:${leadId}`;
  if (bypassCache) deleteCacheKey(key);

  return withCache(key, TTL.leadDetail, async () => {
    const response = await fetch(`${API_BASE}/api/leads/${encodeURIComponent(leadId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to fetch lead");
    }

    const body = await response.json();
    return body.data;
  });
}

/**
 * List call sessions with a given status (ringing, active, completed, etc.)
 * @param {string} status - Session status filter
 * @param {object} [options]
 * @param {boolean} [options.bypassCache]
 * @returns {Promise<object[]>} Session rows
 */
export async function fetchActiveSessions(status = "active", options = {}) {
  const { bypassCache = false } = options;
  const key = `active-sessions:${status || "active"}`;
  if (bypassCache) deleteCacheKey(key);

  return withCache(key, TTL.activeSessions, async () => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);

    const response = await fetch(`${API_BASE}/api/dashboard/active-sessions?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to fetch active sessions");
    }

    const body = await response.json();
    return body.data || [];
  });
}

/**
 * Live/ringing sessions merged (deduped by id).
 * @param {object} [options]
 * @param {boolean} [options.bypassCache]
 * @returns {Promise<object[]>}
 */
export async function fetchLiveAndRingingSessions(options = {}) {
  const { bypassCache = false } = options;
  const key = "live-sessions:merged";
  if (bypassCache) {
    deleteCacheKey(key);
    deleteCacheKey("active-sessions:active");
    deleteCacheKey("active-sessions:ringing");
  }

  return withCache(key, TTL.liveMerged, async () => {
    const [active, ringing] = await Promise.all([
      fetchActiveSessions("active", options),
      fetchActiveSessions("ringing", options),
    ]);
    const byId = new Map();
    for (const row of [...(ringing || []), ...(active || [])]) {
      if (row?.id) byId.set(row.id, row);
    }
    return Array.from(byId.values());
  });
}

/**
 * Update a lead's profile
 * @param {string} leadId - Lead ID
 * @param {object} updateData - Fields to update (name, email, classification, scores, etc)
 * @returns {Promise<object>} Updated lead record
 */
export async function updateLead(leadId, updateData) {
  const response = await fetch(`${API_BASE}/api/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update lead");
  }

  const data = await response.json();
  invalidateAdminApiCache({ leadId, overview: true, liveSessions: true, forYou: true });
  return data.data;
}

/**
 * Analyze call transcript for sentiment, intent, and emotional state
 * @param {string} callSid - Twilio call SID
 * @returns {Promise<object>} Analysis result with sentiment, intent, recommendations
 */
export async function analyzeCallTranscript(callSid) {
  const response = await fetch(
    `${API_BASE}/api/transcription/analyze-call/${encodeURIComponent(callSid)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to analyze transcript");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Health check for API
 * @returns {Promise<boolean>} True if API is healthy
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/for-you/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return response.ok;
  } catch (error) {
    console.error("[forYouApi] Health check failed:", error);
    return false;
  }
}
