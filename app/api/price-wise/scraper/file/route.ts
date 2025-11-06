import { NextRequest, NextResponse } from "next/server"

import { getScraperFile } from "@/lib/price-wise/scraper"

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target")
  if (!target) {
    return NextResponse.json({ error: "Missing target" }, { status: 400 })
  }

  try {
    const file = await getScraperFile(target)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const arrayBuffer = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength,
    ) as ArrayBuffer
    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Failed to read Price Wise file", error)
    return NextResponse.json({ error: "Unable to read file" }, { status: 500 })
  }
}
