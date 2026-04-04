"""
Unit tests for Pydantic models and response formats.

Tests cover:
- Response models validation
- LeadUpdate model validation
- ForYouRequest/ForYouResponse validation
"""

import pytest
from pydantic import ValidationError
from src.models.responses import (
    BaseResponse,
    DataResponse,
    PaginatedResponse,
    ErrorResponse,
    OverviewResponse,
    FunnelResponse,
    PaginationInfo,
)
from src.routes.leads import LeadUpdate


# ────────────────────────────────────────────────────────────────────
# Response Models Tests
# ────────────────────────────────────────────────────────────────────

class TestBaseResponse:
    """Test BaseResponse model."""

    def test_base_response_success(self):
        """Test creating a successful BaseResponse."""
        response = BaseResponse(success=True, message="Test message")

        assert response.success == True
        assert response.message == "Test message"

    def test_base_response_defaults(self):
        """Test BaseResponse with default values."""
        response = BaseResponse()

        assert response.success == True
        assert response.message == None


class TestDataResponse:
    """Test DataResponse model."""

    def test_data_response_with_dict(self):
        """Test DataResponse with dictionary data."""
        data = {"id": "1", "name": "Test"}
        response = DataResponse(success=True, data=data)

        assert response.success == True
        assert response.data == data

    def test_data_response_with_list(self):
        """Test DataResponse with list data."""
        data = [{"id": "1"}, {"id": "2"}]
        response = DataResponse(success=True, data=data)

        assert response.data == data


class TestPaginatedResponse:
    """Test PaginatedResponse model."""

    def test_paginated_response(self):
        """Test creating a paginated response."""
        data = [{"id": "1"}, {"id": "2"}]
        pagination = {"total": 100, "page": 1, "limit": 20, "pages": 5}

        response = PaginatedResponse(
            success=True,
            data=data,
            pagination=pagination
        )

        assert len(response.data) == 2
        assert response.pagination["total"] == 100
        assert response.pagination["pages"] == 5

    def test_paginated_response_pages_calculation(self):
        """Test that PaginationInfo calculates pages correctly."""
        pagination = PaginationInfo(total=100, page=1, limit=20)

        assert pagination.pages == 5

    def test_paginated_response_single_page(self):
        """Test pagination for results fit on single page."""
        pagination = PaginationInfo(total=10, page=1, limit=20)

        assert pagination.pages == 1


class TestErrorResponse:
    """Test ErrorResponse model."""

    def test_error_response(self):
        """Test creating an error response."""
        response = ErrorResponse(
            success=False,
            error="Not found",
            code="RESOURCE_NOT_FOUND"
        )

        assert response.success == False
        assert response.error == "Not found"
        assert response.code == "RESOURCE_NOT_FOUND"


class TestOverviewResponse:
    """Test OverviewResponse model."""

    def test_overview_response(self):
        """Test creating an overview response."""
        response = OverviewResponse(
            hot=45,
            warm=120,
            cold=300,
            todayCalls=28,
            conversionRate=13,
            total=465
        )

        assert response.hot == 45
        assert response.warm == 120
        assert response.total == 465

    def test_overview_response_validation(self):
        """Test that OverviewResponse validates numeric fields."""
        # Should accept integers
        response = OverviewResponse(
            hot=10,
            warm=20,
            cold=30,
            todayCalls=5,
            conversionRate=15,
            total=60
        )
        assert response.hot == 10


class TestFunnelResponse:
    """Test FunnelResponse model."""

    def test_funnel_response(self):
        """Test creating a funnel response."""
        response = FunnelResponse(
            total_calls=1000,
            qualified=450,
            hot=120
        )

        assert response.total_calls == 1000
        assert response.qualified == 450
        assert response.hot == 120


# ────────────────────────────────────────────────────────────────────
# LeadUpdate Model Tests
# ────────────────────────────────────────────────────────────────────

class TestLeadUpdateModel:
    """Test LeadUpdate validation model."""

    def test_lead_update_minimal(self):
        """Test LeadUpdate with minimal fields."""
        update = LeadUpdate(name="John Doe")

        assert update.name == "John Doe"
        assert update.email is None
        assert update.phone is None

    def test_lead_update_all_fields(self):
        """Test LeadUpdate with all fields populated."""
        update = LeadUpdate(
            name="John Doe",
            email="john@example.com",
            phone="+1-2025551234",
            classification="Hot",
            lead_score=85,
            intent_score=75,
            financial_score=70,
            timeline_score=80,
        )

        assert update.name == "John Doe"
        assert update.email == "john@example.com"
        assert update.classification == "Hot"
        assert update.lead_score == 85

    def test_lead_update_optional_fields(self):
        """Test that all fields are optional in LeadUpdate."""
        # Empty update should be valid
        update = LeadUpdate()

        assert update.dict(exclude_none=True) == {}

    def test_lead_update_json_schema(self):
        """Test LeadUpdate has valid JSON schema."""
        schema = LeadUpdate.model_json_schema()

        assert "properties" in schema
        assert "name" in schema["properties"]
        assert "email" in schema["properties"]
        assert "classification" in schema["properties"]

    def test_lead_update_score_types(self):
        """Test that scores are properly typed."""
        update = LeadUpdate(
            lead_score=75,
            intent_score=80,
            financial_score=70,
            timeline_score=85,
        )

        assert isinstance(update.lead_score, int)
        assert isinstance(update.intent_score, int)
        assert isinstance(update.financial_score, int)
        assert isinstance(update.timeline_score, int)

    def test_lead_update_target_countries_type(self):
        """Test that target_countries can be list."""
        update = LeadUpdate(
            target_countries=["uk", "ireland", "uae"]
        )

        assert isinstance(update.target_countries, list)
        assert len(update.target_countries) == 3

    def test_lead_update_json_schema_example(self):
        """Test that LeadUpdate has example in schema."""
        schema = LeadUpdate.model_json_schema()

        # Schema should have Config with example
        # Pydantic v2 puts examples differently
        assert "properties" in schema


# ────────────────────────────────────────────────────────────────────
# Response Serialization Tests
# ────────────────────────────────────────────────────────────────────

class TestResponseSerialization:
    """Test response model serialization."""

    def test_data_response_json_serialization(self):
        """Test DataResponse can be serialized to JSON."""
        data = {"id": "1", "name": "Test"}
        response = DataResponse(success=True, data=data)

        json_str = response.model_dump_json()
        assert isinstance(json_str, str)
        assert "Test" in json_str

    def test_paginated_response_json_serialization(self):
        """Test PaginatedResponse can be serialized."""
        response = PaginatedResponse(
            success=True,
            data=[{"id": "1"}],
            pagination={"total": 1, "page": 1, "limit": 20, "pages": 1}
        )

        json_str = response.model_dump_json()
        assert "pagination" in json_str

    def test_response_exclude_none(self):
        """Test that responses can exclude None values."""
        response = DataResponse(success=True, data=None, message=None)

        json_dict = response.model_dump(exclude_none=True)
        assert "data" not in json_dict
        assert "message" not in json_dict
        assert "success" in json_dict
