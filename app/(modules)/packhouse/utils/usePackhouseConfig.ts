"use client"

import * as React from "react"

import { useClientDatasetPaths } from "@/lib/hooks/useClientDatasetPaths"

export type PackhouseConfigEntry = {
  spread: string
  distributor: string
}

type PackhouseSpreadSource =
  | string[]
  | {
      spreads?: unknown
    }

type PackhouseDistributionEntry = {
  spread?: string | null
  distributor?: string | null
}

type PackhouseDistributionSource =
  | PackhouseDistributionEntry[]
  | string[]
  | {
      distributions?: unknown
      distributors?: unknown
    }

export type PackhouseConfigState = {
  entries: PackhouseConfigEntry[]
  spreads: Set<string>
  spreadList: string[]
  distributors: string[]
  spreadToDistributor: Map<string, string>
  distributorToSpreads: Map<string, string[]>
  loading: boolean
  error: Error | null
}

const UNASSIGNED_DISTRIBUTOR_KEY = "__unassigned__"
const UNASSIGNED_DISTRIBUTOR_LABEL = "Unassigned"
const UNASSIGNED_DISTRIBUTOR_DISPLAY_LABEL = "Unasg."

function createState(overrides: Partial<PackhouseConfigState> = {}): PackhouseConfigState {
  return {
    entries: [],
    spreads: new Set<string>(),
    spreadList: [],
    distributors: [],
    spreadToDistributor: new Map<string, string>(),
    distributorToSpreads: new Map<string, string[]>(),
    loading: false,
    error: null,
    ...overrides,
  }
}

export function normalizeSpreadName(value: string | null | undefined): string {
  if (!value) return ""
  return value.trim().toLowerCase()
}

export const FIXED_PACKING_SPREAD_ORDER = [
  "32/40",
  "36/45",
  "40/50",
  "48/55",
  "56/60",
  "64/65",
  "72",
  "88",
  "105",
  "125",
] as const

const FIXED_SPREAD_ORDER_LOOKUP = new Map<string, number>(
  FIXED_PACKING_SPREAD_ORDER.map((label, index) => [normalizeSpreadName(label), index])
)

export function getFixedSpreadOrderRank(value: string | null | undefined): number {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }
  const normalized = normalizeSpreadName(value)
  if (!normalized) {
    return Number.POSITIVE_INFINITY
  }
  const rank = FIXED_SPREAD_ORDER_LOOKUP.get(normalized)
  return typeof rank === "number" ? rank : Number.POSITIVE_INFINITY
}

export function compareSpreadsByFixedOrder(
  a: string,
  b: string,
  options?: { fallbackOrder?: Map<string, number> }
): number {
  const rankA = getFixedSpreadOrderRank(a)
  const rankB = getFixedSpreadOrderRank(b)

  if (Number.isFinite(rankA) && Number.isFinite(rankB)) {
    if (rankA === rankB) {
      return 0
    }
    return rankA - rankB
  }

  if (Number.isFinite(rankA)) {
    return -1
  }

  if (Number.isFinite(rankB)) {
    return 1
  }

  if (options?.fallbackOrder) {
    const normalizedA = normalizeSpreadName(a)
    const normalizedB = normalizeSpreadName(b)
    const fallbackA = options.fallbackOrder.get(normalizedA)
    const fallbackB = options.fallbackOrder.get(normalizedB)
    const hasFallbackA = typeof fallbackA === "number"
    const hasFallbackB = typeof fallbackB === "number"
    if (hasFallbackA && hasFallbackB && fallbackA !== fallbackB) {
      return fallbackA - fallbackB
    }
    if (hasFallbackA && !hasFallbackB) {
      return -1
    }
    if (!hasFallbackA && hasFallbackB) {
      return 1
    }
  }

  const normalizedA = normalizeSpreadName(a)
  const normalizedB = normalizeSpreadName(b)
  if (normalizedA === normalizedB) {
    return 0
  }
  return normalizedA.localeCompare(normalizedB, undefined, { sensitivity: "base" })
}

function normalizeDistributorKey(value: string | null | undefined): string {
  if (!value) return UNASSIGNED_DISTRIBUTOR_KEY
  const trimmed = value.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : UNASSIGNED_DISTRIBUTOR_KEY
}

function resolveDistributorLabel(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : UNASSIGNED_DISTRIBUTOR_LABEL
}

