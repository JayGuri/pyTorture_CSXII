"""
=============================================================================
FATEH EDUCATION — DEEP UNIVERSITY DATA SCRAPER v2
=============================================================================

WHAT THIS SOLVES:
-----------------
Builds a comprehensive knowledge base for the AI counselling bot covering:
  - Per-course data (not just per-university)
  - Tuition fees, IELTS, GPA, start dates, duration, deadlines
  - Accommodation costs (university halls + private estimates)
  - City-level living costs (rent, food, transport, total/month)
  - Visa financial requirements (exact amounts needed in bank)
  - Scholarships (per-university + national)

SOURCES AND SCRAPING STRATEGY:
-------------------------------

UK — University of Edinburgh:
  List page:  study.ed.ac.uk/programmes/postgraduate-taught
              Paginated, static HTML. Each page has course cards with slug+id.
  Course page: study.ed.ac.uk/programmes/postgraduate-taught/{id}-{slug}
              Static HTML. Contains: IELTS, GPA, fees, living costs, scholarships,
              start date, application deadline, duration, deposit.
  Strategy:   Crawl list -> extract all course URLs -> scrape each course page.

UK — Other Universities (Warwick, Manchester, UCL, Birmingham, Bristol,
     Leeds, Sheffield, King's College, Nottingham):
  List pages: Each university's PG course finder.
  Some are JS rendered (Warwick, Manchester, UCL, King's) -> Selenium.
  Others are static HTML -> BS4.
  Strategy: Extract course links from listing, scrape individual pages.

IRELAND — educationireland.net:
  Requirements: /entryreq/ — static HTML table, 23 universities
  Scholarships: /scholarships/ — static HTML sections per university
  Strategy: BS4 only.

IRELAND — Individual universities (TCD, UCD, UCC, UL, DCU):
  Each has a postgraduate course finder.
  Strategy: BS4 for static, Selenium fallback.

LIVING COSTS:
  Compiled from: Edinburgh official page, UK Home Office visa requirements,
  UniAcco, gradstarglobal.com, fateheducation.com blog.
  All 12 cities covered: London, Edinburgh, Manchester, Birmingham, Bristol,
  Leeds, Sheffield, Nottingham, Coventry, Dublin, Galway, Cork, Dubai.

VISA DATA:
  UK Student Visa and Ireland Study Visa — official requirements, financial
  thresholds, 28-day rule, common rejection reasons, post-study work rights.

OUTPUT FILES (in /data/):
  courses_edinburgh.json       — All Edinburgh PG courses with full details
  courses_other_uk.json        — Birmingham, Bristol, Leeds, Sheffield etc.
  scholarships_uk.json         — National UK scholarships
  ireland_requirements.json    — 23 Irish universities requirements table
  ireland_scholarships.json    — Per-university + govt scholarships
  ireland_courses.json         — TCD, UCD, UCC, DCU, UL course-level data
  dubai_universities.json      — 4 Dubai campuses
  living_costs.json            — City-by-city living cost breakdown
  visa_requirements.json       — UK and Ireland visa details
  all_data.json                — MERGED master file for the AI bot

=============================================================================
"""

import os
import json
import time
import random
import logging
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, WebDriverException
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        WEBDRIVER_MANAGER = True
    except ImportError:
        WEBDRIVER_MANAGER = False
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

# ---------------------------------------------------------------------------
# SETUP
# ---------------------------------------------------------------------------

OUTPUT_DIR = Path("data")
OUTPUT_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("scraper.log"), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
]

DELAY_MIN = 2.0
DELAY_MAX = 4.5
MAX_RETRIES = 3
SCRAPE_TIMESTAMP = datetime.now().isoformat()


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def get_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Connection": "keep-alive",
    }


# ---------------------------------------------------------------------------
# GLOBAL DRIVER (SINGLETON)
# ---------------------------------------------------------------------------

_global_driver = None
_selenium_initialization_failed = False

def get_driver():
    global _global_driver, _selenium_initialization_failed
    if not SELENIUM_AVAILABLE or _selenium_initialization_failed:
        return None
    
    if _global_driver:
        try:
            # Check if driver is still alive
            _global_driver.current_url
            return _global_driver
        except Exception:
            try: 
                _global_driver.quit()
            except: 
                pass
            _global_driver = None

    try:
        log.info("  Initializing Chrome driver (stealth mode)...")
        opts = Options()
        opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--disable-gpu")
        opts.add_argument(f"--user-agent={random.choice(USER_AGENTS)}")
        opts.add_argument("--window-size=1920,1080")
        # Experimental: avoid bot detection
        opts.add_argument("--disable-blink-features=AutomationControlled")
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        opts.add_experimental_option("useAutomationExtension", False)

        driver_path = None
        if WEBDRIVER_MANAGER:
            try:
                # Try with short timeout to fetch driver, fallback to cached or system path
                driver_path = ChromeDriverManager().install()
            except Exception as manager_error:
                log.warning(f"  ChromeDriverManager failed ({manager_error}). Trying system fallback...")

        if driver_path:
            _global_driver = webdriver.Chrome(service=Service(driver_path), options=opts)
        else:
            # Try to initialize normally from system PATH
            _global_driver = webdriver.Chrome(options=opts)
        
        # Execute CDP commands to prevent detection
        _global_driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        })
        
        _global_driver.set_page_load_timeout(30)
        return _global_driver
    except Exception as e:
        log.error(f"Failed to initialize Selenium: {e}")
        # One last fallback: maybe it's just the driver version
        # If it failed to initialize even without manager, give up for this run.
        _selenium_initialization_failed = True 
        return None


def fetch(url: str, use_selenium: bool = False, wait_for_selector: str = None) -> BeautifulSoup | None:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if use_selenium:
                return _selenium_fetch(url, wait_for_selector)
            
            log.info(f"  GET {url}")
            r = requests.get(url, headers=get_headers(), timeout=20)
            if r.status_code == 403 or r.status_code == 429:
                log.warning(f"  Blocked (HTTP {r.status_code}). Falling back to Selenium...")
                return _selenium_fetch(url, wait_for_selector)
            
            r.raise_for_status()
            time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
            return BeautifulSoup(r.text, "lxml")
        except requests.RequestException as e:
            log.warning(f"  Request error (attempt {attempt}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
    log.error(f"  All retries failed: {url}")
    return None


def _selenium_fetch(url: str, wait_for_selector: str = None) -> BeautifulSoup | None:
    driver = get_driver()
    if not driver:
        return None
    
    log.info(f"  SELENIUM {url}")
    try:
        driver.get(url)
        if wait_for_selector:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, wait_for_selector))
            )
        else:
            time.sleep(random.uniform(3, 5))
        
        html = driver.page_source
        return BeautifulSoup(html, "lxml")
    except TimeoutException:
        log.warning(f"  Selenium timeout on {url}")
        return BeautifulSoup(driver.page_source, "lxml") # Return what we have anyway
    except Exception as e:
        log.error(f"  Selenium error on {url}: {e}")
        return None


def clean(text: str) -> str:
    return " ".join(text.strip().split()) if text else ""


def extract_money(text: str) -> str | None:
    m = re.search(r'[£€$][\s]?[\d,]+(?:\s?[–\-]\s?[£€$]?[\d,]+)?', text)
    return clean(m.group(0)) if m else None


def save(data, filename: str):
    path = OUTPUT_DIR / filename
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    count = len(data) if isinstance(data, (list, dict)) else 0
    log.info(f"  Saved {path} ({count} records)")


# ---------------------------------------------------------------------------
# LIVING COSTS — All cities. Compiled from official university pages,
# UK Home Office visa guidance, UniAcco, gradstarglobal.com 2025-26
# ---------------------------------------------------------------------------

