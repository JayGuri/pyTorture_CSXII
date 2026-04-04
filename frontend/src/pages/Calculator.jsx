import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  getCountries,
  getUniversitiesByCountry,
  getCostOfLiving,
  parseDurationToMonths,
  isLondonUniversity,
  calculateVisaFinancial,
  calculateRealisticBudget,
  formatCurrency,
} from '../data/calculatorData';

const Calculator = () => {
  const [selectedCountry, setSelectedCountry] = useState('UK');
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const countries = getCountries();
  const universities = useMemo(
    () => getUniversitiesByCountry(selectedCountry),
    [selectedCountry]
  );

  // Auto-select first university when country changes
  useMemo(() => {
    if (universities.length > 0 && (!selectedUniversity || !universities.find(u => u.id === selectedUniversity.id))) {
      setSelectedUniversity(universities[0]);
      setSelectedCourse(null);
    }
  }, [universities, selectedUniversity]);

  const courses = selectedUniversity?.courses || [];
  const costOfLiving = selectedUniversity ? getCostOfLiving(selectedCountry, selectedUniversity.city) : null;

  // Calculations
  let calculations = null;
  if (selectedCourse && selectedUniversity && costOfLiving) {
    const courseDurationMonths = parseDurationToMonths(selectedCourse.duration);
    const tuitionFee = selectedCourse.fee_gbp;
    const isLondon = isLondonUniversity(selectedUniversity.city);

    const visa = calculateVisaFinancial(tuitionFee, courseDurationMonths, isLondon);
    const realistic = calculateRealisticBudget(
      tuitionFee,
      costOfLiving.monthly.realistic,
      courseDurationMonths
    );

    calculations = {
      visa,
      realistic,
      costOfLiving,
      duration: selectedCourse.duration,
      courseDurationMonths,
      isLondon,
    };
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <main className="min-h-screen bg-brand-obsidian text-brand-ivory pt-24 pb-16">
      <motion.div
        className="max-w-4xl mx-auto px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="font-outfit text-5xl font-bold mb-4">
            Financial Requirement Calculator
          </h1>
          <p className="font-jakarta text-brand-silt text-lg">
            Know exactly what to show in your bank account — and for how long.
          </p>
        </motion.div>

        {/* Selectors Section */}
        <motion.div variants={itemVariants} className="bg-brand-graphite rounded-lg p-8 mb-8">
          {/* Country Selector */}
          <div className="mb-8">
            <label className="font-outfit font-semibold text-brand-gold mb-4 block">
              Step 1: Select Country
            </label>
            <div className="flex flex-wrap gap-3">
              {countries.map(country => (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(country)}
                  className={`px-6 py-2 rounded-full font-jakarta font-medium transition-all ${
                    selectedCountry === country
                      ? 'bg-brand-gold text-brand-obsidian'
                      : 'border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-obsidian'
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          {/* University Selector */}
          <div className="mb-8">
            <label className="font-outfit font-semibold text-brand-gold mb-4 block">
              Step 2: Select University
            </label>
            <div className="relative">
              <select
                value={selectedUniversity?.id || ''}
                onChange={(e) => {
                  const uni = universities.find(u => u.id === e.target.value);
                  setSelectedUniversity(uni);
                  setSelectedCourse(null);
                }}
                className="w-full px-4 py-3 rounded bg-brand-obsidian border border-brand-silt text-brand-ivory font-jakarta focus:outline-none focus:border-brand-gold appearance-none cursor-pointer"
              >
                <option value="">Choose a university...</option>
                {universities.map(uni => (
                  <option key={uni.id} value={uni.id}>
                    {uni.full_name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-3 text-brand-gold">
                ▼
              </div>
            </div>
          </div>

          {/* Course Selector */}
          {selectedUniversity && courses.length > 0 && (
            <div>
              <label className="font-outfit font-semibold text-brand-gold mb-4 block">
                Step 3: Select Course
              </label>
              <div className="relative">
                <select
                  value={selectedCourse?.name || ''}
                  onChange={(e) => {
                    const course = courses.find(c => c.name === e.target.value);
                    setSelectedCourse(course);
                  }}
                  className="w-full px-4 py-3 rounded bg-brand-obsidian border border-brand-silt text-brand-ivory font-jakarta focus:outline-none focus:border-brand-gold appearance-none cursor-pointer"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.name} value={course.name}>
                      {course.name} — {formatCurrency(course.fee_gbp)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-3 text-brand-gold">
                  ▼
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Results Section */}
        {calculations && (
          <motion.div variants={itemVariants} className="space-y-8">
            {/* Main Calculation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Official Visa Requirement Card */}
              <div className="bg-brand-graphite border-2 border-brand-gold rounded-lg p-6">
                <h3 className="font-outfit text-sm font-semibold text-brand-gold uppercase tracking-wide mb-4">
                  UK Visa Requirement (Home Office)
                </h3>
                <div className="space-y-3 mb-6 pb-6 border-b border-brand-silt">
                  <div className="flex justify-between items-center font-jakarta">
                    <span className="text-brand-silt">Tuition Fee ({selectedCourse.duration})</span>
                    <span className="text-white font-semibold">{formatCurrency(calculations.visa.tuitionFee)}</span>
                  </div>
                  <div className="flex justify-between items-center font-jakarta">
                    <span className="text-brand-silt">Living Costs ({calculations.visa.visaLivingMonths} months)</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(calculations.visa.visaLivingCost)} @{formatCurrency(calculations.visa.visaLivingRate)}/mo
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-outfit font-semibold text-brand-gold">Total to Show</span>
                  <span className="font-outfit text-3xl font-bold text-brand-gold">
                    {formatCurrency(calculations.visa.totalRequired)}
                  </span>
                </div>
              </div>

              {/* Realistic Budget Card */}
              <div className="bg-brand-graphite rounded-lg p-6">
                <h3 className="font-outfit text-sm font-semibold text-brand-gold uppercase tracking-wide mb-4">
                  Realistic Budget
                </h3>
                <div className="space-y-3 mb-6 pb-6 border-b border-brand-silt">
                  <div className="flex justify-between items-center font-jakarta">
                    <span className="text-brand-silt">Tuition Fee ({selectedCourse.duration})</span>
                    <span className="text-white font-semibold">{formatCurrency(calculations.realistic.tuitionFee)}</span>
                  </div>
                  <div className="flex justify-between items-center font-jakarta">
                    <span className="text-brand-silt">Living Costs ({calculations.realistic.courseDurationMonths} months)</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(calculations.realistic.totalLivingCost)} @{formatCurrency(calculations.realistic.costPerMonth)}/mo
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-outfit font-semibold text-brand-gold">Total Needed</span>
                  <span className="font-outfit text-3xl font-bold text-brand-gold">
                    {formatCurrency(calculations.realistic.totalRequired)}
                  </span>
                </div>
              </div>
            </div>

            {/* 28-Day Rule Banner */}
            <div className="bg-brand-gold bg-opacity-10 border-2 border-brand-gold rounded-lg p-6">
              <h3 className="font-outfit font-bold text-brand-gold text-lg mb-3">
                ⚠️ The 28-Day Rule (UK Visa Requirement)
              </h3>
              <p className="font-jakarta text-brand-ivory leading-relaxed">
                The total amount of {formatCurrency(calculations.visa.totalRequired)} must sit in your bank account
                for <strong>28 consecutive days</strong> before you submit your visa application. The 28-day window must end within 31 days of your application date. This is a common mistake — many students apply without meeting this requirement.
              </p>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-brand-graphite rounded-lg p-6">
              <h3 className="font-outfit font-semibold text-brand-gold text-lg mb-6">
                Living Cost Breakdown for {selectedUniversity.city}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-brand-obsidian rounded">
                  <div className="text-brand-silt font-jakarta text-sm mb-2">Minimum</div>
                  <div className="font-outfit text-2xl font-bold text-brand-ivory">
                    {formatCurrency(calculations.costOfLiving.monthly.min)}/mo
                  </div>
                </div>
                <div className="text-center p-4 bg-brand-obsidian rounded border border-brand-gold">
                  <div className="text-brand-gold font-jakarta text-sm mb-2">Realistic ★</div>
                  <div className="font-outfit text-2xl font-bold text-brand-gold">
                    {formatCurrency(calculations.costOfLiving.monthly.realistic)}/mo
                  </div>
                </div>
                <div className="text-center p-4 bg-brand-obsidian rounded">
                  <div className="text-brand-silt font-jakarta text-sm mb-2">Comfortable</div>
                  <div className="font-outfit text-2xl font-bold text-brand-ivory">
                    {formatCurrency(calculations.costOfLiving.monthly.comfortable)}/mo
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              {calculations.costOfLiving.breakdown && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(calculations.costOfLiving.breakdown).map(([key, value]) => (
                    <div key={key} className="p-3 bg-brand-obsidian rounded text-center">
                      <div className="text-brand-silt font-jakarta text-xs uppercase tracking-wide mb-1">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="font-jakarta text-brand-ivory font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next Steps */}
            <div className="bg-brand-graphite rounded-lg p-6">
              <h3 className="font-outfit font-semibold text-brand-gold text-lg mb-4">
                Next Steps
              </h3>
              <ol className="font-jakarta text-brand-ivory space-y-3 list-decimal list-inside">
                <li>
                  Transfer {formatCurrency(calculations.visa.totalRequired)} to your bank account <strong>28 days before</strong> you plan to apply.
                </li>
                <li>
                  Keep the money there for the full 28 consecutive days. Don't withdraw it.
                </li>
                <li>
                  Once the 28 days are complete, apply for your visa. Your bank statement must show the full amount.
                </li>
                <li>
                  The 28-day period must end within 31 days of your visa application date.
                </li>
              </ol>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!calculations && (
          <motion.div variants={itemVariants} className="text-center py-12">
            <p className="font-jakarta text-brand-silt text-lg">
              Select a university and course to see your financial requirements.
            </p>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
};

export default Calculator;
