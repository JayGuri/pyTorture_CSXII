"""
Unified Response Models for API Consistency

All API endpoints should return responses using these models to ensure:
- Consistent response structure across all endpoints
- Proper HTTP status codes (not success flags in body)
- Type safety with Pydantic validation
- Easy frontend integration
"""

from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class BaseResponse(BaseModel):
    """Base response model for all successful API responses."""

    success: bool = True
    message: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Operation completed successfully",
            }
        }


class DataResponse(BaseResponse, Generic[T]):
    """Response model for endpoints that return data."""

    data: Optional[T] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": None,
                "data": {"id": "123", "name": "John Doe"},
            }
        }


class PaginatedResponse(DataResponse[List[T]], Generic[T]):
    """Response model for paginated data endpoints."""

    pagination: Optional[dict] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": None,
                "data": [{"id": "1"}, {"id": "2"}],
                "pagination": {
                    "total": 100,
                    "page": 1,
                    "limit": 20,
                    "pages": 5,
                },
            }
        }


class ErrorResponse(BaseModel):
    """Response model for error responses."""

    success: bool = False
    error: str
    code: Optional[str] = None
    details: Optional[dict] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "Lead not found",
                "code": "LEAD_NOT_FOUND",
                "details": {"lead_id": "123"},
            }
        }


class OverviewResponse(BaseModel):
    """Dashboard overview metrics."""

    hot: int
    warm: int
    cold: int
    todayCalls: int
    conversionRate: int
    total: int

    class Config:
        json_schema_extra = {
            "example": {
                "hot": 45,
                "warm": 120,
                "cold": 300,
                "todayCalls": 28,
                "conversionRate": 13,
                "total": 465,
            }
        }


class FunnelResponse(BaseModel):
    """Sales funnel metrics."""

    total_calls: int
    qualified: int
    hot: int

    class Config:
        json_schema_extra = {
            "example": {
                "total_calls": 1000,
                "qualified": 450,
                "hot": 120,
            }
        }


class PaginationInfo(BaseModel):
    """Pagination metadata."""

    total: int
    page: int
    limit: int
    pages: Optional[int] = None

    def __init__(self, **data):
        super().__init__(**data)
        if self.total > 0:
            self.pages = (self.total + self.limit - 1) // self.limit
