"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts"

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
import { Label } from "@/components/ui/label"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import { useClientDatasetPaths } from "@/lib/hooks/useClientDatasetPaths"
import { useIsMobile } from "@/hooks/use-mobile"

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
})

function formatCompact(value: number): string {
  if (!Number.isFinite(value)) {
    return "0"
  }
  const absValue = Math.abs(value)
  if (absValue > 0 && absValue < 1000) {
    const scaled = value / 1000
    const formatted = scaled.toLocaleString("en-US", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })
    return `${formatted.toLowerCase()}k`
  }
  return COMPACT_NUMBER_FORMATTER.format(value).toLowerCase()
}

type TooltipProps = {
  active?: boolean
  payload?: Array<{
    dataKey: string
    value: number
    payload: {
      market: string
      classI: number
      classII: number
      classIII: number
      prevClassI?: number
      prevClassII?: number
      prevClassIII?: number
      total: number
      prevTotal: number
      actualTotal?: number
      actualPrevTotal?: number
    }
  }>
  label?: string
  showPrevSeason?: boolean
  showActualValues?: boolean
}

function CustomTooltip({ active, payload, showPrevSeason, showActualValues = true }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const data = payload[0].payload
  
  const displayClassI = data.classI
  const displayClassII = data.classII
  const displayClassIII = data.classIII
  const displayPrevClassI = data.prevClassI || 0
  const displayPrevClassII = data.prevClassII || 0
  const displayPrevClassIII = data.prevClassIII || 0
  
  const displayTotal = showActualValues ? data.total : 100
  const displayPrevTotal = showActualValues ? data.prevTotal : 100
  
  const hasPrevData = showPrevSeason && (data.prevTotal > 0 || data.actualPrevTotal)

  const formatValue = (value: number) => {
    if (showActualValues) {
      return NUMBER_FORMATTER.format(value)
    }
    return `${NUMBER_FORMATTER.format(value)}%`
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="mb-2 font-medium text-sm">{data.market}</div>
      <table className="text-xs">
        <thead>
          <tr className="border-b">
            <th className="pr-4 pb-1 text-left font-medium text-muted-foreground">Class</th>
            <th className="px-2 pb-1 text-right font-medium text-muted-foreground">Current</th>
            {hasPrevData && (
              <th className="pl-2 pb-1 text-right font-medium text-muted-foreground">Prev</th>
            )}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pr-4 py-0.5 text-muted-foreground">Class I</td>
            <td className="px-2 py-0.5 text-right font-medium">{formatValue(displayClassI)}</td>
            {hasPrevData && (
              <td className="pl-2 py-0.5 text-right font-medium text-muted-foreground">
                {formatValue(displayPrevClassI)}
              </td>
            )}
          </tr>
          <tr>
            <td className="pr-4 py-0.5 text-muted-foreground">Class II</td>
            <td className="px-2 py-0.5 text-right font-medium">{formatValue(displayClassII)}</td>
            {hasPrevData && (
              <td className="pl-2 py-0.5 text-right font-medium text-muted-foreground">
                {formatValue(displayPrevClassII)}
              </td>
            )}
          </tr>
          <tr>
            <td className="pr-4 py-0.5 text-muted-foreground">Class III</td>
            <td className="px-2 py-0.5 text-right font-medium">{formatValue(displayClassIII)}</td>
            {hasPrevData && (
              <td className="pl-2 py-0.5 text-right font-medium text-muted-foreground">
                {formatValue(displayPrevClassIII)}
              </td>
            )}
          </tr>
          <tr className="border-t">
            <td className="pr-4 pt-1 font-medium">Total</td>
            <td className="px-2 pt-1 text-right font-bold">{formatValue(displayTotal)}</td>
            {hasPrevData && (
              <td className="pl-2 pt-1 text-right font-bold text-muted-foreground">
                {formatValue(displayPrevTotal)}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const chartConfig = {
  classI: {
    label: "Class I",
    color: "hsl(var(--chart-2))",
  },
  classII: {
    label: "Class II",
    color: "hsl(var(--chart-4))",
  },
  classIII: {
    label: "Class III",
    color: "hsl(var(--chart-5))",
  },
  prevClassI: {
    label: "Class I (Prev)",
    color: "hsl(var(--chart-2) / 0.4)",
  },
  prevClassII: {
    label: "Class II (Prev)",
    color: "hsl(var(--chart-4) / 0.4)",
  },
  prevClassIII: {
    label: "Class III (Prev)",
    color: "hsl(var(--chart-5) / 0.4)",
  },
} satisfies ChartConfig

type ComponentProps = {
  subtitle?: string
  records?: PackhouseRecord[]
  previousRecords?: PackhouseRecord[]
  showPrevSeason?: boolean
  titleClassName?: string
  showActualValues?: boolean
  onActualValuesChange?: (value: boolean) => void
  headerActions?: React.ReactNode
}

function toMarketKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

export function Component({ 
  subtitle, 
  records = [], 
  previousRecords = [],
  showPrevSeason = false,
  titleClassName = "text-[20px] text-left",
  showActualValues: showActualValuesProp = true,
  onActualValuesChange,
  headerActions,
}: ComponentProps) {
  const { packhouseMarketsPath } = useClientDatasetPaths()
  const isMobile = useIsMobile()
  
  const [marketConfig, setMarketConfig] = React.useState<string[]>([])
  const [showActualValues, setShowActualValues] = React.useState(showActualValuesProp)

  // Load market configuration
  React.useEffect(() => {
    if (!packhouseMarketsPath) return

    fetch(packhouseMarketsPath)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.markets)) {
          setMarketConfig(data.markets)
        }
      })
      .catch(err => console.error("Failed to load markets config:", err))
  }, [packhouseMarketsPath])

  React.useEffect(() => {
    setShowActualValues(showActualValuesProp)
  }, [showActualValuesProp])

  const handleActualValuesChange = React.useCallback((checked: boolean) => {
    setShowActualValues(checked)
    onActualValuesChange?.(checked)
  }, [onActualValuesChange])

  const chartData = React.useMemo(() => {
    if (!records || records.length === 0) {
      return []
    }

    // Create a map to aggregate class totals per market
    const marketMap = new Map<string, { 
      classI: number
      classII: number
      classIII: number
      prevClassI: number
      prevClassII: number
      prevClassIII: number
      name: string 
    }>()

    // Process current season records
    records.forEach(record => {
      const classI = record.classI || 0
      const classII = record.classII || 0
      const classIII = record.classIII || 0
      // If there are packing progress entries (markets), distribute the class values
      if (record.packingProgress && Array.isArray(record.packingProgress) && record.packingProgress.length > 0) {
        const totalValue = record.packingProgress.reduce((sum, entry) => sum + (entry.value || 0), 0)
        
        // Distribute class values proportionally based on market percentage
        record.packingProgress.forEach(entry => {
          const normalizedKey = toMarketKey(entry.key)
          const name = entry.label || entry.key
          
          // Only include entries that match configured markets
          const isMarket = marketConfig.some(m => toMarketKey(m) === normalizedKey)
          if (!isMarket || normalizedKey === "unassigned") return
          
          const ratio = totalValue > 0 ? (entry.value || 0) / totalValue : 0
          
          if (!marketMap.has(normalizedKey)) {
            marketMap.set(normalizedKey, { 
              classI: 0, classII: 0, classIII: 0,
              prevClassI: 0, prevClassII: 0, prevClassIII: 0,
              name 
            })
          }
          
          const market = marketMap.get(normalizedKey)!
          market.classI += classI * ratio
          market.classII += classII * ratio
          market.classIII += classIII * ratio
        })
      }
    })

    // Process previous season records if enabled
    if (showPrevSeason && previousRecords && Array.isArray(previousRecords) && previousRecords.length > 0) {
      previousRecords.forEach(record => {
        const classI = record.classI || 0
        const classII = record.classII || 0
        const classIII = record.classIII || 0
        
        if (record.packingProgress && Array.isArray(record.packingProgress) && record.packingProgress.length > 0) {
          const totalValue = record.packingProgress.reduce((sum, entry) => sum + (entry.value || 0), 0)
          
          record.packingProgress.forEach(entry => {
            const normalizedKey = toMarketKey(entry.key)
            const name = entry.label || entry.key
            
            const isMarket = marketConfig.some(m => toMarketKey(m) === normalizedKey)
            if (!isMarket || normalizedKey === "unassigned") return
            
            const ratio = totalValue > 0 ? (entry.value || 0) / totalValue : 0
            
            if (!marketMap.has(normalizedKey)) {
              marketMap.set(normalizedKey, { 
                classI: 0, classII: 0, classIII: 0,
                prevClassI: 0, prevClassII: 0, prevClassIII: 0,
                name 
              })
            }
            
            const market = marketMap.get(normalizedKey)!
            market.prevClassI += classI * ratio
            market.prevClassII += classII * ratio
            market.prevClassIII += classIII * ratio
          })
        }
      })
    }

    // Filter by configured markets if config is available
    const filtered = Array.from(marketMap.entries()).filter(([key]) => {
      if (!marketConfig || marketConfig.length === 0) return true
      return marketConfig.some(m => toMarketKey(m) === key)
    })

    // Sort by total value (descending) - largest to smallest
    const sorted = filtered.sort((a, b) => {
      const totalA = a[1].classI + a[1].classII + a[1].classIII
      const totalB = b[1].classI + b[1].classII + b[1].classIII
      return totalB - totalA
    })

    // Convert map to array
    return sorted
      .map(([, data]) => ({
        market: data.name.toUpperCase(),
        classI: data.classI,
        classII: data.classII,
        classIII: data.classIII,
        prevClassI: showPrevSeason ? data.prevClassI : undefined,
        prevClassII: showPrevSeason ? data.prevClassII : undefined,
        prevClassIII: showPrevSeason ? data.prevClassIII : undefined,
        total: data.classI + data.classII + data.classIII,
        prevTotal: data.prevClassI + data.prevClassII + data.prevClassIII,
      }))
      .filter(d => d.total > 0 || (showPrevSeason && d.prevTotal > 0))
  }, [records, previousRecords, showPrevSeason, marketConfig])

  const displayData = React.useMemo(() => {
    if (showActualValues) {
      return chartData
    }

    // Convert to percentages (100% stacked)
    return chartData.map(d => {
      const currentTotal = d.total
      const prevTotal = d.prevTotal

      return {
        ...d,
        classI: currentTotal > 0 ? (d.classI / currentTotal) * 100 : 0,
        classII: currentTotal > 0 ? (d.classII / currentTotal) * 100 : 0,
        classIII: currentTotal > 0 ? (d.classIII / currentTotal) * 100 : 0,
        prevClassI: prevTotal > 0 && d.prevClassI ? (d.prevClassI / prevTotal) * 100 : 0,
        prevClassII: prevTotal > 0 && d.prevClassII ? (d.prevClassII / prevTotal) * 100 : 0,
        prevClassIII: prevTotal > 0 && d.prevClassIII ? (d.prevClassIII / prevTotal) * 100 : 0,
        // Keep original totals for tooltip
        actualTotal: currentTotal,
        actualPrevTotal: prevTotal,
      }
    })
  }, [chartData, showActualValues])

  const maxValue = React.useMemo(() => {
    if (!showActualValues) {
      return 100 // Fixed at 100% for percentage mode
    }
    const currentMax = Math.max(...chartData.map(d => d.total), 0)
    const prevMax = showPrevSeason ? Math.max(...chartData.map(d => d.prevTotal || 0), 0) : 0
    const max = Math.max(currentMax, prevMax)
    // Add 20% padding to prevent label cutoff
    return max * 1.2
  }, [chartData, showPrevSeason, showActualValues])

  const hasPreviousData = showPrevSeason && chartData.some(d => 
    (d.prevClassI && d.prevClassI > 0) || 
    (d.prevClassII && d.prevClassII > 0) || 
    (d.prevClassIII && d.prevClassIII > 0)
  )

  const useFullTotalLabels = showActualValues && chartData.length < 8

  if (chartData.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className={titleClassName}>Market by Class</CardTitle>
              <CardDescription className="text-base sm:text-sm text-left">{subtitle}</CardDescription>
            </div>
            {headerActions ? (
              <div className="flex items-center gap-2 pt-1">
                {headerActions}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No market data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className={titleClassName}>Market by Class</CardTitle>
            <CardDescription className="text-base sm:text-sm text-left">{subtitle}</CardDescription>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="actual-values-market"
                checked={showActualValues}
                onChange={(e) => handleActualValuesChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="actual-values-market" className="text-sm font-normal cursor-pointer">
                Actual Values
              </Label>
            </div>
            {headerActions ? (
              <div className="flex items-center">
                {headerActions}
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            accessibilityLayer
            data={displayData}
            margin={{ top: 5, right: 12, bottom: isMobile ? -10 : 75, left: 24 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="market"
              tickLine={false}
              tickMargin={isMobile ? 6 : 10}
              axisLine={false}
              height={isMobile ? 40 : 15}
              tick={{ fontSize: 11 }}
            />
            <YAxis hide domain={[0, maxValue]} />
            <ChartTooltip
              cursor={false}
              content={<CustomTooltip showPrevSeason={showPrevSeason} showActualValues={showActualValues} />}
            />
            {hasPreviousData && (
              <>
                <Bar 
                  dataKey="prevClassI" 
                  fill="var(--color-prevClassI)" 
                  radius={[0, 0, 0, 0]}
                  stackId="b"
                />
                <Bar 
                  dataKey="prevClassII" 
                  fill="var(--color-prevClassII)" 
                  radius={[0, 0, 0, 0]}
                  stackId="b"
                />
                <Bar 
                  dataKey="prevClassIII" 
                  fill="var(--color-prevClassIII)" 
                  radius={[4, 4, 0, 0]}
                  stackId="b"
                >
                  <LabelList
                    dataKey={showActualValues ? "prevTotal" : undefined}
                    position="top"
                    offset={8}
                    className="fill-foreground text-xs"
                    formatter={(value: number) => {
                      if (!showActualValues) return "100%"
                      if (typeof value !== "number" || value <= 0) return ""
                      if (useFullTotalLabels) {
                        return NUMBER_FORMATTER.format(value)
                      }
                      return formatCompact(value)
                    }}
                  />
                </Bar>
              </>
            )}
            <Bar 
              dataKey="classI" 
              fill="var(--color-classI)" 
              radius={[0, 0, 0, 0]}
              stackId="a"
            />
            <Bar 
              dataKey="classII" 
              fill="var(--color-classII)" 
              radius={[0, 0, 0, 0]}
              stackId="a"
            />
            <Bar 
              dataKey="classIII" 
              fill="var(--color-classIII)" 
              radius={[4, 4, 0, 0]}
              stackId="a"
            >
              <LabelList
                dataKey={showActualValues ? "total" : undefined}
                position="top"
                offset={8}
                className="fill-foreground text-xs"
                formatter={(value: number) => {
                  if (!showActualValues) return "100%"
                  if (typeof value !== "number" || value <= 0) return ""
                  if (useFullTotalLabels) {
                    return NUMBER_FORMATTER.format(value)
                  }
                  return formatCompact(value)
                }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
