"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

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
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"

const chartConfig = {
  ctnWeight: {
    label: "Carton Weight",
    color: "hsl(43 92% 45%)",
  },
  tonsTippedStackRemainder: {
    label: "Tons Tipped",
    color: "hsl(43 92% 70%)",
  },
  ctnWeightPrevYear: {
    label: "Carton Weight",
    color: "#4C6A74",
  },
  tonsTippedPrevStackRemainder: {
    label: "Tons Tipped",
    color: "#87A6B0",
  },
} satisfies ChartConfig

type ComponentProps = {
  selectionLabel?: string
  records?: PackhouseRecord[]
  previousRecords?: PackhouseRecord[]
  showPrevSeason?: boolean
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

export function Component({ selectionLabel, records = [], previousRecords = [], showPrevSeason = false }: ComponentProps) {
  const totals = React.useMemo(() => {
    if (!records || records.length === 0) {
      return {
        ctnWeight: 0,
        tonsTipped: 0,
        packPercentage: 0,
      }
    }

    const totalCtnWeight = records.reduce((sum, r) => sum + (r.ctnWeight || 0), 0)
    const totalTonsTipped = records.reduce((sum, r) => sum + (r.tonsTipped || 0), 0)
    
    // Calculate pack percentage
    const packPercentage = totalTonsTipped > 0 
      ? (totalCtnWeight / totalTonsTipped) * 100 
      : 0

    return {
      ctnWeight: totalCtnWeight,
      tonsTipped: totalTonsTipped,
      packPercentage,
    }
  }, [records])

  const previousTotals = React.useMemo(() => {
    if (!previousRecords || previousRecords.length === 0) {
      return {
        ctnWeight: 0,
        tonsTipped: 0,
        packPercentage: 0,
      }
    }

    const totalCtnWeight = previousRecords.reduce((sum, r) => sum + (r.ctnWeight || 0), 0)
    const totalTonsTipped = previousRecords.reduce((sum, r) => sum + (r.tonsTipped || 0), 0)
    
    // Calculate pack percentage
    const packPercentage = totalTonsTipped > 0 
      ? (totalCtnWeight / totalTonsTipped) * 100 
      : 0

    return {
      ctnWeight: totalCtnWeight,
      tonsTipped: totalTonsTipped,
      packPercentage,
    }
  }, [previousRecords])

  const chartData = React.useMemo(() => {
    const tonsTippedRemainder = totals.tonsTipped - totals.ctnWeight
    
    return [
      {
        name: "ctnWeight",
        value: totals.ctnWeight,
        fill: "hsl(43 92% 45%)",
      },
      {
        name: "tonsTippedStackRemainder",
        value: tonsTippedRemainder > 0 ? tonsTippedRemainder : 0,
        fill: "hsl(43 92% 70%)",
      },
    ]
  }, [totals])

  const previousChartData = React.useMemo(() => {
    const tonsTippedRemainder = previousTotals.tonsTipped - previousTotals.ctnWeight
    
    return [
      {
        name: "ctnWeightPrevYear",
        value: previousTotals.ctnWeight,
        fill: "#4C6A74",
      },
      {
        name: "tonsTippedPrevStackRemainder",
        value: tonsTippedRemainder > 0 ? tonsTippedRemainder : 0,
        fill: "#87A6B0",
      },
    ]
  }, [previousTotals])

  const hasPreviousData = showPrevSeason && previousRecords && previousRecords.length > 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-2xl sm:text-lg text-left">Packing Percentage</CardTitle>
        <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center">
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 min-w-0">
            <ChartContainer
              config={chartConfig}
              className="aspect-square w-full max-w-[220px] sm:max-w-[260px] lg:max-w-[280px] mx-auto"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                {hasPreviousData && (
                  <Pie
                    data={previousChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="42%"
                    outerRadius="68%"
                    strokeWidth={3}
                    startAngle={90}
                    endAngle={-270}
                  />
                )}
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={hasPreviousData ? "62%" : "58%"}
                  outerRadius="88%"
                  strokeWidth={5}
                  startAngle={90}
                  endAngle={-270}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={hasPreviousData ? (viewBox.cy || 0) - 12 : viewBox.cy}
                              className="fill-foreground text-2xl font-bold"
                            >
                              {NUMBER_FORMATTER.format(totals.packPercentage)}%
                            </tspan>
                            {!hasPreviousData && (
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 20}
                                className="fill-muted-foreground text-sm"
                              >
                                Pack %
                              </tspan>
                            )}
                            {hasPreviousData && (
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 12}
                                className="fill-muted-foreground text-lg font-bold"
                              >
                                {NUMBER_FORMATTER.format(previousTotals.packPercentage)}%
                              </tspan>
                            )}
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
          <div className="flex flex-col gap-3 text-xs flex-shrink-0 min-h-[80px]">
              <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: "hsl(43 92% 70%)" }} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] text-muted-foreground">Tons Tipped</span>
                <span className="font-semibold text-xs">{NUMBER_FORMATTER.format(totals.tonsTipped)} tons</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: "hsl(43 92% 45%)" }} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] text-muted-foreground">Carton Weight</span>
                <span className="font-semibold text-xs">{NUMBER_FORMATTER.format(totals.ctnWeight)} tons</span>
              </div>
            </div>
            {hasPreviousData && (
              <>
                <div className="border-t pt-1 mt-1" />
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: "#87A6B0" }} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-muted-foreground">Tons Tipped</span>
                    <span className="font-semibold text-xs">{NUMBER_FORMATTER.format(previousTotals.tonsTipped)} tons</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: "#4C6A74" }} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-muted-foreground">Carton Weight</span>
                    <span className="font-semibold text-xs">{NUMBER_FORMATTER.format(previousTotals.ctnWeight)} tons</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
