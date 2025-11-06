#!/usr/bin/env python3
"""Test if context-level stealth extracts room data"""
import asyncio
import re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from fake_useragent import UserAgent

async def test_context_stealth():
    # Test Nov 15 which shows as available in the screenshot
    url = "https://www.booking.com/hotel/za/moditlo-river-lodge.en-gb.html?checkin=2025-11-15&checkout=2025-11-16&group_adults=2&group_children=0&no_rooms=1"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox'
            ]
        )
        
        # Create context with stealth
        stealth_config = Stealth()
        context = await browser.new_context(
            user_agent=UserAgent().random,
            locale="en-GB",
            viewport={'width': 1920, 'height': 1080}
        )
        
        # Apply all stealth scripts to context
        for script in stealth_config.enabled_scripts:
            await context.add_init_script(script)
        
        page = await context.new_page()
        
        print("Loading Nov 15-16 (1 night, should be available)...")
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        
        html = await page.content()
        
        # Check for room data
        if 'b_rooms_available_and_soldout' in html:
            idx = html.index('b_rooms_available_and_soldout')
            snippet = html[idx:idx+300]
            
            # Check if array has content
            pattern = r'b_rooms_available_and_soldout:\s*\[([^\]]{50,})'
            match = re.search(pattern, html)
            if match:
                print("\n✓✓✓ SUCCESS! Room data extracted in HEADLESS mode!")
                content = match.group(1)[:500]
                print(f"Data preview: {content}...")
                
                # Try to count rooms
                room_count = content.count('"b_id"')
                print(f"\nFound approximately {room_count} room types")
            else:
                print("\n✗ Empty array - no room data")
                print(f"Context: {snippet}")
        else:
            print("✗ b_rooms_available_and_soldout not found")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_context_stealth())
