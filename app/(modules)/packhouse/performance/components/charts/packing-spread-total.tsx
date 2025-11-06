"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import {
  normalizeSpreadName,
  usePackhouseConfig,
  compareSpreadsByFixedOrder,
} from "../../../utils/usePackhouseConfig"

const FRUIT_HEATMAP_STOPS = [
  { stop: 0, color: { r: 248, g: 250, b: 252 } }, // soft mist
  { stop: 0.2, color: { r: 228, g: 240, b: 255 } }, // morning sky
  { stop: 0.4, color: { r: 207, g: 243, b: 236 } }, // mint pulp
  { stop: 0.6, color: { r: 245, g: 230, b: 170 } }, // citrus zest
  { stop: 0.8, color: { r: 254, g: 205, b: 130 } }, // ripe mango
  { stop: 1, color: { r: 235, g: 96, b: 63 } }, // sun-blush orange
]
function interpolateFruitColor(ratio: number) {
  for (let i = 0; i < FRUIT_HEATMAP_STOPS.length - 1; i++) {
    const current = FRUIT_HEATMAP_STOPS[i]
    const next = FRUIT_HEATMAP_STOPS[i + 1]
    if (ratio >= current.stop && ratio <= next.stop) {
      const segmentRatio = (ratio - current.stop) / (next.stop - current.stop)
      const r = Math.round(current.color.r + (next.color.r - current.color.r) * segmentRatio)
      const g = Math.round(current.color.g + (next.color.g - current.color.g) * segmentRatio)
      const b = Math.round(current.color.b + (next.color.b - current.color.b) * segmentRatio)
      return { r, g, b }
    }
  }
  const last = FRUIT_HEATMAP_STOPS[FRUIT_HEATMAP_STOPS.length - 1]
  return { ...last.color }
}

