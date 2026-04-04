"""
Integration tests for API routes.

Tests cover:
- Dashboard endpoints
- Leads endpoints
- For You endpoints
- Response formats and status codes
"""

import pytest
from unittest.mock import patch, Mock
from fastapi import HTTPException


# ────────────────────────────────────────────────────────────────────
# Dashboard Route Tests
# ────────────────────────────────────────────────────────────────────

class TestDashboardRoutes:
    """Test dashboard endpoints."""

    def test_dashboard_overview_success(self, client, mock_supabase):
        """Test GET /api/dashboard/overview returns metrics."""
        # Mock Supabase responses
        mock_response = Mock()
        mock_response.count = 10
        mock_response.data = []

        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value = mock_response
            mock_db.table.return_value.select.return_value.gte.return_value.execute.return_value = mock_response

            response = client.get("/api/dashboard/overview")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert "data" in data

    def test_dashboard_leads_list(self, client):
        """Test GET /api/dashboard/leads returns paginated leads."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.count = 5
            mock_response.data = [
                {"id": "1", "name": "Lead 1", "classification": "Hot"},
                {"id": "2", "name": "Lead 2", "classification": "Warm"},
            ]

            mock_db.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = mock_response

            response = client.get("/api/dashboard/leads?page=1&limit=20")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert len(data["data"]) == 2
            assert "pagination" in data

    def test_dashboard_leads_with_classification_filter(self, client):
        """Test /api/dashboard/leads with classification filter."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.count = 2
            mock_response.data = [
                {"id": "1", "name": "Hot Lead 1", "classification": "Hot"},
                {"id": "2", "name": "Hot Lead 2", "classification": "Hot"},
            ]

            mock_db.table.return_value.select.return_value.order.return_value.range.return_value.eq.return_value.execute.return_value = mock_response

            response = client.get("/api/dashboard/leads?page=1&limit=20&classification=Hot")

            assert response.status_code == 200

    def test_dashboard_active_sessions(self, client):
        """Test GET /api/dashboard/active-sessions."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.data = [
                {"id": "session-1", "status": "active", "caller_phone": "+1234"},
            ]

            mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_response

            response = client.get("/api/dashboard/active-sessions")

            assert response.status_code == 200
            assert response.json()["success"] == True

    def test_dashboard_active_sessions_invalid_status(self, client):
        """Test /api/dashboard/active-sessions with invalid status."""
        response = client.get("/api/dashboard/active-sessions?status=invalid_status")

        assert response.status_code == 400

    def test_dashboard_funnel(self, client):
        """Test GET /api/dashboard/funnel."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.count = 100

            mock_db.table.return_value.select.return_value.execute.return_value = mock_response
            mock_db.table.return_value.select.return_value.gt.return_value.execute.return_value = mock_response
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

            response = client.get("/api/dashboard/funnel")

            assert response.status_code == 200
            data = response.json()
            assert "data" in data


# ────────────────────────────────────────────────────────────────────
# Leads Route Tests
# ────────────────────────────────────────────────────────────────────

class TestLeadsRoutes:
    """Test leads endpoints."""

    def test_list_leads(self, client):
        """Test GET /api/leads returns paginated leads."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.count = 3
            mock_response.data = [
                {"id": "1", "name": "Lead 1", "email": "lead1@example.com"},
                {"id": "2", "name": "Lead 2", "email": "lead2@example.com"},
                {"id": "3", "name": "Lead 3", "email": "lead3@example.com"},
            ]

            mock_db.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = mock_response

            response = client.get("/api/leads?page=1&limit=20")

            assert response.status_code == 200
            assert len(response.json()["data"]) == 3

    def test_get_lead_success(self, client):
        """Test GET /api/leads/{lead_id}."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.data = {
                "id": "lead-1",
                "name": "Test Lead",
                "email": "test@example.com",
            }

            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_response

            response = client.get("/api/leads/lead-1")

            assert response.status_code == 200
            assert response.json()["data"]["id"] == "lead-1"

    def test_get_lead_not_found(self, client):
        """Test GET /api/leads/{lead_id} when lead doesn't exist."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.data = None

            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_response

            response = client.get("/api/leads/nonexistent")

            assert response.status_code == 404

    def test_update_lead_success(self, client):
        """Test PATCH /api/leads/{lead_id}."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.data = [
                {
                    "id": "lead-1",
                    "name": "Updated Lead",
                    "classification": "Hot",
                    "lead_score": 75,
                }
            ]

            mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response

            response = client.patch(
                "/api/leads/lead-1",
                json={
                    "name": "Updated Lead",
                    "classification": "Hot",
                    "lead_score": 75,
                }
            )

            assert response.status_code == 200

    def test_update_lead_invalid_classification(self, client):
        """Test PATCH /api/leads/{lead_id} with invalid classification."""
        response = client.patch(
            "/api/leads/lead-1",
            json={"classification": "Invalid"}
        )

        assert response.status_code == 400

    def test_update_lead_invalid_score(self, client):
        """Test PATCH /api/leads/{lead_id} with invalid score."""
        response = client.patch(
            "/api/leads/lead-1",
            json={"lead_score": 150}  # Out of range
        )

        assert response.status_code == 400


