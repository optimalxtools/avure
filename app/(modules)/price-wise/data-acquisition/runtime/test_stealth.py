#!/usr/bin/env python3
"""Test playwright-stealth with Booking.com"""
import asyncio
import re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

async def test_stealth():
    url = "https://www.booking.com/hotel/za/moditlo-river-lodge.en-gb.html?checkin=2025-12-15&checkout=2025-12-18&group_adults=2&group_children=0&no_rooms=1"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            locale='en-GB'
        )
        page = await context.new_page()
        
        # Apply stealth
        stealth_config = Stealth()
        await stealth_config.apply_stealth_async(page)
        
        print("Loading page with playwright-stealth...")
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        
        html = await page.content()
        
        # Check for room data
        if 'b_rooms_available_and_soldout' in html:
            idx = html.index('b_rooms_available_and_soldout')
            snippet = html[idx:idx+400]
            print("\nFound b_rooms_available_and_soldout:")
            print(snippet)
            
            # Check if array has content
            pattern = r'b_rooms_available_and_soldout:\s*\[([^\]]{50,})'
            match = re.search(pattern, html)
            if match:
                print("\n✓✓✓ SUCCESS! Room data is populated!")
                print(f"Data preview: {match.group(1)[:200]}...")
            else:
                print("\n✗ Still empty array []")
        else:
            print("✗ b_rooms_available_and_soldout not found")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_stealth())
