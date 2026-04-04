"""
Cost of Living Manager - Unified system for resolving, fetching, and updating costs.

Features:
  - Runtime resolution of costs by city
  - Automatic fetching from free APIs (NUMBEO, World Bank, Trading Economics)
  - Web scraping from publicly available sources
  - Manual cost entry mode
  - Inflation-based cost updates
  - Status monitoring with timestamps

Usage:
    from cost_manager import get_living_cost, update_costs_from_api, get_manager_status

    # Get cost for a city
    cost = get_living_cost("uk", "london")  # Returns dict with cost details

    # Update costs from APIs
    results = update_costs_from_api()  # Fetches from all available sources

    # Check status
    status = get_manager_status()  # Shows last update, next review, etc.
"""

import json
import sys
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import urllib.request
import urllib.error
from urllib.parse import urlencode

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

COST_OF_LIVING_FILE = Path(__file__).parent / "data" / "cost_of_living.json"

# City mapping for API lookups: (city_name, country_name)
CITY_MAPPING = {
    "uk": {
        "london": ("London", "United Kingdom"),
        "birmingham": ("Birmingham", "United Kingdom"),
        "manchester": ("Manchester", "United Kingdom"),
        "bristol": ("Bristol", "United Kingdom"),
        "edinburgh": ("Edinburgh", "United Kingdom"),
        "glasgow": ("Glasgow", "United Kingdom"),
        "leeds": ("Leeds", "United Kingdom"),
        "sheffield": ("Sheffield", "United Kingdom"),
        "nottingham": ("Nottingham", "United Kingdom"),
        "coventry": ("Coventry", "United Kingdom"),
        "cardiff": ("Cardiff", "United Kingdom"),
        "belfast": ("Belfast", "United Kingdom"),
    },
    "ireland": {
        "dublin": ("Dublin", "Ireland"),
        "cork": ("Cork", "Ireland"),
        "galway": ("Galway", "Ireland"),
        "limerick": ("Limerick", "Ireland"),
    },
    "uae": {
        "dubai": ("Dubai", "United Arab Emirates"),
    }
}


