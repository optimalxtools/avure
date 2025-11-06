import { NextResponse } from "next/server"

import { getScraperConfig, updateScraperConfig } from "@/lib/price-wise/scraper"
import type { PriceWiseConfig } from "@/lib/price-wise/types"

export async function GET() {
  try {
    const config = await getScraperConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Failed to load Price Wise config", error)
    return NextResponse.json({ error: "Unable to load configuration" }, { status: 500 })
  }
}

function coerceArray(value: unknown): number[] | undefined {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry))
  }
  if (typeof value === "string") {
    const chunks = value
      .split(/[,\s]+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
    return chunks.map((chunk) => Number(chunk)).filter((entry) => Number.isFinite(entry))
  }
  return undefined
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<PriceWiseConfig>
    const payload: Partial<PriceWiseConfig> = {}

    if (typeof body.occupancyMode === "boolean") payload.occupancyMode = body.occupancyMode
    if (typeof body.daysAhead === "number") payload.daysAhead = body.daysAhead
    if (typeof body.occupancyCheckInterval === "number") payload.occupancyCheckInterval = body.occupancyCheckInterval

    const offsets = coerceArray(body.checkInOffsets)
    if (offsets) payload.checkInOffsets = offsets

    const durations = coerceArray(body.stayDurations)
    if (durations) payload.stayDurations = durations

    if (typeof body.guests === "number") payload.guests = body.guests
    if (typeof body.rooms === "number") payload.rooms = body.rooms
    if (typeof body.referenceProperty === "string") payload.referenceProperty = body.referenceProperty
    if (typeof body.headless === "boolean") payload.headless = body.headless
    if (typeof body.browserTimeout === "number") payload.browserTimeout = body.browserTimeout
    if (typeof body.enableArchiving === "boolean") payload.enableArchiving = body.enableArchiving
    if (typeof body.maxArchiveFiles === "number") payload.maxArchiveFiles = body.maxArchiveFiles
    if (typeof body.showProgress === "boolean") payload.showProgress = body.showProgress
    if (typeof body.progressInterval === "number") payload.progressInterval = body.progressInterval

    await updateScraperConfig(payload)
    const config = await getScraperConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Failed to update Price Wise config", error)
    return NextResponse.json({ error: "Unable to update configuration" }, { status: 500 })
  }
}
