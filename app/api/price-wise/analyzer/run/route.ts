import { NextResponse } from "next/server"

import { runAnalyzer } from "@/lib/price-wise/scraper"

export async function POST() {
  try {
    await runAnalyzer()
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run analyzer"
    console.error("Failed to run Price Wise analyzer", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
