"""
Unit tests for backend services.

Tests cover:
- ForYouService filtering and matching logic
- KBService loading and caching
- LeadScoringService scoring calculations
"""

import pytest
from src.services.for_you_service import ForYouService
from src.services.kb_service import KBService
from src.services.lead_scoring import LeadScoringService


# ────────────────────────────────────────────────────────────────────
# ForYouService Tests
# ────────────────────────────────────────────────────────────────────

class TestForYouServiceFiltering:
    """Test university filtering logic."""

    def test_filter_universities_by_country(self, sample_lead, sample_university):
        """Test filtering universities by target country."""
        universities = [sample_university]
        filtered = ForYouService.filter_universities_by_profile(sample_lead, universities)

        assert len(filtered) == 1
        assert filtered[0]["country"].lower() in sample_lead["target_countries"]

    def test_filter_universities_by_gpa(self, sample_university):
        """Test filtering universities by GPA requirement."""
        lead_low_gpa = {
            "target_countries": ["uk"],
            "gpa": 6.0,  # Very low GPA
            "ielts_score": None,
            "course_interest": "Computer Science",
        }

        universities = [sample_university]
        filtered = ForYouService.filter_universities_by_profile(lead_low_gpa, universities)

        # Low GPA leads should be filtered out
        assert len(filtered) == 0

    def test_filter_universities_by_ielts(self, sample_university):
        """Test filtering universities by IELTS score."""
        lead_low_ielts = {
            "target_countries": ["uk"],
            "gpa": 8.0,
            "ielts_score": 5.5,  # Below requirement of 7.0
            "course_interest": "Computer Science",
        }

        universities = [sample_university]
        filtered = ForYouService.filter_universities_by_profile(lead_low_ielts, universities)

        # Low IELTS leads should be filtered out
        assert len(filtered) == 0

    def test_filter_universities_target_countries_as_string(self, sample_university):
        """Test that target_countries can be string or list."""
        lead_string = {
            "target_countries": "uk",  # String instead of list
            "gpa": 8.0,
            "ielts_score": 7.5,
            "course_interest": "Computer Science",
        }

        universities = [sample_university]
        filtered = ForYouService.filter_universities_by_profile(lead_string, universities)

        assert len(filtered) == 1

    def test_filter_universities_returns_sorted(self, sample_lead):
        """Test that universities are returned sorted by QS rank."""
        universities = [
            {"qs_rank_2026": 50, "country": "uk", "subject_strengths": []},
            {"qs_rank_2026": 2, "country": "uk", "subject_strengths": []},
            {"qs_rank_2026": 100, "country": "uk", "subject_strengths": []},
        ]

        filtered = ForYouService.filter_universities_by_profile(sample_lead, universities)

        # Should be sorted by QS rank (lower is better)
        assert filtered[0]["qs_rank_2026"] < filtered[1]["qs_rank_2026"]


class TestForYouServiceScholarships:
    """Test scholarship matching logic."""

    def test_match_scholarships_by_country(self, sample_lead, sample_scholarship):
        """Test matching scholarships by country."""
        scholarships = [sample_scholarship]
        matched = ForYouService.match_scholarships_by_profile(sample_lead, scholarships)

        assert len(matched) == 1

    def test_match_scholarships_by_level(self, sample_scholarship):
        """Test matching scholarships by study level."""
        lead_undergraduate = {
            "target_countries": ["uk"],
            "education_level": "Undergraduate",
            "scholarship_interest": True,
            "budget_range": "low",
            "persona_type": "student",
        }

        scholarships = [sample_scholarship]  # Masters level only
        matched = ForYouService.match_scholarships_by_profile(lead_undergraduate, scholarships)

        assert len(matched) == 0

    def test_scholarship_match_score(self, sample_scholarship):
        """Test that scholarships get match scores."""
        lead = {
            "target_countries": ["uk"],
            "education_level": "Masters",
            "scholarship_interest": True,
            "budget_range": "low",
            "persona_type": "student",
        }

        scholarships = [sample_scholarship]
        matched = ForYouService.match_scholarships_by_profile(lead, scholarships)

        assert len(matched) == 1
        assert "match_score" in matched[0]
        assert matched[0]["match_score"] > 0


class TestForYouServiceCosts:
    """Test cost of living recommendations."""

    def test_get_cost_recommendations(self, sample_lead, sample_cost):
        """Test cost recommendations generation."""
        cost_data = {
            "uk": {
                "london": sample_cost,
            }
        }

        recommendations = ForYouService.get_cost_recommendations(sample_lead, cost_data)

        assert len(recommendations) > 0
        assert "city" in recommendations[0]
        assert "monthly_cost" in recommendations[0]

    def test_cost_recommendations_by_budget(self):
        """Test that different budget ranges get different cost tiers."""
        lead_low_budget = {
            "target_countries": ["uk"],
            "budget_range": "low",
        }

        lead_high_budget = {
            "target_countries": ["uk"],
            "budget_range": "high",
        }

        cost_data = {
            "uk": {
                "london": {
                    "monthly": {
                        "min": 1200,
                        "realistic": 1700,
                        "comfortable": 2500,
                    }
                }
            }
        }

        rec_low = ForYouService.get_cost_recommendations(lead_low_budget, cost_data)
        rec_high = ForYouService.get_cost_recommendations(lead_high_budget, cost_data)

        assert rec_low[0]["monthly_cost"] <= rec_high[0]["monthly_cost"]


