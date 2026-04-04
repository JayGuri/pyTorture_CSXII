/**
 * For You Page API Service
 *
 * Handles all backend API calls for personalized recommendations,
 * lead profiles, and score calculations.
 */

// Backend API URL - change this based on your environment
const API_BASE = "http://localhost:8000";
// For production: const API_BASE = "https://your-backend.com";

/**
 * Fetch complete For You dashboard with recommendations
 * @param {string} sessionId - Twilio session ID
 * @param {string} email - User email (fallback)
 * @returns {Promise<object>} Dashboard with lead profile, recommendations, insights
 */
export async function fetchForYouDashboard(sessionId, email) {
  const params = new URLSearchParams();
  if (sessionId) params.append("session_id", sessionId);
  if (email) params.append("email", email);

  const response = await fetch(
    `${API_BASE}/api/v1/for-you/dashboard?${params}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch For You dashboard");
  }

  return response.json();
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
 * @returns {Promise<object>} Dashboard overview with hot/warm/cold counts
 */
export async function fetchDashboardOverview() {
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
}

/**
 * Fetch list of leads with pagination
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @param {string} classification - Filter by Hot/Warm/Cold
 * @param {string} search - Search by name or email
 * @returns {Promise<object>} Paginated leads with metadata
 */
export async function fetchLeads(page = 1, limit = 20, classification = null, search = null) {
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
