"""
Intelligent Data Extraction Service
Extracts 12+ data points from natural conversation
"""

import re
from typing import Dict, List, Tuple, Optional
import asyncio
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class DataExtractionPatterns:
    """Regex and keyword patterns for data extraction"""
    
    # Personal Information
    NAME = r"\b(?:my name is|i'm|i am|call me|[A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"
    PHONE = r"\b(?:\+91|0)?[6-9]\d{9}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"
    EMAIL = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    LOCATION = r"\b(?:from|live in|based in|location|city|place)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"
    
    # Academic Information
    EDUCATION_LEVEL = r"\b(?:12th|XII|bachelor|b\.?tech|btech|masters|m\.?tech|mtech|phd|undergrad|graduation|degree)\b"
    FIELD = r"\b(?:engineering|medicine|business|law|arts|commerce|science|cs|computer|it|mechanical|civil|electrical|finance|marketing|psychology|biology|chemistry|psychology|nursing)\b"
    INSTITUTION = r"\b(?:university|college|school|institute|iit|nit|bits|manipal|kmitl|amity)\b"
    GPA = r"\b(?:gpa|cgpa|percentage|marks)[\s:]*([0-4]\.[0-9]{1,2}|[0-9]{1,2}(?:\.[0-9]{1,2})?)\b"
    
    # Preferences
    TARGET_COUNTRIES = r"\b(?:uk|united kingdom|england|ireland|us|usa|canada|australia|germany|netherlands|europe)\b"
    COURSE_INTEREST = r"\b(?:course|program|degree|studying|study)\s+(?:in\s)?([a-z\s]+?)(?:\s+(?:at|in|from)|\b)"
    INTAKE = r"\b(?:intake|semester)\s+(?:of\s)?(?:(fall|spring|summer|january|september|march|july)|(\d{4}))\b"
    
    # Test Status
    IELTS_SCORE = r"\b(?:ielts|pte)[\s:]*([0-9]\.[0-9]|[0-9]{2})\b"
    TOEFL_SCORE = r"\b(?:toefl|sat|acт)[\s:]*([0-9]{1,3})\b"
    TEST_PREP = r"\b(?:preparing for|studying|taking|exam|test|score)\b"
    
    # Financial
    BUDGET = r"\b(?:budget|afford|cost|fee|expense|fee|price)[\s:]*(?:₹|rs|inr|\$|usd)?\s*(\d+(?:[,_]\d{3})*(?:\.\d{2})?)\b"
    SCHOLARSHIP = r"\b(?:scholarship|grant|funding|sponsorship|fund|financial\s+aid|merit\s+based)\b"
    
    # Timeline
    APPLICATION_TIMELINE = r"\b(?:apply|apply by|applying|application|apply when)[\s:]*(?:in\s)?(?:(next\s+)?(?:year|month|semester)|(\d{1,2})\s+(?:months?|years?))\b"


