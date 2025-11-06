"use client"

import * as React from "react"
import type { PackhouseRecord, PackingProgressMetric } from "../../../utils/usePackhouseData"

export type Granularity = "daily" | "weekly" | "monthly"

export type AggregatedRecord = {
  key: string
  year: number
  periodIdentifier: string
  label: string
  tooltip: string
  tonsTipped: number
  ctnWeight: number
  binsTipped: number
  packPercentage: number
  classI: number
  classII: number
  classIII: number
  packingProgress: Record<string, number>
  distributorTotals: Record<string, number>
  distributorLabels: Record<string, string>
}

type AggregatedAccumulator = {
  key: string
  year: number
  periodIdentifier: string
  label: string
  tooltip: string
  tonsTipped: number
  ctnWeight: number
  binsTipped: number
  packPercentage: number
  classI: number
  classII: number
  classIII: number
  packingProgress: Record<string, number>
  distributorTotals: Map<string, number>
  distributorLabels: Map<string, string>
  sortValue: number
  packPercentageSum: number
  packPercentageCount: number
}

export type ChartRecord = AggregatedRecord & {
  tonsTippedPrevYear: number | null
  ctnWeightPrevYear: number | null
  packPercentagePrevYear: number | null
  tonsTippedStackRemainder: number
  tonsTippedPrevStackRemainder: number | null
}

export type PackingColumn = {
  key: string
  label: string
}

export type ClassSeriesEntry = {
  label: string
  tooltip: string
  classI: number
  classII: number
  classIII: number
  total: number
  prevClassI: number | null
  prevClassII: number | null
  prevClassIII: number | null
  prevTotal: number | null
}

export type PackingAnalyticsArgs = {
  records?: PackhouseRecord[]
  previousRecords?: PackhouseRecord[]
  granularity: Granularity
  subtitle?: string
}

export type PackingAnalyticsResult = {
  granularity: Granularity
  granularityLabel: string
  subtitle?: string
  chartRecords: ChartRecord[]
  previousAggregatedRecords: AggregatedRecord[]
  packPercentageDomain: [number, number]
  hasPrevYearData: boolean
  classSeries: ClassSeriesEntry[]
  packingColumns: PackingColumn[]
  columnTotals: number[]
  aggregatedRecords: AggregatedRecord[]
  bucketCount: number
  hasData: boolean
  minPercent: number
  maxPercent: number
  packingFormatter: Intl.NumberFormat
  percentFormatter: Intl.NumberFormat
  tooltipDateFormatter: Intl.DateTimeFormat
}

function useSortedRecords(records: PackhouseRecord[]) {
  return React.useMemo(() => [...records].sort((a, b) => a.timestamp - b.timestamp), [records])
}

function getIsoWeekInfo(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const year = tmp.getUTCFullYear()
  const week = Math.ceil((((tmp.getTime() - Date.UTC(year, 0, 1)) / 86400000) + 1) / 7)
  const weekStart = new Date(Date.UTC(year, tmp.getUTCMonth(), tmp.getUTCDate() - 3))
  return { week, year, weekStart }
}

function normalizePackingEntries(entries: PackingProgressMetric[] | undefined) {
  if (!entries || entries.length === 0) {
    return []
  }
  return entries.filter((entry) => entry && typeof entry.key === "string")
}

function resolveDistributorIdentity(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  const label = trimmed || "Unassigned"
  const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const key = normalized || "unassigned"
  return { key, label }
}

