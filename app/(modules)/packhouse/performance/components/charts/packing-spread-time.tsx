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
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import {
  type Granularity,
  usePackingAnalytics,
} from "./packing-analytics"
import {
  normalizeSpreadName,
  usePackhouseConfig,
  compareSpreadsByFixedOrder,
} from "../../../utils/usePackhouseConfig"
import { useIsMobile } from "@/hooks/use-mobile"

type PackingSpreadChartProps = {
  selectionLabel: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  granularity: Granularity
  showActualValues?: boolean
  renderMobileActualToggle?: React.ReactNode
  showPrevSeason?: boolean
}

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

function getBubbleTextColor(fill: string): string {
  const greyTextColor = "hsl(var(--muted-foreground))"
  const whiteTextColor = "#ffffff"
  const rgbaMatch = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!rgbaMatch) {
    return greyTextColor
  }
  const [r, g, b] = rgbaMatch.slice(1, 4).map(Number)

  // Simple heuristic: if the average RGB value is high (lighter color), use grey
  // If average is low (darker color), use white
  const average = (r + g + b) / 3
  
  // Average > 180 means it's a light color, use grey
  // Average <= 180 means it's darker, use white
  return average > 180 ? greyTextColor : whiteTextColor
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

function tintWithLight(color: { r: number; g: number; b: number }, intensity = 0.2) {
  const clamp = (value: number) => Math.min(255, Math.round(value))
  const blend = (channel: number) => clamp(channel + (255 - channel) * intensity)
  return { r: blend(color.r), g: blend(color.g), b: blend(color.b) }
}

type BubblePoint = {
  timeLabel: string
  timeTooltip: string
  spread: string
  x: number
  y: number
  actual: number
  percent: number
  fill: string
  stroke: string
  prevActual: number | null
  prevPercent: number | null
  hasPrevData: boolean
}

type TooltipProps = {
  active?: boolean
  payload?: Array<{ payload: BubblePoint }>
  showActualValues: boolean
  showPrevSeason: boolean
  percentFormatter: Intl.NumberFormat
}