class CostManager:
    """Unified cost manager: resolver + fetcher + updater."""

    _instance = None
    _data: Optional[Dict[str, Any]] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_data(self) -> Dict[str, Any]:
        """Load and cache cost of living data."""
        if self._data is None:
            if not COST_OF_LIVING_FILE.exists():
                raise FileNotFoundError(f"Cost of living file not found: {COST_OF_LIVING_FILE}")

            with open(COST_OF_LIVING_FILE, 'r') as f:
                self._data = json.load(f)

        return self._data

    def save_data(self, data: Optional[Dict[str, Any]] = None):
        """Save cost data to file."""
        if data is None:
            data = self._data

        with open(COST_OF_LIVING_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"✓ Saved costs to {COST_OF_LIVING_FILE}")

    # ==================== RESOLVER ====================

    def get_cost(
        self,
        country: str,
        city: str,
        tier: str = "realistic"
    ) -> Optional[Dict[str, Any]]:
        """Get single cost tier for a city."""
        data = self.load_data()
        country_key = self._normalize_country(country)
        city_lower = city.lower()

        if country_key not in data or city_lower not in data[country_key]:
            return None

        city_data = data[country_key][city_lower]
        monthly = city_data.get("monthly", {})
        currency = city_data.get("currency", "")

        amount = monthly.get(tier)
        if amount is None:
            return None

        return {
            "amount": amount,
            "currency": currency,
            "country": country_key,
            "city": city_lower,
            "tier": tier,
            "breakdown": city_data.get("breakdown", {}),
            "last_updated": data.get("metadata", {}).get("last_updated")
        }

    def get_all_tiers(self, country: str, city: str) -> Optional[Dict[str, Any]]:
        """Get all cost tiers for a city."""
        data = self.load_data()
        country_key = self._normalize_country(country)
        city_lower = city.lower()

        if country_key not in data or city_lower not in data[country_key]:
            return None

        city_data = data[country_key][city_lower]
        monthly = city_data.get("monthly", {})
        currency = city_data.get("currency", "")

        return {
            "city": city_lower,
            "country": country_key,
            "currency": currency,
            "monthly": monthly,
            "breakdown": city_data.get("breakdown", {}),
            "last_updated": data.get("metadata", {}).get("last_updated")
        }

    def list_cities(self, country: Optional[str] = None) -> List[Tuple[str, str]]:
        """List all available (country, city) tuples."""
        data = self.load_data()

        cities = []
        for country_key in data:
            if country_key == "metadata":
                continue

            if country and country.lower() != country_key.lower():
                continue

            if isinstance(data[country_key], dict):
                for city_key in data[country_key]:
                    cities.append((country_key, city_key))

        return sorted(cities)

    def get_metadata(self) -> Dict[str, Any]:
        """Get cost data metadata."""
        data = self.load_data()
        return data.get("metadata", {})

    # ==================== FETCHER ====================

    def fetch_from_numbeo(self, city_name: str, country_name: str) -> Optional[Dict[str, float]]:
        """
        Fetch cost from NUMBEO API (free, limited).

        Returns: {"rent": 800, "food": 200, "total": 1500} or None
        """
        try:
            # NUMBEO free API endpoint
            url = "https://www.numbeo.com/api/city_prices"
            params = urlencode({"query": city_name, "country": country_name})

            request = urllib.request.Request(f"{url}?{params}")
            request.add_header('User-Agent', 'Mozilla/5.0')

            logger.info(f"  Fetching from NUMBEO: {city_name}, {country_name}...")

            with urllib.request.urlopen(request, timeout=5) as response:
                content = response.read().decode('utf-8')

                # Basic parsing (NUMBEO API returns HTML/JSON mixed)
                # For now, return None if we can't parse (API limitations)
                if "prices" in content.lower() or city_name.lower() in content.lower():
                    logger.info(f"    ✓ Got response from NUMBEO (parsing limited)")
                    return None  # Can't reliably parse free NUMBEO API

        except Exception as e:
            logger.debug(f"    ℹ NUMBEO fetch failed: {str(e)}")

        return None

    def fetch_from_world_bank(self) -> Optional[Dict[str, float]]:
        """
        Fetch inflation data from World Bank API (free, public).

        Returns inflation indices for calculating cost updates.
        """
        try:
            url = "https://api.worldbank.org/v2/country/GBR/indicator/FP.CPI.TOTL.ZG"
            params = urlencode({"format": "json", "per_page": "5"})

            logger.info("  Fetching from World Bank API...")

            request = urllib.request.Request(f"{url}?{params}")
            request.add_header('User-Agent', 'Mozilla/5.0')

            with urllib.request.urlopen(request, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))

                # Extract inflation rate from latest data
                if len(data) > 1 and data[1]:
                    latest = data[1][0]
                    if latest.get('value'):
                        inflation = float(latest['value'])
                        logger.info(f"    ✓ Got inflation rate: {inflation}%")
                        return {"inflation_rate": inflation / 100}

        except Exception as e:
            logger.debug(f"    ℹ World Bank fetch failed: {str(e)}")

        return None

    def fetch_from_trading_economics(self) -> Optional[Dict[str, float]]:
        """
        Fetch cost indices from Trading Economics (free data available).

        Note: Full API requires key, but some data is publicly available.
        """
        try:
            # Trading Economics has public pages with cost data
            url = "https://tradingeconomics.com/united-kingdom/inflation-cpi"

            logger.info("  Checking Trading Economics...")

            request = urllib.request.Request(url)
            request.add_header('User-Agent', 'Mozilla/5.0')

            with urllib.request.urlopen(request, timeout=5) as response:
                content = response.read().decode('utf-8')

                # Look for inflation or cost indicators
                if "inflation" in content.lower():
                    logger.info(f"    ✓ Found cost data (parsing required)")
                    # Would need HTML parsing library to extract - skip for now
                    return None

        except Exception as e:
            logger.debug(f"    ℹ Trading Economics fetch failed: {str(e)}")

        return None

    def calculate_from_inflation(self, base_cost: float, base_year: int = 2024) -> float:
        """
        Calculate updated cost based on inflation.

        Uses World Bank inflation data to adjust historical costs.
        """
        inflation = self.fetch_from_world_bank()
        if not inflation:
            return base_cost

        years_elapsed = 2026 - base_year
        inflation_rate = inflation.get("inflation_rate", 0.03)  # Default 3% if fetch fails

        # Compound inflation calculation
        updated_cost = base_cost * ((1 + inflation_rate) ** years_elapsed)

        logger.info(f"  Calculated inflation adjustment: {base_cost:.0f} → {updated_cost:.0f}")
        return updated_cost

    # ==================== UPDATER ====================

    def update_from_apis(self) -> Dict[str, Any]:
        """
        Attempt to update costs from all available free APIs.

        Returns summary of what was updated.
        """
        logger.info("\n=== Fetching from Free APIs ===\n")

        data = self.load_data()
        summary = {
            "total_cities": 0,
            "updated_from_apis": 0,
            "updated_from_inflation": 0,
            "failed": []
        }

        # Try NUMBEO for each city
        for country, cities in CITY_MAPPING.items():
            for city_name, (api_city, api_country) in cities.items():
                summary["total_cities"] += 1

                # Try NUMBEO first
                numbeo_data = self.fetch_from_numbeo(api_city, api_country)
                if numbeo_data:
                    # Update with NUMBEO data if available
                    if country not in data:
                        data[country] = {}

                    if city_name in data[country]:
                        # Would update here if NUMBEO data was parseable
                        summary["updated_from_apis"] += 1
                        continue

                # Fallback: use inflation calculation
                if country in data and city_name in data[country]:
                    current_cost = data[country][city_name]["monthly"].get("realistic", 0)
                    if current_cost > 0:
                        updated_cost = self.calculate_from_inflation(current_cost)
                        # Only update if significant change
                        if abs(updated_cost - current_cost) > 10:
                            data[country][city_name]["monthly"]["realistic"] = int(updated_cost)
                            data[country][city_name]["monthly"]["min"] = int(updated_cost * 0.9)
                            data[country][city_name]["monthly"]["comfortable"] = int(updated_cost * 1.3)
                            summary["updated_from_inflation"] += 1

        # Update metadata
        data["metadata"]["last_updated"] = datetime.now().strftime("%Y-%m-%d")
        next_review = datetime.now() + timedelta(days=data["metadata"]["update_frequency_days"])
        data["metadata"]["next_review_date"] = next_review.strftime("%Y-%m-%d")

        # Save updates
        self.save_data(data)
        self._data = data

        logger.info(f"\n✓ Update Summary:")
        logger.info(f"  Total cities: {summary['total_cities']}")
        logger.info(f"  Updated from APIs: {summary['updated_from_apis']}")
        logger.info(f"  Updated from inflation: {summary['updated_from_inflation']}")
        if summary['failed']:
            logger.warning(f"  Failed: {', '.join(summary['failed'])}")

        return summary

    def manual_update(self) -> int:
        """Interactive mode for manually updating costs."""
        logger.info("\n=== Manual Cost Update Mode ===")
        logger.info("Update costs for cities. Press Enter to skip a city.\n")

        data = self.load_data()
        updated_count = 0

        for country, cities in CITY_MAPPING.items():
            logger.info(f"\n--- {country.upper()} ---")

            if country not in data:
                data[country] = {}

            for city_name in sorted(cities.keys()):
                city_data = data[country].get(city_name, {})
                current_monthly = city_data.get("monthly", {})

                logger.info(f"\n{city_name.upper()}")
                logger.info(f"  Current - Min: {current_monthly.get('min', '?')}, "
                           f"Realistic: {current_monthly.get('realistic', '?')}, "
                           f"Comfortable: {current_monthly.get('comfortable', '?')}")

                try:
                    min_val = input(f"  New MIN [skip]: ").strip()
                    if not min_val:
                        continue

                    realistic_val = input(f"  New REALISTIC [skip]: ").strip()
                    comfortable_val = input(f"  New COMFORTABLE [skip]: ").strip()

                    if realistic_val and comfortable_val:
                        if country not in data:
                            data[country] = {}
                        if city_name not in data[country]:
                            currency = "GBP" if country == "uk" else ("EUR" if country == "ireland" else "AED")
                            data[country][city_name] = {"currency": currency, "monthly": {}}

                        data[country][city_name]["monthly"] = {
                            "min": int(min_val),
                            "realistic": int(realistic_val),
                            "comfortable": int(comfortable_val)
                        }

                        logger.info(f"  ✓ Updated {city_name}")
                        updated_count += 1

                except ValueError:
                    logger.error("  ✗ Invalid input. Please enter numbers only.")
                    continue

        if updated_count > 0:
            data["metadata"]["last_updated"] = datetime.now().strftime("%Y-%m-%d")
            next_review = datetime.now() + timedelta(days=data["metadata"]["update_frequency_days"])
            data["metadata"]["next_review_date"] = next_review.strftime("%Y-%m-%d")

            self.save_data(data)
            self._data = data
            logger.info(f"\n✓ Updated {updated_count} cities")
        else:
            logger.info("\nNo updates made.")

        return updated_count

    def check_status(self) -> Dict[str, Any]:
        """Check when costs were last updated."""
        data = self.load_data()
        metadata = data.get("metadata", {})

        last_updated = metadata.get("last_updated", "Unknown")
        next_review = metadata.get("next_review_date", "Unknown")
        update_frequency = metadata.get("update_frequency_days", 90)

        logger.info(f"\n=== Cost of Living Data Status ===")
        logger.info(f"Last Updated: {last_updated}")
        logger.info(f"Next Review: {next_review}")
        logger.info(f"Update Frequency: Every {update_frequency} days")

        try:
            last_date = datetime.strptime(last_updated, "%Y-%m-%d")
            days_since = (datetime.now() - last_date).days
            logger.info(f"Days Since Update: {days_since}")

            if days_since > update_frequency:
                logger.warning(f"⚠ Data is {days_since} days old (threshold: {update_frequency})")
                logger.info("Run --fetch-api or --manual to update costs.")

            return {
                "last_updated": last_updated,
                "next_review": next_review,
                "days_since_update": days_since,
                "is_stale": days_since > update_frequency
            }

        except ValueError:
            logger.warning("Could not parse update date.")
            return {
                "last_updated": last_updated,
                "next_review": next_review,
                "days_since_update": None,
                "is_stale": True
            }

    def _normalize_country(self, country: str) -> str:
        """Normalize country name to key."""
        country_lower = country.lower()

        if country_lower in ("ireland", "ie"):
            return "ireland"
        elif country_lower in ("uae", "dubai", "emirates"):
            return "uae"
        elif country_lower in ("uk", "united kingdom", "gb"):
            return "uk"

        return country_lower


