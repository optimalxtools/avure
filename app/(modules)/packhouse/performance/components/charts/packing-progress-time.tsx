"use client"

import * as React from "react"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

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
  type ChartRecord,
} from "./packing-analytics"
import { useIsMobile } from "@/hooks/use-mobile"

const packingProgressConfig = {
  tonsTippedStackRemainder: {
    label: "Tons Tipped",
    color: "hsl(43 92% 70%)",
  },
  tonsTippedPrevStackRemainder: {
    color: "#87A6B0",
    label: undefined,
  },
  ctnWeight: {
    label: "Carton Weight",
    color: "hsl(43 92% 45%)",
  },
  ctnWeightPrevYear: {
    color: "#4C6A74",
    label: undefined,
  },
  packPercentage: {
    label: "Pack %",
    color: "hsl(var(--chart-3))",
  },
  packPercentagePrevYear: {
    color: "hsl(var(--chart-3) / 0.6)",
    label: undefined,
  },
} satisfies ChartConfig

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

type PackingProgressTooltipProps = {
  active?: boolean
  label?: string | number
  payload?: Array<{
    payload?: ChartRecord
  }>
  showPrevYear: boolean
  percentFormatter: Intl.NumberFormat
}

function formatNumeric(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—"
  }
  return NUMBER_FORMATTER.format(value)
}

function formatPercentValue(value: number | null | undefined, formatter: Intl.NumberFormat) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—"
  }
  return formatter.format(value)
}

