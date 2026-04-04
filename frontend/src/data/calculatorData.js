import { universities as universitiesArray } from './universities';
import { costOfLiving as costOfLivingData } from './costOfLiving';

// Home Office visa financial requirement rates (GBP per month)
export const HOME_OFFICE_RATES = {
  LONDON: 1334,
  OTHER_UK: 1023,
  MAX_MONTHS: 9, // Living costs covered for max 9 months regardless of course duration
};

// Curated university list for the calculator
// Extract only necessary fields: id, full_name, country, city, courses
export const getUniversitiesByCountry = (country) => {
  const countryKey = normalizeCountry(country);
  return universitiesArray
    .filter(uni => uni.country.toLowerCase() === countryKey)
    .map(uni => ({
      id: uni.id,
      full_name: uni.full_name,
      short_name: uni.short_name,
      country: uni.country,
      city: uni.city,
      region: uni.region,
      qs_rank: uni.qs_rank_2026,
      courses: uni.courses || [],
    }));
};

// Get all countries in the dataset
export const getCountries = () => {
  const countries = new Set();
  universitiesArray.forEach(uni => {
    countries.add(uni.country);
  });
  return Array.from(countries).sort();
};

// Get living costs for a city (all tiers)
export const getCostOfLiving = (country, city) => {
  const countryKey = normalizeCountry(country).toLowerCase();
  const cityData = costOfLivingData[countryKey]?.[city.toLowerCase()];

  if (!cityData) return null;

  return {
    city,
    country,
    currency: cityData.currency,
    monthly: cityData.monthly,
    breakdown: cityData.breakdown,
  };
};

// Parse duration string to months
// "1 year" -> 12, "2 years" -> 24, "18 months" -> 18
export const parseDurationToMonths = (durationStr) => {
  if (!durationStr) return 12; // Default to 1 year

  const lower = durationStr.toLowerCase();

  // Match "X year(s)"
  const yearMatch = lower.match(/(\d+)\s*years?/);
  if (yearMatch) return parseInt(yearMatch[1]) * 12;

  // Match "X months"
  const monthMatch = lower.match(/(\d+)\s*months?/);
  if (monthMatch) return parseInt(monthMatch[1]);

  // Match "X.X years" (e.g., "1.5 years")
  const decimalMatch = lower.match(/(\d+\.?\d*)\s*years?/);
  if (decimalMatch) return Math.round(parseFloat(decimalMatch[1]) * 12);

  return 12; // Default to 1 year
};

// Is the university in London?
export const isLondonUniversity = (city) => {
  return city.toLowerCase() === 'london';
};

// Calculate Home Office visa financial requirement
export const calculateVisaFinancial = (tuitionFee, courseDurationMonths, isLondon) => {
  const visaLivingMonths = Math.min(courseDurationMonths, HOME_OFFICE_RATES.MAX_MONTHS);
  const dailyRate = isLondon ? HOME_OFFICE_RATES.LONDON : HOME_OFFICE_RATES.OTHER_UK;
  const visaLivingCost = dailyRate * visaLivingMonths;
  const totalRequired = tuitionFee + visaLivingCost;

  return {
    tuitionFee,
    visaLivingRate: dailyRate,
    visaLivingMonths,
    visaLivingCost,
    totalRequired,
  };
};

// Calculate realistic budget
export const calculateRealisticBudget = (tuitionFee, costPerMonth, courseDurationMonths) => {
  const totalLivingCost = costPerMonth * courseDurationMonths;
  const totalRequired = tuitionFee + totalLivingCost;

  return {
    tuitionFee,
    costPerMonth,
    courseDurationMonths,
    totalLivingCost,
    totalRequired,
  };
};

// Normalize country input
function normalizeCountry(country) {
  const aliases = {
    'uk': 'UK',
    'united kingdom': 'UK',
    'gb': 'UK',
    'england': 'UK',
    'scotland': 'UK',
    'wales': 'UK',
    'ireland': 'Ireland',
    'ie': 'Ireland',
    'uae': 'UAE',
    'dubai': 'UAE',
    'emirates': 'UAE',
  };

  const normalized = aliases[country.toLowerCase()];
  return normalized || country;
}

// Currency formatter
export const formatCurrency = (amount, currency = 'GBP') => {
  const symbols = {
    GBP: '£',
    EUR: '€',
    AED: 'د.إ',
    INR: '₹',
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default {
  getUniversitiesByCountry,
  getCountries,
  getCostOfLiving,
  parseDurationToMonths,
  isLondonUniversity,
  calculateVisaFinancial,
  calculateRealisticBudget,
  formatCurrency,
};
