"use client"

import * as React from "react"

import { useClientDatasetPaths } from "@/lib/hooks/useClientDatasetPaths"
import { useSessionCachedResource } from "@/lib/hooks/useSessionCachedResource"
import type { PackhouseRecord, DistributorSpreadTotal } from "./packhouse-types"

export type { PackhouseRecord, PackingProgressMetric } from "./packhouse-types"

function uniquePreserveOrder(values: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value)
      result.push(value)
    }
  }
  return result
}

type PackhouseApiResponse = {
  records?: PackhouseRecord[]
}

function coerceRecord(record: PackhouseRecord): PackhouseRecord {
  const isoDate = typeof record.date === "string" ? record.date : ""
  const timestamp = Number.isFinite(record.timestamp) ? record.timestamp : Date.parse(isoDate)
  return {
    variety: record.variety,
    season: record.season,
    block: record.block,
    date: isoDate,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    tonsTipped: Number.isFinite(record.tonsTipped) ? record.tonsTipped : 0,
    ctnWeight: Number.isFinite(record.ctnWeight) ? record.ctnWeight : 0,
    binsTipped: Number.isFinite(record.binsTipped) ? record.binsTipped : 0,
    classI: Number.isFinite(record.classI) ? record.classI : 0,
    classII: Number.isFinite(record.classII) ? record.classII : 0,
    classIII: Number.isFinite(record.classIII) ? record.classIII : 0,
    packPercentage: Number.isFinite(record.packPercentage) ? record.packPercentage : 0,
    packingProgress: Array.isArray(record.packingProgress)
      ? record.packingProgress.map((entry) => ({
          key: entry?.key ?? "",
          label: entry?.label ?? entry?.key ?? "",
          value: Number.isFinite(entry?.value) ? entry.value : 0,
        }))
      : [],
    distributorSpreads: Array.isArray(record.distributorSpreads)
      ? (record.distributorSpreads as DistributorSpreadTotal[])
          .map((entry) => ({
            distributor: entry?.distributor ?? "",
            spread: entry?.spread ?? "",
            value: Number.isFinite(entry?.value) ? entry.value : 0,
          }))
          .filter((entry) => entry.distributor && entry.spread && entry.value > 0)
      : undefined,
    puc: record.puc,
  }
}

function extractRecords(payload: unknown): PackhouseRecord[] {
  if (!payload) {
    return []
  }
  if (Array.isArray(payload)) {
    return payload.filter(Boolean).map((item) => coerceRecord(item as PackhouseRecord))
  }
  if (typeof payload === "object" && payload !== null && "records" in payload) {
    const records = (payload as PackhouseApiResponse).records ?? []
    return extractRecords(records)
  }
  return []
}

export function usePackhouseData() {
  const { packhouseTemporalPath } = useClientDatasetPaths()

  const loadRecords = React.useCallback(async () => {
    if (!packhouseTemporalPath) {
      return []
    }
    const response = await fetch(packhouseTemporalPath, { cache: "no-store" })
    if (response.status === 404) {
      const notFoundError = new Error("No packhouse dataset configured for this client.")
      notFoundError.name = "NotFoundError"
      throw notFoundError
    }
    if (!response.ok) {
      throw new Error(`Failed to load packhouse data: ${response.status}`)
    }
    const body = await response.json()
    return extractRecords(body)
  }, [packhouseTemporalPath])

  const {
    data,
    error,
    isLoading,
    isRefreshing,
    lastUpdatedAt,
    refresh,
  } = useSessionCachedResource<PackhouseRecord[]>({
    cacheKey: packhouseTemporalPath ? `packhouse:temporal:${packhouseTemporalPath}` : null,
    enabled: Boolean(packhouseTemporalPath),
    load: loadRecords,
  })

  const records = React.useMemo(() => data ?? [], [data])

  const seasons = React.useMemo(() => {
    if (!records.length) return []
    const unique = uniquePreserveOrder(records.map((record) => record.season))
    return [...unique].sort((a, b) => {
      const aNum = Number(a)
      const bNum = Number(b)
      const aIsFinite = Number.isFinite(aNum)
      const bIsFinite = Number.isFinite(bNum)

      if (aIsFinite && bIsFinite) {
        return bNum - aNum
      }

      if (aIsFinite !== bIsFinite) {
        return bIsFinite ? 1 : -1
      }

      return b.localeCompare(a)
    })
  }, [records])

  return {
    data: records,
    isLoading: isLoading && !data,
    isRefreshing,
    error,
    seasons,
    refresh,
    lastUpdatedAt,
  }
}