LIVING_COSTS = {
    "London": {
        "city": "London", "country": "UK",
        "accommodation_university_halls_per_month": "£900 – £1,200",
        "accommodation_private_studio_per_month": "£1,200 – £2,200",
        "accommodation_shared_flat_per_month": "£700 – £1,100",
        "food_groceries_per_month": "£200 – £350",
        "transport_per_month": "£100 – £180 (Oyster card zones 1-2)",
        "utilities_per_month": "£100 – £150 (if not included in rent)",
        "books_materials_per_month": "£50 – £100",
        "personal_entertainment_per_month": "£100 – £250",
        "total_per_month_estimate": "£1,500 – £2,500",
        "total_per_year_estimate": "£18,000 – £30,000",
        "visa_financial_requirement_per_month": "£1,334 (UK Home Office official)",
        "visa_financial_requirement_9_months_total": "£12,006",
        "nhs_surcharge_per_year": "£776",
        "budget_tips": "Use Oyster card. Live in zones 2-3 (Stratford, Wembley). Shop at Aldi/Lidl.",
        "source": "UK Home Office + UniAcco 2025-26"
    },
    "Edinburgh": {
        "city": "Edinburgh", "country": "UK",
        "accommodation_university_halls_self_catered_per_month": "£383 – £849",
        "accommodation_university_halls_catered_per_month": "£479 – £1,020 (includes 2 meals/day)",
        "accommodation_private_per_month": "£700 – £1,500",
        "accommodation_shared_flat_per_month": "£500 – £850",
        "food_groceries_per_month": "£200 – £350",
        "transport_per_month": "£25 – £77 (Lothian Bus Ridacard — FREE under 22 with Young Scot card)",
        "utilities_per_month": "£0 (included in uni halls) / £80 – £150 (private)",
        "books_materials_per_month": "£50 – £100",
        "personal_entertainment_per_month": "£100 – £200",
        "total_per_month_estimate": "£1,167 – £2,330 (University of Edinburgh official)",
        "total_per_year_estimate": "£14,000 – £28,000",
        "visa_financial_requirement_per_month": "£1,023 (outside London — UK Home Office)",
        "visa_financial_requirement_9_months_total": "£9,207",
        "nhs_surcharge_per_year": "£776",
        "accommodation_guarantee": "University guarantees accommodation for all new single international PG students who apply by the deadline",
        "budget_tips": "Areas: Leith, Gorgie, Marchmont. Festival season (August) is 30-50% pricier. Young Scot card for free buses.",
        "source": "study.ed.ac.uk/postgraduate/fees-funding/living-costs (official page)"
    },
    "Manchester": {
        "city": "Manchester", "country": "UK",
        "accommodation_university_halls_per_month": "£500 – £900",
        "accommodation_private_per_month": "£600 – £1,200",
        "accommodation_shared_flat_per_month": "£400 – £700",
        "food_groceries_per_month": "£150 – £250",
        "transport_per_month": "£50 – £100 (Bee Network bus/tram)",
        "utilities_per_month": "£80 – £130",
        "personal_entertainment_per_month": "£100 – £200",
        "total_per_month_estimate": "£900 – £1,400",
        "total_per_year_estimate": "£11,000 – £17,000",
        "visa_financial_requirement_per_month": "£1,023",
        "visa_financial_requirement_9_months_total": "£9,207",
        "nhs_surcharge_per_year": "£776",
        "budget_tips": "Areas: Fallowfield, Rusholme, Withington. Large South Asian community. Part-time jobs plentiful.",
        "source": "applyindex.com + gradstarglobal.com 2025"
    },
    "Birmingham": {
        "city": "Birmingham", "country": "UK",
        "accommodation_university_halls_per_month": "£500 – £850",
        "accommodation_private_per_month": "£550 – £1,000",
        "accommodation_shared_flat_per_month": "£400 – £650",
        "food_groceries_per_month": "£150 – £250",
        "transport_per_month": "£50 – £90",
        "total_per_month_estimate": "£900 – £1,300",
        "total_per_year_estimate": "£11,000 – £16,000",
        "visa_financial_requirement_per_month": "£1,023",
        "visa_financial_requirement_9_months_total": "£9,207",
        "nhs_surcharge_per_year": "£776",
        "budget_tips": "Second-largest UK city. Strong South Asian community. Good transport links.",
        "source": "uniacco.com 2025-26"
    },
    "Bristol": {
        "city": "Bristol", "country": "UK",
        "accommodation_university_halls_per_month": "£550 – £950",
        "accommodation_private_per_month": "£700 – £1,200",
        "accommodation_shared_flat_per_month": "£500 – £800",
        "food_groceries_per_month": "£150 – £300",
        "transport_per_month": "£50 – £100",
        "total_per_month_estimate": "£1,000 – £1,600",
        "total_per_year_estimate": "£12,000 – £19,000",
        "visa_financial_requirement_per_month": "£1,023",
        "visa_financial_requirement_9_months_total": "£9,207",
        "nhs_surcharge_per_year": "£776",
        "budget_tips": "Growing tech hub. Slightly pricier than Manchester.",
        "source": "uniacco.com 2025-26"
    },
    "Leeds": {
        "city": "Leeds", "country": "UK",
        "accommodation_university_halls_per_month": "£450 – £850",
        "accommodation_private_per_month": "£500 – £950",
        "accommodation_shared_flat_per_month": "£380 – £650",
        "food_groceries_per_month": "£150 – £250",
        "transport_per_month": "£45 – £85",
        "total_per_month_estimate": "£850 – £1,300",
        "total_per_year_estimate": "£10,000 – £16,000",
        "visa_financial_requirement_per_month": "£1,023",
        "visa_financial_requirement_9_months_total": "£9,207",
        "nhs_surcharge_per_year": "£776",
        "budget_tips": "Very affordable. Strong for finance and law.",
        "source": "stuaccommodation.com 2025-26"
    },
    "Sheffield": {
        "city": "Sheffield", "country": "UK",
        "accommodation_university_halls_per_month": "£430 – £800",
        "accommodation_private_per_month": "£450 – £900",
        "accommodation_shared_flat_per_month": "£350 – £600",
        "food_groceries_per_month": "£130 – £230",
        "transport_per_month": "£40 – £80",
        "total_per_month_estimate": "£800 – £1,200",
        "total_per_year_estimate": "£9,500 – £14,500",
        "visa_financial_requirement_per_month": "£1,023",
        "visa_financial_requirement_9_months_total": "£9,207",
        "nhs_surcharge_per_year": "£776",
        "budget_tips": "One of UK's most affordable student cities.",
        "source": "stuaccommodation.com 2025-26"
    },
    "Nottingham": {
        "city": "Nottingham", "country": "UK",
        "accommodation_university_halls_per_month": "£430 – £800",
        "accommodation_private_per_month": "£450 – £850",
        "accommodation_shared_flat_per_month": "£350 – £600",
        "food_groceries_per_month": "£130 – £220",
        "transport_per_month": "£40 – £80",
        "total_per_month_estimate": "£800 – £1,200",
        "total_per_year_estimate": "£9,500 – £14,500",
        "visa_financial_requirement_per_month": "£1,023",
        "visa_financial_requirement_9_months_total": "£9,207",
        "nhs_surcharge_per_year": "£776",
        "budget_tips": "Affordable. Beautiful University Park campus.",
        "source": "uniacco.com 2025-26"
    },
    "Coventry": {
        "city": "Coventry", "country": "UK",
        "note": "Home to University of Warwick",
        "accommodation_shared_flat_per_month": "£350 – £600",
        "accommodation_university_halls_per_month": "£430 – £800",
        "food_groceries_per_month": "£130 – £220",
        "transport_per_month": "£40 – £80",
        "total_per_month_estimate": "£800 – £1,200",
        "total_per_year_estimate": "£9,500 – £14,500",
        "visa_financial_requirement_per_month": "£1,023",
        "visa_financial_requirement_9_months_total": "£9,207",
        "nhs_surcharge_per_year": "£776",
        "budget_tips": "20 mins from Birmingham by train. Very affordable.",
        "source": "uniacco.com 2025-26"
    },
    "Dublin": {
        "city": "Dublin", "country": "Ireland",
        "accommodation_university_halls_per_month": "€900 – €1,500",
        "accommodation_private_per_month": "€1,200 – €2,200",
        "accommodation_shared_flat_per_month": "€700 – €1,200",
        "food_groceries_per_month": "€200 – €400",
        "transport_per_month": "€100 – €150 (Leap Card student discount)",
        "utilities_per_month": "€100 – €200",
        "personal_entertainment_per_month": "€100 – €200",
        "total_per_month_estimate": "€1,200 – €2,000",
        "total_per_year_estimate": "€14,400 – €24,000",
        "visa_financial_requirement": "€7,000 minimum shown in account (Irish immigration)",
        "post_study_work": "Graduate Programme: 2 years for Honours degree/Masters, 1 year for others",
        "budget_tips": "Housing shortage — apply early. Use Leap Card. Areas: Drumcondra, Rathmines for cheaper rent.",
        "source": "educationireland.net + Irish INIS guidelines"
    },
    "Galway": {
        "city": "Galway", "country": "Ireland",
        "accommodation_university_halls_per_month": "€600 – €1,000",
        "accommodation_shared_flat_per_month": "€500 – €900",
        "food_groceries_per_month": "€150 – €300",
        "transport_per_month": "€60 – €100",
        "total_per_month_estimate": "€900 – €1,500",
        "total_per_year_estimate": "€10,800 – €18,000",
        "visa_financial_requirement": "€7,000 minimum",
        "budget_tips": "Smaller city, more affordable than Dublin. Great student culture.",
        "source": "educationireland.net"
    },
    "Cork": {
        "city": "Cork", "country": "Ireland",
        "accommodation_university_halls_per_month": "€650 – €1,100",
        "accommodation_shared_flat_per_month": "€550 – €950",
        "food_groceries_per_month": "€150 – €300",
        "transport_per_month": "€60 – €100",
        "total_per_month_estimate": "€950 – €1,500",
        "total_per_year_estimate": "€11,400 – €18,000",
        "visa_financial_requirement": "€7,000 minimum",
        "budget_tips": "Ireland's second city. More affordable than Dublin.",
        "source": "educationireland.net"
    },
    "Dubai": {
        "city": "Dubai", "country": "UAE",
        "accommodation_university_halls_per_month": "AED 2,000 – 4,000 (~£440 – £880)",
        "accommodation_private_per_month": "AED 3,000 – 7,000 (~£660 – £1,540)",
        "accommodation_shared_flat_per_month": "AED 1,500 – 3,000 (~£330 – £660)",
        "food_groceries_per_month": "AED 600 – 1,200 (~£132 – £264)",
        "transport_per_month": "AED 200 – 500 (~£44 – £110) (Dubai Metro + bus)",
        "utilities_per_month": "AED 200 – 500 (often included in student accommodation)",
        "personal_entertainment_per_month": "AED 300 – 800",
        "total_per_month_estimate": "AED 3,500 – 7,000 (~£770 – £1,540)",
        "total_per_year_estimate": "AED 42,000 – 84,000 (~£9,240 – £18,480)",
        "tax": "No income tax in UAE",
        "visa_requirement": "UAE student visa — sponsored by university, no minimum bank balance requirement",
        "work_rights": "20 hours/week on student visa",
        "budget_tips": "No tax advantage. Campus-based universities. International environment. Heat can be extreme.",
        "source": "Dubai university official pages + general research"
    }
}