function CustomTooltip({ active, payload, showActualValues, showPrevSeason, percentFormatter }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const data = payload[0]?.payload
  if (!data) {
    return null
  }

  const formatActual = (value: number | null) =>
    typeof value === "number"
      ? `${NUMBER_FORMATTER.format(value)} tons`
      : "—"

  const formatPercentValue = (value: number | null) =>
    typeof value === "number"
      ? percentFormatter.format(value / 100)
      : "—"

  const currentActualText = formatActual(data.actual)
  const currentPercentText = formatPercentValue(data.percent)
  const prevActualText = formatActual(data.prevActual)
  const prevPercentText = formatPercentValue(data.prevPercent)

  const showPrevValues = showPrevSeason && data.hasPrevData

  const primary = showActualValues ? currentActualText : currentPercentText
  const secondary = showActualValues ? currentPercentText : currentActualText
  const prevPrimary = showActualValues ? prevActualText : prevPercentText
  const prevSecondary = showActualValues ? prevPercentText : prevActualText

  return (
    <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-sm">
      <div className="font-medium text-sm" title={data.timeTooltip}>
        {data.timeLabel}
      </div>
      <div className="text-muted-foreground">{data.spread}</div>
      <div className="mt-1 space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Current</span>
          <span className="font-semibold">{primary}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-muted-foreground">
          <span>{showActualValues ? "Share" : "Actual"}</span>
          <span className="font-semibold text-foreground">{secondary}</span>
        </div>
        {showPrevValues ? (
          <>
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Prev</span>
              <span className="font-semibold">{prevPrimary}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-muted-foreground">
              <span>{showActualValues ? "Prev Share" : "Prev Actual"}</span>
              <span className="font-semibold text-foreground">{prevSecondary}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function PackingSpreadChart({
  selectionLabel,
  records,
  previousRecords,
  granularity,
  showActualValues: showActualValuesProp,
  renderMobileActualToggle,
  showPrevSeason: showPrevSeasonProp,
}: PackingSpreadChartProps) {
  const showActualValues = showActualValuesProp !== false
  const showPrevSeason = showPrevSeasonProp === true
  const isMobile = useIsMobile()

  const analytics = usePackingAnalytics({
    records,
    previousRecords,
    granularity,
    subtitle: selectionLabel,
  })

  const config = usePackhouseConfig()

  const filteredColumns = React.useMemo(() => {
    const baseColumns = config.spreads.size
      ? analytics.packingColumns.filter((column) => {
          const normalizedLabel = normalizeSpreadName(column.label)
          const normalizedKey = normalizeSpreadName(column.key)
          return config.spreads.has(normalizedLabel) || config.spreads.has(normalizedKey)
        })
      : analytics.packingColumns

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

    baseColumns.forEach((column) => {
      registerFallback(column.label)
      registerFallback(column.key)
    })

    return baseColumns
      .slice()
      .sort((a, b) => {
        const compare = compareSpreadsByFixedOrder(a.label || a.key, b.label || b.key, {
          fallbackOrder: orderFallback,
        })
        if (compare !== 0) {
          return compare
        }
        return compareSpreadsByFixedOrder(a.key, b.key, { fallbackOrder: orderFallback })
      })
  }, [analytics.packingColumns, config.spreads, config.spreadList])

  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const hideDailyValues = granularity === "daily" && analytics.bucketCount > 45
  const subtitleText =
    analytics.subtitle && analytics.subtitle.trim().length > 0
      ? analytics.subtitle
      : "Share of packing activity by size"
  const fullSubtitle = `${subtitleText} | ${analytics.granularityLabel}`
  const hasSpreadData = analytics.hasData && filteredColumns.length > 0

  const {
    points: dataPoints,
    timeLabels,
    timeTooltips,
    spreadLabels,
    maxActualValue,
  } = React.useMemo(() => {
    const timeRecords = analytics.aggregatedRecords
    const previousTimeRecords = analytics.previousAggregatedRecords
    if (!timeRecords.length || !filteredColumns.length) {
      return {
        points: [] as BubblePoint[],
        timeLabels: [] as string[],
        timeTooltips: [] as string[],
        spreadLabels: [] as string[],
        maxActualValue: 0,
      }
    }

    const spreads = filteredColumns.map((column) => ({
      key: column.key,
      label: column.label || column.key,
    }))

    const spreadCount = spreads.length

    type RawPoint = {
      timeLabel: string
      timeTooltip: string
      spread: string
      spreadKey: string
      actual: number
      prevActual: number | null
      x: number
      y: number
    }

    const rawPoints: RawPoint[] = []
    let maxActual = 0
    const spreadTotals = new Map<string, number>()
    const prevSpreadTotals = new Map<string, number>()

    spreads.forEach((spread) => {
      spreadTotals.set(spread.key, 0)
      prevSpreadTotals.set(spread.key, 0)
    })

    const currentLookup = new Map<string, (typeof timeRecords)[number]>()
    timeRecords.forEach((record) => {
      currentLookup.set(`${record.periodIdentifier}-${record.year}`, record)
    })

    const previousLookup = new Map<string, (typeof previousTimeRecords)[number]>()
    previousTimeRecords.forEach((record) => {
      previousLookup.set(record.periodIdentifier, record)
    })

    timeRecords.forEach((record, columnIndex) => {
      const inlinePrevious = currentLookup.get(`${record.periodIdentifier}-${record.year - 1}`)
      const overlayPrevious = previousLookup.get(record.periodIdentifier)
      const previousRecord = overlayPrevious ?? inlinePrevious ?? null

      spreads.forEach((spread, spreadIndex) => {
        const actual = record.packingProgress[spread.key] ?? 0
        const previousValueCandidate = previousRecord
          ? previousRecord.packingProgress[spread.key]
          : undefined
        const prevActual = typeof previousValueCandidate === "number" ? previousValueCandidate : null

        if (typeof prevActual === "number") {
          prevSpreadTotals.set(
            spread.key,
            (prevSpreadTotals.get(spread.key) ?? 0) + prevActual
          )
        }

        if (!(actual > 0)) {
          return
        }
        maxActual = Math.max(maxActual, actual)
        spreadTotals.set(
          spread.key,
          (spreadTotals.get(spread.key) ?? 0) + actual
        )
        rawPoints.push({
          timeLabel: record.label,
          timeTooltip: record.tooltip || record.label,
          spread: spread.label,
          spreadKey: spread.key,
          actual,
          prevActual,
          x: columnIndex + 1,
          y: spreadCount - spreadIndex,
        })
      })
    })

    const points: BubblePoint[] = rawPoints.map((point) => {
      const { spreadKey, prevActual, ...rest } = point
      const spreadTotal = spreadTotals.get(spreadKey) ?? 0
      const percent = spreadTotal > 0 ? (rest.actual / spreadTotal) * 100 : 0
      const ratio = maxActual > 0 ? rest.actual / maxActual : 0
      const baseColor = interpolateFruitColor(ratio)
      const lightIntensity = 0.05 + 0.15 * (1 - ratio)
      const fillTint = tintWithLight(baseColor, lightIntensity)
      const fillAlpha = 0.7 + 0.3 * ratio
      const prevTotal = prevSpreadTotals.get(spreadKey) ?? 0
      const prevPercent =
        typeof prevActual === "number"
          ? prevTotal > 0
            ? (prevActual / prevTotal) * 100
            : 0
          : null
      const hasPrevData = typeof prevActual === "number"
      return {
        ...rest,
        percent,
        prevActual,
        prevPercent,
        hasPrevData,
        fill: `rgba(${fillTint.r}, ${fillTint.g}, ${fillTint.b}, ${Math.max(0, Math.min(1, fillAlpha))})`,
        stroke: `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`,
      }
    })

    return {
      points,
      timeLabels: timeRecords.map((record) => record.label),
      timeTooltips: timeRecords.map((record) => record.tooltip || record.label),
      spreadLabels: spreads.map((spread) => spread.label).reverse(),
      maxActualValue: maxActual,
    }
  }, [analytics.aggregatedRecords, analytics.previousAggregatedRecords, filteredColumns])

  const heatmapGridStroke = React.useMemo(() => "rgba(148, 163, 184, 0.28)", [])

  const renderTimeTick = React.useCallback(
    (props: { x?: number; y?: number; payload?: { value?: number } }) => {
      const { x = 0, y = 0, payload } = props
  const rawValue = typeof payload?.value === "number" ? payload.value : NaN
  const value = Number.isFinite(rawValue) ? Math.round(rawValue) : NaN
  const index = Number.isFinite(value) ? value - 1 : -1
      const label = index >= 0 ? timeLabels[index] ?? "" : ""
      const tooltip = index >= 0 ? timeTooltips[index] ?? label : label

      return (
        <g transform={`translate(${x},${y})`}>
          <text
            dy={12}
            textAnchor="middle"
            fill="currentColor"
            className="text-[12px] font-medium"
          >
            <title>{tooltip}</title>
            {label}
          </text>
        </g>
      )
    },
    [timeLabels, timeTooltips]
  )

  const renderSpreadTick = React.useCallback(
    (props: { x?: number; y?: number; payload?: { value?: number } }) => {
      const { x = 0, y = 0, payload } = props
      const value = typeof payload?.value === "number" ? payload.value : NaN
      const index = Number.isFinite(value) ? value - 1 : -1
      const label = index >= 0 ? spreadLabels[index] ?? "" : ""

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
    [spreadLabels]
  )

  const renderBubbleLabel = React.useCallback(
    (props: { value?: number | string; cx?: number | string; cy?: number | string; viewBox?: unknown; payload?: unknown; fill?: string }) => {
      if (hideDailyValues) {
        return null
      }

      const toNumeric = (input: unknown): number | undefined => {
        if (typeof input === "number" && Number.isFinite(input)) {
          return input
        }
        if (typeof input === "string") {
          const parsed = Number(input.trim())
          return Number.isFinite(parsed) ? parsed : undefined
        }
        return undefined
      }

      const numericValue = toNumeric(props.value)
      const numericCx = toNumeric(props.cx)
      const numericCy = toNumeric(props.cy)

      const geometry =
        props.viewBox && typeof props.viewBox === "object"
          ? (props.viewBox as { [key: string]: unknown })
          : undefined
      const boxX = geometry ? toNumeric(geometry["x"]) : undefined
      const boxY = geometry ? toNumeric(geometry["y"]) : undefined
      const boxWidth = geometry ? toNumeric(geometry["width"]) : undefined
      const boxHeight = geometry ? toNumeric(geometry["height"]) : undefined

      const centerX =
        numericCx ?? (typeof boxX === "number" && typeof boxWidth === "number"
          ? boxX + boxWidth / 2
          : undefined)
      const centerY =
        numericCy ?? (typeof boxY === "number" && typeof boxHeight === "number"
          ? boxY + boxHeight / 2
          : undefined)

      if (typeof numericValue !== "number" || typeof centerX !== "number" || typeof centerY !== "number") {
        return null
      }

      // Mobile: show label inside bubble with compact formatting
      if (isMobile) {
        const labelText = showActualValues
          ? formatCompact(numericValue)
          : `${NUMBER_FORMATTER.format(numericValue)}%`
        
        const bubblePoint = props.payload as BubblePoint | undefined
        const bubbleFill = typeof props.fill === "string" ? props.fill : bubblePoint?.fill || "rgba(17, 24, 39, 0.85)"
        const textColor = getBubbleTextColor(bubbleFill)

        return (
          <text
            x={centerX}
            y={centerY}
            fill={textColor}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[9px]"
            pointerEvents="none"
          >
            {labelText}
          </text>
        )
      }

      // Desktop: show label below bubble
      const radius = typeof boxWidth === "number" ? boxWidth / 2 : 0
      const verticalOffset = Math.max(3, radius * 0.15)
      const labelText = showActualValues
        ? NUMBER_FORMATTER.format(numericValue)
        : analytics.percentFormatter.format(numericValue / 100)
      const labelX = centerX
      const labelHeight = 18
      const labelTop = centerY + radius + verticalOffset
      const labelY = labelTop + labelHeight / 2

      return (
        <text
          x={labelX}
          y={labelY}
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-[10px] font-medium fill-muted-foreground"
        >
          {labelText}
        </text>
      )
    },
    [analytics.percentFormatter, hideDailyValues, showActualValues, isMobile]
  )

  const scatterData = React.useMemo(
    () =>
      dataPoints.map((point) => ({
        ...point,
        value: showActualValues ? point.actual : point.percent,
      })),
    [dataPoints, showActualValues]
  )

  const zDomain: [number, number] = showActualValues
    ? [0, Math.max(maxActualValue, 1)]
    : [0, 100]

  const xTicks = React.useMemo(() => {
    const count = timeLabels.length
    if (count === 0) {
      return [] as number[]
    }
    if (granularity === "weekly") {
      const maxPreferred = 18
      const useEveryTick = count <= 12
      if (useEveryTick) {
        return timeLabels.map((_, index) => index + 1)
      }
      const step = Math.max(1, count <= maxPreferred ? 2 : Math.ceil(count / maxPreferred))
      const ticks: number[] = []
      for (let index = 0; index < count; index += step) {
        ticks.push(index + 1)
      }
      const lastTick = count
      if (ticks[ticks.length - 1] !== lastTick) {
        ticks.push(lastTick)
      }
      return ticks
    }
    const targetTickCount = granularity === "daily" ? 10 : 12
    if (count <= targetTickCount) {
      return timeLabels.map((_, index) => index + 1)
    }
    const step = Math.max(1, Math.ceil(count / targetTickCount))
    const ticks: number[] = []
    for (let index = 0; index < count; index += step) {
      ticks.push(index + 1)
    }
    const lastTick = count
    if (ticks[ticks.length - 1] !== lastTick) {
      ticks.push(lastTick)
    }
    return ticks
  }, [granularity, timeLabels])

  const yTicks = spreadLabels.map((_, index) => index + 1)
  const xDomain: [number, number] = [0.5, Math.max(timeLabels.length + 0.5, 1)]
  const yDomain: [number, number] = [0.5, Math.max(spreadLabels.length + 0.5, 1)]

  if (!isClient) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Spread</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">
            {selectionLabel || "Share of packing activity by size"}
          </CardDescription>
          {renderMobileActualToggle}
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading chart...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (config.loading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Spread</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">{fullSubtitle}</CardDescription>
          {renderMobileActualToggle}
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading configuration...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (config.error) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Spread</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">{fullSubtitle}</CardDescription>
          {renderMobileActualToggle}
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Failed to load packing configuration.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics.hasData) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Spread</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">{fullSubtitle}</CardDescription>
          {renderMobileActualToggle}
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No records available for the selected filters.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasSpreadData || scatterData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Spread</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">{fullSubtitle}</CardDescription>
          {renderMobileActualToggle}
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No packing spreads configured for this view.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-2xl sm:text-lg text-left">Packing Spread</CardTitle>
        <CardDescription className="text-base sm:text-sm text-left">{fullSubtitle}</CardDescription>
        {renderMobileActualToggle}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={{}} className="h-[450px] sm:h-full w-full">
          <ScatterChart>
            <CartesianGrid stroke={heatmapGridStroke} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              ticks={xTicks}
              tick={renderTimeTick}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              height={30}
              interval={isMobile ? "preserveStart" : 0}
              minTickGap={isMobile ? 50 : 2}
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
              width={45}
            />
            <ZAxis type="number" dataKey="value" domain={zDomain} range={[220, 680]} />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={
                <CustomTooltip
                  showActualValues={showActualValues}
                  showPrevSeason={showPrevSeason}
                  percentFormatter={analytics.percentFormatter}
                />
              }
            />
            <Scatter data={scatterData} shape="circle">
              {scatterData.map((point) => (
                <Cell
                  key={`${point.timeTooltip}-${point.spread}`}
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