function getColorForValue(value: number, maxValue: number): string {
  if (maxValue === 0) return "rgba(148, 163, 184, 0.3)"
  const ratio = Math.max(0, Math.min(1, value / maxValue))
  const baseColor = interpolateFruitColor(ratio)
  const alpha = 0.55 + ratio * 0.45
  return `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha.toFixed(2)})`
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

type ComponentProps = {
  selectionLabel?: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  showPrevSeason: boolean
  titleClassName?: string
  headerActions?: React.ReactNode
}

export function Component({ selectionLabel, records, previousRecords, showPrevSeason, titleClassName = "text-2xl sm:text-lg text-left", headerActions }: ComponentProps) {
  const config = usePackhouseConfig()

  // Generate unique IDs for gradients
  const currentGradientId = React.useId()
  const previousGradientId = React.useId()

  const chartData = React.useMemo(() => {
    if (!records || records.length === 0) {
      return []
    }

    const sizeTotals: Record<string, { current: number; previous: number; label: string }> = {}
    
    // Calculate current season totals by aggregating all size values across all records
    records.forEach(record => {
      if (record.packingProgress && Array.isArray(record.packingProgress)) {
        // packingProgress is an array of PackingProgressMetric
        record.packingProgress.forEach(entry => {
          const key = entry.key
          const label = entry.label || entry.key
          if (!key) return
          if (!sizeTotals[key]) {
            sizeTotals[key] = { current: 0, previous: 0, label }
          }
          sizeTotals[key].current += entry.value || 0
        })
      }
    })

    // Calculate previous season totals if needed
    if (showPrevSeason && previousRecords && Array.isArray(previousRecords) && previousRecords.length > 0) {
      previousRecords.forEach(record => {
        if (record.packingProgress && Array.isArray(record.packingProgress)) {
          record.packingProgress.forEach(entry => {
            const key = entry.key
            const label = entry.label || entry.key
            if (!key) return
            if (!sizeTotals[key]) {
              sizeTotals[key] = { current: 0, previous: 0, label }
            }
            sizeTotals[key].previous += entry.value || 0
          })
        }
      })
    }

    // Filter by configured spreads if config is available
    const filtered = Object.entries(sizeTotals).filter(([key]) => {
      if (!config.spreads || config.spreads.size === 0) return true
      const normalized = normalizeSpreadName(key)
      return config.spreads.has(normalized) || config.spreads.has(key)
    })

    const orderFallback = new Map<string, number>()
    const registerFallback = (value: string | undefined) => {
      if (!value) return
      const normalized = normalizeSpreadName(value)
      if (!normalized || orderFallback.has(normalized)) {
        return
      }
      orderFallback.set(normalized, orderFallback.size)
    }

    if (config.spreadList?.length) {
      config.spreadList.forEach(registerFallback)
    }

    filtered.forEach(([key, values]) => {
      registerFallback(values.label)
      registerFallback(key)
    })

    const sorted = filtered
      .slice()
      .sort((a, b) => {
        const labelA = a[1].label || a[0]
        const labelB = b[1].label || b[0]
        const compare = compareSpreadsByFixedOrder(labelA, labelB, { fallbackOrder: orderFallback })
        if (compare !== 0) {
          return compare
        }
        return b[1].current - a[1].current
      })

    return sorted.map(([size, values]) => ({
      size: values.label || size,
      current: values.current,
      previous: showPrevSeason ? values.previous : undefined,
    }))
  }, [records, previousRecords, showPrevSeason, config.spreads, config.spreadList])

  const { minValue, maxValue } = React.useMemo(() => {
    const allValues = [
      ...chartData.map(d => d.current),
      ...chartData.map(d => d.previous || 0)
    ].filter(v => v > 0)
    
    if (allValues.length === 0) {
      return { minValue: 0, maxValue: 100 }
    }
    
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    
    // Calculate padding (10% of range)
    const range = max - min
    const padding = range * 0.1
    
    // Round to nice intervals (5000 for values in this range)
    const rawMin = Math.max(0, min - padding)
    const rawMax = max + padding
    
    // Determine appropriate rounding interval based on scale
    let interval = 5000
    if (rawMax > 1000000) interval = 50000
    else if (rawMax > 100000) interval = 10000
    else if (rawMax > 10000) interval = 5000
    else if (rawMax > 1000) interval = 1000
    else interval = 100
    
    return {
      minValue: Math.floor(rawMin / interval) * interval,
      maxValue: Math.ceil(rawMax / interval) * interval
    }
  }, [chartData])

  const chartConfig = React.useMemo(() => {
    const cfg: ChartConfig = {}
    chartData.forEach(item => {
      cfg[item.size] = {
        label: item.size,
        color: getColorForValue(item.current, maxValue),
      }
    })
    return cfg
  }, [chartData, maxValue])

  const hasPreviousData = showPrevSeason && chartData.some(d => d.previous && d.previous > 0)

  if (config.loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className={titleClassName}>Packing Spread</CardTitle>
              <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
            </div>
            {headerActions ? (
              <div className="flex items-center gap-2 pt-1">
                {headerActions}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className={titleClassName}>Packing Spread</CardTitle>
              <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
            </div>
            {headerActions ? (
              <div className="flex items-center gap-2 pt-1">
                {headerActions}
              </div>
            ) : null}
          </div>
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className={titleClassName}>Packing Spread</CardTitle>
            <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
          </div>
          {headerActions ? (
            <div className="flex items-center gap-2 pt-1">
              {headerActions}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[350px] sm:h-full w-full">
          <AreaChart layout="vertical" accessibilityLayer data={chartData} margin={{ left: 5, right: 20, top: 20, bottom: 30 }}>
            <defs>
              <linearGradient id={currentGradientId} x1="0" y1="0" x2="1" y2="0">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--chart-1))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--chart-1))"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id={previousGradientId} x1="0" y1="0" x2="1" y2="0">
                <stop
                  offset="5%"
                  stopColor="#87A6B0"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="#87A6B0"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <YAxis
              type="category"
              dataKey="size"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={50}
            />
            <XAxis 
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[minValue, maxValue]}
              tickFormatter={(value) => Math.round(value).toLocaleString('en-US')}
              allowDecimals={false}
              hide
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Size
                        </span>
                        <span className="font-bold text-muted-foreground">{data.size}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Current
                        </span>
                        <span className="font-bold">{NUMBER_FORMATTER.format(data.current)} tons</span>
                      </div>
                      {hasPreviousData && data.previous !== undefined && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Previous
                          </span>
                          <span className="font-bold text-muted-foreground/60">{NUMBER_FORMATTER.format(data.previous)} tons</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
            />
            {hasPreviousData && (
              <Area
                type="monotone"
                dataKey="previous"
                stroke="#87A6B0"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill={`url(#${previousGradientId})`}
                dot={{ fill: "#87A6B0", r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="current"
              stroke="hsl(var(--chart-1))"
              strokeWidth={3}
              fill={`url(#${currentGradientId})`}
              dot={{ fill: "hsl(var(--chart-1))", r: 5 }}
              activeDot={{ r: 7 }}
            >
              <LabelList
                dataKey="current"
                position="right"
                formatter={(value: number) => Math.round(value).toLocaleString("en-US")}
                className="fill-muted-foreground text-xs font-medium"
                offset={12}
                content={({ x, y, value, viewBox }) => {
                  if (value == null || x == null || y == null) {
                    return null
                  }

                  const formattedValue = Math.round(Number(value)).toLocaleString("en-US")
                  const labelWidth = Math.max(formattedValue.length * 6 + 6, 28)
                  const desiredX = Number(x) + 12

                  const numericViewBox =
                    viewBox && typeof viewBox === "object" && "x" in viewBox && "width" in viewBox
                      ? (viewBox as { x: number; width: number })
                      : null

                  let clampedX = desiredX
                  if (numericViewBox && numericViewBox.width > 0) {
                    const minX = numericViewBox.x + 4
                    const maxX = Math.max(minX, numericViewBox.x + numericViewBox.width - labelWidth - 4)
                    clampedX = Math.min(Math.max(minX, desiredX), maxX)
                  }

                  const rectX = clampedX - 4
                  const rectY = Number(y) - 9
                  const rectHeight = 18

                  return (
                    <g>
                      <rect
                        x={rectX}
                        y={rectY}
                        width={labelWidth}
                        height={rectHeight}
                        fill="white"
                        rx={9}
                      />
                      <text
                        x={clampedX}
                        y={y}
                        textAnchor="start"
                        dominantBaseline="middle"
                        className="fill-muted-foreground text-xs font-medium"
                      >
                        {formattedValue}
                      </text>
                    </g>
                  )
                }}
              />
            </Area>
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