export function getDistributorDisplayLabel(value: string | null | undefined): string {
  const base = resolveDistributorLabel(value)
  const trimmed = base.trim()
  if (trimmed.length === 0) {
    return UNASSIGNED_DISTRIBUTOR_DISPLAY_LABEL
  }
  if (trimmed.toLowerCase() === UNASSIGNED_DISTRIBUTOR_LABEL.toLowerCase()) {
    return UNASSIGNED_DISTRIBUTOR_DISPLAY_LABEL
  }
  return base
}

function addToMapList(map: Map<string, string[]>, key: string, value: string) {
  const current = map.get(key)
  if (current) {
    if (!current.includes(value)) {
      current.push(value)
    }
    return
  }
  map.set(key, [value])
}

function sanitizeSpreadList(values: unknown[]): string[] {
  return values
    .map((value) => {
      if (typeof value === "string") return value.trim()
      if (typeof value === "object" && value && "spread" in value && typeof (value as { spread?: unknown }).spread === "string") {
        return ((value as { spread?: string }).spread ?? "").trim()
      }
      if (typeof value === "object" && value && "key" in value && typeof (value as { key?: unknown }).key === "string") {
        return ((value as { key?: string }).key ?? "").trim()
      }
      if (typeof value === "object" && value && "label" in value && typeof (value as { label?: unknown }).label === "string") {
        return ((value as { label?: string }).label ?? "").trim()
      }
      return ""
    })
    .filter((value) => value.length > 0)
}

function extractSpreadValues(source: PackhouseSpreadSource | null | undefined): string[] {
  if (!source) return []

  if (Array.isArray(source)) {
    return sanitizeSpreadList(source)
  }

  if (source && typeof source === "object" && "spreads" in source) {
    const spreadsValue = (source as { spreads?: unknown }).spreads
    if (Array.isArray(spreadsValue)) {
      return sanitizeSpreadList(spreadsValue)
    }
    if (spreadsValue && typeof spreadsValue === "object") {
      return Object.keys(spreadsValue as Record<string, unknown>).map((key) => key.trim()).filter((key) => key.length > 0)
    }
  }

  return []
}

function resolveCandidateList(source: PackhouseDistributionSource | null | undefined): unknown[] | null {
  if (!source) return null

  if (Array.isArray(source)) {
    return source
  }

  if (typeof source !== "object") {
    return null
  }

  const distributions = (source as { distributions?: unknown[] }).distributions
  if (Array.isArray(distributions)) {
    return distributions
  }

  const distributors = (source as { distributors?: unknown[] }).distributors
  if (Array.isArray(distributors)) {
    return distributors
  }

  return null
}

function extractDistributionEntries(
  source: PackhouseDistributionSource | null | undefined
): PackhouseConfigEntry[] {
  const candidateList = resolveCandidateList(source)

  if (!candidateList || candidateList.length === 0) return []

  return candidateList
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null
      const spreadValue = "spread" in raw && typeof (raw as { spread?: unknown }).spread === "string" ? (raw as { spread?: string }).spread : null
      if (!spreadValue) return null
      const distributorValue =
        "distributor" in raw && typeof (raw as { distributor?: unknown }).distributor === "string"
          ? (raw as { distributor?: string }).distributor ?? ""
          : ""
      return {
        spread: spreadValue.trim(),
        distributor: distributorValue.trim(),
      } satisfies PackhouseConfigEntry
    })
    .filter((entry): entry is PackhouseConfigEntry => Boolean(entry?.spread))
}

function extractDistributorNames(source: PackhouseDistributionSource | null | undefined): string[] {
  if (source && typeof source === "object" && !Array.isArray(source)) {
    const distributors = (source as { distributors?: unknown }).distributors
    if (distributors && typeof distributors === "object" && !Array.isArray(distributors)) {
      return Object.keys(distributors as Record<string, unknown>).map((key) => key.trim()).filter((key) => key.length > 0)
    }
  }

  const candidateList = resolveCandidateList(source)

  if (!candidateList || candidateList.length === 0) return []

  return candidateList
    .map((value) => {
      if (typeof value === "string") return value.trim()
      if (value && typeof value === "object" && "distributor" in value && typeof (value as { distributor?: unknown }).distributor === "string") {
        return ((value as { distributor?: string }).distributor ?? "").trim()
      }
      return ""
    })
    .filter((value) => value.length > 0)
}