# ────────────────────────────────────────────────────────────────────
# KBService Tests
# ────────────────────────────────────────────────────────────────────

class TestKBService:
    """Test knowledge base service."""

    def test_load_universities(self, load_kb_service):
        """Test loading universities from KB."""
        unis = load_kb_service.load_universities()

        assert len(unis) > 0
        assert isinstance(unis, list)
        assert all("country" in u for u in unis)

    def test_load_scholarships(self, load_kb_service):
        """Test loading scholarships from KB."""
        scholarships = load_kb_service.load_scholarships()

        assert len(scholarships) > 0
        assert isinstance(scholarships, list)

    def test_load_cost_of_living(self, load_kb_service):
        """Test loading cost of living data."""
        cost_data = load_kb_service.load_cost_of_living()

        assert isinstance(cost_data, dict)
        assert "uk" in cost_data or "ireland" in cost_data or "uae" in cost_data

    def test_kb_caching(self, load_kb_service):
        """Test that KB data is cached."""
        unis1 = load_kb_service.load_universities()
        unis2 = load_kb_service.load_universities()

        # Should be same object due to caching
        assert unis1 is unis2

    def test_cache_clear(self, load_kb_service):
        """Test clearing KB cache."""
        load_kb_service.load_universities()
        load_kb_service.clear_cache()

        # After clearing, next load should fetch fresh data
        unis = load_kb_service.load_universities()
        assert len(unis) > 0

    def test_load_all(self, load_kb_service):
        """Test loading all KB data at once."""
        all_data = load_kb_service.load_all()

        assert "universities" in all_data
        assert "scholarships" in all_data
        assert "cost_data" in all_data


# ────────────────────────────────────────────────────────────────────
# LeadScoringService Tests
# ────────────────────────────────────────────────────────────────────

class TestLeadScoringService:
    """Test lead scoring and data completeness calculations."""

    def test_calculate_data_completeness_full(self, sample_lead):
        """Test completeness calculation for fully filled lead."""
        completeness = LeadScoringService.calculate_data_completeness(sample_lead)

        # Sample lead has most fields filled
        assert completeness >= 50

    def test_calculate_data_completeness_empty(self, incomplete_lead):
        """Test completeness calculation for nearly empty lead."""
        completeness = LeadScoringService.calculate_data_completeness(incomplete_lead)

        # Incomplete lead has very few fields
        assert completeness < 30

    def test_get_missing_fields(self, incomplete_lead):
        """Test identifying missing fields."""
        missing = LeadScoringService.get_missing_fields(incomplete_lead)

        assert len(missing) > 0
        assert all("field" in m and "priority" in m for m in missing)

    def test_improvement_recommendations(self, incomplete_lead):
        """Test improvement recommendations."""
        missing = LeadScoringService.get_missing_fields(incomplete_lead)
        recommendations = LeadScoringService.get_improvement_recommendations(
            incomplete_lead, missing
        )

        assert len(recommendations) > 0
        assert all("priority" in r and "action" in r for r in recommendations)

    def test_calculate_lead_score(self, sample_lead):
        """Test overall lead score calculation."""
        score = LeadScoringService.calculate_lead_score(sample_lead)

        assert 0 <= score <= 100
        # Sample lead with test score and progress should score well
        assert score > 30

    def test_calculate_intent_score(self, sample_lead):
        """Test intent score calculation."""
        score = LeadScoringService.calculate_intent_score(sample_lead)

        assert 0 <= score <= 100

    def test_calculate_financial_score(self, sample_lead):
        """Test financial score calculation."""
        score = LeadScoringService.calculate_financial_score(sample_lead)

        assert 0 <= score <= 100

    def test_calculate_timeline_score(self, sample_lead):
        """Test timeline score calculation."""
        score = LeadScoringService.calculate_timeline_score(sample_lead)

        assert 0 <= score <= 100

    def test_scoring_consistency(self, sample_lead):
        """Test that scores are consistent and reasonable."""
        completeness = LeadScoringService.calculate_data_completeness(sample_lead)
        lead_score = LeadScoringService.calculate_lead_score(sample_lead)
        intent_score = LeadScoringService.calculate_intent_score(sample_lead)

        # Lead score should be influenced by completeness
        assert lead_score > 0
        assert intent_score > 0

    def test_scoring_with_empty_fields(self, incomplete_lead):
        """Test scoring with mostly empty fields."""
        completeness = LeadScoringService.calculate_data_completeness(incomplete_lead)
        lead_score = LeadScoringService.calculate_lead_score(incomplete_lead)

        assert completeness >= 0
        assert lead_score >= 0
        assert completeness < 30
