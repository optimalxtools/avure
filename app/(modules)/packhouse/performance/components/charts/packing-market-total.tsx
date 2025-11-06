"use client"

import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"

const COLOR_PALETTE = [
  "hsl(var(--chart-1))",      // Original: 12 76% 61%
  "hsl(var(--chart-2))",      // Original: 173 58% 39%
  "hsl(var(--chart-3))",      // Original: 197 37% 24%
  "hsl(var(--chart-4))",      // Original: 43 74% 66%
  "hsl(var(--chart-5))",      // Original: 27 87% 67%
  "hsl(220, 70%, 50%)",       // Chart-6 (dark mode chart-1)
  // Lighter variations
  "hsl(12, 76%, 71%)",        // Lighter chart-1
  "hsl(173, 58%, 49%)",       // Lighter chart-2
  "hsl(197, 37%, 34%)",       // Lighter chart-3
  "hsl(43, 74%, 76%)",        // Lighter chart-4
  "hsl(27, 87%, 77%)",        // Lighter chart-5
  "hsl(220, 70%, 60%)",       // Lighter blue
  // Darker/desaturated variations
  "hsl(12, 66%, 51%)",        // Darker chart-1
  "hsl(173, 48%, 29%)",       // Darker chart-2
  "hsl(43, 64%, 56%)",        // Darker chart-4
  "hsl(27, 77%, 57%)",        // Darker chart-5
]

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

function toMarketKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

type BubbleData = {
  market: string
  marketKey: string
  value: number
  color: string
  x: number
  y: number
  radius: number
}

type ComponentProps = {
  selectionLabel?: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  showPrevSeason: boolean
}

// Improved circle packing algorithm with no overlaps
function packCircles(
  data: Array<{ market: string; marketKey: string; value: number; color: string }>,
  width: number,
  height: number,
): BubbleData[] {
  if (data.length === 0) return []

  const padding = 6
  const totalValue = data.reduce((acc, item) => acc + Math.max(item.value, 0), 0)
  const targetArea = width * height * 0.45 // Aim to occupy ~45% of the available area
  const scale = totalValue > 0 ? Math.sqrt(targetArea / (Math.PI * totalValue)) : 0
  const baseMinRadius = Math.min(width, height) / 18

  // Calculate radii based on proportional area
  const bubbles = data.map((item) => {
    const baseRadius = scale > 0 ? Math.sqrt(Math.max(item.value, 0)) * scale : 0
    const radius = Math.max(baseMinRadius, baseRadius)
    return {
      ...item,
      radius,
      x: 0,
      y: 0,
    }
  })
  
  // Sort by radius (largest first) for better packing
  bubbles.sort((a, b) => b.radius - a.radius)
  
  const centerX = width / 2
  const centerY = height / 2
  
  // Place first bubble at center
  if (bubbles.length > 0) {
    bubbles[0].x = centerX
    bubbles[0].y = centerY
  }
  
  // Place remaining bubbles using a more robust algorithm
  for (let i = 1; i < bubbles.length; i++) {
    const bubble = bubbles[i]
    let placed = false
    let bestPosition = { x: centerX, y: centerY, distance: Infinity }
    
    // For each already placed bubble, try to place this one next to it
    for (let j = 0; j < i; j++) {
      const other = bubbles[j]
      const minDist = bubble.radius + other.radius + padding
      
      // Try multiple angles around the other bubble
      for (let angle = 0; angle < 360; angle += 10) {
        const rad = (angle * Math.PI) / 180
        const testX = other.x + Math.cos(rad) * minDist
        const testY = other.y + Math.sin(rad) * minDist
        
        // Check if position is within bounds
        if (
          testX - bubble.radius < padding ||
          testX + bubble.radius > width - padding ||
          testY - bubble.radius < padding ||
          testY + bubble.radius > height - padding
        ) {
          continue
        }
        
        // Check for collisions with all other bubbles
        let hasCollision = false
        for (let k = 0; k < i; k++) {
          const checkBubble = bubbles[k]
          const dx = testX - checkBubble.x
          const dy = testY - checkBubble.y
          const dist = Math.hypot(dx, dy)
          const requiredDist = bubble.radius + checkBubble.radius + padding
          
          if (dist < requiredDist) {
            hasCollision = true
            break
          }
        }
        
        // If no collision, check if this is closest to center
        if (!hasCollision) {
          const distToCenter = Math.hypot(testX - centerX, testY - centerY)
          if (distToCenter < bestPosition.distance) {
            bestPosition = { x: testX, y: testY, distance: distToCenter }
            placed = true
          }
        }
      }
    }
    
    // Use best position found
    if (placed) {
      bubble.x = bestPosition.x
      bubble.y = bestPosition.y
    } else {
      // Fallback: try to fit somewhere using spiral pattern
      let spiralPlaced = false
      const maxRadius = Math.max(width, height)
      for (let radius = baseMinRadius; radius < maxRadius && !spiralPlaced; radius += baseMinRadius / 2) {
        for (let angle = 0; angle < 360 && !spiralPlaced; angle += 10) {
          const rad = (angle * Math.PI) / 180
          const testX = centerX + Math.cos(rad) * radius
          const testY = centerY + Math.sin(rad) * radius
          
          // Check bounds
          if (
            testX - bubble.radius < padding ||
            testX + bubble.radius > width - padding ||
            testY - bubble.radius < padding ||
            testY + bubble.radius > height - padding
          ) {
            continue
          }
          
          // Check collisions
          let hasCollision = false
          for (let k = 0; k < i; k++) {
            const checkBubble = bubbles[k]
            const dx = testX - checkBubble.x
            const dy = testY - checkBubble.y
            const dist = Math.hypot(dx, dy)
            const requiredDist = bubble.radius + checkBubble.radius + padding
            
            if (dist < requiredDist) {
              hasCollision = true
              break
            }
          }
          
          if (!hasCollision) {
            bubble.x = testX
            bubble.y = testY
            spiralPlaced = true
          }
        }
      }
      
      // Last resort: place at center (shouldn't happen with reasonable data)
      if (!spiralPlaced) {
        bubble.x = centerX
        bubble.y = centerY
      }
    }
  }
  
  // Light relaxation to improve layout (fewer iterations since placement is already good)
  for (let iteration = 0; iteration < 25; iteration++) {
    bubbles.forEach((bubble, i) => {
  const forceX = (centerX - bubble.x) * 0.01 // Gentle pull to center
  const forceY = (centerY - bubble.y) * 0.01
      
      // Apply forces only if no collision would occur
      const newX = bubble.x + forceX
      const newY = bubble.y + forceY
      
      // Check if new position causes collision
      let wouldCollide = false
      for (let j = 0; j < bubbles.length; j++) {
        if (i === j) continue
        const other = bubbles[j]
  const dx = newX - other.x
  const dy = newY - other.y
  const dist = Math.hypot(dx, dy)
        const minDist = bubble.radius + other.radius + padding
        
        if (dist < minDist) {
          wouldCollide = true
          break
        }
      }
      
      // Apply movement only if safe
      if (!wouldCollide &&
          newX - bubble.radius >= padding &&
          newX + bubble.radius <= width - padding &&
          newY - bubble.radius >= padding &&
          newY + bubble.radius <= height - padding) {
        bubble.x = newX
        bubble.y = newY
      }
    })
  }
  
  return bubbles
}