async function fetchJsonOrNull<T>(path: string | null): Promise<T | null> {
  if (!path) return null
  const response = await fetch(path, { cache: "no-store" })
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load packhouse config (${path}): ${response.status}`)
  }
  return (await response.json()) as T
}

export function usePackhouseConfig(): PackhouseConfigState {
  const { packhouseSpreadPath, packhouseDistributorsPath } = useClientDatasetPaths()
  const [state, setState] = React.useState<PackhouseConfigState>(() => createState({ loading: true }))

  React.useEffect(() => {
    let cancelled = false

    if (!packhouseSpreadPath && !packhouseDistributorsPath) {
      setState(createState())
      return () => {
        cancelled = true
      }
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }))

    const load = async () => {
      try {
        const [spreadSource, distributionSource] = await Promise.all([
          fetchJsonOrNull<PackhouseSpreadSource>(packhouseSpreadPath),
          fetchJsonOrNull<PackhouseDistributionSource>(packhouseDistributorsPath),
        ])

        const spreadValues = extractSpreadValues(spreadSource)
        const distributionEntries = extractDistributionEntries(distributionSource)
        const distributorNames = extractDistributorNames(distributionSource)

        if (!spreadValues.length && !distributionEntries.length && !distributorNames.length) {
          if (!cancelled) {
            setState(createState())
          }
          return
        }

        const spreadToDistributor = new Map<string, string>()
        const distributorToSpreads = new Map<string, string[]>()
        const canonicalDistributorLabels = new Map<string, string>()
        const distributorOrder: string[] = []
  const seenSpreads = new Set<string>()
  const orderedSpreads: string[] = []
  const spreadOriginalOrder = new Map<string, number>()
        const distributionLookup = new Map<string, string>()

        distributionEntries.forEach(({ spread, distributor }) => {
          const normalizedSpread = normalizeSpreadName(spread)
          if (!normalizedSpread) return
          distributionLookup.set(normalizedSpread, distributor ?? "")
        })

        const registerSpread = (rawSpread: string) => {
          const trimmed = rawSpread.trim()
          if (!trimmed) {
            return
          }
          const normalized = normalizeSpreadName(trimmed)
          if (seenSpreads.has(normalized)) {
            return
          }
          seenSpreads.add(normalized)
          spreadOriginalOrder.set(normalized, spreadOriginalOrder.size)
          orderedSpreads.push(trimmed)
        }

        spreadValues.forEach(registerSpread)
        distributionEntries.forEach((entry) => {
          if (entry.spread) {
            registerSpread(entry.spread)
          }
        })

        if (!orderedSpreads.length) {
          spreadValues.forEach(registerSpread)
        }

        orderedSpreads.sort((a, b) =>
          compareSpreadsByFixedOrder(a, b, { fallbackOrder: spreadOriginalOrder })
        )

        const entries: PackhouseConfigEntry[] = orderedSpreads.map((spread, index) => {
          const normalized = normalizeSpreadName(spread)
          const fallbackFromList = distributorNames[index] ?? ""
          const distributor = distributionLookup.get(normalized) ?? fallbackFromList
          return { spread, distributor }
        })

        const spreadList: string[] = []

        entries.forEach((entry) => {
          const spreadKey = normalizeSpreadName(entry.spread)
          if (!spreadKey) {
            return
          }
          const distributorKey = normalizeDistributorKey(entry.distributor)
          let distributorLabel = canonicalDistributorLabels.get(distributorKey)
          if (!distributorLabel) {
            distributorLabel = resolveDistributorLabel(entry.distributor)
            canonicalDistributorLabels.set(distributorKey, distributorLabel)
            distributorOrder.push(distributorLabel)
          }
          spreadList.push(spreadKey)
          spreadToDistributor.set(spreadKey, distributorLabel)
          addToMapList(distributorToSpreads, distributorLabel, spreadKey)
        })

        const spreads = new Set(spreadList)

        if (!cancelled) {
          setState(
            createState({
              entries,
              spreads,
              spreadList,
              distributors: distributorOrder,
              spreadToDistributor,
              distributorToSpreads,
            })
          )
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error : new Error("Unknown error"),
          }))
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [packhouseSpreadPath, packhouseDistributorsPath])

  return state
}
