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
  getDistributorDisplayLabel,
} from "../../../utils/usePackhouseConfig"
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
  distributor: string
  canonicalDistributor: string
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

type ScatterLabelProps = {
  value?: number | string
  cx?: number | string
  cy?: number | string
  x?: number | string
  y?: number | string
  viewBox?: unknown
  fill?: string
  payload?: BubblePoint
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
      <div className="font-medium text-sm" title={data.canonicalDistributor}>
        {data.distributor}
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

export function Component({
  subtitle,
  records = [],
  previousRecords = [],
  showPrevSeason = false,
  titleClassName = "text-[20px] text-left",
  headerActions,
}: ComponentProps) {
  const {
    entries,
    distributors: configDistributors,
    loading,
  } = usePackhouseConfig()

  const baseDistributorOrder = React.useMemo(() => {
    if (!configDistributors?.length) {
      return [] as string[]
    }
    const order: string[] = []
    const seen = new Set<string>()
    configDistributors.forEach((label) => {
      const trimmed = label.trim()
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed)
        order.push(trimmed)
      }
    })
    return order
  }, [configDistributors])

  const spreadConfig = React.useMemo(() => {
    const order: string[] = []
    const displayMap = new Map<string, string>()
    const seen = new Set<string>()
    entries.forEach((entry) => {
      const trimmed = entry.spread.trim()
      const normalized = normalizeSpreadName(trimmed)
      if (!normalized || seen.has(normalized)) {
        return
      }
      seen.add(normalized)
      order.push(normalized)
      displayMap.set(normalized, trimmed)
    })
    return {
      order,
      displayMap,
    }
  }, [entries])

  const baseSpreadOrder = spreadConfig.order
  const configSpreadDisplay = spreadConfig.displayMap

  const {
    dataPoints,
    distributors,
    spreads,
    maxActualValue,
    distributorDisplayMap,
  } = React.useMemo(() => {
    const totals = new Map<string, Map<string, number>>()
    const spreadTotals = new Map<string, number>()
    const prevTotals = new Map<string, Map<string, number>>()
    const prevSpreadTotals = new Map<string, number>()
    const distributorDisplay = new Map<string, string>()

    const distributorOrder = [...baseDistributorOrder]
    const distributorSeen = new Set(distributorOrder)
    const spreadOrderNormalized = [...baseSpreadOrder]
    const spreadSeen = new Set(spreadOrderNormalized)
    const spreadDisplay = new Map<string, string>(configSpreadDisplay)
    const spreadOrderFallback = new Map<string, number>()
    spreadOrderNormalized.forEach((normalized, index) => {
      spreadOrderFallback.set(normalized, index)
    })
    const distributorFirstSeenOrder = new Map<string, number>()
    distributorOrder.forEach((label, index) => {
      distributorFirstSeenOrder.set(label, index)
      if (!distributorDisplay.has(label)) {
        distributorDisplay.set(label, getDistributorDisplayLabel(label))
      }
    })
    const spreadsWithValues = new Set<string>()

    const toDistributorKey = (labelRaw: string) => {
      const trimmed = labelRaw?.trim?.() ?? ""
      return trimmed || "Unassigned"
    }

    const appendDistributor = (labelRaw: string) => {
      const resolved = toDistributorKey(labelRaw)
      if (!distributorFirstSeenOrder.has(resolved)) {
        distributorFirstSeenOrder.set(resolved, distributorOrder.length)
      }
      if (!distributorSeen.has(resolved)) {
        distributorSeen.add(resolved)
        distributorOrder.push(resolved)
      }
      if (!distributorDisplay.has(resolved)) {
        distributorDisplay.set(resolved, getDistributorDisplayLabel(resolved))
      }
      return resolved
    }

    const appendSpread = (normalized: string, displayCandidate: string) => {
      if (!normalized) {
        return normalized
      }
      const trimmed = displayCandidate?.trim?.() ?? ""
      const resolvedDisplay = trimmed || spreadDisplay.get(normalized) || normalized
      if (!spreadDisplay.has(normalized)) {
        spreadDisplay.set(normalized, resolvedDisplay)
      }
      if (!spreadSeen.has(normalized)) {
        spreadSeen.add(normalized)
        spreadOrderFallback.set(normalized, spreadOrderNormalized.length)
        spreadOrderNormalized.push(normalized)
      }
      return resolvedDisplay
    }

    records.forEach((record) => {
      record.distributorSpreads?.forEach(({ distributor, spread, value }) => {
        if (!(value > 0)) {
          return
        }

        const normalizedSpread = normalizeSpreadName(spread)
        if (!normalizedSpread) {
          return
        }

        const distributorLabel = appendDistributor(distributor)
        appendSpread(normalizedSpread, spread)
        spreadsWithValues.add(normalizedSpread)

        let distributorTotals = totals.get(distributorLabel)
        if (!distributorTotals) {
          distributorTotals = new Map<string, number>()
          totals.set(distributorLabel, distributorTotals)
        }
        const updatedValue = (distributorTotals.get(normalizedSpread) || 0) + value
        distributorTotals.set(normalizedSpread, updatedValue)
        spreadTotals.set(
          normalizedSpread,
          (spreadTotals.get(normalizedSpread) || 0) + value
        )
      })
    })

    if (showPrevSeason && previousRecords.length > 0) {
      previousRecords.forEach((record) => {
        record.distributorSpreads?.forEach(({ distributor, spread, value }) => {
          if (!(value > 0)) {
            return
          }

          const normalizedSpread = normalizeSpreadName(spread)
          if (!normalizedSpread) {
            return
          }

          const distributorKey = toDistributorKey(distributor)
          let distributorTotals = prevTotals.get(distributorKey)
          if (!distributorTotals) {
            distributorTotals = new Map<string, number>()
            prevTotals.set(distributorKey, distributorTotals)
          }
          distributorTotals.set(
            normalizedSpread,
            (distributorTotals.get(normalizedSpread) || 0) + value
          )
          prevSpreadTotals.set(
            normalizedSpread,
            (prevSpreadTotals.get(normalizedSpread) || 0) + value
          )
        })
      })
    }

    const distributorTotals = new Map<string, number>()
    totals.forEach((spreadMap, distributorLabel) => {
      let total = 0
      spreadMap.forEach((value) => {
        total += value
      })
      distributorTotals.set(distributorLabel, total)
    })

    const visibleDistributors = Array.from(distributorTotals.entries())
      .filter(([, total]) => total > 0)
      .sort((a, b) => {
        if (b[1] === a[1]) {
          const aIndex = distributorFirstSeenOrder.get(a[0]) ?? Number.MAX_SAFE_INTEGER
          const bIndex = distributorFirstSeenOrder.get(b[0]) ?? Number.MAX_SAFE_INTEGER
          return aIndex - bIndex
        }
        return b[1] - a[1]
      })
      .map(([label]) => label)
    const visibleSpreads = spreadOrderNormalized
      .slice()
      .sort((a, b) =>
        compareSpreadsByFixedOrder(a, b, { fallbackOrder: spreadOrderFallback })
      )
      .reverse()

    const distributorIndex = new Map<string, number>()
    visibleDistributors.forEach((label, index) => {
      distributorIndex.set(label, index + 1)
    })

    const spreadIndex = new Map<string, number>()
    visibleSpreads.forEach((normalized, index) => {
      spreadIndex.set(normalized, index + 1)
    })

    const points: BubblePoint[] = []
    let maxActual = 0

    totals.forEach((spreadMap, distributorLabel) => {
      const x = distributorIndex.get(distributorLabel)
      if (!x) {
        return
      }
      spreadMap.forEach((value, normalizedSpread) => {
        const y = spreadIndex.get(normalizedSpread)
        if (!y) {
          return
        }
    const spreadTotal = spreadTotals.get(normalizedSpread) ?? 0
    const percent = spreadTotal > 0 ? (value / spreadTotal) * 100 : 0
    maxActual = Math.max(maxActual, value)
    const ratio = maxActual > 0 ? value / maxActual : 0
    const baseColor = interpolateFruitColor(ratio)
    const lightIntensity = 0.05 + 0.15 * (1 - ratio)
    const fillTint = tintWithLight(baseColor, lightIntensity)
    const fillAlpha = 0.7 + 0.3 * ratio
    const fill = `rgba(${fillTint.r}, ${fillTint.g}, ${fillTint.b}, ${Math.max(0, Math.min(1, fillAlpha))})`
        const stroke = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`
        const displayDistributor =
          distributorDisplay.get(distributorLabel) ?? getDistributorDisplayLabel(distributorLabel)

        const prevSpreadMap = prevTotals.get(distributorLabel)
        const hasPrevEntry = Boolean(prevSpreadMap?.has(normalizedSpread))
        const prevActualRaw = hasPrevEntry ? prevSpreadMap!.get(normalizedSpread)! : 0
        const prevSpreadTotal = prevSpreadTotals.get(normalizedSpread) ?? 0
        const prevPercent =
          hasPrevEntry && prevSpreadTotal > 0 ? (prevActualRaw / prevSpreadTotal) * 100 : 0

        points.push({
          distributor: displayDistributor,
          canonicalDistributor: distributorLabel,
          spread: spreadDisplay.get(normalizedSpread) || normalizedSpread,
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
      distributors: visibleDistributors,
      spreads: visibleSpreads.map((normalized) => spreadDisplay.get(normalized) || normalized),
      maxActualValue: maxActual,
      distributorDisplayMap: distributorDisplay,
    }
  }, [records, previousRecords, showPrevSeason, baseDistributorOrder, baseSpreadOrder, configSpreadDisplay])

  const [showActualValues, setShowActualValues] = React.useState(true)
  const isMobile = useIsMobile()

  const heatmapGridStroke = React.useMemo(() => "rgba(148, 163, 184, 0.28)", [])

  const renderDistributorTick = React.useCallback(
    (props: { x?: number; y?: number; payload?: { value?: number } }) => {
      const { x = 0, y = 0, payload } = props
      const value = typeof payload?.value === "number" ? payload.value : NaN
      const canonical = Number.isFinite(value) ? distributors[value - 1] ?? "" : ""
      const display = canonical
        ? distributorDisplayMap.get(canonical) ?? getDistributorDisplayLabel(canonical)
        : ""
      const label = display ? display.toUpperCase() : ""

      return (
        <g transform={`translate(${x},${y})`}>
          <text
            dy={12}
            textAnchor="middle"
            fill="currentColor"
            className="text-[11px]"
          >
            <title>{canonical}</title>
            {label}
          </text>
        </g>
      )
    },
    [distributors, distributorDisplayMap]
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

  const renderBubbleLabel = React.useCallback(
    (props: ScatterLabelProps) => {
      const { value, cx, cy, x, y, viewBox, fill, payload: rawPayload } = props

      const toNumeric = (input: unknown): number | undefined => {
        if (typeof input === "number" && Number.isFinite(input)) {
          return input
        }
        if (typeof input === "string") {
          const trimmed = input.trim()
          if (!trimmed) {
            return undefined
          }
          const parsed = Number(trimmed)
          return Number.isFinite(parsed) ? parsed : undefined
        }
        return undefined
      }

      const numericValue = toNumeric(value)
      const numericCx = toNumeric(cx)
      const numericCy = toNumeric(cy)
      const numericX = toNumeric(x)
      const numericY = toNumeric(y)

      const geometry =
        viewBox && typeof viewBox === "object"
          ? (viewBox as { [key: string]: unknown })
          : undefined
      const boxX = geometry ? toNumeric(geometry["x"]) : undefined
      const boxY = geometry ? toNumeric(geometry["y"]) : undefined
      const boxWidth = geometry ? toNumeric(geometry["width"]) : undefined
      const boxHeight = geometry ? toNumeric(geometry["height"]) : undefined

      const centerX =
        numericCx ?? (typeof boxX === "number" && typeof boxWidth === "number"
          ? boxX + boxWidth / 2
          : numericX)
      const centerY =
        numericCy ?? (typeof boxY === "number" && typeof boxHeight === "number"
          ? boxY + boxHeight / 2
          : numericY)

      if (typeof centerX !== "number" || typeof centerY !== "number") {
        return null
      }

      const pointPayload = rawPayload
      const resolvedValue = showActualValues
        ? pointPayload?.actual ?? numericValue
        : pointPayload?.percent ?? numericValue

      if (!(typeof resolvedValue === "number" && Number.isFinite(resolvedValue))) {
        return null
      }

      const bubbleFill =
        typeof fill === "string"
          ? fill
          : typeof pointPayload?.fill === "string"
            ? pointPayload.fill
            : undefined

      if (isMobile) {
        const textColor = getBubbleTextColor(bubbleFill || "rgba(17, 24, 39, 0.85)")
        const textValue = showActualValues
          ? formatCompact(resolvedValue)
          : `${NUMBER_FORMATTER.format(resolvedValue)}%`
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
            {textValue}
          </text>
        )
      }

      const radius = typeof boxWidth === "number" ? boxWidth / 2 : 0
      const offset = Math.max(20, radius * 0.75)
      const labelText = showActualValues
        ? NUMBER_FORMATTER.format(resolvedValue)
        : `${NUMBER_FORMATTER.format(resolvedValue)}%`
      const labelX = centerX + offset
      const labelY = centerY
      const approxTextWidth = Math.max(24, labelText.length * 6.5)
      const labelHeight = 18
      const paddingX = 6

      return (
        <g>
          <rect
            x={labelX - paddingX}
            y={labelY - labelHeight / 2}
            width={approxTextWidth + paddingX * 2}
            height={labelHeight}
            rx={labelHeight / 2}
            fill="rgba(255, 255, 255, 0.95)"
          />
          <text
            x={labelX}
            y={labelY}
            dominantBaseline="middle"
            textAnchor="start"
            className="text-[12px] font-medium fill-muted-foreground"
          >
            {labelText}
          </text>
        </g>
      )
    },
    [showActualValues, isMobile]
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

  const handleActualToggle = React.useCallback((checked: boolean) => {
    setShowActualValues(checked)
  }, [])

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className={titleClassName}>Distributor by Spread</CardTitle>
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

  if (dataPoints.length === 0 || distributors.length === 0 || spreads.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className={titleClassName}>Distributor by Spread</CardTitle>
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
          <p className="text-sm text-muted-foreground">No distribution data available</p>
        </CardContent>
      </Card>
    )
  }

  const xTicks = distributors.map((_, index) => index + 1)
  const yTicks = spreads.map((_, index) => index + 1)
  const xDomain: [number, number] = [0.5, Math.max(distributors.length + 0.5, 1)]
  const yDomain: [number, number] = [0.5, Math.max(spreads.length + 0.5, 1)]

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className={titleClassName}>Distributor by Spread</CardTitle>
            <CardDescription className="text-base sm:text-sm text-left">
              {subtitle}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center gap-2">
              <input
                id="distributor-spread-actual-values"
                type="checkbox"
                checked={showActualValues}
                onChange={(event) => handleActualToggle(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label
                htmlFor="distributor-spread-actual-values"
                className="text-sm font-normal cursor-pointer"
              >
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
        <ChartContainer config={{}} className="h-full w-full">
          <ScatterChart>
            <CartesianGrid stroke={heatmapGridStroke} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              ticks={xTicks}
              tick={renderDistributorTick}
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
                  key={`${point.canonicalDistributor}-${point.spread}`}
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
