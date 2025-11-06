"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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
  ChartTooltip,
} from "@/components/ui/chart"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import {
  type Granularity,
  usePackingAnalytics,
} from "./packing-analytics"
import { useIsMobile } from "@/hooks/use-mobile"

const classGradeConfig = {
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
} satisfies ChartConfig

const sanitizeId = (value: string) => value.replace(/:/g, "")

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

const CLASS_KEYS = ["classI", "classII", "classIII"] as const

type ClassTooltipProps = {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    dataKey: string
    payload?: {
      tooltip?: string
      [key: string]: unknown
    }
  }>
  label?: string
  showActualValues: boolean
  showPrevSeason: boolean
}

type TooltipDataRow = {
  tooltip?: string
  currentActuals?: Record<string, number>
  currentPercentages?: Record<string, number>
  previousActuals?: Record<string, number | null>
  previousPercentages?: Record<string, number | null>
}

function ClassTooltipContent({ active, payload, label, showActualValues, showPrevSeason }: ClassTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const dataRow = payload[0]?.payload as TooltipDataRow | undefined
  const tooltipLabel = typeof dataRow?.tooltip === "string" && dataRow.tooltip.trim().length > 0
    ? dataRow.tooltip
    : label

  const currentValues = showActualValues ? dataRow?.currentActuals : dataRow?.currentPercentages
  const previousValues = showActualValues ? dataRow?.previousActuals : dataRow?.previousPercentages

  const rows = CLASS_KEYS.map((key) => {
    const config = classGradeConfig[key]
    const currentValue = currentValues?.[key] ?? null
    const previousValue = previousValues?.[key] ?? null
    return {
      key,
      label: config.label,
      color: config.color,
      current: typeof currentValue === "number" ? currentValue : null,
      previous: typeof previousValue === "number" ? previousValue : null,
    }
  })

  const totalCurrent = currentValues?.total ?? null
  const totalPrevious = previousValues?.total ?? null

  const showPrevColumn = showPrevSeason && [...rows, { current: totalCurrent, previous: totalPrevious }].some(
    (entry) => typeof entry.previous === "number"
  )

  const formatValue = (value: number | null, isActual: boolean) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "—"
    }
    return isActual ? `${NUMBER_FORMATTER.format(value)} tons` : `${NUMBER_FORMATTER.format(value)}%`
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      {tooltipLabel ? <div className="mb-2 font-medium">{tooltipLabel}</div> : null}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-1 pr-3 text-left font-medium">Class</th>
            <th className="py-1 pr-3 text-right font-medium">Current</th>
            {showPrevColumn ? (
              <th className="py-1 text-right font-medium">Prev</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="py-1 pr-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                </div>
              </td>
              <td className="py-1 pr-3 text-right font-mono text-xs font-medium tabular-nums">
                {formatValue(row.current, showActualValues)}
              </td>
              {showPrevColumn ? (
                <td className="py-1 text-right font-mono text-xs font-medium tabular-nums text-muted-foreground">
                  {formatValue(row.previous, showActualValues)}
                </td>
              ) : null}
            </tr>
          ))}
          <tr className="border-t">
            <td className="py-1 pr-3 font-medium text-muted-foreground">Total</td>
            <td className="py-1 pr-3 text-right font-mono text-xs font-semibold tabular-nums">
              {formatValue(typeof totalCurrent === "number" ? totalCurrent : null, showActualValues)}
            </td>
            {showPrevColumn ? (
              <td className="py-1 text-right font-mono text-xs font-medium tabular-nums text-muted-foreground">
                {formatValue(typeof totalPrevious === "number" ? totalPrevious : null, showActualValues)}
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

type PackingClassChartProps = {
  selectionLabel: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  granularity: Granularity
  showActualValues?: boolean
  renderMobileActualToggle?: React.ReactNode
  showPrevSeason?: boolean
}

export function PackingClassChart({
  selectionLabel,
  records,
  previousRecords,
  granularity,
  showActualValues: showActualValuesProp,
  renderMobileActualToggle,
  showPrevSeason: showPrevSeasonProp,
}: PackingClassChartProps) {
  const showActualValues = showActualValuesProp === true
  const showPrevSeason = showPrevSeasonProp === true
  
  const analytics = usePackingAnalytics({
    records,
    previousRecords,
    granularity,
    subtitle: selectionLabel,
  })

  const [isClient, setIsClient] = React.useState(false)
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const classIGradientId = sanitizeId(React.useId())
  const classIIGradientId = sanitizeId(React.useId())
  const classIIIGradientId = sanitizeId(React.useId())
  const isMobile = useIsMobile()
  const chartMargin = React.useMemo(
    () => ({ top: 12, right: isMobile ? 6 : 10, bottom: 0, left: isMobile ? 6 : 10 }),
    [isMobile]
  )
  const subtitleText =
    analytics.subtitle && analytics.subtitle.trim().length > 0
      ? analytics.subtitle
      : "Distribution across class groups"
  const fullSubtitle = `${subtitleText} | ${analytics.granularityLabel}`
  const loadingSubtitle =
    selectionLabel && selectionLabel.trim().length > 0
      ? `${selectionLabel} | ${analytics.granularityLabel}`
      : `Distribution across class groups | ${analytics.granularityLabel}`

  // Compute actual values data if toggled
  const chartData = React.useMemo(() => {
    const computeShare = (value: number | null, total: number | null) => {
      if (value === null || Number.isNaN(value)) {
        return null
      }
      if (total === null) {
        return null
      }
      if (total <= 0) {
        return 0
      }
      return (value / total) * 100
    }

    return analytics.classSeries.map((row) => {
      const currentTotal = row.total ?? row.classI + row.classII + row.classIII
      const currentActuals = {
        classI: row.classI,
        classII: row.classII,
        classIII: row.classIII,
        total: currentTotal,
      }

      const currentPercentages = {
        classI: currentTotal > 0 ? (row.classI / currentTotal) * 100 : 0,
        classII: currentTotal > 0 ? (row.classII / currentTotal) * 100 : 0,
        classIII: currentTotal > 0 ? (row.classIII / currentTotal) * 100 : 0,
        total: currentTotal > 0 ? 100 : 0,
      }

      const prevClassI = typeof row.prevClassI === "number" ? row.prevClassI : null
      const prevClassII = typeof row.prevClassII === "number" ? row.prevClassII : null
      const prevClassIII = typeof row.prevClassIII === "number" ? row.prevClassIII : null
      const hasPrevRecord =
        prevClassI !== null || prevClassII !== null || prevClassIII !== null
      const summedPrevTotal = (prevClassI ?? 0) + (prevClassII ?? 0) + (prevClassIII ?? 0)
      const prevTotal = hasPrevRecord
        ? row.prevTotal ?? summedPrevTotal
        : null

      const previousActuals = {
        classI: prevClassI,
        classII: prevClassII,
        classIII: prevClassIII,
        total: hasPrevRecord ? prevTotal ?? 0 : null,
      }

      const previousPercentages = {
        classI: computeShare(prevClassI, previousActuals.total),
        classII: computeShare(prevClassII, previousActuals.total),
        classIII: computeShare(prevClassIII, previousActuals.total),
        total:
          previousActuals.total === null
            ? null
            : previousActuals.total <= 0
              ? 0
              : 100,
      }

      return {
        label: row.label,
        tooltip: row.tooltip,
        classI: showActualValues ? row.classI : currentPercentages.classI,
        classII: showActualValues ? row.classII : currentPercentages.classII,
        classIII: showActualValues ? row.classIII : currentPercentages.classIII,
        currentActuals,
        currentPercentages,
        previousActuals,
        previousPercentages,
      }
    })
  }, [analytics.classSeries, showActualValues])

  if (!isClient) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Class</CardTitle>
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-2xl sm:text-lg text-left">Packing Class</CardTitle>
        <CardDescription className="text-base sm:text-sm text-left">{fullSubtitle}</CardDescription>
        {/* Mobile only: render the toggle below the subheading if provided */}
        {analytics.hasData && renderMobileActualToggle}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {analytics.hasData ? (
          <ChartContainer
            config={classGradeConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData} margin={chartMargin}>
              <defs>
                <linearGradient id={classIGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-classI)"
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-classI)"
                    stopOpacity={0.15}
                  />
                </linearGradient>
                <linearGradient id={classIIGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-classII)"
                    stopOpacity={0.85}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-classII)"
                    stopOpacity={0.15}
                  />
                </linearGradient>
                <linearGradient id={classIIIGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-classIII)"
                    stopOpacity={0.85}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-classIII)"
                    stopOpacity={0.15}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ClassTooltipContent
                    showActualValues={showActualValues}
                    showPrevSeason={showPrevSeason}
                  />
                }
              />
              <Area
                dataKey="classI"
                type="monotone"
                fill={`url(#${classIGradientId})`}
                stroke="var(--color-classI)"
                stackId="a"
              />
              <Area
                dataKey="classII"
                type="monotone"
                fill={`url(#${classIIGradientId})`}
                stroke="var(--color-classII)"
                stackId="a"
              />
              <Area
                dataKey="classIII"
                type="monotone"
                fill={`url(#${classIIIGradientId})`}
                stroke="var(--color-classIII)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No records available for the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
