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
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { PackhouseRecord } from "../../../utils/usePackhouseData"

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
  classIPrev: {
    label: "Class I (Prev)",
    color: "hsl(var(--chart-2) / 0.6)",
  },
  classIIPrev: {
    label: "Class II (Prev)",
    color: "hsl(var(--chart-4) / 0.6)",
  },
  classIIIPrev: {
    label: "Class III (Prev)",
    color: "hsl(var(--chart-5) / 0.6)",
  },
} satisfies ChartConfig

type ComponentProps = {
  selectionLabel?: string
  records?: PackhouseRecord[]
  previousRecords?: PackhouseRecord[]
  showPrevSeason?: boolean
  titleClassName?: string
  headerActions?: React.ReactNode
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

export function Component({ 
  selectionLabel, 
  records = [], 
  previousRecords = [],
  showPrevSeason = false,
  titleClassName = "text-2xl sm:text-lg text-left",
  headerActions,
}: ComponentProps) {
  const chartData = React.useMemo(() => {
    // Calculate totals for current season
    const currentTotals = records.reduce(
      (acc, r) => ({
        classI: acc.classI + (r.classI || 0),
        classII: acc.classII + (r.classII || 0),
        classIII: acc.classIII + (r.classIII || 0),
      }),
      { classI: 0, classII: 0, classIII: 0 }
    )

    // Calculate totals for previous season
    const previousTotals = previousRecords.reduce(
      (acc, r) => ({
        classI: acc.classI + (r.classI || 0),
        classII: acc.classII + (r.classII || 0),
        classIII: acc.classIII + (r.classIII || 0),
      }),
      { classI: 0, classII: 0, classIII: 0 }
    )

    const hasPreviousData = showPrevSeason && previousRecords.length > 0

    if (hasPreviousData) {
      return [
        {
          name: "Class I",
          current: currentTotals.classI,
          previous: previousTotals.classI,
          fill: "var(--color-classI)",
        },
        {
          name: "Class II",
          current: currentTotals.classII,
          previous: previousTotals.classII,
          fill: "var(--color-classII)",
        },
        {
          name: "Class III",
          current: currentTotals.classIII,
          previous: previousTotals.classIII,
          fill: "var(--color-classIII)",
        },
      ]
    } else {
      return [
        {
          name: "Class I",
          current: currentTotals.classI,
          fill: "var(--color-classI)",
        },
        {
          name: "Class II",
          current: currentTotals.classII,
          fill: "var(--color-classII)",
        },
        {
          name: "Class III",
          current: currentTotals.classIII,
          fill: "var(--color-classIII)",
        },
      ]
    }
  }, [records, previousRecords, showPrevSeason])

  const hasPreviousData = showPrevSeason && previousRecords.length > 0

  const maxValue = React.useMemo(() => {
    const max = Math.max(
      ...chartData.map(d => d.current),
      ...chartData.map(d => ('previous' in d ? d.previous : 0))
    )
    // Add 20% padding to prevent label cutoff
    return max * 1.2
  }, [chartData])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className={titleClassName}>Packing Class</CardTitle>
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
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis hide domain={[0, maxValue]} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent 
                  indicator="dashed"
                  formatter={(value) => `${NUMBER_FORMATTER.format(value as number)} tons`}
                />
              }
            />
            {hasPreviousData && (
              <Bar 
                dataKey="previous" 
                fill="var(--color-classI)" 
                radius={4}
                fillOpacity={0.6}
              >
                <LabelList
                  dataKey="previous"
                  position="top"
                  offset={8}
                  className="fill-foreground text-xs"
                  formatter={(value: number) => NUMBER_FORMATTER.format(value)}
                />
              </Bar>
            )}
            <Bar 
              dataKey="current" 
              fill="var(--color-classI)" 
              radius={4}
              fillOpacity={1}
            >
              <LabelList
                dataKey="current"
                position="top"
                offset={8}
                className="fill-foreground text-xs"
                formatter={(value: number) => NUMBER_FORMATTER.format(value)}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