# ---------------------------------------------------------------------------
# VISA REQUIREMENTS — Official data
# ---------------------------------------------------------------------------

VISA_REQUIREMENTS = {
    "UK_Student_Visa": {
        "visa_type": "UK Student Visa (Tier 4 successor)",
        "financial_requirement_london": "£1,334/month x 9 months = £12,006 total (PLUS first year tuition if not pre-paid)",
        "financial_requirement_outside_london": "£1,023/month x 9 months = £9,207 total (PLUS first year tuition if not pre-paid)",
        "funds_holding_period_days": 28,
        "funds_holding_rule": "Funds must be continuously held for 28 consecutive days. The last day of the 28-day period must be within 31 days of your application date.",
        "acceptable_funds_sources": ["Personal savings", "Parents/family (relationship must be documented)", "Bank loan letter", "Scholarship letter"],
        "joint_accounts": "Accepted if student is named on the account",
        "cas_requirement": "Confirmation of Acceptance for Studies (CAS) from university — issued after conditional offer is met",
        "cas_validity": "CAS is valid for 6 months from issue date",
        "ielts_approved_test": "Must be IELTS UKVI (not academic) OR Pearson PTE Academic UKVI OR Trinity College SELT",
        "healthcare_surcharge_per_year": "£776 (from January 2024) — paid upfront for entire course duration with application",
        "application_fee": "£490 (applications outside UK)",
        "processing_time_standard": "3 weeks",
        "processing_time_peak": "Up to 6 weeks (June – August)",
        "work_rights_during_term": "20 hours/week",
        "work_rights_holidays": "Full-time during official university holidays",
        "post_study_work_visa_graduate_route": "2 years for UG and PG taught degrees, 3 years for PhD",
        "post_study_work_visa_cost": "£827 (2024)",
        "common_rejection_reasons": [
            "Funds not held for 28 consecutive days before application",
            "Funds insufficient (doesn't include first year tuition + maintenance)",
            "Financial statements not from approved bank or not in correct format",
            "Academic gap unexplained (gaps over 2 years often questioned)",
            "Career switch from undergraduate subject to Masters subject not justified",
            "Previous UK/other country visa refusal not disclosed",
            "CAS expired or student details don't match passport",
            "IELTS score from non-UKVI approved test used",
            "SOP does not convincingly explain study purpose and return plans"
        ],
        "gap_year_guidance": "Gaps under 1 year: explain briefly. 1-2 years: need strong justification (work, health, family). Over 2 years: high risk — prepare detailed SOP and supporting documents.",
        "source": "UK Home Office — Student visa official guidance 2024-25"
    },
    "Ireland_Student_Visa": {
        "visa_type": "Ireland Study Visa (D Study)",
        "financial_requirement_minimum": "€7,000 minimum in personal or parents account",
        "financial_requirement_recommended": "€10,000+ recommended for strong application",
        "funds_holding_period": "No specific 28-day rule — recent 3-6 months bank statements required",
        "acceptable_funds_sources": ["Personal savings", "Parents' savings", "Sponsor letter with bank statements"],
        "application_fee": "€60 (online), €100 (paper/postal)",
        "processing_time": "8 – 12 weeks (Irish Naturalisation and Immigration Service, INIS)",
        "apply_through": "VFS Global (India) — visa application centre",
        "ielts_general": "IELTS 6.0+ for most universities, 6.5 for competitive programmes",
        "work_rights_during_term": "20 hours/week",
        "work_rights_summer": "40 hours/week (June – September and December – January)",
        "post_study_work_graduate_programme": "2 years for NFQ Level 8 (Honours degree) and above, 1 year for NFQ Level 7",
        "post_study_work_cost": "€300",
        "stamp_type": "Stamp 2 — allows work rights during study and Graduate Programme after",
        "common_rejection_reasons": [
            "Insufficient financial evidence",
            "Incomplete documentation",
            "No evidence of strong ties to home country (family, property, job offer)",
            "Previous Irish or Schengen visa refusal not declared",
            "Course not on ILEP (Irish Language Education Provider) or eligible institution list",
            "Gaps in academic history unexplained"
        ],
        "source": "Irish Naturalisation and Immigration Service (INIS) + VFS Global 2024-25"
    }
}


