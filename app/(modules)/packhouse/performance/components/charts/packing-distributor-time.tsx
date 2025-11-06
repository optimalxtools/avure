"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"

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
import { getDistributorDisplayLabel } from "../../../utils/usePackhouseConfig"
import {
  type Granularity,
  usePackingAnalytics,
  type AggregatedRecord,
} from "./packing-analytics"
import { useIsMobile } from "@/hooks/use-mobile"

const COLOR_PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
]

const ACTUAL_SUFFIX = "__actual"

type PackingDistributorChartProps = {
  selectionLabel: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  granularity: Granularity
  showPrevYear: boolean
  onPrevYearAvailabilityChange?: (available: boolean) => void
  showActualValues?: boolean
  renderMobileActualToggle?: React.ReactNode
}

type DistributorKey = {
  name: string
  key: string
}

type DistributorShareRecord = {
  label: string
  tooltip: string
  periodIdentifier: string
  [key: string]: string | number
}

type DistributorTooltipPayload = {
  dataKey?: string | number
  value?: number
  payload?: Record<string, unknown>
}

type DistributorTooltipProps = {
  active?: boolean
  label?: string | number
  payload?: DistributorTooltipPayload[]
  distributorKeys: DistributorKey[]
  showPrevYear: boolean
  showActual: boolean
  valueFormatter: (value: number | undefined) => string
}

function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10
  return `${rounded.toFixed(1)}%`
}