export function PackingMarketSecondaryChart({ selectionLabel, records, previousRecords, showPrevSeason }: ComponentProps) {
  const [marketConfig, setMarketConfig] = React.useState<string[]>([])
  const [hoveredBubble, setHoveredBubble] = React.useState<string | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState({ width: 400, height: 400 })

  React.useEffect(() => {
    fetch("/data/bj-vorster-edms-bpk/packhouse/packhouse-markets.json")
      .then((res) => res.json())
      .then((data: { markets: string[] }) => {
        setMarketConfig(data.markets || [])
      })
      .catch((err) => {
        console.error("Failed to load market config:", err)
        setMarketConfig([])
      })
  }, [])

  React.useEffect(() => {
    if (!containerRef.current) return
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        setDimensions({ width: width || 400, height: height || 400 })
      }
    })
    
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const chartData = React.useMemo(() => {
    if (!records || records.length === 0 || marketConfig.length === 0) {
      return []
    }

    const marketTotals: Record<string, { current: number; previous: number; name: string }> = {}
    // Calculate current season totals by aggregating all market values across all records
    records.forEach(record => {
      if (record.packingProgress && Array.isArray(record.packingProgress)) {
        record.packingProgress.forEach(entry => {
          const normalizedKey = toMarketKey(entry.key)
          const name = entry.label || entry.key
          if (!normalizedKey || normalizedKey === "unassigned") return
          
          // Check if this normalized key matches any configured market
          const matchedMarket = marketConfig.find(m => toMarketKey(m) === normalizedKey)
          if (!matchedMarket) return
          
          if (!marketTotals[normalizedKey]) {
            marketTotals[normalizedKey] = { current: 0, previous: 0, name: name.toUpperCase() }
          }
          marketTotals[normalizedKey].current += entry.value || 0
        })
      }
    })



    // Calculate previous season totals if needed
    if (showPrevSeason && previousRecords && Array.isArray(previousRecords) && previousRecords.length > 0) {
      previousRecords.forEach(record => {
        if (record.packingProgress && Array.isArray(record.packingProgress)) {
          record.packingProgress.forEach(entry => {
            const normalizedKey = toMarketKey(entry.key)
            const name = entry.label || entry.key
            if (!normalizedKey || normalizedKey === "unassigned") return
            
            const matchedMarket = marketConfig.find(m => toMarketKey(m) === normalizedKey)
            if (!matchedMarket) return
            
            if (!marketTotals[normalizedKey]) {
              marketTotals[normalizedKey] = { current: 0, previous: 0, name: name.toUpperCase() }
            }
            marketTotals[normalizedKey].previous += entry.value || 0
          })
        }
      })
    }

    // Filter by configured markets
    const filtered = Object.entries(marketTotals).filter(([key]) => {
      return marketConfig.some(m => toMarketKey(m) === key)
    })

    // Sort by market order from config
    const sorted = filtered.sort((a, b) => {
      const indexA = marketConfig.findIndex(m => toMarketKey(m) === a[0])
      const indexB = marketConfig.findIndex(m => toMarketKey(m) === b[0])
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })

    return sorted.map(([key, values], index) => ({
      market: values.name.toUpperCase(),
      marketKey: key,
      value: values.current,
      previous: showPrevSeason ? values.previous : undefined,
      color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    }))
  }, [records, previousRecords, showPrevSeason, marketConfig])

  const bubbleData = React.useMemo(() => {
    const dataWithValues = chartData.filter(d => d.value > 0)
    return packCircles(dataWithValues, dimensions.width, dimensions.height)
  }, [chartData, dimensions])

  const hasPreviousData = showPrevSeason && chartData.some(d => d.previous && d.previous > 0)

  if (marketConfig.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Market</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0 || bubbleData.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Market</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-2xl sm:text-lg text-left">Packing Market</CardTitle>
        <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2" ref={containerRef}>
        <div className="relative w-full h-full min-h-[300px]">
          <svg width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
            {bubbleData.map((bubble) => {
              const isHovered = hoveredBubble === bubble.marketKey
              return (
                <g key={bubble.marketKey}>
                  <circle
                    cx={bubble.x}
                    cy={bubble.y}
                    r={bubble.radius}
                    fill={bubble.color}
                    opacity={isHovered ? 0.6 : 0.9}
                    stroke={isHovered ? "hsl(var(--foreground))" : bubble.color}
                    strokeWidth={isHovered ? 2 : 0}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={() => setHoveredBubble(bubble.marketKey)}
                    onMouseLeave={() => setHoveredBubble(null)}
                  />
                  {bubble.radius > 25 && (
                    <>
                      <text
                        x={bubble.x}
                        y={bubble.y - 5}
                        textAnchor="middle"
                        fill="hsl(var(--background))"
                        fontSize={Math.min(14, bubble.radius / 3)}
                        fontWeight="600"
                        pointerEvents="none"
                      >
                        {bubble.market}
                      </text>
                      <text
                        x={bubble.x}
                        y={bubble.y + 10}
                        textAnchor="middle"
                        fill="hsl(var(--background))"
                        fontSize={Math.min(12, bubble.radius / 4)}
                        fontWeight="400"
                        pointerEvents="none"
                      >
                        {NUMBER_FORMATTER.format(bubble.value)}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>
          
          {/* Tooltip */}
          {hoveredBubble && (() => {
            const bubble = bubbleData.find(b => b.marketKey === hoveredBubble)
            const data = chartData.find(d => d.marketKey === hoveredBubble)
            if (!bubble || !data) return null
            
            return (
              <div
                className="absolute pointer-events-none rounded-lg border bg-background p-3 shadow-lg"
                style={{
                  left: `${(bubble.x / dimensions.width) * 100}%`,
                  top: `${(bubble.y / dimensions.height) * 100}%`,
                  transform: 'translate(-50%, -120%)',
                  zIndex: 50,
                }}
              >
                <div className="grid gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                      Market
                    </span>
                    <span className="font-bold text-muted-foreground">{data.market}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                      Current
                    </span>
                    <span className="font-bold">{NUMBER_FORMATTER.format(data.value)}</span>
                  </div>
                  {hasPreviousData && data.previous !== undefined && data.previous > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Previous
                      </span>
                      <span className="font-bold">{NUMBER_FORMATTER.format(data.previous)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </CardContent>
    </Card>
  )
}

export { PackingMarketSecondaryChart as Component }
// Packed bubble chart visualization