class DataExtractor:
    """Extracts structured data from conversational text"""
    
    # Category mapping for all 12 data points
    DATA_CATEGORIES = {
        # Personal (4 points)
        "name": ("personal", "personal.name"),
        "phone": ("personal", "personal.phone"),
        "email": ("personal", "personal.email"),
        "location": ("personal", "personal.location"),
        
        # Academic (4 points)
        "education_level": ("academic", "academic.education_level"),
        "field": ("academic", "academic.field"),
        "institution": ("academic", "academic.institution"),
        "gpa": ("academic", "academic.gpa"),
        
        # Preferences (2 points)
        "target_countries": ("preferences", "preferences.target_countries"),
        "course_interest": ("preferences", "preferences.course_interest"),
        "intake": ("preferences", "preferences.intake"),
        
        # Test Status (2 points)
        "test_scores": ("test_status", "test_status.test_scores"),
        "test_preparation": ("test_status", "test_status.preparation"),
        
        # Financial (2 points)
        "budget": ("financial", "financial.budget"),
        "scholarship_interest": ("financial", "financial.scholarship_interest"),
        
        # Timeline (1 point)
        "application_timeline": ("timeline", "timeline.application_timeline"),
    }

    def __init__(self):
        self.patterns = DataExtractionPatterns()

    async def extract_all(self, text: str, language: str = "en") -> Dict[str, any]:
        """
        Extract all available data points from text
        
        Returns:
            {
                "extracted": {
                    "personal": {"name": "...", "phone": "...", ...},
                    "academic": {...},
                    ...
                },
                "count": int,
                "coverage": float (0-1),
                "confidence": float (0-1)
            }
        """
        
        if not text or not text.strip():
            return {
                "extracted": {},
                "count": 0,
                "coverage": 0.0,
                "missing_categories": list(self.DATA_CATEGORIES.keys())
            }

        # Run extraction in thread pool
        extracted = await asyncio.to_thread(self._extract_sync, text, language)
        
        # Calculate coverage
        total_fields = len(self.DATA_CATEGORIES)
        extracted_fields = sum(1 for v in extracted.get("extracted", {}).values() if v)
        coverage = extracted_fields / total_fields

        return {
            "extracted": extracted.get("extracted", {}),
            "count": extracted.get("count", 0),
            "coverage": coverage,
            "confidence": extracted.get("confidence", 0.5),
            "missing_categories": extracted.get("missing", [])
        }

    def _extract_sync(self, text: str, language: str = "en") -> Dict[str, any]:
        """Synchronous extraction logic"""
        
        extracted = {}
        text_lower = text.lower()
        count = 0
        confidence_sum = 0

        # Personal Information
        extracted["name"] = self._extract_pattern(text, self.patterns.NAME)
        extracted["phone"] = self._extract_pattern(text, self.patterns.PHONE)
        extracted["email"] = self._extract_pattern(text, self.patterns.EMAIL)
        extracted["location"] = self._extract_pattern(text, self.patterns.LOCATION)
        
        # Academic Information
        extracted["education_level"] = self._extract_pattern(text, self.patterns.EDUCATION_LEVEL)
        extracted["field"] = self._extract_pattern(text, self.patterns.FIELD)
        extracted["institution"] = self._extract_pattern(text, self.patterns.INSTITUTION)
        extracted["gpa"] = self._extract_pattern(text, self.patterns.GPA)
        
        # Preferences
        extracted["target_countries"] = self._extract_pattern(text, self.patterns.TARGET_COUNTRIES, multiple=True)
        extracted["course_interest"] = self._extract_pattern(text, self.patterns.COURSE_INTEREST)
        extracted["intake"] = self._extract_pattern(text, self.patterns.INTAKE)
        
        # Test Status
        extracted["test_scores"] = self._extract_pattern(text, self.patterns.IELTS_SCORE) or self._extract_pattern(text, self.patterns.TOEFL_SCORE)
        extracted["test_preparation"] = "yes" if any(kw in text_lower for kw in ["preparing", "studying", "taking", "exam"]) else None
        
        # Financial
        extracted["budget"] = self._extract_pattern(text, self.patterns.BUDGET)
        extracted["scholarship_interest"] = "yes" if any(kw in text_lower for kw in ["scholarship", "grant", "funding"]) else None
        
        # Timeline
        extracted["application_timeline"] = self._extract_pattern(text, self.patterns.APPLICATION_TIMELINE)
        
        # Count extracted fields
        for key, value in extracted.items():
            if value:
                count += 1
                confidence_sum += 0.8  # Default confidence for extracted data
        
        avg_confidence = (confidence_sum / len(extracted)) if extracted else 0

        return {
            "extracted": extracted,
            "count": count,
            "confidence": avg_confidence,
            "missing": [k for k, v in extracted.items() if not v]
        }

    def _extract_pattern(self, text: str, pattern: str, multiple: bool = False) -> Optional[str]:
        """Extract value using regex pattern"""
        try:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if not matches:
                return None
            
            if multiple:
                return ", ".join(matches)
            
            # Return first match or first group
            match = matches[0]
            if isinstance(match, tuple):
                return next((m for m in match if m), None)
            return match
        except Exception as e:
            logger.error(f"Pattern extraction error: {e}")
            return None

    def get_missing_fields(self, extracted_data: dict) -> List[str]:
        """Get list of missing data fields for follow-up questions"""
        return [k for k, v in extracted_data.items() if not v]


# Global extractor instance
_extractor: Optional[DataExtractor] = None


def get_data_extractor() -> DataExtractor:
    """Get or initialize global data extractor"""
    global _extractor
    if _extractor is None:
        _extractor = DataExtractor()
    return _extractor


async def extract_data(text: str, language: str = "en") -> Dict[str, any]:
    """Convenience function for data extraction"""
    extractor = get_data_extractor()
    return await extractor.extract_all(text, language)