# ---------------------------------------------------------------------------
# SCRAPER 1: UNIVERSITY OF EDINBURGH
# study.ed.ac.uk/programmes/postgraduate-taught — paginated static HTML
# Each course page is fully detailed with all data we need
# ---------------------------------------------------------------------------

EDINBURGH_BASE = "https://study.ed.ac.uk"
EDINBURGH_LIST = "https://study.ed.ac.uk/programmes/postgraduate-taught"


def _parse_edinburgh_course_page(soup: BeautifulSoup, url: str) -> dict:
    data = {
        "university": "University of Edinburgh",
        "country": "UK",
        "city": "Edinburgh",
        "course_url": url,
        "scraped_at": SCRAPE_TIMESTAMP
    }

    h1 = soup.find("h1")
    data["course_name"] = clean(h1.get_text()) if h1 else ""

    text = soup.get_text(" ", strip=True)

    # Delivery mode
    delivery = re.search(r'Delivery[:\s]+([^\n\.]{5,60})', text)
    if delivery:
        data["delivery_mode"] = clean(delivery.group(1))

    # Duration
    dur = re.search(r'(\d+)\s*(year|month)', text, re.IGNORECASE)
    if dur:
        data["duration"] = clean(dur.group(0))

    # Tuition fees — overseas/international
    for pat in [
        r'[Oo]verseas[^£\n]{0,30}£([\d,]+)',
        r'[Ii]nternational[^£\n]{0,30}£([\d,]+)',
        r'£([\d,]+)\s*per year',
        r'tuition[^£]{0,30}£([\d,]+)',
    ]:
        m = re.search(pat, text)
        if m:
            data["tuition_fee_overseas_per_year"] = f"£{m.group(1)}"
            break

    # Alumni discount
    if "10% discount" in text or "10 per cent" in text.lower():
        data["alumni_discount"] = "10% off for Edinburgh graduates"

    # Deposit
    if "no deposit" in text.lower() or "do not have to pay a deposit" in text.lower():
        data["deposit"] = "No deposit required"
    else:
        dep = re.search(r'deposit[^£]{0,20}£([\d,]+)', text, re.IGNORECASE)
        if dep:
            data["deposit"] = f"£{dep.group(1)}"

    # Living costs (Edinburgh official estimate appears on every course page)
    lc = re.search(r'£([\d,]+)\s*to\s*£([\d,]+)\s*per month', text)
    if lc:
        data["living_cost_per_month_estimate"] = f"£{lc.group(1)} – £{lc.group(2)}"
    else:
        data["living_cost_per_month_estimate"] = "£1,167 – £2,330 (official University estimate)"

    # Accommodation guarantee
    if "guarantee" in text.lower() and "accommodation" in text.lower():
        data["accommodation_guarantee"] = "University guarantees accommodation for new single international PG students"

    # IELTS
    ielts = re.search(r'IELTS[^:]*:\s*total\s*([\d.]+)[^.]+?([\d.]+)\s*in each', text)
    if ielts:
        data["ielts_overall"] = ielts.group(1)
        data["ielts_per_component"] = ielts.group(2)
        data["ielts_requirement"] = f"IELTS {ielts.group(1)} overall, {ielts.group(2)} per component"
    else:
        simple_ielts = re.search(r'IELTS[^0-9]*([\d.]+)', text)
        if simple_ielts:
            data["ielts_requirement"] = f"IELTS {simple_ielts.group(1)} overall"

    # TOEFL
    toefl = re.search(r'TOEFL[^0-9]*([\d]+)', text)
    if toefl:
        data["toefl_requirement"] = f"TOEFL iBT {toefl.group(1)}"

    # Degree requirement
    for pat in [r'(2:1|first.class|2:2)[^.]{0,60}(degree|honours)', r'(UK 2:1|UK first|UK 2:2)', r'minimum[^0-9]*([\d]+)%']:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            data["minimum_degree_requirement"] = clean(m.group(0)[:80])
            break

    # Start date
    for pat in [r'(September|January|October|February)\s+(\d{4})', r'start[s]?\s+in\s+(September|January)']:
        m = re.search(pat, text)
        if m:
            data["start_date"] = clean(m.group(0)[:30])
            break

    # Application deadline
    dl = re.search(r'deadline[:\s]+([0-9]{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{4})', text, re.IGNORECASE)
    if dl:
        data["application_deadline"] = clean(dl.group(1))

    # Application fee
    if "no fee to apply" in text.lower():
        data["application_fee"] = "Free"

    # Scholarships on page
    schols = re.findall(r'scholarship[^.]{0,250}(?:£|€)[\d,]+[^.]*\.', text, re.IGNORECASE)
    if schols:
        data["scholarships_mentioned_on_page"] = [clean(s) for s in schols[:4]]

    # Documents needed
    doc_keywords = ["degree certificate", "transcript", "personal statement", "reference", "CV", "resume", "portfolio", "research proposal"]
    data["documents_typically_required"] = [d for d in doc_keywords if d.lower() in text.lower()]

    # Standard fields
    data["post_study_work_visa"] = "Graduate Route: 2 years (MSc), 3 years (PhD)"
    data["work_rights_during_study"] = "20 hours/week during term, full-time during official holidays"
    data["nhs_surcharge"] = "£776/year (paid upfront with visa application)"

    return data


def scrape_edinburgh() -> list[dict]:
    log.info("=== Edinburgh: Crawling course list ===")
    
    # Resumability check
    target_file = OUTPUT_DIR / "courses_edinburgh.json"
    if target_file.exists():
        log.info(f"   Edinburgh data already exists. Loading {target_file}...")
        with open(target_file, "r", encoding="utf-8") as f:
            return json.load(f)

    course_urls = []
    page = 0

    while True:
        list_url = f"{EDINBURGH_LIST}?page={page}" if page > 0 else EDINBURGH_LIST
        soup = fetch(list_url)
        if not soup:
            break

        links = soup.find_all("a", href=re.compile(r'/programmes/postgraduate-taught/\d+'))
        if not links:
            log.info(f"  Page {page}: no more courses found")
            break

        new_urls = []
        for a in links:
            full_url = urljoin(EDINBURGH_BASE, a["href"])
            if full_url not in course_urls:
                new_urls.append(full_url)
                course_urls.append(full_url)

        log.info(f"  Page {page}: +{len(new_urls)} courses (total: {len(course_urls)})")
        page += 1
        if page > 40: # Edinburgh usually has ~30-35 pages
            break

    log.info(f"Edinburgh: {len(course_urls)} URLs found. Scraping each (parallel)...")
    
    courses = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    # We use a small number of workers to be polite and avoid blocks
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_url = {executor.submit(fetch, url): url for url in course_urls}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                soup = future.result()
                if soup:
                    course = _parse_edinburgh_course_page(soup, url)
                    if course.get("course_name"):
                        courses.append(course)
                        if len(courses) % 20 == 0:
                            log.info(f"    Scraped {len(courses)}/{len(course_urls)} courses...")
            except Exception as e:
                log.error(f"    Error scraping {url}: {e}")

    log.info(f"Edinburgh: {len(courses)} courses scraped")
    return courses


# ---------------------------------------------------------------------------
# SCRAPER 2: OTHER UK UNIVERSITIES
# ---------------------------------------------------------------------------

