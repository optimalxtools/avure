#!/usr/bin/env python3
"""Test if Booking.com still has b_rooms_available_and_soldout JSON"""
import asyncio
import re
from playwright.async_api import async_playwright

async def test_page_structure():
    # Test with Moditlo for a future date that's likely available
    url = "https://www.booking.com/hotel/za/moditlo-river-lodge.en-gb.html?checkin=2026-03-15&checkout=2026-03-17&group_adults=2&group_children=0&no_rooms=1"
    
    print("=" * 60)
    print("TEST 1: HEADLESS = True")
    print("=" * 60)
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context()
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)
        page = await context.new_page()
        
        print("Loading page (headless)...")
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        
        html = await page.content()
        
        pattern = r'b_rooms_available_and_soldout:\s*\[(.*?)\],'
        match = re.search(pattern, html)
        if match:
            content = match.group(1).strip()
            if content:
                print(f"✓ Headless: Found room data - {len(content)} chars")
            else:
                print("✗ Headless: Empty array []")
        else:
            print("✗ Headless: Pattern not found")
        
        await browser.close()
    
    print("\n" + "=" * 60)
    print("TEST 2: HEADLESS = False")
    print("=" * 60)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("Loading page (visible browser)...")
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        
        html = await page.content()
        
        # Save HTML for inspection
        with open('test_page_visible.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"Saved HTML ({len(html)} chars) to test_page_visible.html")
        
        # Check if JSON exists
        if 'b_rooms_available_and_soldout' in html:
            print("✓ Found 'b_rooms_available_and_soldout' in HTML")
            # Find it and show context
            idx = html.index('b_rooms_available_and_soldout')
            snippet = html[idx:idx+300]
            print(f"Context: {snippet}")
        else:
            print("✗ 'b_rooms_available_and_soldout' NOT in HTML")
            print("\nChecking for room-related content...")
            if 'hprt-table' in html:
                print("✓ Found 'hprt-table' (room table)")
            if 'roomName' in html or 'room_name' in html:
                print("✓ Found room name references")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_page_structure())
