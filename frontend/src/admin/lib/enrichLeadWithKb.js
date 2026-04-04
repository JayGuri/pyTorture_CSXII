/**
 * Enrich a Supabase-shaped lead row with slices from the static JSON knowledge bases
 * (same sources as src/lib/knowledgeBase.js — universities, scholarships, cost_of_living).
 */

import {
  getTopUniversities,
  matchScholarshipsForUser,
  getCitiesByCountry,
  getAllUniversities,
} from "../../lib/knowledgeBase";

export function resolveKbCountryKeys(raw) {
  const c = String(raw || "").trim().toLowerCase();
  if (!c) return null;
  if (
    c === "uk" ||
    c === "united kingdom" ||
    c === "britain" ||
    c === "great britain"
  ) {
    return { uni: "UK", cost: "uk", display: "UK" };
  }
  if (c === "ireland" || c === "ie" || c === "republic of ireland") {
    return { uni: "Ireland", cost: "ireland", display: "Ireland" };
  }
  if (c === "uae" || c === "dubai" || c === "united arab emirates") {
    return { uni: "UAE", cost: "uae", display: "UAE" };
  }
  return null;
}

export function firstTargetCountryForKb(targetCountries) {
  const list = Array.isArray(targetCountries) ? targetCountries : [];
  for (const raw of list) {
    const keys = resolveKbCountryKeys(raw);
    if (keys) return keys;
  }
  return null;
}

function studyLevelFromEducation(educationLevel) {
  const e = String(educationLevel || "").toLowerCase();
  if (e.includes("phd") || e.includes("doctor")) return "PhD";
  if (e.includes("mba")) return "MBA";
  if (
    e.includes("bachelor") ||
    e.includes("undergraduate") ||
    e.includes("b.tech") ||
    e.includes("b.com")
  ) {
    return "Bachelors";
  }
  if (
    e.includes("master") ||
    e.includes("msc") ||
    e.includes("m.s") ||
    e.includes("ms ")
  ) {
    return "Masters";
  }
  return "Masters";
}

/**
 * @param {object|null} lead — row from GET /api/leads/:id
 * @returns {object} KB slices for admin panels
 */
export function enrichLeadWithKb(lead) {
  if (!lead) {
    return {
      kbCountry: null,
      topUniversities: [],
      matchedScholarships: [],
      costCities: [],
      recommendedFromKb: [],
    };
  }

  const keys = firstTargetCountryForKb(lead.target_countries);
  if (!keys) {
    return {
      kbCountry: null,
      topUniversities: [],
      matchedScholarships: [],
      costCities: [],
      recommendedFromKb: [],
    };
  }

  const studyLevel = studyLevelFromEducation(lead.education_level);
  const userProfile = {
    country: keys.uni,
    studyLevel,
    workExp: 0,
    nationality: "India",
  };

  const matchedScholarships = matchScholarshipsForUser(userProfile).slice(0, 10);
  const topUniversities = getTopUniversities(6, keys.uni);
  const costCities = getCitiesByCountry(keys.cost).slice(0, 10);

  const recNames = Array.isArray(lead.recommended_universities)
    ? lead.recommended_universities
    : [];
  const allUnis = getAllUniversities(keys.uni);
  const recommendedFromKb = [];
  for (const name of recNames) {
    const n = String(name).toLowerCase().trim();
    if (!n) continue;
    const hit = allUnis.find(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(n)) ||
        (u.short_name && u.short_name.toLowerCase() === n) ||
        (u.short_name && n.includes(u.short_name.toLowerCase())),
    );
    if (hit) recommendedFromKb.push(hit);
  }

  return {
    kbCountry: keys.display,
    topUniversities,
    matchedScholarships,
    costCities,
    recommendedFromKb,
  };
}
