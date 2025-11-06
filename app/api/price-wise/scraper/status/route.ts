import { NextResponse } from "next/server"

import { getScraperStatus } from "@/lib/price-wise/scraper"

export async function GET() {
  try {
    const status = await getScraperStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error("Failed to load Price Wise scraper status", error)
    return NextResponse.json({ error: "Unable to load scraper status" }, { status: 500 })
  }
}