UK_UNI_CONFIGS = [
    {
        "name": "University of Warwick", "city": "Coventry", "country": "UK",
        "pg_list_url": "https://warwick.ac.uk/study/postgraduate/courses/",
        "ielts_general": "6.5 overall, 6.0 per component",
        "min_degree": "2:1 (60-65%+)", "tuition_range_pg": "£24,950 – £31,450/year",
        "start_dates": "September (primary), January (some)", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", 
        "use_selenium": True, "selector": ".course-listing"
    },
    {
        "name": "University of Manchester", "city": "Manchester", "country": "UK",
        "pg_list_url": "https://www.manchester.ac.uk/study/masters/courses/list/",
        "ielts_general": "6.5 overall, 6.0 per component",
        "min_degree": "2:1 (60-65%+)", "tuition_range_pg": "£23,000 – £32,000/year",
        "start_dates": "September, January (some)", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", 
        "use_selenium": True, "selector": ".course-list-item"
    },
    {
        "name": "UCL (University College London)", "city": "London", "country": "UK",
        "pg_list_url": "https://www.ucl.ac.uk/prospective-students/graduate/taught-degrees",
        "ielts_general": "7.0 overall, 6.5 per component (some courses 7.5)",
        "min_degree": "2:1 (65%+)", "tuition_range_pg": "£26,000 – £38,000/year",
        "start_dates": "September", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", 
        "use_selenium": True, "selector": ".course-finder__results"
    },
    {
        "name": "University of Birmingham", "city": "Birmingham", "country": "UK",
        "pg_list_url": "https://www.birmingham.ac.uk/postgraduate/courses",
        "ielts_general": "6.5 overall, 6.0 per component",
        "min_degree": "2:1 (60%+)", "tuition_range_pg": "£21,840 – £28,320/year",
        "start_dates": "September, January", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", "use_selenium": False
    },
    {
        "name": "University of Bristol", "city": "Bristol", "country": "UK",
        "pg_list_url": "https://www.bristol.ac.uk/study/postgraduate/",
        "ielts_general": "6.5 overall, 6.0 per component",
        "min_degree": "2:1 (65%+)", "tuition_range_pg": "£22,200 – £29,700/year",
        "start_dates": "September", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", "use_selenium": False
    },
    {
        "name": "University of Leeds", "city": "Leeds", "country": "UK",
        "pg_list_url": "https://courses.leeds.ac.uk/course-search/masters-courses",
        "ielts_general": "6.5 overall, 6.0 per component",
        "min_degree": "2:1 (60%+)", "tuition_range_pg": "£20,000 – £27,000/year",
        "start_dates": "September", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", "use_selenium": False
    },
    {
        "name": "University of Sheffield", "city": "Sheffield", "country": "UK",
        "pg_list_url": "https://www.sheffield.ac.uk/postgraduate/taught/courses",
        "ielts_general": "6.5 overall, 6.0 per component",
        "min_degree": "2:1 (60%+)", "tuition_range_pg": "£19,580 – £25,740/year",
        "start_dates": "September", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", "use_selenium": False
    },
    {
        "name": "King's College London", "city": "London", "country": "UK",
        "pg_list_url": "https://www.kcl.ac.uk/study/postgraduate-taught/courses",
        "ielts_general": "7.0 overall, 6.5 per component",
        "min_degree": "2:1 (65%+)", "tuition_range_pg": "£25,000 – £36,000/year",
        "start_dates": "September", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", 
        "use_selenium": True, "selector": ".course-list"
    },
    {
        "name": "University of Nottingham", "city": "Nottingham", "country": "UK",
        "pg_list_url": "https://www.nottingham.ac.uk/pgstudy/courses/",
        "ielts_general": "6.5 overall, 6.0 per component",
        "min_degree": "2:1 (60%+)", "tuition_range_pg": "£20,500 – £26,500/year",
        "start_dates": "September", "application_fee": "Free",
        "post_study_work": "Graduate Route: 2 years MSc, 3 years PhD", "use_selenium": False
    }
]


def scrape_other_uk() -> list[dict]:
    log.info("=== Other UK Universities ===")
    
    # Resumability check
    target_file = OUTPUT_DIR / "courses_other_uk.json"
    if target_file.exists():
        log.info(f"   Other UK data already exists. Loading {target_file}...")
        with open(target_file, "r", encoding="utf-8") as f:
            return json.load(f)

    all_courses = []

    for cfg in UK_UNI_CONFIGS:
        log.info(f"  {cfg['name']}")
        soup = fetch(cfg["pg_list_url"], use_selenium=cfg.get("use_selenium", False), wait_for_selector=cfg.get("selector"))

        if not soup:
            # Fallback: return university-level record
            all_courses.append({
                "university": cfg["name"], "city": cfg["city"], "country": cfg["country"],
                "course_name": "All postgraduate programmes",
                "course_url": cfg["pg_list_url"],
                "ielts_requirement": cfg["ielts_general"],
                "minimum_degree_requirement": cfg["min_degree"],
                "tuition_fee_range_per_year": cfg["tuition_range_pg"],
                "start_dates": cfg["start_dates"],
                "application_fee": cfg["application_fee"],
                "post_study_work_visa": cfg["post_study_work"],
                "work_rights_during_study": "20 hours/week during term",
                "data_level": "university_fallback",
                "scraped_at": SCRAPE_TIMESTAMP
            })
            continue

        # Extract course links from listing page
        course_links = soup.find_all("a", href=re.compile(
            r'(postgraduate|masters|courses?|programme)/[a-z0-9\-]+', re.IGNORECASE
        ))

        seen = set()
        found = 0
        for a in course_links[:60]:
            href = a.get("href", "")
            if not href or href in seen:
                continue
            seen.add(href)
            name = clean(a.get_text())
            if not (5 < len(name) < 100):
                continue

            full_url = urljoin(cfg["pg_list_url"], href)
            all_courses.append({
                "university": cfg["name"], "city": cfg["city"], "country": cfg["country"],
                "course_name": name,
                "course_url": full_url,
                "ielts_requirement": cfg["ielts_general"],
                "minimum_degree_requirement": cfg["min_degree"],
                "tuition_fee_range_per_year": cfg["tuition_range_pg"],
                "start_dates": cfg["start_dates"],
                "application_fee": cfg["application_fee"],
                "post_study_work_visa": cfg["post_study_work"],
                "work_rights_during_study": "20 hours/week during term, full-time during holidays",
                "nhs_surcharge": "£776/year",
                "scraped_at": SCRAPE_TIMESTAMP
            })
            found += 1

        log.info(f"    {cfg['name']}: {found} courses")

        if found == 0:
            all_courses.append({
                "university": cfg["name"], "city": cfg["city"], "country": cfg["country"],
                "course_name": "All postgraduate programmes",
                "course_url": cfg["pg_list_url"],
                "ielts_requirement": cfg["ielts_general"],
                "minimum_degree_requirement": cfg["min_degree"],
                "tuition_fee_range_per_year": cfg["tuition_range_pg"],
                "start_dates": cfg["start_dates"],
                "application_fee": cfg["application_fee"],
                "post_study_work_visa": cfg["post_study_work"],
                "work_rights_during_study": "20 hours/week during term",
                "data_level": "university_fallback",
                "scraped_at": SCRAPE_TIMESTAMP
            })

    return all_courses


# ---------------------------------------------------------------------------
# SCRAPER 3: IRELAND REQUIREMENTS
# ---------------------------------------------------------------------------

