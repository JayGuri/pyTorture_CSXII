/**
 * Knowledge Base Processing Layer
 * Imports and processes all KB data for frontend display
 */

// Import all knowledge bases
import fatehKB from "../../data/fateh_kb_v4_comprehensive.json";
import scholarshipsKB from "../../data/scholarships.json";
import universitiesKB from "../../data/universities.json";
import costOfLivingKB from "../../data/cost_of_living.json";

/**
 * Extract key insights from central KB
 * Returns structured insights for display
 */
export function extractKeyInsights() {
  const uk = fatehKB.uk?._overview || {};
  return {
    whyUK: uk.why_uk || [],
    academicYear: uk.academic_year || {},
    degreeEquivalency: uk.degree_equivalency_india || {},
    threeYearPolicy: uk.three_year_degree_policy || "",
  };
}

/**
 * Get all universities with smart filtering
 */
export function getAllUniversities(country = null) {
  const unis = universitiesKB.universities || [];
  if (!country) return unis;
  return unis.filter((u) => u.country?.toLowerCase() === country.toLowerCase());
}

/**
 * Get universities by region
 */
export function getUniversitiesByRegion(country, region) {
  return getAllUniversities(country).filter((u) => u.region === region);
}

/**
 * Get top-ranked universities
 */
export function getTopUniversities(limit = 6, country = null) {
  let unis = getAllUniversities(country);
  return unis
    .filter((u) => u.qs_rank_2026)
    .sort((a, b) => (a.qs_rank_2026 || 999) - (b.qs_rank_2026 || 999))
    .slice(0, limit);
}

/**
 * Get scholarships with smart filtering
 */
export function getAllScholarships() {
  return scholarshipsKB.scholarships || [];
}

/**
 * Filter scholarships by country
 */
export function getScholarshipsByCountry(country) {
  return getAllScholarships().filter(
    (s) => s.country?.toLowerCase() === country.toLowerCase()
  );
}

/**
 * Get full scholarships (fully funded)
 */
export function getFullScholarships(country = null) {
  let scholarships = getAllScholarships();
  if (country) {
    scholarships = scholarships.filter(
      (s) => s.country?.toLowerCase() === country.toLowerCase()
    );
  }
  return scholarships.filter((s) => s.funding_level === "full");
}

/**
 * Get scholarships for Indians specifically
 */
export function getScholarshipsForIndians() {
  return getAllScholarships().filter((s) => s.india_specific?.india_eligible);
}

/**
 * Get cost of living for a city
 */
export function getCostOfLiving(country, city) {
  const countryData = costOfLivingKB[country?.toLowerCase()];
  if (!countryData) return null;
  return countryData[city?.toLowerCase()] || null;
}

/**
 * Get all cities for a country
 */
export function getCitiesByCountry(country) {
  const countryData = costOfLivingKB[country?.toLowerCase()];
  if (!countryData) return [];
  return Object.keys(countryData)
    .filter((key) => key !== "metadata")
    .map((city) => ({
      city,
      ...countryData[city],
    }));
}

/**
 * Get average cost across all tiers for comparison
 */
export function getAverageCost(country, city) {
  const cost = getCostOfLiving(country, city);
  if (!cost?.monthly) return null;
  return {
    min: cost.monthly.min,
    realistic: cost.monthly.realistic,
    comfortable: cost.monthly.comfortable,
    average:
      (cost.monthly.min + cost.monthly.realistic + cost.monthly.comfortable) /
      3,
  };
}

/**
 * Get regions from central KB
 */
export function getRegionsByCountry(country = "uk") {
  const regions = fatehKB[country?.toLowerCase()]?.regions || {};
  return Object.entries(regions).map(([key, value]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    ...value,
  }));
}

/**
 * Match scholarships based on user profile
 * Takes user criteria and returns matching scholarships
 */
export function matchScholarshipsForUser(userProfile = {}) {
  const {
    country = "uk",
    studyLevel = "Masters",
    workExp = 0,
    nationality = "India",
  } = userProfile;

  return getAllScholarships().filter((s) => {
    // Match country
    if (s.country?.toLowerCase() !== country.toLowerCase()) return false;

    // Match study level
    if (
      s.level_of_study &&
      !s.level_of_study.includes(studyLevel)
    )
      return false;

    // Check nationality eligibility
    if (
      s.eligible_nationalities &&
      typeof s.eligible_nationalities === "string"
    ) {
      if (!s.eligible_nationalities.includes(nationality)) return false;
    }

    // Check work experience requirements
    if (s.eligibility?.work_experience) {
      const requiredYears = parseInt(s.eligibility.work_experience) || 0;
      if (workExp < requiredYears) return false;
    }

    return true;
  });
}

/**
 * Get FAQ from central KB
 */
export function getFAQ() {
  return fatehKB.faq || [];
}

/**
 * Search FAQ by keyword
 */
export function searchFAQ(keyword) {
  const faqs = getFAQ();
  const lowerKeyword = keyword.toLowerCase();
  return faqs.filter(
    (f) =>
      f.question?.toLowerCase().includes(lowerKeyword) ||
      f.answer?.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * Get consultant info
 */
export function getConsultantInfo() {
  return fatehKB.consultant_identity || {};
}

/**
 * Get live metrics
 */
export function getLiveMetrics() {
  return fatehKB.live_metrics || {};
}

/**
 * Get visa financial requirements
 */
export function getVisaFinancialRequirements(country = "uk") {
  return fatehKB[country?.toLowerCase()]?.visa_financial_requirements || {};
}

/**
 * Build a comprehensive "For You" dashboard based on user profile
 */
export function buildForYouDashboard(userProfile = {}) {
  const {
    country = "uk",
    studyLevel = "Masters",
    budget = "flexible",
    interests = [],
  } = userProfile;

  return {
    topUniversities: getTopUniversities(6, country),
    matchedScholarships: matchScholarshipsForUser(userProfile),
    topCities: getCitiesByCountry(country),
    keyInsights: extractKeyInsights(),
    regions: getRegionsByCountry(country),
    visaRequirements: getVisaFinancialRequirements(country),
  };
}

export default {
  extractKeyInsights,
  getAllUniversities,
  getUniversitiesByRegion,
  getTopUniversities,
  getAllScholarships,
  getScholarshipsByCountry,
  getFullScholarships,
  getScholarshipsForIndians,
  getCostOfLiving,
  getCitiesByCountry,
  getAverageCost,
  getRegionsByCountry,
  matchScholarshipsForUser,
  getFAQ,
  searchFAQ,
  getConsultantInfo,
  getLiveMetrics,
  getVisaFinancialRequirements,
  buildForYouDashboard,
};