function DistributorTooltipContent({
  active,
  label,
  payload,
  distributorKeys,
  showPrevYear,
  showActual,
  valueFormatter,
}: DistributorTooltipProps) {
  if (!active || !payload?.length || distributorKeys.length === 0) {
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

  const rows = distributorKeys.map(({ name, key }) => {
    const currentKey = showActual ? `${key}${ACTUAL_SUFFIX}` : key
    const previousKey = showActual ? `prev_${key}${ACTUAL_SUFFIX}` : `prev_${key}`
    const current = payload.find((item) => item.dataKey === currentKey)
    const previous = payload.find((item) => item.dataKey === previousKey)
    const currentValue = typeof current?.value === "number" ? current.value : undefined
    const previousValue = typeof previous?.value === "number" ? previous.value : undefined
    return {
      name,
      key,
      current: currentValue,
      previous: previousValue,
    }
  })

  const hasPrevValues = showPrevYear && rows.some((row) => typeof row.previous === "number")

  return (
    <div className="min-w-[200px] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      {tooltipLabel ? (
        <div className="mb-2 text-sm font-medium text-foreground">{tooltipLabel}</div>
      ) : null}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-1 pr-3 text-left font-medium">Distributor</th>
            <th className="py-1 pr-3 text-right font-medium">Current</th>
            {hasPrevValues ? (
              <th className="py-1 text-right font-medium">Prev</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="text-foreground">
          {rows.map(({ name, key, current, previous }) => (
            <tr key={key}>
              <td className="py-1 pr-3 text-left font-medium">{name}</td>
              <td className="py-1 pr-3 text-right font-mono tabular-nums">
                {valueFormatter(current)}
              </td>
              {hasPrevValues ? (
                <td className="py-1 text-right font-mono tabular-nums">
                  {valueFormatter(previous)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
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

function buildDistributorShares(
  record: AggregatedRecord,
  distributorKeys: DistributorKey[]
): DistributorShareRecord {
  const totals = record.distributorTotals ?? {}

  const distributionTotals = distributorKeys.map(({ key }) => totals[key] ?? 0)
  const distributionTotal = distributionTotals.reduce((acc, value) => acc + value, 0)

  const result: DistributorShareRecord = {
    label: record.label,
    tooltip: record.tooltip,
    periodIdentifier: record.periodIdentifier,
  }

  if (distributionTotal <= 0) {
    distributorKeys.forEach(({ key }) => {
      result[key] = 0
      result[`${key}${ACTUAL_SUFFIX}`] = 0
    })
    return result
  }

  distributorKeys.forEach(({ key }, index) => {
    const total = distributionTotals[index]
    const percentage = (total / distributionTotal) * 100
    const rounded = Math.round((percentage + Number.EPSILON) * 100) / 100
    result[key] = rounded
    result[`${key}${ACTUAL_SUFFIX}`] = total
  })

  return result
}

export function PackingDistributorChart({
  selectionLabel,
  records,
  previousRecords,
  granularity,
  showPrevYear,
  onPrevYearAvailabilityChange,
  showActualValues: showActualValuesProp,
  renderMobileActualToggle,
}: PackingDistributorChartProps) {
  const analytics = usePackingAnalytics({
    records,
    previousRecords,
    granularity,
    subtitle: selectionLabel,
  })

  const distributorKeys = React.useMemo<DistributorKey[]>(() => {
    const totals = new Map<string, { label: string; total: number }>()

    const includeRecord = (record: AggregatedRecord) => {
      const recordTotals = record.distributorTotals ?? {}
      Object.entries(recordTotals).forEach(([key, value]) => {
        if (!(value > 0)) {
          return
        }
        const label = record.distributorLabels?.[key] ?? key
        const current = totals.get(key)
        if (current) {
          current.total += value
        } else {
          totals.set(key, { label, total: value })
        }
      })
    }

    analytics.aggregatedRecords.forEach(includeRecord)
    analytics.previousAggregatedRecords.forEach(includeRecord)

    return Array.from(totals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([key, info]) => {
        const display = getDistributorDisplayLabel(info.label)
        return {
          key,
          name: display.toUpperCase(),
        }
      })
  }, [analytics.aggregatedRecords, analytics.previousAggregatedRecords])

  const chartConfig = React.useMemo<ChartConfig>(() => {
    if (!distributorKeys.length) return {}
    return distributorKeys.reduce<ChartConfig>((acc, { name, key }, index) => {
      const color = COLOR_PALETTE[index % COLOR_PALETTE.length]
      acc[key] = {
        label: name,
        color,
      }
      acc[`prev_${key}`] = {
        label: `${name} (Prev)`,
        color,
      }
      acc[`${key}${ACTUAL_SUFFIX}`] = {
        label: name,
        color,
      }
      acc[`prev_${key}${ACTUAL_SUFFIX}`] = {
        label: `${name} (Prev)`,
        color,
      }
      return acc
    }, {})
  }, [distributorKeys])

  const previousLookup = React.useMemo(() => {
    if (!analytics.previousAggregatedRecords?.length) return new Map<string, DistributorShareRecord>()
    const map = new Map<string, DistributorShareRecord>()
    analytics.previousAggregatedRecords.forEach((record) => {
      map.set(record.periodIdentifier, buildDistributorShares(record, distributorKeys))
    })
    return map
  }, [analytics.previousAggregatedRecords, distributorKeys])

  const data = React.useMemo(() => {
    return analytics.aggregatedRecords.map((record) => {
      const base = buildDistributorShares(record, distributorKeys)
      const previous = previousLookup.get(record.periodIdentifier)
      if (previous) {
        distributorKeys.forEach(({ key }) => {
          base[`prev_${key}`] = previous[key] ?? 0
          base[`prev_${key}${ACTUAL_SUFFIX}`] = previous[`${key}${ACTUAL_SUFFIX}`] ?? 0
        })
      }
      return base
    })
  }, [analytics.aggregatedRecords, distributorKeys, previousLookup])

  const actualExtents = React.useMemo(() => {
    if (!data.length) return { currentMax: 0, prevMax: 0 }
    return data.reduce(
      (acc, row) => {
        const currentTotal = distributorKeys.reduce((sum, { key }) => {
          const value = row[`${key}${ACTUAL_SUFFIX}`]
          return sum + (typeof value === "number" ? value : 0)
        }, 0)
        const previousTotal = distributorKeys.reduce((sum, { key }) => {
          const value = row[`prev_${key}${ACTUAL_SUFFIX}`]
          return sum + (typeof value === "number" ? value : 0)
        }, 0)
        return {
          currentMax: Math.max(acc.currentMax, currentTotal),
          prevMax: Math.max(acc.prevMax, previousTotal),
        }
      },
      { currentMax: 0, prevMax: 0 }
    )
  }, [data, distributorKeys])

  const [isClient, setIsClient] = React.useState(false)
  const showActualValues = showActualValuesProp === true

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  React.useEffect(() => {
    onPrevYearAvailabilityChange?.(analytics.hasPrevYearData)
  }, [analytics.hasPrevYearData, onPrevYearAvailabilityChange])

  const shouldShowPrevYear = showPrevYear && analytics.hasPrevYearData
  const isMobile = useIsMobile()

  const chartMargin = React.useMemo(
    () => ({ top: 12, right: isMobile ? 6 : 10, bottom: 0, left: isMobile ? -12 : -10 }),
    [isMobile]
  )

  const yAxisDomain = React.useMemo<[number, number]>(() => {
    if (showActualValues) {
      const targetMax = shouldShowPrevYear
        ? Math.max(actualExtents.currentMax, actualExtents.prevMax)
        : actualExtents.currentMax
      const padded = Math.ceil((targetMax || 0) * 1.05)
      return [0, padded > 0 ? padded : 10]
    }
    return [0, 100]
  }, [showActualValues, shouldShowPrevYear, actualExtents])

  const yTickFormatter = React.useCallback(
    (value: number) =>
      showActualValues
        ? analytics.packingFormatter.format(value)
        : `${Number(value.toFixed(0))}%`,
    [showActualValues, analytics.packingFormatter]
  )

  const tooltipValueFormatter = React.useCallback(
    (value: number | undefined) =>
      showActualValues
        ? typeof value === "number" && Number.isFinite(value)
          ? analytics.packingFormatter.format(value)
          : "—"
        : formatPercent(value),
    [showActualValues, analytics.packingFormatter]
  )

  const subtitleText =
    analytics.subtitle && analytics.subtitle.trim().length > 0
      ? analytics.subtitle
      : "Distributor share of packing"
  const fullSubtitle = `${subtitleText} | ${analytics.granularityLabel}`
  const loadingSubtitle =
    selectionLabel && selectionLabel.trim().length > 0
      ? `${selectionLabel} | ${analytics.granularityLabel}`
      : `Distributor share of packing | ${analytics.granularityLabel}`

  if (!isClient) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Distributor</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">{loadingSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading chart...
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasData = analytics.hasData && distributorKeys.length > 0

  return (
    <Card className="w-full">
      <CardHeader className="pb-0">
  <CardTitle className="text-2xl sm:text-lg text-left">Packing Distributor</CardTitle>
  <CardDescription className="text-base sm:text-sm text-left">{fullSubtitle}</CardDescription>
        {/* Mobile only: render the toggle below the subheading if provided */}
        {analytics.hasData && renderMobileActualToggle}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[280px] w-full"
          >
            <BarChart data={data} margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis domain={yAxisDomain} tickFormatter={yTickFormatter} />
              <RechartsTooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                content={
                  <DistributorTooltipContent
                    distributorKeys={distributorKeys}
                    showPrevYear={shouldShowPrevYear}
                    showActual={showActualValues}
                    valueFormatter={tooltipValueFormatter}
                  />
                }
              />
              {shouldShowPrevYear &&
                distributorKeys.map(({ name, key }, index) => (
                  <Bar
                    key={`prev_${key}`}
                    stackId="prev"
                    dataKey={showActualValues ? `prev_${key}${ACTUAL_SUFFIX}` : `prev_${key}`}
                    fill={`var(--color-${key})`}
                    fillOpacity={0.35}
                    stroke={`var(--color-${key})`}
                    strokeDasharray="4 2"
                    name={`${name} (Prev)`}
                    radius={index === distributorKeys.length - 1 ? [4, 4, 0, 0] : 0}
                    legendType="none"
                  />
                ))}
              {distributorKeys.map(({ name, key }, index) => (
                <Bar
                  key={key}
                  stackId="current"
                  dataKey={showActualValues ? `${key}${ACTUAL_SUFFIX}` : key}
                  fill={`var(--color-${key})`}
                  name={name}
                  radius={index === distributorKeys.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
              <ChartLegend content={<FilteredLegend />} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No distributor data available for this view yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
