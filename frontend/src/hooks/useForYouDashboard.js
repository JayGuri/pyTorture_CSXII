/**
 * useForYouDashboard Hook
 *
 * Fetches and manages For You page data from backend API.
 * Handles loading, error states, and data caching.
 */

import { useState, useEffect, useCallback } from "react";
import { fetchForYouDashboard, updateLeadCompleteness } from "../lib/forYouApi";

/**
 * Hook to fetch and manage For You dashboard data
 * @param {string} sessionId - Twilio session ID
 * @param {string} email - User email (fallback if no session_id)
 * @param {boolean} enabled - Whether to fetch data (default: true)
 * @returns {object} Dashboard data, loading state, error, and refresh function
 */
export function useForYouDashboard(sessionId, email, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dashboard data from backend
  const fetchDashboard = useCallback(async () => {
    if (!enabled || (!sessionId && !email)) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchForYouDashboard(sessionId, email);
      // API returns the dashboard directly without success wrapper
      setData(response);
    } catch (err) {
      console.error("[useForYouDashboard] Error:", err);
      setError(err.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, [sessionId, email, enabled]);

  // Fetch on mount or when sessionId/email changes
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Refresh dashboard data
  const refresh = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Update completeness scores
  const updateCompleteness = useCallback(async () => {
    if (!data?.lead_profile?.id) {
      setError("Lead ID not found");
      return null;
    }

    try {
      const updated = await updateLeadCompleteness(data.lead_profile.id);
      // Update local data with new scores
      setData((prev) => ({
        ...prev,
        lead_profile: updated,
        personalization: {
          ...prev.personalization,
          data_completeness: updated.data_completeness,
        },
      }));
      return updated;
    } catch (err) {
      console.error("[useForYouDashboard] Completeness update error:", err);
      setError(err.message);
      return null;
    }
  }, [data?.lead_profile?.id]);

  return {
    // Data
    dashboard: data,
    leadProfile: data?.lead_profile,
    recommendations: data?.recommendations,
    insights: data?.insights,
    nextSteps: data?.next_steps,
    personalization: data?.personalization,

    // States
    loading,
    error,
    hasData: !!data,

    // Actions
    refresh,
    updateCompleteness,
  };
}

/**
 * Hook for simpler usage - just get lead profile data
 * @param {string} sessionId - Twilio session ID
 * @param {string} email - User email
 * @returns {object} Lead profile data and loading state
 */
export function useLeadProfile(sessionId, email) {
  const { leadProfile, loading, error, refresh } = useForYouDashboard(
    sessionId,
    email
  );

  return {
    profile: leadProfile,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for just recommendations
 * @param {string} sessionId - Twilio session ID
 * @param {string} email - User email
 * @returns {object} Recommendations data
 */
export function useRecommendations(sessionId, email) {
  const { recommendations, loading, error } = useForYouDashboard(
    sessionId,
    email
  );

  return {
    universities: recommendations?.universities || [],
    scholarships: recommendations?.scholarships || [],
    costs: recommendations?.costs || [],
    loading,
    error,
  };
}
