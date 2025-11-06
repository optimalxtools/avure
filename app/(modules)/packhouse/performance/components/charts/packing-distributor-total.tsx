"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"

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
import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import { getDistributorDisplayLabel } from "../../../utils/usePackhouseConfig"

const COLOR_PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
]

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

function toDistributorKey(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return normalized || "unassigned"
}

type ComponentProps = {
  selectionLabel?: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  showPrevSeason: boolean
}

function aggregateTotals(
  records: PackhouseRecord[] | undefined,
  slot: "current" | "previous",
  totals: Map<string, { label: string; current: number; previous: number }>
) {
  if (!records?.length) {
    return
  }

  records.forEach((record) => {
    const spreads = record.distributorSpreads
    if (!spreads || spreads.length === 0) {
      return
    }

    spreads.forEach(({ distributor, value }) => {
      if (!(value > 0)) {
        return
      }
      const label = (distributor ?? "").trim() || "Unassigned"
      const key = toDistributorKey(label)
      let entry = totals.get(key)
      if (!entry) {
        entry = { label, current: 0, previous: 0 }
        totals.set(key, entry)
      }
      entry[slot] += value
    })
  })
}

export function Component({ selectionLabel, records, previousRecords, showPrevSeason }: ComponentProps) {
  const chartData = React.useMemo(() => {
    const totals = new Map<string, { label: string; current: number; previous: number }>()

    aggregateTotals(records, "current", totals)
    if (showPrevSeason) {
      aggregateTotals(previousRecords, "previous", totals)
    }

    return Array.from(totals.entries())
      .map(([key, value]) => {
        const display = getDistributorDisplayLabel(value.label)
        return {
          distributorKey: key,
          distributor: display.toUpperCase(),
          distributorDisplay: display,
          distributorOriginal: value.label,
          current: value.current,
          previous: value.previous,
        }
      })
      .filter((entry) => entry.current > 0 || (showPrevSeason && entry.previous > 0))
      .sort((a, b) => (b.current + b.previous) - (a.current + a.previous))
      .map((entry) => ({
        ...entry,
        previous: showPrevSeason ? entry.previous : undefined,
      }))
  }, [records, previousRecords, showPrevSeason])

  const maxValue = React.useMemo(() => {
    if (chartData.length === 0) {
      return 0
    }
    const max = Math.max(
      ...chartData.map((entry) => entry.current),
      ...chartData.map((entry) => entry.previous ?? 0)
    )
    return max * 1.15
  }, [chartData])

  const chartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    chartData.forEach((item, index) => {
      const color = COLOR_PALETTE[index % COLOR_PALETTE.length]
      config[item.distributorKey] = {
        label: item.distributor,
        color,
      }
    })
    return config
  }, [chartData])

  const hasPreviousData = showPrevSeason && chartData.some((entry) => (entry.previous ?? 0) > 0)

  if (chartData.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-lg text-left">Packing Distributor</CardTitle>
          <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-2xl sm:text-lg text-left">Packing Distributor</CardTitle>
        <CardDescription className="text-base sm:text-sm text-left">{selectionLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart layout="vertical" accessibilityLayer data={chartData} margin={{ left: 0, right: 40 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              type="category"
              dataKey="distributor"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={90}
            />
            <XAxis type="number" hide domain={[0, Math.max(maxValue, 1)]} />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const tooltipPayload = payload[0]?.payload as
                  | {
                      distributor: string
                      current: number
                      previous?: number
                    }
                  | undefined
                if (!tooltipPayload) return null
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Distributor
                        </span>
                        <span className="font-bold text-muted-foreground">{tooltipPayload.distributor}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Current
                        </span>
                        <span className="font-bold">{NUMBER_FORMATTER.format(tooltipPayload.current)} tons</span>
                      </div>
                      {hasPreviousData && tooltipPayload.previous !== undefined && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Previous
                          </span>
                          <span className="font-bold text-muted-foreground/60">
                            {NUMBER_FORMATTER.format(tooltipPayload.previous)} tons
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="current"
              radius={4}
            >
              {chartData.map((entry, index) => {
                const color = COLOR_PALETTE[index % COLOR_PALETTE.length]
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={color}
                  />
                )
              })}
              <LabelList
                dataKey="current"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => NUMBER_FORMATTER.format(value)}
              />
            </Bar>
            {hasPreviousData ? (
              <Bar
                dataKey="previous"
                radius={4}
              >
                {chartData.map((entry, index) => {
                  const color = COLOR_PALETTE[index % COLOR_PALETTE.length]
                  return (
                    <Cell
                      key={`cell-prev-${index}`}
                      fill={color}
                      fillOpacity={0.4}
                    />
                  )
                })}
                <LabelList
                  dataKey="previous"
                  position="right"
                  offset={8}
                  className="fill-muted-foreground"
                  fontSize={12}
                  formatter={(value?: number) =>
                    typeof value === "number" ? NUMBER_FORMATTER.format(value) : ""
                  }
                />
              </Bar>
            ) : null}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

