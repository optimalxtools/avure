import { NextResponse } from "next/server"

import { isAnalysisOutdated, getScraperAnalysis } from "@/lib/price-wise/scraper"

export async function GET() {
  try {
    const [outdated, analysis] = await Promise.all([
      isAnalysisOutdated(),
      getScraperAnalysis(),
    ])

    return NextResponse.json({
      outdated,
      lastUpdated: analysis?.generated_at || null,
    })
  } catch (error) {
    console.error("Failed to check analysis status", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