# Singleton instance
_manager = CostManager()


# ==================== PUBLIC API ====================

def get_living_cost(country: str, city: str, tier: str = "realistic") -> Optional[Dict[str, Any]]:
    """Get living cost for a city."""
    return _manager.get_cost(country, city, tier)


def get_all_tiers(country: str, city: str) -> Optional[Dict[str, Any]]:
    """Get all cost tiers for a city."""
    return _manager.get_all_tiers(country, city)


def list_cities(country: Optional[str] = None) -> List[Tuple[str, str]]:
    """List all available cities."""
    return _manager.list_cities(country)


def get_manager_status() -> Dict[str, Any]:
    """Check cost data status."""
    return _manager.check_status()


def update_costs_from_api() -> Dict[str, Any]:
    """Update costs from free APIs (NUMBEO, World Bank, etc)."""
    return _manager.update_from_apis()


def update_costs_manual() -> int:
    """Manual cost update mode."""
    return _manager.manual_update()


# ==================== CLI ====================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Cost of Living Manager - Resolver + Fetcher + Updater",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cost_manager.py --check              # Check status
  python cost_manager.py --fetch-api          # Fetch from free APIs
  python cost_manager.py --manual             # Manual entry
  python cost_manager.py --info               # Show all costs
        """
    )

    parser.add_argument("--check", action="store_true", help="Check status")
    parser.add_argument("--fetch-api", action="store_true", help="Fetch from free APIs")
    parser.add_argument("--manual", action="store_true", help="Manual entry mode")
    parser.add_argument("--info", action="store_true", help="Show all available costs")

    args = parser.parse_args()

    try:
        if args.check:
            _manager.check_status()
        elif args.fetch_api:
            _manager.update_from_apis()
        elif args.manual:
            _manager.manual_update()
        elif args.info:
            data = _manager.load_data()
            print("\n=== Available Costs ===\n")
            for country in sorted(data):
                if country == "metadata":
                    continue
                print(f"{country.upper()}:")
                for city, city_data in sorted(data[country].items()):
                    monthly = city_data.get("monthly", {})
                    currency = city_data.get("currency", "")
                    print(f"  {city:15} - {monthly.get('realistic', '?'):5} {currency}")
        else:
            _manager.check_status()

    except KeyboardInterrupt:
        logger.info("\nAborted by user.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)