def scrape_ireland_requirements():
    log.info("=== Ireland Entry Requirements ===")
    
    # Resumability check
    target_file = OUTPUT_DIR / "ireland_requirements.json"
    if target_file.exists():
        log.info(f"   Ireland requirements already exist. Loading {target_file}...")
        with open(target_file, "r", encoding="utf-8") as f:
            # We only store requirements in the JSON, so we'll just re-scrape to get equiv as well.
            # It's a single fast request.
            pass

    url = "https://educationireland.net/entryreq/"
    soup = fetch(url)
    if not soup:
        return [], []

    tables = soup.find_all("table")
    results = []

    if tables:
        for row in tables[0].find_all("tr")[1:]:
            cols = row.find_all("td")
            if len(cols) >= 3:
                inst = clean(cols[0].get_text())
                if inst:
                    results.append({
                        "country": "Ireland",
                        "university": inst,
                        "ug_requirement_percentage": clean(cols[1].get_text()),
                        "pg_requirement_percentage": clean(cols[2].get_text()),
                        "ielts_general": "6.5 overall (most Irish universities)",
                        "post_study_work": "Graduate Programme: 2 years for Honours degree, 1 year for others",
                        "work_rights_during_study": "20 hrs/week term, 40 hrs June-Sep & Dec-Jan",
                        "source": url,
                        "scraped_at": SCRAPE_TIMESTAMP
                    })

        # Merge application fees
        if len(tables) >= 2:
            fee_map = {}
            for row in tables[1].find_all("tr")[1:]:
                cols = row.find_all("td")
                if len(cols) >= 2:
                    fee_map[clean(cols[0].get_text()).lower()] = clean(cols[1].get_text())
            for r in results:
                for key, val in fee_map.items():
                    if any(p in r["university"].lower() for p in key.split()):
                        r["application_fee"] = val
                        break

    # A-Level equivalency
    equiv = []
    if len(tables) >= 3:
        for row in tables[2].find_all("tr")[1:]:
            cols = row.find_all("td")
            if len(cols) >= 4:
                equiv.append({
                    "a_level_grade": clean(cols[0].get_text()),
                    "cao_points_ireland": clean(cols[1].get_text()),
                    "ucas_points_uk": clean(cols[2].get_text()),
                    "ib_equivalent": clean(cols[3].get_text()) if len(cols) > 3 else ""
                })

    log.info(f"  Ireland requirements: {len(results)} universities, {len(equiv)} A-Level equiv rows")
    return results, equiv


# ---------------------------------------------------------------------------
# SCRAPER 4: IRELAND SCHOLARSHIPS
# ---------------------------------------------------------------------------

def scrape_ireland_scholarships() -> list[dict]:
    log.info("=== Ireland Scholarships ===")
    
    target_file = OUTPUT_DIR / "ireland_scholarships.json"
    if target_file.exists():
        log.info(f"   Ireland scholarships already exist. Loading {target_file}...")
        with open(target_file, "r", encoding="utf-8") as f:
            return json.load(f)

    url = "https://educationireland.net/scholarships/"
    soup = fetch(url)
    if not soup:
        return []

    results = []
    content = soup.find("main") or soup.find("article") or soup

    for h2 in content.find_all("h2"):
        uni_name = clean(h2.get_text())
        if not uni_name or len(uni_name) < 3:
            continue
        if any(s in uni_name.lower() for s in ["scholarship", "ieo", "overview", "apply", "contact", "document"]):
            continue

        uni_scholarships = []
        official_link = apply_link = None
        sib = h2.find_next_sibling()

        while sib and sib.name != "h2":
            if sib.name == "h3":
                sub = clean(sib.get_text())
                ul = sib.find_next_sibling("ul")
                if ul:
                    for li in ul.find_all("li"):
                        t = clean(li.get_text())
                        if t:
                            amt = extract_money(t)
                            nm = re.match(r'^([^:]+):', t)
                            uni_scholarships.append({
                                "name": clean(nm.group(1)) if nm else t[:60],
                                "details": t, "amount": amt,
                                "category": sub,
                                "level": "Postgraduate" if any(w in t.lower() for w in ["master", "pg", "msc", "postgrad"]) else "All levels"
                            })
            elif sib.name == "ul":
                for li in sib.find_all("li"):
                    t = clean(li.get_text())
                    if t:
                        amt = extract_money(t)
                        nm = re.match(r'^([^:]+):', t)
                        uni_scholarships.append({
                            "name": clean(nm.group(1)) if nm else t[:60],
                            "details": t, "amount": amt, "category": None,
                            "level": "Postgraduate" if any(w in t.lower() for w in ["master", "pg", "msc", "postgrad"]) else "All levels"
                        })
            elif sib.name in ["p", "div"]:
                for a in sib.find_all("a", href=True):
                    lt = clean(a.get_text()).lower()
                    if "visit" in lt:
                        official_link = a["href"]
                    elif "apply" in lt:
                        apply_link = a["href"]
            sib = sib.find_next_sibling()

        if uni_scholarships:
            results.append({
                "country": "Ireland", "university": uni_name,
                "total_scholarships": len(uni_scholarships),
                "scholarships": uni_scholarships,
                "official_scholarship_page": official_link,
                "apply_link": apply_link,
                "source": url, "scraped_at": SCRAPE_TIMESTAMP
            })

    # Government scholarships
    results.append({
        "country": "Ireland", "university": "Government of Ireland (National)",
        "scholarships": [
            {
                "name": "Government of Ireland International Education Scholarship (GOI-IES)",
                "details": "60 scholarships/year. Full tuition waiver + €10,000 stipend. One year Masters or PhD.",
                "amount": "Full tuition + €10,000 stipend",
                "eligible_nationalities": "Non-EU/EEA — Indian students eligible",
                "level": "Masters and PhD",
                "application_window": "January – March 2026 (2026 deadline: 12 March)",
                "requirements": "Conditional/final offer from eligible Irish HEI",
                "official_link": "https://hea.ie/policy/internationalisation/goi-ies/"
            },
            {
                "name": "Ireland Fellows Programme",
                "details": "Fully funded fellowships for select developing countries for Masters in Ireland.",
                "amount": "Full funding",
                "eligible_nationalities": "Specific developing countries — check official list",
                "level": "Masters",
                "official_link": "https://www.irishaidfellows.gov.ie/"
            }
        ],
        "source": "hea.ie + irishaidfellows.gov.ie", "scraped_at": SCRAPE_TIMESTAMP
    })

    log.info(f"  Ireland scholarships: {len(results)} bodies")
    return results


# ---------------------------------------------------------------------------
# SCRAPER 5: IRELAND INDIVIDUAL UNIVERSITIES
# ---------------------------------------------------------------------------

IRELAND_UNI_CONFIGS = [
    {"name": "Trinity College Dublin (TCD)", "city": "Dublin",
     "pg_url": "https://www.tcd.ie/courses/postgraduate/",
     "ielts": "6.5 – 7.0 (varies by course)", "min_degree": "2:1 (60-65%+) — 3.3 GPA minimum",
     "tuition_range": "€15,750 – €25,000/year", "application_fee": "€55", "use_selenium": False},
    {"name": "University College Dublin (UCD)", "city": "Dublin",
     "pg_url": "https://www.ucd.ie/study/",
     "ielts": "6.5 overall (7.0 for some programmes)", "min_degree": "2:1 (65%+) — 3.3 GPA minimum",
     "tuition_range": "€16,000 – €24,000/year", "application_fee": "Free", "use_selenium": False},
    {"name": "Dublin City University (DCU)", "city": "Dublin",
     "pg_url": "https://www.dcu.ie/courses/postgraduate/index.shtml",
     "ielts": "6.5 overall, 6.0 per component", "min_degree": "2:1 (60%+) — 3.0 GPA minimum",
     "tuition_range": "€13,500 – €20,000/year", "application_fee": "Free", "use_selenium": False},
    {"name": "University of Limerick (UL)", "city": "Limerick",
     "pg_url": "https://www.ul.ie/gps/courses",
     "ielts": "6.5 overall", "min_degree": "2:1 (60%+) — 3.0 GPA minimum",
     "tuition_range": "€12,000 – €18,000/year", "application_fee": "€50", "use_selenium": False},
    {"name": "University College Cork (UCC)", "city": "Cork",
     "pg_url": "https://www.ucc.ie/en/study/postgrad/",
     "ielts": "6.5 overall", "min_degree": "2:1 (65%+) — 3.3 GPA minimum",
     "tuition_range": "€14,000 – €22,000/year", "application_fee": "€50", "use_selenium": False},
    {"name": "University of Galway (NUI Galway)", "city": "Galway",
     "pg_url": "https://www.universityofgalway.ie/courses/postgraduate-courses/",
     "ielts": "6.5 overall", "min_degree": "2:1 (60%+) — 3.0 GPA minimum",
     "tuition_range": "€12,000 – €19,000/year", "application_fee": "€35", "use_selenium": False},
    {"name": "Maynooth University", "city": "Maynooth/Dublin",
     "pg_url": "https://www.maynoothuniversity.ie/study-maynooth/postgraduate",
     "ielts": "6.5 overall", "min_degree": "2:1 (55-60%+) — 3.0 GPA minimum",
     "tuition_range": "€11,000 – €17,000/year", "application_fee": "€50", "use_selenium": False},
]