function PackingProgressTooltipContent({
  active,
  label,
  payload,
  showPrevYear,
  percentFormatter,
}: PackingProgressTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const record = payload[0]?.payload
  if (!record) {
    return null
  }

  const tooltipLabel = (() => {
    if (typeof record.tooltip === "string" && record.tooltip.trim().length > 0) {
      return record.tooltip
    }
    if (typeof label === "string" && label.trim().length > 0) {
      return label
    }
    return null
  })()

  const rows = [
    {
      label: "Tons Tipped",
      current: record.tonsTipped,
      previous: record.tonsTippedPrevYear,
      formatter: formatNumeric,
    },
    {
      label: "Carton Weight",
      current: record.ctnWeight,
      previous: record.ctnWeightPrevYear,
      formatter: formatNumeric,
    },
    {
      label: "Pack %",
      current: record.packPercentage,
      previous: record.packPercentagePrevYear,
      formatter: (value: number | null | undefined) =>
        formatPercentValue(value, percentFormatter),
    },
  ]

  const hasPrevValues =
    showPrevYear &&
    rows.some((row) => typeof row.previous === "number" && Number.isFinite(row.previous))

  return (
    <div className="min-w-[220px] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      {tooltipLabel ? (
        <div className="mb-2 text-sm font-medium text-foreground">{tooltipLabel}</div>
      ) : null}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-1 pr-3 text-left font-medium">Metric</th>
            <th className="py-1 pr-3 text-right font-medium">Current</th>
            {hasPrevValues ? (
              <th className="py-1 text-right font-medium">Prev</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="text-foreground">
          {rows.map(({ label: rowLabel, current, previous, formatter }) => (
            <tr key={rowLabel}>
              <td className="py-1 pr-3 text-left font-medium">{rowLabel}</td>
              <td className="py-1 pr-3 text-right font-mono tabular-nums">
                {formatter(current)}
              </td>
              {hasPrevValues ? (
                <td className="py-1 text-right font-mono tabular-nums">
                  {formatter(previous)}
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
      // Filter out previous year items (they have undefined labels in config)
      if (dataKey.includes("PrevYear") || dataKey.includes("PrevStack")) {
        return false
      }
      // Also filter out items starting with prev_
      return !dataKey.startsWith("prev_")
    }
    return true
  })
}

function FilteredLegend(props: React.ComponentProps<typeof ChartLegendContent>) {
  const [isMounted, setIsMounted] = React.useState(false)
  
  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return <ChartLegendContent {...props} />
  }
  
  const filtered = filterPrevLegendEntries(props.payload as LegendPayload)
  return <ChartLegendContent {...props} payload={filtered} />
}

type PackingProgressChartProps = {
  selectionLabel: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  granularity: Granularity
  showPrevYear: boolean
  onPrevYearAvailabilityChange?: (available: boolean) => void
  showActualValues?: boolean
  renderMobileActualToggle?: React.ReactNode
}

export function PackingProgressChart({
  selectionLabel,
  records,
  previousRecords,
  granularity,
  showPrevYear,
  onPrevYearAvailabilityChange,
  showActualValues: showActualValuesProp,
  renderMobileActualToggle,
}: PackingProgressChartProps) {
  const showActualValues = showActualValuesProp === true
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

  React.useEffect(() => {
    onPrevYearAvailabilityChange?.(analytics.hasPrevYearData)
  }, [analytics.hasPrevYearData, onPrevYearAvailabilityChange])

  const shouldShowPrevYear = showPrevYear && analytics.hasPrevYearData
  const isMobile = useIsMobile()

  const chartMargin = React.useMemo(
    () => ({ top: 12, right: isMobile ? 6 : 10, bottom: 0, left: isMobile ? 6 : 10 }),
    [isMobile]
  )
  const subtitleText =
    analytics.subtitle && analytics.subtitle.trim().length > 0
      ? analytics.subtitle
      : "Showing totals for the selected grouping"
  const fullSubtitle = `${subtitleText} | ${analytics.granularityLabel}`
  const loadingSubtitle =
    selectionLabel && selectionLabel.trim().length > 0
      ? `${selectionLabel} | ${analytics.granularityLabel}`
      : `Showing totals for the selected grouping | ${analytics.granularityLabel}`


  // Compute actual values data if toggled
  const actualData = React.useMemo(() => {
    if (showActualValues) return analytics.chartRecords;
    // Convert Carton Weight and Tons Tipped Stack Remainder to percentages (100% stacked)
    return analytics.chartRecords.map((row) => {
      const ctn = typeof row.ctnWeight === 'number' ? row.ctnWeight : 0;
      const tonsRemainder = typeof row.tonsTippedStackRemainder === 'number' ? row.tonsTippedStackRemainder : 0;
      const total = ctn + tonsRemainder;
      
      // For previous year, calculate percentages too
      const ctnPrev = typeof row.ctnWeightPrevYear === 'number' ? row.ctnWeightPrevYear : 0;
      const tonsRemainderPrev = typeof row.tonsTippedPrevStackRemainder === 'number' ? row.tonsTippedPrevStackRemainder : 0;
      const totalPrev = ctnPrev + tonsRemainderPrev;
      
      return {
        ...row,
        ctnWeight: total > 0 ? (ctn / total) * 100 : 0,
        tonsTippedStackRemainder: total > 0 ? (tonsRemainder / total) * 100 : 0,
        // Convert previous year to percentages as well
        ctnWeightPrevYear: totalPrev > 0 ? (ctnPrev / totalPrev) * 100 : (row.ctnWeightPrevYear !== null ? 0 : null),
        tonsTippedPrevStackRemainder: totalPrev > 0 ? (tonsRemainderPrev / totalPrev) * 100 : (row.tonsTippedPrevStackRemainder !== null ? 0 : null),
        // Keep pack percentage visible for both years
      };
    });
  }, [showActualValues, analytics.chartRecords]);

  if (!isClient) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="flex flex-1 flex-col text-left sm:flex-row sm:items-baseline sm:gap-2">
            <CardTitle className="text-lg sm:text-base">Packing Percentage</CardTitle>
            <CardDescription className="sm:text-sm sm:text-muted-foreground/80">
              {loadingSubtitle}
            </CardDescription>
          </div>
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
    <Card className="w-full h-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-2xl sm:text-lg text-left">Packing Percentage</CardTitle>
        <CardDescription className="text-base sm:text-sm text-left">{fullSubtitle}</CardDescription>
        {/* Mobile only: render the toggle below the subheading if provided */}
        {analytics.hasData && renderMobileActualToggle}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {analytics.hasData ? (
          <ChartContainer
            config={packingProgressConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <ComposedChart data={actualData} margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis yAxisId="metric" hide />
              <YAxis yAxisId="percentage" hide domain={analytics.packPercentageDomain} />
              <ChartTooltip
                cursor={false}
                content={
                  <PackingProgressTooltipContent
                    showPrevYear={shouldShowPrevYear}
                    percentFormatter={analytics.percentFormatter}
                  />
                }
              />
              {/* Show percentage stacked bars when actual values is OFF, or actual values when ON */}
              {!showActualValues ? (
                <>
                  {shouldShowPrevYear ? (
                    <>
                      <Bar
                        yAxisId="metric"
                        stackId="prev"
                        dataKey="ctnWeightPrevYear"
                        fill="var(--color-ctnWeightPrevYear)"
                        radius={[0, 0, 0, 0]}
                        legendType="none"
                      />
                      <Bar
                        yAxisId="metric"
                        stackId="prev"
                        dataKey="tonsTippedPrevStackRemainder"
                        fill="var(--color-tonsTippedPrevStackRemainder)"
                        radius={[4, 4, 0, 0]}
                        legendType="none"
                      />
                    </>
                  ) : null}
                  <Bar
                    yAxisId="metric"
                    stackId="current"
                    dataKey="ctnWeight"
                    fill="var(--color-ctnWeight)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    yAxisId="metric"
                    stackId="current"
                    dataKey="tonsTippedStackRemainder"
                    fill="var(--color-tonsTippedStackRemainder)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="percentage"
                    type="natural"
                    dataKey="packPercentage"
                    stroke="var(--color-packPercentage)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  {shouldShowPrevYear ? (
                    <Line
                      yAxisId="percentage"
                      type="natural"
                      dataKey="packPercentagePrevYear"
                      stroke="var(--color-packPercentagePrevYear)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      connectNulls
                      legendType="none"
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {shouldShowPrevYear ? (
                    <>
                      <Bar
                        yAxisId="metric"
                        stackId="prev"
                        dataKey="ctnWeightPrevYear"
                        fill="var(--color-ctnWeightPrevYear)"
                        radius={[0, 0, 0, 0]}
                        legendType="none"
                      />
                      <Bar
                        yAxisId="metric"
                        stackId="prev"
                        dataKey="tonsTippedPrevStackRemainder"
                        fill="var(--color-tonsTippedPrevStackRemainder)"
                        radius={[4, 4, 0, 0]}
                        legendType="none"
                      />
                    </>
                  ) : null}
                  <Bar
                    yAxisId="metric"
                    stackId="current"
                    dataKey="ctnWeight"
                    fill="var(--color-ctnWeight)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    yAxisId="metric"
                    stackId="current"
                    dataKey="tonsTippedStackRemainder"
                    fill="var(--color-tonsTippedStackRemainder)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="percentage"
                    type="natural"
                    dataKey="packPercentage"
                    stroke="var(--color-packPercentage)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  {shouldShowPrevYear ? (
                    <Line
                      yAxisId="percentage"
                      type="natural"
                      dataKey="packPercentagePrevYear"
                      stroke="var(--color-packPercentagePrevYear)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      connectNulls
                      legendType="none"
                    />
                  ) : null}
                </>
              )}
              <ChartLegend content={<FilteredLegend />} />
            </ComposedChart>
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
