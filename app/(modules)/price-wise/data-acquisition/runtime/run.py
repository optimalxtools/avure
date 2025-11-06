#!/usr/bin/env python3
"""
Price-Wise Run Script
Orchestrates the complete scrape + analysis workflow
"""
import sys
import asyncio
import json
from pathlib import Path
from datetime import datetime

# Force UTF-8 encoding for stdout/stderr to handle special characters
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

# Import the scraper and analyzer modules
import scrape
import analyze
import config


def log_execution(scrape_success: bool, analysis_success: bool):
    """Log execution to history file"""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "scrape_success": scrape_success,
        "analysis_success": analysis_success,
        "config": {
            "occupancy_mode": config.OCCUPANCY_MODE,
            "days_ahead": config.DAYS_AHEAD,
            "guests": config.GUESTS,
            "rooms": config.ROOMS,
            "reference_property": config.REFERENCE_PROPERTY,
            "timestamp": datetime.now().isoformat()
        }
    }
    
    # Read existing history
    history = []
    if config.LOG_FILE.exists():
        try:
            with open(config.LOG_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except:
            history = []
    
    # Append new entry
    history.append(entry)
    
    # Keep only last 20 entries
    history = history[-20:]
    
    # Write back
    with open(config.LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2, ensure_ascii=False)


async def main():
    """Main orchestration function"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting Price-Wise scraper...")
    print(f"Mode: {config.get_mode_name()}")
    print(f"Days ahead: {config.DAYS_AHEAD}")
    print(f"Reference property: {config.REFERENCE_PROPERTY}")
    print("-" * 60)
    
    scrape_success = False
    analysis_success = False
    scraping_actually_done = False
    
    try:
        # Step 1: Run the scraper
        print("\n[STEP 1] Running scraper...")
        
        # Check if scraping was already done today
        progress = scrape.load_daily_progress()
        today = scrape.get_today_str()
        
        # Load hotels to determine if work is needed
        hotels = []
        if config.HOTELS_FILE.exists():
            with open(config.HOTELS_FILE, 'r') as f:
                hotels = json.load(f)
        
        # Check if already completed today
        if progress.get("date") == today and len(progress.get("completed_properties", [])) >= len(hotels):
            print("All properties already scraped today - skipping scrape step")
            scraping_actually_done = False
            scrape_success = True  # Not an error, just already done
        else:
            # Actually run the scraper
            await scrape.main()
            scraping_actually_done = True
            scrape_success = True
            print("OK: Scraping completed successfully")
        
        # Step 2: Run the analysis (always run to ensure latest analysis)
        print("\n[STEP 2] Running analysis...")
        analyze.main()
        analysis_success = True
        print("OK: Analysis completed successfully")
        
        print("\n" + "=" * 60)
        print("Price-Wise workflow completed successfully!")
        print("=" * 60)
        
        # Only log if actual scraping was done
        if scraping_actually_done:
            log_execution(scrape_success, analysis_success)
        
        return 0
        
    except Exception as e:
        print(f"\nERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        
        # Only log if scraping was attempted
        if scraping_actually_done:
            log_execution(scrape_success, analysis_success)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
