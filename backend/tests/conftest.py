"""
Pytest configuration and shared fixtures for all tests.

Provides mock data, database fixtures, and API client setup.
"""

import pytest
import json
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient

# Add backend to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.main import app
from src.services.kb_service import KBService
from src.services.lead_scoring import LeadScoringService


# ────────────────────────────────────────────────────────────────────
# Fixtures: Mock Data
# ────────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_lead():
    """Sample lead profile for testing."""
    return {
        "id": "test-lead-001",
        "name": "Aanya Sharma",
        "email": "aanya@example.com",
        "phone": "+91-9876543210",
        "location": "Mumbai, India",
        "education_level": "Undergraduate",
        "field": "Engineering",
        "institution": "IIT Mumbai",
        "gpa": 8.5,
        "target_countries": ["uk", "ireland"],
        "course_interest": "Computer Science",
        "intake_timing": "September 2026",
        "ielts_score": 7.5,
        "pte_score": None,
        "budget_range": "Medium (1-2M INR)",
        "scholarship_interest": True,
        "timeline": "Soon (3-6 months)",
        "application_stage": "In progress",
        "persona_type": "Academic achiever",
        "lead_score": 0,
        "intent_score": 0,
        "financial_score": 0,
        "timeline_score": 0,
        "classification": "Warm",
        "data_completeness": 0,
        "created_at": "2026-04-01T10:00:00Z",
        "updated_at": "2026-04-05T10:00:00Z",
    }


@pytest.fixture
def incomplete_lead():
    """Lead with missing fields for completeness testing."""
    return {
        "id": "test-lead-002",
        "name": "John Doe",
        "email": None,
        "phone": "+1-2025551234",
        "location": None,
        "education_level": None,
        "field": None,
        "institution": None,
        "gpa": None,
        "target_countries": None,
        "course_interest": None,
        "intake_timing": None,
        "ielts_score": None,
        "pte_score": None,
        "budget_range": None,
        "scholarship_interest": None,
        "timeline": None,
        "application_stage": None,
        "classification": "Cold",
        "data_completeness": 0,
        "created_at": "2026-04-01T10:00:00Z",
        "updated_at": "2026-04-01T10:00:00Z",
    }


@pytest.fixture
def sample_university():
    """Sample university record from KB."""
    return {
        "id": "uni-001",
        "name": "University of Cambridge",
        "country": "uk",
        "region": "East Anglia",
        "city": "Cambridge",
        "qs_rank_2026": 2,
        "subject_strengths": ["Computer Science", "Mathematics", "Engineering"],
        "courses": [
            {
                "name": "MSc Computer Science",
                "duration": "1 year",
                "tuition_gbp": 45000,
                "ielts_min": 7.0,
            }
        ],
    }


@pytest.fixture
def sample_scholarship():
    """Sample scholarship record from KB."""
    return {
        "id": "scholarship-001",
        "name": "Cambridge South Asia Scholarship",
        "country": "uk",
        "level_of_study": ["Masters", "Postgraduate"],
        "funding_level": "full",
        "eligible_nationalities": ["India", "Pakistan", "Bangladesh"],
        "amount_gbp": 45000,
        "deadline": "2026-04-30",
    }


@pytest.fixture
def sample_cost():
    """Sample cost of living data."""
    return {
        "city": "London",
        "country": "uk",
        "currency": "GBP",
        "monthly": {
            "min": 1200,
            "realistic": 1700,
            "comfortable": 2500,
        },
        "breakdown": {
            "rent": {"min": 600, "realistic": 900, "comfortable": 1400},
            "food": {"min": 250, "realistic": 400, "comfortable": 600},
            "transport": {"min": 150, "realistic": 150, "comfortable": 150},
            "utilities": {"min": 100, "realistic": 150, "comfortable": 200},
            "entertainment": {"min": 100, "realistic": 100, "comfortable": 150},
        },
    }


# ────────────────────────────────────────────────────────────────────
# Fixtures: API Client
# ────────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


# ────────────────────────────────────────────────────────────────────
# Fixtures: Service Mocks
# ────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_supabase():
    """Mock Supabase client."""
    with patch('src.db.supabase_client.supabase') as mock:
        yield mock


@pytest.fixture
def mock_logger():
    """Mock logger."""
    with patch('src.utils.logger.logger') as mock:
        yield mock


# ────────────────────────────────────────────────────────────────────
# Fixtures: KB Service
# ────────────────────────────────────────────────────────────────────

@pytest.fixture
def load_kb_service():
    """Load actual KB service (from files)."""
    KBService.clear_cache()
    return KBService


# ────────────────────────────────────────────────────────────────────
# Utility Functions
# ────────────────────────────────────────────────────────────────────

def mock_supabase_query_result(data=None, count=None, error=None):
    """Helper to create mock Supabase query results."""
    result = Mock()
    result.data = data
    result.count = count
    result.error = error
    return result


def mock_supabase_table_call(method="select", return_data=None, return_count=None):
    """Helper to mock Supabase table method calls."""
    mock_table = Mock()
    mock_query = Mock()

    # Configure the query chain
    mock_query.eq = Mock(return_value=mock_query)
    mock_query.gte = Mock(return_value=mock_query)
    mock_query.gt = Mock(return_value=mock_query)
    mock_query.order = Mock(return_value=mock_query)
    mock_query.limit = Mock(return_value=mock_query)
    mock_query.range = Mock(return_value=mock_query)
    mock_query.ilike = Mock(return_value=mock_query)
    mock_query.or_ = Mock(return_value=mock_query)
    mock_query.single = Mock(return_value=mock_query)
    mock_query.execute = Mock(return_value=mock_supabase_query_result(return_data, return_count))
    mock_query.update = Mock(return_value=mock_query)

    # Configure table method
    getattr(mock_table, method, Mock(return_value=mock_query))()

    return mock_table