function useAggregatedRecords(records: PackhouseRecord[], granularity: Granularity) {
  return React.useMemo<AggregatedRecord[]>(() => {
    if (!records.length) return []

    const groups = new Map<string, AggregatedAccumulator>()

    for (const record of records) {
      const date = new Date(record.date)
      if (Number.isNaN(date.getTime())) continue

      let key: string
      let label: string
      let tooltip: string
      let sortValue: number
      let yearValue: number
      let periodIdentifier: string

      if (granularity === "weekly") {
        const { week, year, weekStart } = getIsoWeekInfo(date)
        const paddedWeek = String(week).padStart(2, "0")
        key = `${year}-W${paddedWeek}`
        label = `Week ${week}`
        tooltip = `Week ${week}, ${year}`
        sortValue = weekStart.getTime()
        yearValue = year
        periodIdentifier = `W${paddedWeek}`
      } else if (granularity === "monthly") {
        const month = date.getMonth()
        const year = date.getFullYear()
        key = `${year}-${month}`
        label = date.toLocaleString("en-US", { month: "short" })
        tooltip = `${label} ${year}`
        sortValue = new Date(year, month, 1).getTime()
        yearValue = year
        periodIdentifier = `M${String(month + 1).padStart(2, "0")}`
      } else {
        const month = date.getMonth()
        const day = date.getDate()
        const year = date.getFullYear()
        key = record.date
        label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        tooltip = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        sortValue = date.getTime()
        yearValue = year
        periodIdentifier = `D${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      }

      const entries = normalizePackingEntries(record.packingProgress)
      const distributorEntries = Array.isArray(record.distributorSpreads)
        ? record.distributorSpreads.filter((entry) => entry && Number.isFinite(entry.value) && (entry.value ?? 0) > 0)
        : []
      const existing = groups.get(key)
      const packPercentageValue = Number.isFinite(record.packPercentage) ? record.packPercentage : null

      if (existing) {
        existing.tonsTipped += record.tonsTipped
        existing.ctnWeight += record.ctnWeight
        existing.binsTipped += record.binsTipped
        existing.classI += record.classI
        existing.classII += record.classII
        existing.classIII += record.classIII
        if (packPercentageValue !== null) {
          existing.packPercentageSum += packPercentageValue
          existing.packPercentageCount += 1
          existing.packPercentage =
            existing.packPercentageCount > 0
              ? existing.packPercentageSum / existing.packPercentageCount
              : 0
        }
        for (const entry of entries) {
          existing.packingProgress[entry.key] =
            (existing.packingProgress[entry.key] ?? 0) + entry.value
        }
        distributorEntries.forEach(({ distributor, value }) => {
          const { key: distributorKey, label } = resolveDistributorIdentity(distributor)
          const current = existing.distributorTotals.get(distributorKey) ?? 0
          existing.distributorTotals.set(distributorKey, current + (value ?? 0))
          if (!existing.distributorLabels.has(distributorKey)) {
            existing.distributorLabels.set(distributorKey, label)
          }
        })
      } else {
        const packingTotals: Record<string, number> = {}
        for (const entry of entries) {
          packingTotals[entry.key] = entry.value
        }
        const distributorTotals = new Map<string, number>()
        const distributorLabels = new Map<string, string>()
        distributorEntries.forEach(({ distributor, value }) => {
          const { key: distributorKey, label } = resolveDistributorIdentity(distributor)
          const current = distributorTotals.get(distributorKey) ?? 0
          distributorTotals.set(distributorKey, current + (value ?? 0))
          if (!distributorLabels.has(distributorKey)) {
            distributorLabels.set(distributorKey, label)
          }
        })
        const packSum = packPercentageValue ?? 0
        const packCount = packPercentageValue === null ? 0 : 1
        groups.set(key, {
          key,
          year: yearValue,
          periodIdentifier,
          label,
          tooltip,
          sortValue,
          tonsTipped: record.tonsTipped,
          ctnWeight: record.ctnWeight,
          binsTipped: record.binsTipped,
          packPercentage: packCount > 0 ? packSum / packCount : 0,
          packPercentageSum: packSum,
          packPercentageCount: packCount,
          classI: record.classI,
          classII: record.classII,
          classIII: record.classIII,
          packingProgress: packingTotals,
          distributorTotals,
          distributorLabels,
        })
      }
    }

    const aggregated: AggregatedAccumulator[] = []
    groups.forEach((value) => aggregated.push(value))

    return aggregated
      .sort((a, b) => a.sortValue - b.sortValue)
      .map((entry) => {
        const distributorTotalsObject: Record<string, number> = {}
        entry.distributorTotals.forEach((value, key) => {
          distributorTotalsObject[key] = value
        })
        const distributorLabelsObject: Record<string, string> = {}
        entry.distributorLabels.forEach((value, key) => {
          distributorLabelsObject[key] = value
        })

        return {
          key: entry.key,
          year: entry.year,
          periodIdentifier: entry.periodIdentifier,
          label: entry.label,
          tooltip: entry.tooltip,
          tonsTipped: entry.tonsTipped,
          ctnWeight: entry.ctnWeight,
          binsTipped: entry.binsTipped,
          packPercentage: entry.packPercentage,
          classI: entry.classI,
          classII: entry.classII,
          classIII: entry.classIII,
          packingProgress: entry.packingProgress,
          distributorTotals: distributorTotalsObject,
          distributorLabels: distributorLabelsObject,
        }
      })
  }, [records, granularity])
}

function resolveColumnLabels(records: PackhouseRecord[]): PackingColumn[] {
  const labelMap = new Map<string, string>()
  for (const record of records) {
    const entries = normalizePackingEntries(record.packingProgress)
    for (const entry of entries) {
      if (!labelMap.has(entry.key)) {
        labelMap.set(entry.key, entry.label || entry.key)
      }
    }
  }
  return Array.from(labelMap.entries()).map(([key, label]) => ({ key, label }))
}

export function usePackingAnalytics({
  records = [],
  previousRecords = [],
  granularity,
  subtitle,
}: PackingAnalyticsArgs): PackingAnalyticsResult {
  const granularityLabel = React.useMemo(() => {
    if (granularity === "weekly") return "Weekly"
    if (granularity === "monthly") return "Monthly"
    return "Daily"
  }, [granularity])

  const sortedRecords = useSortedRecords(records)
  const aggregatedRecords = useAggregatedRecords(sortedRecords, granularity)
  const sortedPreviousRecords = useSortedRecords(previousRecords)
  const aggregatedPreviousRecords = useAggregatedRecords(sortedPreviousRecords, granularity)

  const chartRecords = React.useMemo<ChartRecord[]>(() => {
    if (!aggregatedRecords.length) return []

    const lookup = new Map<string, AggregatedRecord>()
    aggregatedRecords.forEach((record) => {
      lookup.set(`${record.periodIdentifier}-${record.year}`, record)
    })

    const previousLookup = new Map<string, AggregatedRecord>()
    aggregatedPreviousRecords.forEach((record) => {
      previousLookup.set(record.periodIdentifier, record)
    })

    return aggregatedRecords.map((record) => {
      const inlinePrevious = lookup.get(`${record.periodIdentifier}-${record.year - 1}`)
      const overlayPrevious = previousLookup.get(record.periodIdentifier)
      const previous = overlayPrevious ?? inlinePrevious
      const tonsStackRemainder = Math.max(record.tonsTipped - record.ctnWeight, 0)
      const previousCtnWeight = previous?.ctnWeight ?? null
      const previousTons = previous?.tonsTipped ?? null
      const prevStackRemainder =
        previousTons !== null && previousCtnWeight !== null
          ? Math.max(previousTons - previousCtnWeight, 0)
          : null
      return {
        ...record,
        tonsTippedPrevYear: previous?.tonsTipped ?? null,
        ctnWeightPrevYear: previous?.ctnWeight ?? null,
        packPercentagePrevYear: previous?.packPercentage ?? null,
        tonsTippedStackRemainder: tonsStackRemainder,
        tonsTippedPrevStackRemainder: prevStackRemainder,
      }
    })
  }, [aggregatedPreviousRecords, aggregatedRecords])

  const hasPrevYearData = React.useMemo(
    () =>
      chartRecords.some(
        (record) =>
          record.tonsTippedPrevYear !== null ||
          record.ctnWeightPrevYear !== null ||
          record.packPercentagePrevYear !== null
      ),
    [chartRecords]
  )

  const packPercentageDomain = React.useMemo<[number, number]>(() => {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    chartRecords.forEach((record) => {
      const values = [record.packPercentage, record.packPercentagePrevYear ?? undefined]
      values.forEach((value) => {
        if (typeof value === "number" && Number.isFinite(value)) {
          if (value < min) min = value
          if (value > max) max = value
        }
      })
    })

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return [0, 1]
    }

    if (min === max) {
      const delta = min === 0 ? 0.05 : Math.abs(min) * 0.1
      min -= delta
      max += delta
    }

    const span = max - min
    const padding = Math.max(0.02, span * 0.35)
    let lower = Math.max(0, min - padding)
    let upper = Math.min(1, max + padding)

    const minimumRange = 0.2
    if (upper - lower < minimumRange) {
      const midpoint = (lower + upper) / 2
      lower = Math.max(0, midpoint - minimumRange / 2)
      upper = Math.min(1, midpoint + minimumRange / 2)
    }

    return [Number(lower.toFixed(3)), Number(upper.toFixed(3))]
  }, [chartRecords])

  const packingColumns = React.useMemo(() => resolveColumnLabels(sortedRecords), [sortedRecords])

  const columnTotals = React.useMemo(
    () =>
      aggregatedRecords.map((record) =>
        packingColumns.reduce((sum, column) => sum + (record.packingProgress[column.key] ?? 0), 0)
      ),
    [aggregatedRecords, packingColumns]
  )

  const classSeries = React.useMemo<ClassSeriesEntry[]>(() => {
    if (!aggregatedRecords.length) {
      return []
    }

    const currentLookup = new Map<string, AggregatedRecord>()
    aggregatedRecords.forEach((record) => {
      currentLookup.set(`${record.periodIdentifier}-${record.year}`, record)
    })

    const previousLookup = new Map<string, AggregatedRecord>()
    aggregatedPreviousRecords.forEach((record) => {
      previousLookup.set(record.periodIdentifier, record)
    })

    return aggregatedRecords.map((entry) => {
      const inlinePrevious = currentLookup.get(`${entry.periodIdentifier}-${entry.year - 1}`)
      const overlayPrevious = previousLookup.get(entry.periodIdentifier)
      const previous = overlayPrevious ?? inlinePrevious ?? null

      const prevClassI = previous?.classI ?? null
      const prevClassII = previous?.classII ?? null
      const prevClassIII = previous?.classIII ?? null

      const hasPrevRecord =
        prevClassI !== null || prevClassII !== null || prevClassIII !== null
      const prevTotal = hasPrevRecord
        ? previous
          ? previous.classI + previous.classII + previous.classIII
          : (prevClassI ?? 0) + (prevClassII ?? 0) + (prevClassIII ?? 0)
        : null

      return {
        label: entry.label,
        tooltip: entry.tooltip,
        classI: entry.classI,
        classII: entry.classII,
        classIII: entry.classIII,
        total: entry.classI + entry.classII + entry.classIII,
        prevClassI,
        prevClassII,
        prevClassIII,
        prevTotal,
      }
    })
  }, [aggregatedPreviousRecords, aggregatedRecords])

  const { minPercent, maxPercent } = React.useMemo(() => {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    aggregatedRecords.forEach((record, columnIndex) => {
      const total = columnTotals[columnIndex] ?? 0
      if (!Number.isFinite(total) || total <= 0) return
      packingColumns.forEach((column) => {
        const value = record.packingProgress[column.key]
        if (!Number.isFinite(value) || value <= 0) return
        const percent = (value / total) * 100
        if (percent < min) min = percent
        if (percent > max) max = percent
      })
    })

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { minPercent: 0, maxPercent: 0 }
    }

    if (min > max) {
      min = max
    }

    return { minPercent: min, maxPercent: max }
  }, [aggregatedRecords, columnTotals, packingColumns])

  const packingFormatter = React.useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
    []
  )

  const percentFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  )

  const tooltipDateFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  )

  const hasData = aggregatedRecords.length > 0

  return {
    granularity,
    granularityLabel,
    subtitle,
    chartRecords,
    previousAggregatedRecords: aggregatedPreviousRecords,
    packPercentageDomain,
    hasPrevYearData,
    classSeries,
    packingColumns,
    columnTotals,
    aggregatedRecords,
    bucketCount: aggregatedRecords.length,
    hasData,
    minPercent,
    maxPercent,
    packingFormatter,
    percentFormatter,
    tooltipDateFormatter,
  }
}
