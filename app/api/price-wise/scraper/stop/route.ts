import { NextResponse } from "next/server"

import { stopScraperRun } from "@/lib/price-wise/scraper"

export async function POST() {
  try {
    await stopScraperRun()
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to stop scraper"
    console.error("Failed to stop Price Wise scraper", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