def scrape_ireland_courses() -> list[dict]:
    log.info("=== Ireland Courses ===")
    
    target_file = OUTPUT_DIR / "ireland_courses.json"
    if target_file.exists():
        log.info(f"   Ireland courses already exist. Loading {target_file}...")
        with open(target_file, "r", encoding="utf-8") as f:
            return json.load(f)

    results = []

    for cfg in IRELAND_UNI_CONFIGS:
        log.info(f"  {cfg['name']}")
        soup = fetch(cfg["pg_url"], use_selenium=cfg.get("use_selenium", False))

        base_record = {
            "country": "Ireland", "university": cfg["name"], "city": cfg["city"],
            "ielts_requirement": cfg["ielts"],
            "minimum_degree_requirement": cfg["min_degree"],
            "tuition_fee_range_per_year": cfg["tuition_range"],
            "application_fee": cfg["application_fee"],
            "post_study_work": "Graduate Programme: 2 years for Honours degree, 1 year for others",
            "work_rights_during_study": "20 hrs/week term, 40 hrs June-Sep & Dec-Jan",
            "scraped_at": SCRAPE_TIMESTAMP
        }

        if not soup:
            base_record["course_name"] = "All postgraduate programmes"
            base_record["course_url"] = cfg["pg_url"]
            results.append(base_record)
            continue

        links = soup.find_all("a", href=re.compile(r'(postgraduate|courses?|programme)/[a-z0-9\-]+', re.IGNORECASE))
        seen = set()
        found = 0

        for a in links[:40]:
            href = a.get("href", "")
            if not href or href in seen:
                continue
            seen.add(href)
            name = clean(a.get_text())
            if not (5 < len(name) < 100):
                continue
            r = dict(base_record)
            r["course_name"] = name
            r["course_url"] = urljoin(cfg["pg_url"], href)
            results.append(r)
            found += 1

        if found == 0:
            base_record["course_name"] = "All postgraduate programmes"
            base_record["course_url"] = cfg["pg_url"]
            results.append(base_record)

        log.info(f"    {cfg['name']}: {found} courses")

    return results


# ---------------------------------------------------------------------------
# SCRAPER 6: DUBAI UNIVERSITIES
# ---------------------------------------------------------------------------

def scrape_dubai() -> list[dict]:
    log.info("=== Dubai Universities ===")
    
    target_file = OUTPUT_DIR / "dubai_universities.json"
    if target_file.exists():
        log.info(f"   Dubai data already exists. Loading {target_file}...")
        with open(target_file, "r", encoding="utf-8") as f:
            return json.load(f)

    configs = [
        {
            "name": "Heriot-Watt University Dubai", "city": "Dubai", "country": "UAE",
            "location": "Dubai International Academic City (DIAC)",
            "url": "https://www.hw.ac.uk/dubai/study/postgraduate.htm",
            "ielts": "6.5 overall, 6.0 per component", "min_degree": "2:1 (60%+)",
            "tuition": "AED 60,000 – 90,000/year (~£13,000 – £20,000)",
            "subjects": "Engineering, Computer Science, Business, Architecture, Actuarial Science",
            "notes": "Scottish Russell Group equivalent. Degree same as UK Heriot-Watt."
        },
        {
            "name": "Middlesex University Dubai", "city": "Dubai", "country": "UAE",
            "location": "Dubai Knowledge Park (DKP)",
            "url": "https://www.mdx.ac.ae/study/postgraduate",
            "ielts": "6.0 overall", "min_degree": "2:2 (55%+)",
            "tuition": "AED 45,000 – 70,000/year (~£9,900 – £15,400)",
            "subjects": "Business, Law, Media, Psychology, IT, Design",
            "notes": "More accessible entry requirements. UK degree awarded."
        },
        {
            "name": "University of Birmingham Dubai", "city": "Dubai", "country": "UAE",
            "location": "Dubai International Academic City (DIAC)",
            "url": "https://www.birmingham.ac.uk/dubai",
            "ielts": "6.5 overall, 6.0 per component", "min_degree": "2:1 (60%+)",
            "tuition": "AED 78,000 – 95,000/year (~£17,200 – £20,900)",
            "subjects": "Computer Science, Engineering, Business, Finance, Law",
            "notes": "Full Russell Group university campus. Identical UK degree."
        },
        {
            "name": "University of Wollongong Dubai", "city": "Dubai", "country": "UAE",
            "location": "Dubai Knowledge Park (DKP)",
            "url": "https://www.uowdubai.ac.ae/postgraduate-courses",
            "ielts": "6.5 overall", "min_degree": "2:1 (60%+)",
            "tuition": "AED 55,000 – 75,000/year (~£12,100 – £16,500)",
            "subjects": "Business, IT, Engineering, Education, Health",
            "notes": "Australian university. Strong for MBA and Engineering."
        }
    ]

    results = []
    for cfg in configs:
        record = {
            "university": cfg["name"], "city": cfg["city"], "country": cfg["country"],
            "location_detail": cfg["location"],
            "ielts_requirement": cfg["ielts"],
            "minimum_degree_requirement": cfg["min_degree"],
            "tuition_fee_range_per_year": cfg["tuition"],
            "application_fee": "Free",
            "main_subjects": cfg["subjects"],
            "notable_points": cfg["notes"],
            "course_finder_url": cfg["url"],
            "visa_type": "UAE Student Visa — sponsored by university, no minimum bank balance",
            "work_rights_during_study": "20 hours/week on student visa",
            "post_study": "Switch to UAE work visa — employer sponsorship required",
            "tax": "No income tax in UAE",
            "scraped_at": SCRAPE_TIMESTAMP
        }

        soup = fetch(cfg["url"])
        if soup:
            text = soup.get_text()
            m = re.search(r'IELTS[^0-9]*([\d.]+)', text)
            if m:
                record["ielts_requirement"] = f"IELTS {m.group(1)} overall"
            course_links = []
            for a in soup.find_all("a", href=re.compile(r'(postgraduate|masters|course)', re.IGNORECASE))[:20]:
                n = clean(a.get_text())
                if 5 < len(n) < 80:
                    course_links.append({"name": n, "url": urljoin(cfg["url"], a["href"])})
            if course_links:
                record["courses_found"] = course_links

        results.append(record)

    return results


# ---------------------------------------------------------------------------
# UK SCHOLARSHIPS (curated — no scraping needed)
# ---------------------------------------------------------------------------

