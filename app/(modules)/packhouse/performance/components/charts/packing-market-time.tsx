"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"

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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import {
  type Granularity,
  usePackingAnalytics,
  type AggregatedRecord,
} from "./packing-analytics"
import { useIsMobile } from "@/hooks/use-mobile"

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

const ACTUAL_SUFFIX = "__actual"

type PackingMarketChartProps = {
  selectionLabel: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  granularity: Granularity
  showPrevYear: boolean
  onPrevYearAvailabilityChange?: (available: boolean) => void
  showActualValues?: boolean
  renderMobileActualToggle?: React.ReactNode
}

type MarketKey = {
  name: string
  key: string
}

type MarketShareRecord = {
  label: string
  tooltip: string
  periodIdentifier: string
  [key: string]: string | number
}

function toMarketKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

type MarketTooltipPayload = {
  dataKey?: string | number
  value?: number
  payload?: Record<string, unknown>
}

type MarketTooltipProps = {
  active?: boolean
  label?: string | number
  payload?: MarketTooltipPayload[]
  marketKeys: MarketKey[]
  showPrevYear: boolean
  showActual: boolean
  valueFormatter: (value: number | undefined) => string
}

function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10
  return `${rounded.toFixed(1)}%`
}

function MarketTooltipContent({
  active,
  label,
  payload,
  marketKeys,
  showPrevYear,
  showActual,
  valueFormatter,
}: MarketTooltipProps) {
  if (!active || !payload?.length || marketKeys.length === 0) {
    return null
  }

  const tooltipLabel = (() => {
    const candidate = payload[0]?.payload?.tooltip
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate
    }
    if (typeof label === "string" && label.trim().length > 0) {
      return label
    }
    return null
  })()

  const rows = marketKeys.map(({ name, key }) => {
    const currentKey = showActual ? `${key}${ACTUAL_SUFFIX}` : key
    const previousKey = showActual ? `prev_${key}${ACTUAL_SUFFIX}` : `prev_${key}`
    
    // Try to find in payload array first
    const current = payload.find((item) => item.dataKey === currentKey)
    const currentValue = typeof current?.value === "number" ? current.value : undefined
    
    // For previous values, check both payload array and the data point object
    let previousValue: number | undefined = undefined
    const previousInPayload = payload.find((item) => item.dataKey === previousKey)
    if (typeof previousInPayload?.value === "number") {
      previousValue = previousInPayload.value
    } else if (payload[0]?.payload) {
      // Check the data point object directly
      const dataPoint = payload[0].payload
      const prevVal = dataPoint[previousKey]
      if (typeof prevVal === "number") {
        previousValue = prevVal
      }
    }
    
    return {
      name,
      key,
      current: currentValue,
      previous: previousValue,
    }
  })

  const hasPrevValues = showPrevYear && rows.some((row) => typeof row.previous === "number")

  // Split rows into 2 columns for more compact display
  const midPoint = Math.ceil(rows.length / 2)
  const leftColumn = rows.slice(0, midPoint)
  const rightColumn = rows.slice(midPoint)

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      {tooltipLabel ? (
        <div className="mb-2 text-sm font-medium text-foreground">{tooltipLabel}</div>
      ) : null}
      <div className="flex gap-4">
        {/* Left Column */}
        <table className="border-collapse text-[11px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 pr-2 text-left font-medium">Market</th>
              <th className="py-1 pr-2 text-right font-medium">Current</th>
              {hasPrevValues ? (
                <th className="py-1 text-right font-medium">Prev</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="text-foreground">
            {leftColumn.map(({ name, key, current, previous }) => (
              <tr key={key}>
                <td className="py-0.5 pr-2 text-left font-medium">{name}</td>
                <td className="py-0.5 pr-2 text-right font-mono tabular-nums">
                  {valueFormatter(current)}
                </td>
                {hasPrevValues ? (
                  <td className="py-0.5 text-right font-mono tabular-nums">
                    {valueFormatter(previous)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Right Column */}
        <table className="border-collapse text-[11px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 pr-2 text-left font-medium">Market</th>
              <th className="py-1 pr-2 text-right font-medium">Current</th>
              {hasPrevValues ? (
                <th className="py-1 text-right font-medium">Prev</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="text-foreground">
            {rightColumn.map(({ name, key, current, previous }) => (
              <tr key={key}>
                <td className="py-0.5 pr-2 text-left font-medium">{name}</td>
                <td className="py-0.5 pr-2 text-right font-mono tabular-nums">
                  {valueFormatter(current)}
                </td>
                {hasPrevValues ? (
                  <td className="py-0.5 text-right font-mono tabular-nums">
                    {valueFormatter(previous)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type LegendPayload = NonNullable<React.ComponentProps<typeof ChartLegendContent>["payload"]>

function filterPrevLegendEntries(payload?: LegendPayload) {
  if (!payload) return payload
  return payload.filter((item) => {
    const dataKey = item.dataKey
    if (typeof dataKey === "string") {
      return !dataKey.startsWith("prev_")
    }
    return true
  })
}

function FilteredLegend(props: React.ComponentProps<typeof ChartLegendContent>) {
  const filtered = filterPrevLegendEntries(props.payload as LegendPayload)
  return <ChartLegendContent {...props} payload={filtered} className="flex-wrap" />
}

function buildMarketShares(
  record: AggregatedRecord,
  marketKeys: MarketKey[]
): MarketShareRecord {
  const normalizedTotals = new Map<string, number>()

  Object.entries(record.packingProgress).forEach(([rawKey, value]) => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return
    const normalizedKey = toMarketKey(rawKey)
    normalizedTotals.set(normalizedKey, (normalizedTotals.get(normalizedKey) ?? 0) + numericValue)
  })

  const marketTotals = marketKeys.map(({ key, name }) => {
    const lookupKey = key || toMarketKey(name)
    return normalizedTotals.get(lookupKey) ?? 0
  })

  const marketTotal = marketTotals.reduce((acc, value) => acc + value, 0)

  const result: MarketShareRecord = {
    label: record.label,
    tooltip: record.tooltip,
    periodIdentifier: record.periodIdentifier,
  }

  marketKeys.forEach(({ key }, index) => {
    const total = marketTotals[index]
    const share = marketTotal > 0 ? (total / marketTotal) * 100 : 0
    result[key] = share
    result[`${key}${ACTUAL_SUFFIX}`] = total
  })

  return result
}

export function PackingMarketChart({
  selectionLabel,
  records,
  previousRecords,
  granularity,
  showPrevYear,
  onPrevYearAvailabilityChange,
  showActualValues = false,
  renderMobileActualToggle,
}: PackingMarketChartProps) {
  const isMobile = useIsMobile()

  const [marketConfig, setMarketConfig] = React.useState<MarketKey[]>([])

  React.useEffect(() => {
    fetch("/data/bj-vorster-edms-bpk/packhouse/packhouse-markets.json")
      .then((res) => res.json())
      .then((data: { markets: string[] }) => {
        const keys = data.markets.map((market) => ({
          name: market.toUpperCase(),
          key: toMarketKey(market),
        }))
        setMarketConfig(keys)
      })
      .catch((err) => {
        console.error("Failed to load market config:", err)
        setMarketConfig([])
      })
  }, [])

  const {
    aggregatedRecords,
    previousAggregatedRecords,
    hasPrevYearData,
  } = usePackingAnalytics({ records, previousRecords, granularity })

  React.useEffect(() => {
    onPrevYearAvailabilityChange?.(hasPrevYearData)
  }, [hasPrevYearData, onPrevYearAvailabilityChange])

  const chartData = React.useMemo(() => {
    if (marketConfig.length === 0) return []

    const current = aggregatedRecords.map((record) =>
      buildMarketShares(record, marketConfig)
    )

    if (!showPrevYear || previousAggregatedRecords.length === 0) {
      return current
    }

    const previousByIdentifier = new Map(
      previousAggregatedRecords.map((record) => {
        const shares = buildMarketShares(record, marketConfig)
        return [shares.periodIdentifier, shares]
      })
    )

    return current.map((currentRecord) => {
      const previousRecord = previousByIdentifier.get(currentRecord.periodIdentifier)
      if (!previousRecord) return currentRecord

      const merged = { ...currentRecord }
      marketConfig.forEach(({ key }) => {
        merged[`prev_${key}`] = previousRecord[key]
        merged[`prev_${key}${ACTUAL_SUFFIX}`] = previousRecord[`${key}${ACTUAL_SUFFIX}`]
      })

      return merged
    })
  }, [aggregatedRecords, previousAggregatedRecords, marketConfig, showPrevYear])

  const chartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    marketConfig.forEach((item, index) => {
      const color = COLOR_PALETTE[index % COLOR_PALETTE.length]
      config[item.key] = {
        label: item.name,
        color,
      }
      // Add config for actual values suffix
      config[`${item.key}${ACTUAL_SUFFIX}`] = {
        label: item.name,
        color,
      }
      if (showPrevYear) {
        config[`prev_${item.key}`] = {
          label: `${item.name} (Prev)`,
          color,
        }
        config[`prev_${item.key}${ACTUAL_SUFFIX}`] = {
          label: `${item.name} (Prev)`,
          color,
        }
      }
    })
    return config
  }, [marketConfig, showPrevYear])

  const valueFormatter = showActualValues ? 
    (v: number | undefined) => (typeof v === "number" ? v.toFixed(0) : "—") :
    formatPercent

  if (marketConfig.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Market</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">
            {selectionLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            Loading market configuration...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Market</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">
            {selectionLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="gap-2 space-y-0 border-b py-5 sm:flex-row" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
        <div className="grid flex-1 gap-1 text-left">
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Market</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">
            {selectionLabel}
          </CardDescription>
        </div>
        {renderMobileActualToggle}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: isMobile ? 20 : 40,
              right: isMobile ? 20 : 20,
              top: 12,
              bottom: 0,
            }}
            stackOffset="wiggle"
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={['dataMin', 'dataMax']}
              hide
            />
            <RechartsTooltip
              position={{ y: 0 }}
              content={
                <MarketTooltipContent
                  marketKeys={marketConfig}
                  showPrevYear={showPrevYear}
                  showActual={showActualValues}
                  valueFormatter={valueFormatter}
                />
              }
            />
            <ChartLegend content={<FilteredLegend />} />
            {marketConfig.map(({ key }, index) => {
              const color = COLOR_PALETTE[index % COLOR_PALETTE.length]
              const dataKey = showActualValues ? `${key}${ACTUAL_SUFFIX}` : key
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={dataKey}
                  stackId="1"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.9}
                />
              )
            })}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
