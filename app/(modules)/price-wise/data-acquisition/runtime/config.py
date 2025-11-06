"""
Configuration settings for Booking.com pricing scraper.
Adjust these settings to customize scraping behavior.
"""
from datetime import datetime
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════
# SCRAPING MODE
# ═══════════════════════════════════════════════════════════════════════════

# Set to True for occupancy tracking (check every day for availability)
# Set to False for pricing analysis (check specific date combinations)
OCCUPANCY_MODE = True

# ═══════════════════════════════════════════════════════════════════════════
# DATE RANGE SETTINGS
# ═══════════════════════════════════════════════════════════════════════════

# How many days ahead to check
DAYS_AHEAD = 90

# OCCUPANCY MODE settings
OCCUPANCY_CHECK_INTERVAL = 1  # Check every N days (1 = every day, 2 = every other day)
OCCUPANCY_STAY_DURATION = 2  # Number of nights for each stay

# PRICING MODE settings
CHECK_IN_OFFSETS = [0, 7, 14, 21, 30, 60, 90]  # Days ahead for check-in
STAY_DURATIONS = [2, 3, 7]  # Night durations to test

# ═══════════════════════════════════════════════════════════════════════════
# BOOKING PARAMETERS
# ═══════════════════════════════════════════════════════════════════════════

GUESTS = 2  # Number of guests
ROOMS = 1   # Number of rooms

# ═══════════════════════════════════════════════════════════════════════════
# REFERENCE PROPERTY
# ═══════════════════════════════════════════════════════════════════════════

REFERENCE_PROPERTY = "Ukanyi Luxury Villa"  # Property for comparison

# ═══════════════════════════════════════════════════════════════════════════
# FILE PATHS
# ═══════════════════════════════════════════════════════════════════════════

BASE_DIR = Path(__file__).parent  # runtime/
PARENT_DIR = BASE_DIR.parent       # data-acquisition/

# Input files
HOTELS_FILE = BASE_DIR / "config" / "urls.json"

# Output files
OUTPUT_DIR = PARENT_DIR / "outputs"
ARCHIVE_DIR = PARENT_DIR / "archive"

PRICING_CSV = OUTPUT_DIR / "pricing_data.csv"
ANALYSIS_JSON = OUTPUT_DIR / "pricing_analysis.json"

# Logs
LOG_FILE = OUTPUT_DIR / "scrape_log.json"
DAILY_PROGRESS_FILE = OUTPUT_DIR / "daily_progress.json"

# ═══════════════════════════════════════════════════════════════════════════
# SCRAPING BEHAVIOR
# ═══════════════════════════════════════════════════════════════════════════

# Delay between requests (seconds) - be respectful to servers
REQUEST_DELAY = 0.5 if OCCUPANCY_MODE else 1.0

# Browser settings
# HEADLESS mode: 
# - True = No browser windows (works on servers). Fresh browser context created per request to bypass detection.
# - False = Browser windows visible (for debugging/local use)
# NOTE: Scraper creates a new browser instance for EACH date check to avoid Booking.com's automation detection.
# This is slower but allows headless mode to work reliably for room data extraction.
HEADLESS = False  # MUST be False - Booking.com detects ALL headless browsers and blocks room data
BROWSER_TIMEOUT = 30000  # 30 seconds

# ═══════════════════════════════════════════════════════════════════════════
# ARCHIVING
# ═══════════════════════════════════════════════════════════════════════════

ENABLE_ARCHIVING = True  # Archive old data before new scrape
MAX_ARCHIVE_FILES = 30   # Keep last N archive files

# ═══════════════════════════════════════════════════════════════════════════
# DISPLAY SETTINGS
# ═══════════════════════════════════════════════════════════════════════════

# Progress updates
SHOW_PROGRESS = True
PROGRESS_INTERVAL = 10  # Show progress every N days in occupancy mode

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def ensure_directories():
    """Create necessary directories if they don't exist."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    ARCHIVE_DIR.mkdir(exist_ok=True)


def get_mode_name():
    """Get human-readable mode name."""
    return "OCCUPANCY TRACKING" if OCCUPANCY_MODE else "PRICING ANALYSIS"


def get_scrape_info():
    """Get dictionary of current scraping configuration."""
    return {
        "mode": get_mode_name(),
        "occupancy_mode": OCCUPANCY_MODE,
        "days_ahead": DAYS_AHEAD,
        "guests": GUESTS,
        "rooms": ROOMS,
        "reference_property": REFERENCE_PROPERTY,
        "timestamp": datetime.now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════
# QUICK CONFIGURATION PRESETS
# ═══════════════════════════════════════════════════════════════════════════

def use_occupancy_mode():
    """Quick preset for occupancy tracking."""
    global OCCUPANCY_MODE
    OCCUPANCY_MODE = True


def use_pricing_mode():
    """Quick preset for pricing analysis."""
    global OCCUPANCY_MODE
    OCCUPANCY_MODE = False


def set_fast_mode():
    """Quick preset for faster scraping (less data)."""
    global DAYS_AHEAD, OCCUPANCY_CHECK_INTERVAL, CHECK_IN_OFFSETS
    DAYS_AHEAD = 30
    OCCUPANCY_CHECK_INTERVAL = 2
    CHECK_IN_OFFSETS = [0, 7, 14, 30]