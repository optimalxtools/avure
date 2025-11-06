import { NextResponse } from "next/server"

import { startScraperRun } from "@/lib/price-wise/scraper"

export async function POST() {
  try {
    const { runId } = await startScraperRun()
    return NextResponse.json({ runId }, { status: 202 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start scraper"
    const status = message.includes("already running") ? 409 : 500
    if (status !== 409) {
      console.error("Failed to start Price Wise scraper", error)
    }
    return NextResponse.json({ error: message }, { status })
  }
}