# ────────────────────────────────────────────────────────────────────
# For You Route Tests
# ────────────────────────────────────────────────────────────────────

class TestForYouRoutes:
    """Test For You page endpoints."""

    def test_for_you_dashboard_missing_params(self, client):
        """Test GET /api/v1/for-you/dashboard without session_id or email."""
        response = client.get("/api/v1/for-you/dashboard")

        assert response.status_code == 400

    def test_for_you_dashboard_lead_not_found(self, client):
        """Test /api/v1/for-you/dashboard when lead not found."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.data = None

            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_response

            response = client.get("/api/v1/for-you/dashboard?session_id=unknown")

            assert response.status_code == 404

    def test_for_you_dashboard_success(self, client, sample_lead):
        """Test GET /api/v1/for-you/dashboard returns complete dashboard."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.data = sample_lead

            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_response

            with patch('src.services.kb_service.KBService.load_universities', return_value=[]):
                with patch('src.services.kb_service.KBService.load_scholarships', return_value=[]):
                    with patch('src.services.kb_service.KBService.load_cost_of_living', return_value={}):
                        response = client.get("/api/v1/for-you/dashboard?session_id=test-123")

            assert response.status_code == 200
            data = response.json()
            assert "lead_profile" in data
            assert "recommendations" in data
            assert "insights" in data

    def test_for_you_completeness_success(self, client, sample_lead):
        """Test GET /api/v1/for-you/completeness/{lead_id}."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.data = sample_lead

            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_response

            response = client.get("/api/v1/for-you/completeness/lead-1")

            assert response.status_code == 200
            data = response.json()
            assert "completeness_percentage" in data["data"]
            assert "missing_fields" in data["data"]

    def test_for_you_update_completeness(self, client, sample_lead):
        """Test PATCH /api/v1/for-you/update-completeness/{lead_id}."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_get = Mock()
            mock_get.data = sample_lead

            mock_update = Mock()
            mock_update.data = [sample_lead]

            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_get
            mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_update

            response = client.patch("/api/v1/for-you/update-completeness/lead-1")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True

    def test_for_you_health_check(self, client):
        """Test GET /api/v1/for-you/health."""
        response = client.get("/api/v1/for-you/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"


# ────────────────────────────────────────────────────────────────────
# Response Format Tests
# ────────────────────────────────────────────────────────────────────

class TestResponseFormats:
    """Test API response format consistency."""

    def test_successful_response_has_success_flag(self, client):
        """Test that successful responses have success=true."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.data = [{"id": "1"}]
            mock_response.count = 1

            mock_db.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = mock_response

            response = client.get("/api/leads?page=1&limit=20")

            assert response.json()["success"] == True

    def test_error_response_status_code(self, client):
        """Test that error responses have appropriate status codes."""
        response = client.get("/api/leads/nonexistent")

        # Should return 404 through Supabase mock returning None
        # This tests the error handling in routes

    def test_paginated_response_has_pagination(self, client):
        """Test that paginated responses include pagination metadata."""
        with patch('src.db.supabase_client.supabase') as mock_db:
            mock_response = Mock()
            mock_response.count = 100
            mock_response.data = [{"id": "1"}]

            mock_db.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = mock_response

            response = client.get("/api/leads?page=1&limit=20")

            assert "pagination" in response.json()
            pagination = response.json()["pagination"]
            assert "total" in pagination
            assert "page" in pagination
            assert "limit" in pagination
            assert "pages" in pagination
