"use client"

import * as React from "react"
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
  LabelList,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import {
  normalizeSpreadName,
  usePackhouseConfig,
  compareSpreadsByFixedOrder,
} from "../../../utils/usePackhouseConfig"
import { useClientDatasetPaths } from "@/lib/hooks/useClientDatasetPaths"

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

const FRUIT_HEATMAP_STOPS = [
  { stop: 0, color: { r: 254, g: 223, b: 206 } },
  { stop: 0.3, color: { r: 252, g: 179, b: 136 } },
  { stop: 0.6, color: { r: 247, g: 121, b: 80 } },
  { stop: 0.85, color: { r: 221, g: 72, b: 49 } },
  { stop: 1, color: { r: 153, g: 27, b: 27 } },
]

function interpolateFruitColor(ratio: number) {
  const clamped = Math.max(0, Math.min(1, ratio))
  for (let index = 0; index < FRUIT_HEATMAP_STOPS.length - 1; index += 1) {
    const current = FRUIT_HEATMAP_STOPS[index]
    const next = FRUIT_HEATMAP_STOPS[index + 1]
    if (clamped >= current.stop && clamped <= next.stop) {
      const localRatio = (clamped - current.stop) / (next.stop - current.stop || 1)
      const r = Math.round(current.color.r + (next.color.r - current.color.r) * localRatio)
      const g = Math.round(current.color.g + (next.color.g - current.color.g) * localRatio)
      const b = Math.round(current.color.b + (next.color.b - current.color.b) * localRatio)
      return { r, g, b }
    }
  }
  const last = FRUIT_HEATMAP_STOPS[FRUIT_HEATMAP_STOPS.length - 1]
  return { ...last.color }
}

function tintWithLight(color: { r: number; g: number; b: number }, intensity = 0.35) {
  const clamp = (value: number) => Math.min(255, Math.round(value))
  const blend = (channel: number) => clamp(channel + (255 - channel) * intensity)
  return { r: blend(color.r), g: blend(color.g), b: blend(color.b) }
}

type ComponentProps = {
  subtitle?: string
  records?: PackhouseRecord[]
  previousRecords?: PackhouseRecord[]
  showPrevSeason?: boolean
  titleClassName?: string
  headerActions?: React.ReactNode
}

type BubblePoint = {
  market: string
  canonicalMarket: string
  canonicalSpread: string
  spread: string
  actual: number
  percent: number
  x: number
  y: number
  fill: string
  stroke: string
  prevActual?: number
  prevPercent?: number
  hasPrevData?: boolean
}

type ChartBubblePoint = BubblePoint & {
  value: number
}

type BubbleLabelProps = {
  cx?: number | string
  cy?: number | string
  value?: number | string
  fill?: string
  payload?: ChartBubblePoint
}

type TooltipProps = {
  active?: boolean
  payload?: Array<{ payload: BubblePoint; value?: number }>
  showActualValues: boolean
  showPrevSeason?: boolean
}

