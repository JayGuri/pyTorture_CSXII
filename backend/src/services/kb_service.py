"""
Knowledge Base Service

Loads and caches knowledge base data from JSON files.
Provides centralized access to universities, scholarships, and cost of living data.
"""

import json
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class KBService:
    """Service for managing knowledge base data with caching."""

    _cache: Dict[str, Any] = {}
    _data_dir = Path(__file__).parent.parent.parent.parent / "scraper" / "data"

    @classmethod
    def _load_json_file(cls, filename: str) -> Optional[Dict[str, Any]]:
        """
        Load JSON file from data directory.

        Args:
            filename: Name of JSON file (e.g., 'universities.json')

        Returns:
            Parsed JSON data or None if file not found
        """
        file_path = cls._data_dir / filename
        try:
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.warning(f"Knowledge base file not found: {file_path}")
                return None
        except Exception as e:
            logger.error(f"Error loading KB file {filename}: {e}")
            return None

    @classmethod
    def load_universities(cls, force_reload: bool = False) -> List[Dict[str, Any]]:
        """
        Load all universities from KB.

        Args:
            force_reload: Force reload from disk instead of cache

        Returns:
            List of university records
        """
        if not force_reload and "universities" in cls._cache:
            return cls._cache["universities"]

        data = cls._load_json_file("universities.json")
        if isinstance(data, dict) and "universities" in data:
            universities = data["universities"]
        elif isinstance(data, list):
            universities = data
        else:
            universities = []

        cls._cache["universities"] = universities
        logger.info(f"Loaded {len(universities)} universities")
        return universities

    @classmethod
    def load_scholarships(cls, force_reload: bool = False) -> List[Dict[str, Any]]:
        """
        Load all scholarships from KB.

        Args:
            force_reload: Force reload from disk instead of cache

        Returns:
            List of scholarship records
        """
        if not force_reload and "scholarships" in cls._cache:
            return cls._cache["scholarships"]

        data = cls._load_json_file("scholarships.json")
        if isinstance(data, dict) and "scholarships" in data:
            scholarships = data["scholarships"]
        elif isinstance(data, list):
            scholarships = data
        else:
            scholarships = []

        cls._cache["scholarships"] = scholarships
        logger.info(f"Loaded {len(scholarships)} scholarships")
        return scholarships

    @classmethod
    def load_cost_of_living(cls, force_reload: bool = False) -> Dict[str, Any]:
        """
        Load cost of living data from KB.

        Args:
            force_reload: Force reload from disk instead of cache

        Returns:
            Cost of living data by country and city
        """
        if not force_reload and "cost_of_living" in cls._cache:
            return cls._cache["cost_of_living"]

        data = cls._load_json_file("cost_of_living.json")
        if isinstance(data, dict):
            cost_data = data
        else:
            cost_data = {}

        cls._cache["cost_of_living"] = cost_data
        logger.info(f"Loaded cost of living for {len(cost_data)} countries")
        return cost_data

    @classmethod
    def load_all(cls, force_reload: bool = False) -> Dict[str, Any]:
        """
        Load all knowledge bases at once.

        Args:
            force_reload: Force reload from disk instead of cache

        Returns:
            Dictionary with universities, scholarships, and cost_data keys
        """
        return {
            "universities": cls.load_universities(force_reload=force_reload),
            "scholarships": cls.load_scholarships(force_reload=force_reload),
            "cost_data": cls.load_cost_of_living(force_reload=force_reload),
        }

    @classmethod
    def clear_cache(cls):
        """Clear all cached data."""
        cls._cache.clear()
        logger.info("KB cache cleared")
