# Price-Wise Data Acquisition Runtime

This directory contains the operational Python scripts for the Price-Wise competitive intelligence system.

## Directory Structure

```
data-acquisition/
├── runtime/           # Python execution scripts
│   ├── analyze.py          # Pricing analysis & report generation
│   ├── config.py           # Scraper configuration settings
│   ├── config_manager.py   # CLI tool to read/update config
│   ├── quick_view.py       # CLI summaries for occupancy & pricing
│   ├── run.py              # Orchestrates scrape + analysis workflow
│   ├── scrape.py           # Booking.com data scraper
│   └── config/
│       └── urls.json       # Target properties list
├── outputs/           # Generated data files (CSV, JSON, logs)
│   ├── pricing_data.csv       # Raw pricing data
│   ├── pricing_summary.csv    # Comparison summary
│   ├── pricing_analysis.json  # Analysis + markdown report
│   ├── scrape_log.json        # Scraping execution log
│   └── daily_progress.json    # Daily tracking data
└── archive/           # Historical data snapshots
```

## Data Extraction Method

### JSON Extraction from Booking.com

The scraper uses a hybrid approach for extracting room data from Booking.com:

**Primary Method: JSON Extraction**
- Extracts the `b_rooms_available_and_soldout` JavaScript object embedded in page HTML
- This object contains ALL room data in structured JSON format
- Present in initial HTML payload (no need to wait for JS execution)
- More reliable and faster than DOM scraping

**Fallback Method: DOM Scraping**
- Used when JSON is empty (sold-out dates) or unavailable
- Parses HTML room tables to extract room names and availability
- Ensures room names are captured even for sold-out dates

**Data Structure:**
```javascript
{
  "b_id": 70236502,
  "b_name": "Luxury Twin Room including two game drives per day",
  "b_blocks": [
    {
      "b_raw_price": "34668.00",
      "b_price": "ZAR 34,668",
      "b_max_persons": 2,
      "b_mealplan_included_name": "full_board",
      "b_cancellation_type": "non_refundable"
    }
  ]
}
```

**Extraction Pattern:**
```python
r'b_rooms_available_and_soldout:\s*(\[.*?\]),\s*\n\s*b_cheapest_price'
```

**Advantages:**
- ✓ More reliable - uses Booking.com's own data structure
- ✓ Faster - no complex JavaScript execution waiting
- ✓ Comprehensive - captures all rate plans including sold-out rooms
- ✓ Consistent - same structure across all properties
- ✓ WAF-resistant - minimal interaction required

## Integration

Scripts are invoked via the Next.js TypeScript bridge at `lib/price-wise/scraper.ts` which spawns Python processes and manages data flow.

## Output Files

- **pricing_data.csv** - Raw scraped pricing and availability data
- **pricing_summary.csv** - Competitive comparison metrics
- **pricing_analysis.json** - Complete analysis including:
  - Pricing metrics by property
  - Occupancy rates
  - Competitive comparisons
  - **Markdown report** (embedded in `report_markdown` field)

The markdown report is generated during analysis and embedded in the JSON file, eliminating the need for a separate reports directory.

## Configuration

Edit `runtime/config.py` to adjust:
- Scraping mode (occupancy vs pricing analysis)
- Date ranges and check-in offsets
- Number of guests/rooms
- Reference property for comparisons

Use `config_manager.py` for programmatic configuration updates:
```bash
python runtime/config_manager.py --mode occupancy
python runtime/config_manager.py --days-ahead 120
```