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

  const fetchDashboard = useCallback(async () => {
    if (!enabled || (!sessionId && !email)) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchForYouDashboard(sessionId, email);
      setData(response);
    } catch (err) {
      console.error("[useForYouDashboard] Error:", err);
      setError(err.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, [sessionId, email, enabled]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const refresh = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const updateCompleteness = useCallback(async () => {
    if (!data?.lead_profile?.id) {
      setError("Lead ID not found");
      return null;
    }

    try {
      const updated = await updateLeadCompleteness(data.lead_profile.id);
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
    dashboard: data,
    leadProfile: data?.lead_profile,
    recommendations: data?.recommendations,
    insights: data?.insights,
    nextSteps: data?.next_steps,
    personalization: data?.personalization,
    loading,
    error,
    hasData: !!data,
    refresh,
    updateCompleteness,
  };
}

export function useLeadProfile(sessionId, email) {
  const { leadProfile, loading, error, refresh } = useForYouDashboard(
    sessionId,
    email
  );
  return { profile: leadProfile, loading, error, refresh };
}

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

export function useAllScholarships(sessionId, email) {
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (sessionId) query.set("session_id", sessionId);
        if (email) query.set("email", email);
        const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/for-you/scholarships?${query.toString()}`);
        const data = await response.json();
        setScholarships(data.scholarships || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [sessionId, email]);

  return { scholarships, loading, error };
}

export function useUserSchedule(email) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSchedule = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/for-you/schedule?email=${email}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return { sessions, loading, error, refresh: fetchSchedule };
}

export function useScheduleMeeting() {
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState(null);

  const schedule = async (payload) => {
    setScheduling(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/for-you/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to schedule meeting");
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setScheduling(false);
    }
  };

  return { schedule, scheduling, error };
}