def get_uk_scholarships() -> list[dict]:
    return [
        {
            "country": "UK", "scholarship_name": "Chevening Scholarships",
            "type": "UK Government — Full funding",
            "description": "UK Government's flagship international scholarship. Covers all costs for a one-year Masters at any UK university.",
            "amount": "~£30,000 total",
            "covers": ["Full tuition", "Monthly living allowance", "Return economy flights", "UK visa fee", "Mandatory events travel"],
            "eligible_nationalities": "140+ countries including India, Pakistan, Bangladesh",
            "eligibility": ["2:1 degree equivalent", "2+ years work experience", "Unconditional UK university offer", "Return to home country for 2 years post-study"],
            "application_window": "August – November each year",
            "india_notes": "~50 awards/year for Indian students — India has the largest Chevening programme globally",
            "official_link": "https://www.chevening.org/scholarships/",
            "scraped_at": SCRAPE_TIMESTAMP
        },
        {
            "country": "UK", "scholarship_name": "GREAT Scholarships",
            "type": "British Council — Partial funding",
            "description": "Minimum £10,000 towards Masters tuition at selected UK universities. For students from 18 countries.",
            "amount": "£10,000 (tuition only — student covers living costs)",
            "covers": ["Partial/full tuition"],
            "eligible_nationalities": ["India", "Bangladesh", "China", "Egypt", "Ghana", "Kenya", "Indonesia", "Malaysia", "Mexico", "Nigeria", "Pakistan", "Thailand", "Turkey", "Vietnam"],
            "eligibility": ["Citizen of eligible country", "Meet university entry requirements"],
            "application_window": "March – June (varies by university)",
            "official_link": "https://study-uk.britishcouncil.org/scholarships-funding/great-scholarships",
            "scraped_at": SCRAPE_TIMESTAMP
        },
        {
            "country": "UK", "scholarship_name": "Commonwealth Masters Scholarships",
            "type": "UK Government — Full funding",
            "description": "For developing Commonwealth countries. Covers full tuition, living, airfare, and thesis grant.",
            "amount": "Full funding",
            "covers": ["Full tuition", "Living allowance", "Return flights", "Thesis grant", "Arrival allowance"],
            "eligible_nationalities": ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Other developing Commonwealth countries"],
            "eligibility": ["First class or 2:1 degree", "Citizen of developing Commonwealth country", "Not residing in UK"],
            "application_window": "October – December each year",
            "official_link": "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/",
            "scraped_at": SCRAPE_TIMESTAMP
        },
        {
            "country": "UK", "scholarship_name": "Gates Cambridge Scholarships",
            "type": "Private — Full funding",
            "description": "For exceptional students from any non-UK country for postgraduate study at University of Cambridge.",
            "amount": "Full funding — all costs covered",
            "covers": ["Full Cambridge fees", "Maintenance allowance", "Flights", "Family allowance (if applicable)"],
            "eligible_nationalities": "Any country outside UK",
            "eligibility": ["Outstanding academic record", "Apply to Cambridge course simultaneously", "Leadership potential"],
            "application_window": "September – October each year",
            "competition": "~80 awards globally per year — extremely competitive",
            "official_link": "https://www.gatescambridge.org/apply/",
            "scraped_at": SCRAPE_TIMESTAMP
        },
        {
            "country": "UK", "scholarship_name": "Scotland Saltire Scholarships",
            "type": "Scottish Government — Partial funding",
            "description": "£8,000 towards Masters tuition in Scotland. For citizens of Canada, China, India, Japan, Pakistan, USA.",
            "amount": "£8,000 (tuition only)",
            "eligible_nationalities": ["India", "China", "Canada", "Japan", "Pakistan", "USA"],
            "eligible_subjects": "Science, Technology, Creative Industries, Healthcare, Renewable Energy",
            "application_window": "February – March each year",
            "official_link": "https://www.scotland.org/study/saltire-scholarships",
            "scraped_at": SCRAPE_TIMESTAMP
        },
        {
            "country": "UK", "scholarship_name": "University of Edinburgh — India Scholarship",
            "type": "University — Partial funding",
            "description": "£5,000 towards tuition for gifted Indian international Masters students. Automatically considered — no separate application.",
            "amount": "£5,000",
            "eligible_nationalities": ["India"],
            "eligibility": ["Indian citizen", "On-campus PG Masters application", "Strong academic record"],
            "application_window": "Automatic with Masters application",
            "official_link": "https://study.ed.ac.uk/postgraduate/fees-funding/scholarships",
            "scraped_at": SCRAPE_TIMESTAMP
        },
        {
            "country": "UK", "scholarship_name": "University of Edinburgh — Women in STEM South Asia",
            "type": "University/British Council — Full funding",
            "description": "Fully funded scholarship for women from South Asia studying STEM Masters at University of Edinburgh.",
            "amount": "Full funding (tuition + living)",
            "eligible_nationalities": ["India", "Pakistan", "Sri Lanka", "Bangladesh", "Nepal"],
            "eligible_subjects": "STEM only",
            "eligibility": ["Female applicant", "Citizen of eligible South Asian country", "STEM Masters at Edinburgh"],
            "official_link": "https://study.ed.ac.uk/postgraduate/fees-funding/scholarships",
            "scraped_at": SCRAPE_TIMESTAMP
        }
    ]


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def run_all():
    log.info("=" * 70)
    log.info("FATEH EDUCATION — DEEP SCRAPER v2")
    log.info(f"Started: {SCRAPE_TIMESTAMP}")
    log.info("=" * 70)

    master = {
        "scraped_at": SCRAPE_TIMESTAMP,
        "summary": {},
        "living_costs": LIVING_COSTS,
        "visa_requirements": VISA_REQUIREMENTS,
        "uk_scholarships": [],
        "edinburgh_courses": [],
        "other_uk_courses": [],
        "ireland_requirements": [],
        "ireland_a_level_equivalency": [],
        "ireland_scholarships": [],
        "ireland_courses": [],
        "dubai_universities": [],
    }

    # UK Scholarships
    master["uk_scholarships"] = get_uk_scholarships()
    save(master["uk_scholarships"], "scholarships_uk.json")

    # Edinburgh
    try:
        master["edinburgh_courses"] = scrape_edinburgh()
        save(master["edinburgh_courses"], "courses_edinburgh.json")
    except Exception as e:
        log.error(f"Edinburgh failed: {e}")

    # Other UK
    try:
        master["other_uk_courses"] = scrape_other_uk()
        save(master["other_uk_courses"], "courses_other_uk.json")
    except Exception as e:
        log.error(f"Other UK failed: {e}")

    # Ireland requirements
    try:
        req, equiv = scrape_ireland_requirements()
        master["ireland_requirements"] = req
        master["ireland_a_level_equivalency"] = equiv
        save(req, "ireland_requirements.json")
    except Exception as e:
        log.error(f"Ireland requirements failed: {e}")

    # Ireland scholarships
    try:
        master["ireland_scholarships"] = scrape_ireland_scholarships()
        save(master["ireland_scholarships"], "ireland_scholarships.json")
    except Exception as e:
        log.error(f"Ireland scholarships failed: {e}")

    # Ireland courses
    try:
        master["ireland_courses"] = scrape_ireland_courses()
        save(master["ireland_courses"], "ireland_courses.json")
    except Exception as e:
        log.error(f"Ireland courses failed: {e}")

    # Dubai
    try:
        master["dubai_universities"] = scrape_dubai()
        save(master["dubai_universities"], "dubai_universities.json")
    except Exception as e:
        log.error(f"Dubai failed: {e}")

    # Static data files
    save(LIVING_COSTS, "living_costs.json")
    save(VISA_REQUIREMENTS, "visa_requirements.json")

    # Summary
    master["summary"] = {
        "edinburgh_courses": len(master["edinburgh_courses"]),
        "other_uk_universities": len(set(c.get("university") for c in master["other_uk_courses"])),
        "other_uk_course_records": len(master["other_uk_courses"]),
        "uk_scholarships": len(master["uk_scholarships"]),
        "ireland_universities_requirements": len(master["ireland_requirements"]),
        "ireland_scholarship_bodies": len(master["ireland_scholarships"]),
        "ireland_course_records": len(master["ireland_courses"]),
        "dubai_universities": len(master["dubai_universities"]),
        "cities_with_living_cost_data": len(LIVING_COSTS),
        "visa_types_documented": len(VISA_REQUIREMENTS),
    }

    save(master, "all_data.json")
    
    # Cleanup Selenium
    global _global_driver
    if _global_driver:
        try:
            _global_driver.quit()
            _global_driver = None
            log.info("  Selenium driver closed.")
        except:
            pass

    log.info("=" * 70)
    log.info("DONE — SUMMARY")
    for k, v in master["summary"].items():
        log.info(f"  {k}: {v}")
    log.info("Output: data/all_data.json")
    log.info("=" * 70)


if __name__ == "__main__":
    run_all()