function CustomTooltip({ active, payload, showActualValues, showPrevSeason }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const data = payload[0]?.payload
  if (!data) {
    return null
  }

  const currentValue = showActualValues ? data.actual : data.percent
  const prevValue = showActualValues ? data.prevActual : data.prevPercent
  const hasPrevData = Boolean(showPrevSeason && data.hasPrevData && typeof prevValue === "number")

  const formatValue = (value?: number) => {
    if (typeof value !== "number") {
      return "—"
    }
    if (showActualValues) {
      return NUMBER_FORMATTER.format(value)
    }
    return `${NUMBER_FORMATTER.format(value)}%`
  }

  return (
    <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-sm">
      <div className="font-medium text-sm" title={data.canonicalMarket}>
        {data.market}
      </div>
      <div className="text-muted-foreground">{data.spread}</div>
      <div className="mt-1 space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Current</span>
          <span className="font-semibold">{formatValue(currentValue)}</span>
        </div>
        {hasPrevData && (
          <div className="flex items-center justify-between gap-6 text-muted-foreground">
            <span>Prev</span>
            <span className="font-semibold">{formatValue(prevValue)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function getBubbleTextColor(fill: string): string {
  const lightTextColor = "hsl(var(--muted-foreground))"
  const darkTextColor = "#ffffff"
  const rgbaMatch = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!rgbaMatch) {
    return lightTextColor
  }
  const [r, g, b] = rgbaMatch.slice(1, 4).map(Number)

  const normalizeChannel = (channel: number) => {
    const scaled = channel / 255
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4)
  }

  const rLin = normalizeChannel(r)
  const gLin = normalizeChannel(g)
  const bLin = normalizeChannel(b)
  const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin

  return luminance > 0.55 ? lightTextColor : darkTextColor
}

function toMarketKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

export function Component({
  subtitle,
  records = [],
  previousRecords = [],
  showPrevSeason = false,
  titleClassName = "text-[20px] text-left",
  headerActions,
}: ComponentProps) {
  const { entries, loading, spreads: spreadSet } = usePackhouseConfig()
  const { packhouseMarketsPath } = useClientDatasetPaths()

  const [marketConfig, setMarketConfig] = React.useState<string[]>([])
  const [marketsLoading, setMarketsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!packhouseMarketsPath) {
      setMarketConfig([])
      setMarketsLoading(false)
      return
    }

    let cancelled = false
    setMarketsLoading(true)

    fetch(packhouseMarketsPath)
      .then((res) => res.json())
      .then((data: { markets?: string[] } | null) => {
        if (cancelled) return
        if (data && Array.isArray(data.markets)) {
          setMarketConfig(data.markets)
        } else {
          setMarketConfig([])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMarketConfig([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMarketsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [packhouseMarketsPath])

  const spreadConfig = React.useMemo(() => {
    const order: string[] = []
    const displayMap = new Map<string, string>()
    const seen = new Set<string>()

    entries.forEach((entry) => {
      const normalized = normalizeSpreadName(entry.spread)
      if (!normalized || seen.has(normalized)) {
        return
      }
      seen.add(normalized)
      order.push(normalized)
      displayMap.set(normalized, entry.spread.trim() || normalized)
    })

    return {
      order,
      displayMap,
    }
  }, [entries])

  const marketSetup = React.useMemo(() => {
    const order: string[] = []
    const displayMap = new Map<string, string>()
    const fallbackOrder = new Map<string, number>()
    const allowed = new Set<string>()

    marketConfig.forEach((raw, index) => {
      const normalized = toMarketKey(raw)
      if (!normalized || normalized === "unassigned") {
        return
      }
      if (!displayMap.has(normalized)) {
        displayMap.set(normalized, raw.trim().length ? raw.trim().toUpperCase() : normalized.toUpperCase())
      }
      if (!fallbackOrder.has(normalized)) {
        fallbackOrder.set(normalized, index)
      }
      if (!order.includes(normalized)) {
        order.push(normalized)
      }
      allowed.add(normalized)
    })

    return {
      order,
      displayMap,
      fallbackOrder,
      allowed,
    }
  }, [marketConfig])

  const {
    dataPoints,
    markets,
    spreads,
    maxActualValue,
    marketDisplayMap,
  } = React.useMemo(() => {
    const totals = new Map<string, Map<string, number>>()
    const marketTotals = new Map<string, number>()
    const spreadTotals = new Map<string, number>()

    const prevTotals = new Map<string, Map<string, number>>()
    const prevMarketTotals = new Map<string, number>()
    const prevSpreadTotals = new Map<string, number>()

    const marketOrder = [...marketSetup.order]
    const marketSeen = new Set(marketOrder)
    const marketDisplay = new Map(marketSetup.displayMap)
    const marketFallbackOrder = new Map(marketSetup.fallbackOrder)

    const spreadOrder = [...spreadConfig.order]
    const spreadSeen = new Set(spreadOrder)
    const spreadDisplay = new Map(spreadConfig.displayMap)
    const spreadOrderFallback = new Map<string, number>()
    spreadOrder.forEach((normalized, index) => {
      spreadOrderFallback.set(normalized, index)
    })

    const processRecords = (
      sourceRecords: PackhouseRecord[],
      {
        totalsMap,
        marketTotalsMap,
        spreadTotalsMap,
        mutateOrder,
      }: {
        totalsMap: Map<string, Map<string, number>>
        marketTotalsMap: Map<string, number>
        spreadTotalsMap: Map<string, number>
        mutateOrder: boolean
      }
    ) => {
      sourceRecords.forEach((record) => {
        if (!record?.packingProgress?.length) {
          return
        }

        const spreadValues = new Map<string, number>()
        const marketValues = new Map<string, number>()

        record.packingProgress.forEach((entry) => {
          const value = Number(entry?.value) || 0
          if (!(value > 0)) {
            return
          }
          const key = entry?.key ?? entry?.label ?? ""
          const normalizedSpread = normalizeSpreadName(key)

          if (spreadSet.has(normalizedSpread)) {
            spreadValues.set(
              normalizedSpread,
              (spreadValues.get(normalizedSpread) ?? 0) + value
            )
            if (mutateOrder && !spreadSeen.has(normalizedSpread)) {
              spreadSeen.add(normalizedSpread)
              spreadOrderFallback.set(normalizedSpread, spreadOrder.length)
              spreadOrder.push(normalizedSpread)
            }
            if (!spreadDisplay.has(normalizedSpread)) {
              const displayLabel =
                entry?.label?.trim?.() || entry?.key?.trim?.() || normalizedSpread
              spreadDisplay.set(normalizedSpread, displayLabel)
            }
            return
          }

          const normalizedMarket = toMarketKey(key)
          if (!normalizedMarket || normalizedMarket === "unassigned") {
            return
          }
          if (!marketSetup.allowed.has(normalizedMarket)) {
            return
          }

          marketValues.set(
            normalizedMarket,
            (marketValues.get(normalizedMarket) ?? 0) + value
          )

          if (mutateOrder && !marketSeen.has(normalizedMarket)) {
            marketSeen.add(normalizedMarket)
            marketFallbackOrder.set(normalizedMarket, marketOrder.length)
            marketOrder.push(normalizedMarket)
          }
          if (!marketDisplay.has(normalizedMarket)) {
            const display =
              entry?.label?.trim?.() || entry?.key?.trim?.() || normalizedMarket
            marketDisplay.set(normalizedMarket, display.toUpperCase())
          }
        })

        const totalMarket = Array.from(marketValues.values()).reduce(
          (acc, value) => acc + value,
          0
        )
        if (!(totalMarket > 0) || spreadValues.size === 0) {
          return
        }

        marketValues.forEach((value, marketKey) => {
          marketTotalsMap.set(
            marketKey,
            (marketTotalsMap.get(marketKey) ?? 0) + value
          )
        })

        spreadValues.forEach((spreadValue, spreadKey) => {
          spreadTotalsMap.set(
            spreadKey,
            (spreadTotalsMap.get(spreadKey) ?? 0) + spreadValue
          )
        })

        marketValues.forEach((value, marketKey) => {
          if (!(value > 0)) {
            return
          }
          const ratio = value / totalMarket
          if (!(ratio > 0)) {
            return
          }
          spreadValues.forEach((spreadValue, spreadKey) => {
            if (!(spreadValue > 0)) {
              return
            }
            const allocation = spreadValue * ratio
            if (!(allocation > 0)) {
              return
            }
            let spreadMap = totalsMap.get(marketKey)
            if (!spreadMap) {
              spreadMap = new Map<string, number>()
              totalsMap.set(marketKey, spreadMap)
            }
            spreadMap.set(
              spreadKey,
              (spreadMap.get(spreadKey) ?? 0) + allocation
            )
          })
        })
      })
    }

    processRecords(records, {
      totalsMap: totals,
      marketTotalsMap: marketTotals,
      spreadTotalsMap: spreadTotals,
      mutateOrder: true,
    })

    if (showPrevSeason && previousRecords.length > 0) {
      processRecords(previousRecords, {
        totalsMap: prevTotals,
        marketTotalsMap: prevMarketTotals,
        spreadTotalsMap: prevSpreadTotals,
        mutateOrder: false,
      })
    }

    const visibleMarkets = Array.from(marketTotals.entries())
      .filter(([, total]) => total > 0)
      .sort((a, b) => {
        const totalDelta = b[1] - a[1]
        if (Math.abs(totalDelta) > Number.EPSILON) {
          return totalDelta
        }
        const aFallback = marketFallbackOrder.get(a[0]) ?? Number.POSITIVE_INFINITY
        const bFallback = marketFallbackOrder.get(b[0]) ?? Number.POSITIVE_INFINITY
        if (aFallback !== bFallback) {
          return aFallback - bFallback
        }
        return a[0].localeCompare(b[0])
      })
      .map(([market]) => market)

    const visibleSpreads = spreadOrder
      .slice()
      .sort((a, b) => compareSpreadsByFixedOrder(a, b, { fallbackOrder: spreadOrderFallback }))
      .reverse()

    const marketIndex = new Map<string, number>()
    visibleMarkets.forEach((market, index) => {
      marketIndex.set(market, index + 1)
    })

    const spreadIndex = new Map<string, number>()
    visibleSpreads.forEach((spread, index) => {
      spreadIndex.set(spread, index + 1)
    })

    const points: BubblePoint[] = []
    let maxActual = 0

    totals.forEach((spreadMap, marketKey) => {
      const x = marketIndex.get(marketKey)
      if (!x) {
        return
      }
      spreadMap.forEach((value, spreadKey) => {
        const y = spreadIndex.get(spreadKey)
        if (!y) {
          return
        }
        if (!(value > 0)) {
          return
        }
        const spreadTotal = spreadTotals.get(spreadKey) ?? 0
        const percent = spreadTotal > 0 ? (value / spreadTotal) * 100 : 0
        maxActual = Math.max(maxActual, value)
        const ratio = maxActual > 0 ? value / maxActual : 0
        const baseColor = interpolateFruitColor(ratio)
        const lightIntensity = 0.05 + 0.15 * (1 - ratio)
        const fillTint = tintWithLight(baseColor, lightIntensity)
        const fillAlpha = 0.7 + 0.3 * ratio
        const fill = `rgba(${fillTint.r}, ${fillTint.g}, ${fillTint.b}, ${Math.max(0, Math.min(1, fillAlpha))})`
        const stroke = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`
        const displayMarket = marketDisplay.get(marketKey) ?? marketKey.toUpperCase()
        const displaySpread = spreadDisplay.get(spreadKey) ?? spreadKey

        const prevSpreadMap = prevTotals.get(marketKey)
        const hasPrevEntry = Boolean(prevSpreadMap?.has(spreadKey))
        const prevActualRaw = hasPrevEntry ? prevSpreadMap!.get(spreadKey)! : 0
        const prevSpreadTotal = prevSpreadTotals.get(spreadKey) ?? 0
        const prevPercent =
          hasPrevEntry && prevSpreadTotal > 0 ? (prevActualRaw / prevSpreadTotal) * 100 : 0

        points.push({
          market: displayMarket,
          canonicalMarket: marketKey,
          canonicalSpread: spreadKey,
          spread: displaySpread,
          actual: value,
          percent,
          x,
          y,
          fill,
          stroke,
          prevActual: showPrevSeason && hasPrevEntry ? prevActualRaw : undefined,
          prevPercent: showPrevSeason && hasPrevEntry ? prevPercent : undefined,
          hasPrevData: showPrevSeason && hasPrevEntry,
        })
      })
    })

    return {
      dataPoints: points,
      markets: visibleMarkets,
      spreads: visibleSpreads.map((spread) => spreadDisplay.get(spread) ?? spread),
      maxActualValue: maxActual,
      marketDisplayMap: marketDisplay,
    }
  }, [records, previousRecords, showPrevSeason, marketSetup, spreadConfig, spreadSet])

  const [showActualValues, setShowActualValues] = React.useState(true)

  const heatmapGridStroke = React.useMemo(() => "rgba(148, 163, 184, 0.28)", [])

  const renderMarketTick = React.useCallback(
    (props: { x?: number; y?: number; payload?: { value?: number } }) => {
      const { x = 0, y = 0, payload } = props
      const value = typeof payload?.value === "number" ? payload.value : NaN
      const canonical = Number.isFinite(value) ? markets[value - 1] ?? "" : ""
      const display = canonical
        ? marketDisplayMap.get(canonical) ?? canonical.toUpperCase()
        : ""

      return (
        <g transform={`translate(${x},${y})`}>
          <text
            dy={12}
            textAnchor="middle"
            fill="currentColor"
            className="text-[11px]"
          >
            <title>{canonical}</title>
            {display}
          </text>
        </g>
      )
    },
    [markets, marketDisplayMap]
  )

  const renderSpreadTick = React.useCallback(
    (props: { x?: number; y?: number; payload?: { value?: number } }) => {
      const { x = 0, y = 0, payload } = props
      const value = typeof payload?.value === "number" ? payload.value : NaN
      const label = Number.isFinite(value) ? spreads[value - 1] ?? "" : ""

      return (
        <g transform={`translate(${x},${y})`}>
          <text
            dx={-6}
            dy={4}
            textAnchor="end"
            fill="currentColor"
            className="text-[12px]"
          >
            <title>{label}</title>
            {label}
          </text>
        </g>
      )
    },
    [spreads]
  )

  const scatterData = React.useMemo<ChartBubblePoint[]>(
    () =>
      dataPoints.map((point) => ({
        ...point,
        value: showActualValues ? point.actual : point.percent,
      })),
    [dataPoints, showActualValues]
  )

  const renderBubbleLabel = React.useCallback(
    ({ cx, cy, value, fill, payload }: BubbleLabelProps) => {
      const x = typeof cx === "string" ? Number.parseFloat(cx) : cx
      const y = typeof cy === "string" ? Number.parseFloat(cy) : cy
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null
      }

      const effectiveValue = typeof value === "string" ? Number.parseFloat(value) : value
      const fallbackPoint = payload as ChartBubblePoint | undefined
      const rawValue = showActualValues
        ? fallbackPoint?.actual ?? effectiveValue
        : fallbackPoint?.percent ?? effectiveValue
      if (!(typeof rawValue === "number" && rawValue > 0)) {
        return null
      }

      const text = showActualValues
        ? formatCompact(rawValue)
        : `${NUMBER_FORMATTER.format(rawValue)}%`
      const bubbleFill = typeof fill === "string" ? fill : fallbackPoint?.fill
      const textColor = getBubbleTextColor(bubbleFill || "rgba(17, 24, 39, 0.85)")

      return (
        <text
          x={x}
          y={y}
          fill={textColor}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[9px]"
          pointerEvents="none"
        >
          {text}
        </text>
      )
    },
    [showActualValues]
  )

  const zDomain: [number, number] = showActualValues
    ? [0, Math.max(maxActualValue, 1)]
    : [0, 100]

  const handleActualToggle = React.useCallback((checked: boolean) => {
    setShowActualValues(checked)
  }, [])

  if (loading || marketsLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className={titleClassName}>Market by Spread</CardTitle>
              <CardDescription className="text-base sm:text-sm text-left">
                {subtitle}
              </CardDescription>
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

  if (dataPoints.length === 0 || markets.length === 0 || spreads.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className={titleClassName}>Market by Spread</CardTitle>
              <CardDescription className="text-base sm:text-sm text-left">
                {subtitle}
              </CardDescription>
            </div>
            {headerActions ? (
              <div className="flex items-center gap-2 pt-1">
                {headerActions}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No market distribution data available</p>
        </CardContent>
      </Card>
    )
  }

  const xTicks = markets.map((_, index) => index + 1)
  const yTicks = spreads.map((_, index) => index + 1)
  const xDomain: [number, number] = [0.5, Math.max(markets.length + 0.5, 1)]
  const yDomain: [number, number] = [0.5, Math.max(spreads.length + 0.5, 1)]

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className={titleClassName}>Market by Spread</CardTitle>
            <CardDescription className="text-base sm:text-sm text-left">
              {subtitle}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center gap-2">
              <input
                id="market-spread-actual-values"
                type="checkbox"
                checked={showActualValues}
                onChange={(event) => handleActualToggle(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label
                htmlFor="market-spread-actual-values"
                className="text-sm font-normal cursor-pointer"
              >
                Actual Values
              </Label>
            </div>
            {headerActions ? (
              <div className="flex items-center gap-2">
                {headerActions}
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={{}} className="h-full w-full">
          <ScatterChart>
            <CartesianGrid stroke={heatmapGridStroke} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              ticks={xTicks}
              tick={renderMarketTick}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              interval={0}
              height={15}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              ticks={yTicks}
              tick={renderSpreadTick}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <ZAxis type="number" dataKey="value" domain={zDomain} range={[220, 680]} />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={<CustomTooltip showActualValues={showActualValues} showPrevSeason={showPrevSeason} />}
            />
            <Scatter data={scatterData} shape="circle">
              {scatterData.map((point) => (
                <Cell
                  key={`${point.canonicalMarket}-${point.spread}`}
                  fill={point.fill}
                  stroke={point.stroke}
                  strokeWidth={1.5}
                />
              ))}
              <LabelList dataKey="value" content={renderBubbleLabel} />
            </Scatter>
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
