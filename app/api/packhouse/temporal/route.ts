export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { Buffer } from "node:buffer"

import type { PackhouseRecord, DistributorSpreadTotal } from "@/app/(modules)/packhouse/utils/packhouse-types"
import type { PackingProgressMetric } from "@/app/(modules)/packhouse/utils/packhouse-types"
import { parseMasterConfigCsv, type MasterConfigRecord } from "@/lib/master-config"

type TeamdeskRow = Record<string, unknown>

type ClassConfig = {
  classes?: Record<string, string[]>
}

type SpreadConfig = {
  spreads?: Record<string, Array<number | string>>
}

type DistributorConfig = {
  distributors?: Record<string, string[]>
}

type MarketConfig = {
  markets?: string[]
}

type PackhouseServerConfig = {
  gradeToClass: Map<string, "Class I" | "Class II" | "Class III">
  spreadOrder: string[]
  spreadLookup: Map<number, string>
  distributorOrder: string[]
  distributorAliasMap: Map<string, string>
  distributorPatterns: Array<{ pattern: string; canonical: string }>
  marketOrder: string[]
  marketAliasMap: Map<string, string>
  blockLookup: Map<string, string>
  blockToPuc: Map<string, string>
}

type RecordsCacheEntry = {
  records: PackhouseRecord[]
  sourceRowCount: number
  expiresAt: number
}

type WeightStats = {
  totalWeightKg: number
  totalPacks: number
}

type WeightHeuristics = {
  grossPerPack: Map<string, WeightStats>
  netPerPack: Map<string, WeightStats>
  packagingPerPack: Map<string, WeightStats>
}

type HeuristicKeyParts = {
  client: string
  packType: string
  count: string
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_TTL_MS = (() => {
  const raw = Number(process.env.PACKHOUSE_CACHE_TTL_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CACHE_TTL_MS
})()

const TEAMDESK_PAGE_SIZE = (() => {
  const raw = Number(process.env.TEAMDESK_PAGE_SIZE)
  if (Number.isFinite(raw) && raw >= 100 && raw <= 1000) {
    return Math.floor(raw)
  }
  return 500
})()

const TEAMDESK_CONCURRENCY = (() => {
  const raw = Number(process.env.TEAMDESK_CONCURRENCY)
  if (Number.isFinite(raw) && raw >= 1 && raw <= 8) {
    return Math.floor(raw)
  }
  return 3
})()

const TEAMDESK_MAX_RETRIES = (() => {
  const raw = Number(process.env.TEAMDESK_MAX_RETRIES)
  if (Number.isFinite(raw) && raw >= 0 && raw <= 8) {
    return Math.floor(raw)
  }
  return 5
})()

const RETRY_BASE_DELAY_MS = 750
const RETRY_MAX_DELAY_MS = 6000

const TEAMDESK_DOMAIN = process.env.TEAMDESK_DOMAIN ?? "appnostic.dbflex.net"
const TEAMDESK_APP_ID = process.env.TEAMDESK_APP_ID ?? "75820"
const TEAMDESK_TABLE = process.env.TEAMDESK_TABLE ?? "Palletizing"
const TEAMDESK_VIEW = process.env.TEAMDESK_VIEW ?? "BI_Palletizing"
const TEAMDESK_FILTER = process.env.TEAMDESK_FILTER

const configCache = new Map<string, PackhouseServerConfig>()
const recordsCache = new Map<string, RecordsCacheEntry>()

const MARKET_OVERRIDES: Record<string, string> = {
  gb: "uk",
}

const UNASSIGNED_DISTRIBUTOR_LABEL = "Unassigned"

const HEURISTIC_ANY = "*"

function buildHeuristicKey(parts: HeuristicKeyParts): string {
  return `${parts.client}|${parts.packType}|${parts.count}`
}

function dedupe<T>(values: T[]): T[] {
  return values.filter((value, index, array) => array.indexOf(value) === index)
}

function getHeuristicKeyParts(row: TeamdeskRow): HeuristicKeyParts {
  const client = normalizeKey(row["Client"]) || HEURISTIC_ANY
  const packType = normalizeKey(row["Pack Type"]) || HEURISTIC_ANY
  const countValue = toNumber(row["Count/Size"])
  const count = Number.isFinite(countValue) && (countValue ?? 0) > 0 ? String(Math.round(countValue!)) : HEURISTIC_ANY
  return { client, packType, count }
}

function getHeuristicKeyCandidates(parts: HeuristicKeyParts): string[] {
  const { client, packType, count } = parts
  const candidates = [
    buildHeuristicKey({ client, packType, count }),
    buildHeuristicKey({ client, packType, count: HEURISTIC_ANY }),
    buildHeuristicKey({ client: HEURISTIC_ANY, packType, count }),
    buildHeuristicKey({ client: HEURISTIC_ANY, packType, count: HEURISTIC_ANY }),
    buildHeuristicKey({ client, packType: HEURISTIC_ANY, count }),
    buildHeuristicKey({ client, packType: HEURISTIC_ANY, count: HEURISTIC_ANY }),
    buildHeuristicKey({ client: HEURISTIC_ANY, packType: HEURISTIC_ANY, count }),
    buildHeuristicKey({ client: HEURISTIC_ANY, packType: HEURISTIC_ANY, count: HEURISTIC_ANY }),
  ]
  return dedupe(candidates)
}

function updateWeightStats(map: Map<string, WeightStats>, keys: string[], weightKg: number, packQty: number) {
  if (!(weightKg > 0) || !(packQty > 0)) return
  keys.forEach((key) => {
    const current = map.get(key)
    if (current) {
      current.totalWeightKg += weightKg
      current.totalPacks += packQty
    } else {
      map.set(key, { totalWeightKg: weightKg, totalPacks: packQty })
    }
  })
}

function computeWeightHeuristics(rows: TeamdeskRow[]): WeightHeuristics {
  const grossPerPack = new Map<string, WeightStats>()
  const netPerPack = new Map<string, WeightStats>()
  const packagingPerPack = new Map<string, WeightStats>()

  for (const row of rows) {
    const packQty = toNumber(row["Pack QTY"])
    if (!packQty || packQty <= 0) continue

    const parts = getHeuristicKeyParts(row)
    const keys = getHeuristicKeyCandidates(parts)

    const packagingWeightKg = toNumber(row["Packaging Weight"]) ?? 0
    const palletWeightKg = toNumber(row["Pallet Weight"]) ?? null
    const weightKg = toNumber(row["Weight"]) ?? null

    const grossCandidate = palletWeightKg && palletWeightKg > 0 ? palletWeightKg : weightKg && weightKg > 0 ? weightKg + packagingWeightKg : null
    const netCandidateFromGross = grossCandidate && grossCandidate > 0 ? Math.max(grossCandidate - packagingWeightKg, 0) : null
    const netCandidate = netCandidateFromGross && netCandidateFromGross > 0 ? netCandidateFromGross : weightKg && weightKg > 0 ? weightKg : null

    if (grossCandidate && grossCandidate > 0) {
      updateWeightStats(grossPerPack, keys, grossCandidate, packQty)
    }

    if (netCandidate && netCandidate > 0) {
      updateWeightStats(netPerPack, keys, netCandidate, packQty)
    }

    if (packagingWeightKg > 0) {
      updateWeightStats(packagingPerPack, keys, packagingWeightKg, packQty)
    }
  }

  return { grossPerPack, netPerPack, packagingPerPack }
}

function getAveragePerPack(map: Map<string, WeightStats>, keys: string[]): number | null {
  for (const key of keys) {
    const stats = map.get(key)
    if (stats && stats.totalPacks > 0 && stats.totalWeightKg > 0) {
      return stats.totalWeightKg / stats.totalPacks
    }
  }
  return null
}

function estimateWeightKg(map: Map<string, WeightStats>, keys: string[], packQty: number): number | null {
  if (!(packQty > 0)) return null
  const average = getAveragePerPack(map, keys)
  if (average === null) return null
  return average * packQty
}

function normalizeDisplay(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value.trim()
  return String(value).trim()
}

function normalizeKey(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") {
    return String(value).trim().toLowerCase()
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase()
  }
  return String(value).trim().toLowerCase()
}

function sanitizeKey(value: string): string {
  return value.replace(/[^a-z0-9]+/g, " ").trim()
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const sanitized = trimmed.replace(/,/g, "")
    const parsed = Number(sanitized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

async function loadJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return null
    }
    throw error
  }
}

async function loadMasterConfigRecords(slug: string): Promise<MasterConfigRecord[]> {
  const filePath = path.join(process.cwd(), "public", "data", slug, "master-config.csv")
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return parseMasterConfigCsv(raw)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return []
    }
    throw error
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === "\"") {
      const next = line[i + 1]
      if (inQuotes && next === "\"") {
        current += "\""
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

function collectBlockKeyVariants(value: unknown): string[] {
  const variants = new Set<string>()
  const display = normalizeDisplay(value)
  if (!display) return []

  const normalized = normalizeKey(display)
  if (normalized) {
    variants.add(normalized)
    variants.add(normalized.replace(/\s+/g, ""))
    variants.add(normalized.replace(/[^a-z0-9]+/g, ""))
  }

  variants.add(display.trim().toLowerCase())

  const sanitizedRaw = sanitizeKey(display)
  if (sanitizedRaw) {
    variants.add(sanitizedRaw)
    variants.add(sanitizedRaw.replace(/\s+/g, ""))
    variants.add(sanitizedRaw.replace(/[^a-z0-9]+/g, ""))
  }

  const sanitizedNormalized = sanitizedRaw || ""
  if (sanitizedNormalized) {
    variants.add(sanitizedNormalized.trim().toLowerCase())
  }

  return Array.from(variants)
    .map((key) => key.trim().toLowerCase())
    .filter((key) => key.length > 0)
}

function addBlockMapping(
  map: Map<string, string>,
  rawKey: string,
  canonical: string,
  blockToPuc?: Map<string, string>,
  puc?: string
) {
  const variants = collectBlockKeyVariants(rawKey)
  if (!variants.length) return

  variants.forEach((variant) => {
    if (!map.has(variant)) {
      map.set(variant, canonical)
    }
    if (blockToPuc && puc && !blockToPuc.has(variant)) {
      blockToPuc.set(variant, puc)
    }
  })
}

async function loadBlockLookup(slug: string): Promise<{
  blockLookup: Map<string, string>
  blockToPuc: Map<string, string>
}> {
  const lookup = new Map<string, string>()
  const blockToPuc = new Map<string, string>()
  const masterRecords = await loadMasterConfigRecords(slug)
  if (masterRecords.length > 0) {
    masterRecords.forEach((record) => {
      const canonical = record.block?.trim() ?? ""
      if (!canonical) return
      const puc = record.puc?.trim() ?? ""
      addBlockMapping(lookup, canonical, canonical, blockToPuc, puc || undefined)
      if (Number.isFinite(record.id)) {
        addBlockMapping(lookup, String(record.id), canonical, blockToPuc, puc || undefined)
      }
    })
  }
  const filePath = path.join(process.cwd(), "public", "data", slug, "api", "teamdesk_block_power_bi.csv")

  let raw: string
  try {
    raw = await fs.readFile(filePath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return { blockLookup: lookup, blockToPuc }
    }
    throw error
  }

  const text = raw.replace(/^\ufeff/, "").trim()
  if (!text) {
    return { blockLookup: lookup, blockToPuc }
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length <= 1) {
    return { blockLookup: lookup, blockToPuc }
  }

  const headerCells = parseCsvLine(lines[0])
  const normalized = headerCells.map((cell) => cell.trim().toLowerCase())

  const blockNoIndex = normalized.indexOf("block no")
  if (blockNoIndex === -1) {
    return { blockLookup: lookup, blockToPuc }
  }

  const idIndex = normalized.indexOf("id")
  const rowIdIndex = normalized.indexOf("@row.id")
  const productionUnitIndex = (() => {
    const candidates = [
      normalized.indexOf("production unit name"),
      normalized.indexOf("production unit"),
      normalized.indexOf("puc"),
    ]
    return candidates.find((index) => index !== -1) ?? -1
  })()

  for (const rawLine of lines.slice(1)) {
    const cells = parseCsvLine(rawLine)
    const canonical = cells[blockNoIndex]?.trim()
    if (!canonical) continue

    const productionUnit = productionUnitIndex !== -1 ? cells[productionUnitIndex]?.trim() ?? "" : ""

    addBlockMapping(lookup, canonical, canonical, blockToPuc, productionUnit || undefined)

    const idCell = idIndex !== -1 ? cells[idIndex]?.trim() ?? "" : ""
    if (idCell) {
      addBlockMapping(lookup, idCell, canonical, blockToPuc, productionUnit || undefined)
      const numeric = Number.parseInt(idCell, 10)
      if (Number.isFinite(numeric)) {
        addBlockMapping(lookup, String(numeric), canonical, blockToPuc, productionUnit || undefined)
      }
    }

    const rowIdCell = rowIdIndex !== -1 ? cells[rowIdIndex]?.trim() ?? "" : ""
    if (rowIdCell) {
      addBlockMapping(lookup, rowIdCell, canonical, blockToPuc, productionUnit || undefined)
      const numeric = Number.parseInt(rowIdCell, 10)
      if (Number.isFinite(numeric)) {
        addBlockMapping(lookup, String(numeric), canonical, blockToPuc, productionUnit || undefined)
      }
    }
  }

  return { blockLookup: lookup, blockToPuc }
}

async function loadPackhouseConfig(slug: string): Promise<PackhouseServerConfig> {
  const cached = configCache.get(slug)
  if (cached) {
    return cached
  }

  const baseDir = path.join(process.cwd(), "public", "data", slug, "packhouse")

  const [classConfig, spreadConfig, distributorConfig, marketConfig] = await Promise.all([
    loadJsonFile<ClassConfig>(path.join(baseDir, "packhouse-class.json")),
    loadJsonFile<SpreadConfig>(path.join(baseDir, "packhouse-spread.json")),
    loadJsonFile<DistributorConfig>(path.join(baseDir, "packhouse-distributors.json")),
    loadJsonFile<MarketConfig>(path.join(baseDir, "packhouse-markets.json")),
  ])

  const { blockLookup, blockToPuc } = await loadBlockLookup(slug)

  const gradeToClass = new Map<string, "Class I" | "Class II" | "Class III">()
  if (classConfig?.classes) {
    for (const [className, entries] of Object.entries(classConfig.classes)) {
      if (!Array.isArray(entries)) continue
      entries.forEach((entry) => {
        const key = normalizeKey(entry)
        if (!key) return
        const canonical = className.trim() as "Class I" | "Class II" | "Class III"
        gradeToClass.set(key, canonical)
        const sanitized = sanitizeKey(key)
        if (sanitized && sanitized !== key) {
          gradeToClass.set(sanitized, canonical)
        }
      })
    }
  }

  const spreadOrder: string[] = []
  const spreadLookup = new Map<number, string>()
  if (spreadConfig?.spreads) {
    for (const [label, values] of Object.entries(spreadConfig.spreads)) {
      spreadOrder.push(label)
      if (!Array.isArray(values)) continue
      values.forEach((candidate) => {
        const parsed = toNumber(candidate)
        if (parsed === null) return
        spreadLookup.set(Math.round(parsed), label)
      })
    }
  }

  const distributorOrder: string[] = []
  const distributorAliasMap = new Map<string, string>()
  const distributorPatterns: Array<{ pattern: string; canonical: string }> = []
  if (distributorConfig?.distributors) {
    for (const [canonical, aliases] of Object.entries(distributorConfig.distributors)) {
      const normalizedCanonical = normalizeKey(canonical)
      if (normalizedCanonical) {
        distributorOrder.push(canonical)
        distributorAliasMap.set(normalizedCanonical, canonical)
        const sanitizedCanonical = sanitizeKey(normalizedCanonical)
        if (sanitizedCanonical && sanitizedCanonical !== normalizedCanonical) {
          distributorAliasMap.set(sanitizedCanonical, canonical)
        }
        distributorPatterns.push({ pattern: sanitizedCanonical || normalizedCanonical, canonical })
      }
      if (!Array.isArray(aliases)) continue
      aliases.forEach((alias) => {
        const key = normalizeKey(alias)
        if (!key) return
        distributorAliasMap.set(key, canonical)
        const sanitized = sanitizeKey(key)
        if (sanitized && sanitized !== key) {
          distributorAliasMap.set(sanitized, canonical)
          distributorPatterns.push({ pattern: sanitized, canonical })
        } else if (key) {
          distributorPatterns.push({ pattern: key, canonical })
        }
      })
    }
  }

  const marketOrder = Array.isArray(marketConfig?.markets)
    ? marketConfig!.markets.map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.length > 0)
    : []

  const marketAliasMap = new Map<string, string>()
  marketOrder.forEach((code) => {
    marketAliasMap.set(code, code)
    const sanitized = sanitizeKey(code)
    if (sanitized && sanitized !== code) {
      marketAliasMap.set(sanitized, code)
    }
  })
  Object.entries(MARKET_OVERRIDES).forEach(([raw, canonical]) => {
    const normalized = raw.trim().toLowerCase()
    const target = canonical.trim().toLowerCase()
    if (!normalized || !target) return
    marketAliasMap.set(normalized, target)
  })

  const config: PackhouseServerConfig = {
    gradeToClass,
    spreadOrder,
    spreadLookup,
    distributorOrder,
    distributorAliasMap,
    distributorPatterns,
    marketOrder,
    marketAliasMap,
    blockLookup,
    blockToPuc,
  }

  configCache.set(slug, config)
  return config
}

function buildTeamdeskUrl(): string {
  const encodedTable = encodeURIComponent(TEAMDESK_TABLE)
  const base = `https://${TEAMDESK_DOMAIN}/secure/api/v2/${TEAMDESK_APP_ID}/${encodedTable}`
  if (TEAMDESK_VIEW) {
    const encodedView = encodeURIComponent(TEAMDESK_VIEW)
    return `${base}/${encodedView}/select.json`
  }
  return `${base}/select.json`
}

function buildTeamdeskHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
  }

  const token = process.env.TEAMDESK_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
    return headers
  }

  const user = process.env.TEAMDESK_USER
  const password = process.env.TEAMDESK_PASSWORD
  if (user && password) {
    const encoded = Buffer.from(`${user}:${password}`).toString("base64")
    headers.Authorization = `Basic ${encoded}`
    return headers
  }

  throw new Error("TeamDesk credentials are not configured. Provide TEAMDESK_TOKEN or TEAMDESK_USER/TEAMDESK_PASSWORD.")
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchTeamdeskRows(): Promise<TeamdeskRow[]> {
  const url = buildTeamdeskUrl()
  const headers = buildTeamdeskHeaders()
  const pageSize = TEAMDESK_PAGE_SIZE
  const pages: Array<{ skip: number; rows: TeamdeskRow[] }> = []

  let nextSkip = 0
  let exhausted = false

  const loadPage = async (skip: number, attempt = 0): Promise<TeamdeskRow[]> => {
    const pageUrl = new URL(url)
    pageUrl.searchParams.set("skip", String(skip))
    pageUrl.searchParams.set("top", String(pageSize))
    if (TEAMDESK_FILTER) {
      pageUrl.searchParams.set("filter", TEAMDESK_FILTER)
    }

    const response = await fetch(pageUrl, {
      headers,
      cache: "no-store",
    })

    if (response.status === 429 || response.status === 503) {
      if (attempt >= TEAMDESK_MAX_RETRIES) {
        const detail = await response.text()
        throw new Error(`TeamDesk request failed (${response.status}): ${detail}`)
      }

      const retryAfterHeader = response.headers.get("Retry-After")
      const retryAfterSeconds = retryAfterHeader ? Number.parseFloat(retryAfterHeader) : NaN
      const backoff = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, attempt), RETRY_MAX_DELAY_MS)
      const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : backoff
      await delay(delayMs)
      return loadPage(skip, attempt + 1)
    }

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`TeamDesk request failed (${response.status}): ${detail}`)
    }

    const payload = (await response.json()) as unknown
    if (!Array.isArray(payload)) {
      throw new Error("Unexpected TeamDesk response shape; expected array")
    }

    return payload as TeamdeskRow[]
  }

  async function worker() {
    while (true) {
      if (exhausted) {
        break
      }

      const currentSkip = nextSkip
      nextSkip += pageSize

      const rows = await loadPage(currentSkip)

      if (rows.length === 0) {
        exhausted = true
        continue
      }

      pages.push({ skip: currentSkip, rows })

      if (rows.length < pageSize) {
        exhausted = true
      }
    }
  }

  const concurrency = Math.max(1, TEAMDESK_CONCURRENCY)
  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  pages.sort((a, b) => a.skip - b.skip)

  const rows: TeamdeskRow[] = []
  for (const page of pages) {
    rows.push(...page.rows)
  }

  return rows
}

function resolveIsoDate(row: TeamdeskRow): { iso: string; timestamp: number } | null {
  const candidates = [row["Timestamp"], row["Date Modified"], row["Date Completed"], row["Date Created"]]
  for (const candidate of candidates) {
    const text = normalizeDisplay(candidate)
    if (!text) continue
    const parsed = Date.parse(text)
    if (!Number.isNaN(parsed)) {
      const iso = new Date(parsed).toISOString().slice(0, 10)
      return { iso, timestamp: parsed }
    }
  }
  return null
}

function resolveSeason(row: TeamdeskRow, fallbackIso: string): string {
  const explicit = normalizeDisplay(row["Seasons"])
  if (explicit) {
    const numeric = Number(explicit)
    if (Number.isFinite(numeric)) {
      const rounded = Math.trunc(numeric)
      if (rounded >= 1900 && rounded <= 3000) {
        return String(rounded)
      }
      const isoYear = fallbackIso.slice(0, 4)
      return isoYear
    }
    return explicit
  }
  const year = fallbackIso.slice(0, 4)
  return year
}

function resolveVariety(row: TeamdeskRow): string {
  const cultivar = normalizeDisplay(row["Cultivar"])
  if (cultivar) return cultivar
  const variety = normalizeDisplay(row["Variety"])
  if (variety) return variety
  return "Unknown"
}

function resolveBlock(row: TeamdeskRow, config: PackhouseServerConfig): string {
  const blockValue = normalizeDisplay(row["Block"] ?? row["Block No"])
  if (!blockValue) return "all"

  const variants = collectBlockKeyVariants(blockValue)
  for (const variant of variants) {
    const mapped = config.blockLookup.get(variant)
    if (mapped) {
      return mapped
    }
  }

  const numeric = toNumber(blockValue)
  if (numeric !== null) {
    const numericVariants = collectBlockKeyVariants(String(Math.round(numeric)))
    for (const variant of numericVariants) {
      const mapped = config.blockLookup.get(variant)
      if (mapped) {
        return mapped
      }
    }
  }

  return blockValue
}

function resolvePuc(row: TeamdeskRow, config: PackhouseServerConfig, resolvedBlock: string): string | null {
  const direct = normalizeDisplay(
    row["Production Unit Name"] ?? row["Production Unit"] ?? row["PUC"] ?? row["PUC Name"]
  )
  if (direct) {
    const variants = collectBlockKeyVariants(direct)
    for (const variant of variants) {
      const mappedVariant = config.blockToPuc.get(variant)
      if (mappedVariant) {
        return mappedVariant
      }
    }
    return direct
  }

  const candidateKeys = [resolvedBlock, row["Block"], row["Block No"], row["Id"], row["@row.id"]]
  for (const candidate of candidateKeys) {
    const variants = collectBlockKeyVariants(candidate)
    for (const variant of variants) {
      const mapped = config.blockToPuc.get(variant)
      if (mapped) {
        return mapped
      }
    }
  }

  return null
}

function resolveGradeClass(row: TeamdeskRow, config: PackhouseServerConfig): "Class I" | "Class II" | "Class III" | null {
  const grade = normalizeKey(row["Grade"]) || normalizeKey(row["Class"])
  if (!grade) return null
  const direct = config.gradeToClass.get(grade)
  if (direct) {
    return direct
  }
  const sanitized = sanitizeKey(grade)
  if (!sanitized || sanitized === grade) {
    return null
  }
  return config.gradeToClass.get(sanitized) ?? null
}

function resolveSpread(row: TeamdeskRow, config: PackhouseServerConfig): string | null {
  const countValue = toNumber(row["Count/Size"])
  if (countValue === null) return null
  const rounded = Math.round(countValue)
  return config.spreadLookup.get(rounded) ?? null
}

function resolveDistributorAlias(candidate: unknown, config: PackhouseServerConfig): string | null {
  const normalized = normalizeKey(candidate)
  if (!normalized) {
    return null
  }

  const direct = config.distributorAliasMap.get(normalized)
  if (direct) {
    return direct
  }

  const sanitized = sanitizeKey(normalized)
  if (sanitized) {
    const sanitizedMatch = config.distributorAliasMap.get(sanitized)
    if (sanitizedMatch) {
      return sanitizedMatch
    }

    for (const { pattern, canonical } of config.distributorPatterns) {
      if (!pattern) continue
      if (sanitized.includes(pattern)) {
        return canonical
      }
    }
  }

  for (const { pattern, canonical } of config.distributorPatterns) {
    if (!pattern) continue
    if (normalized.includes(pattern)) {
      return canonical
    }
  }

  return null
}

function resolveDistributor(row: TeamdeskRow, config: PackhouseServerConfig): string {
  const brandRaw = row["Brand"]
  const brandDisplay = normalizeDisplay(brandRaw)
  if (!brandDisplay) {
    return UNASSIGNED_DISTRIBUTOR_LABEL
  }

  const fromBrand = resolveDistributorAlias(brandRaw, config)
  if (fromBrand) {
    return fromBrand
  }

  const additionalCandidates = [
    row["Client"],
    row["Client Order"],
    row["Pack Type"],
    row["Target Market"],
    row["Target Country"],
  ]

  for (const candidate of additionalCandidates) {
    const resolved = resolveDistributorAlias(candidate, config)
    if (resolved) {
      return resolved
    }
  }

  return brandDisplay
}

function resolveMarket(row: TeamdeskRow, config: PackhouseServerConfig): string | null {
  const candidates = [row["Target Country"], row["Target Market"], row["Client"], row["Brand"]]
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate)
    if (!normalized) continue
    const direct = config.marketAliasMap.get(normalized)
    if (direct) {
      return direct
    }
    const sanitized = sanitizeKey(normalized)
    if (sanitized) {
      const sanitizedMatch = config.marketAliasMap.get(sanitized)
      if (sanitizedMatch) {
        return sanitizedMatch
      }
    }
  }
  return null
}

function createAggregationBucket(): {
  tons: number
  packagingWeightKg: number
  bins: Set<string>
  classTotals: Record<"Class I" | "Class II" | "Class III", number>
  spreads: Map<string, number>
  distributors: Map<string, number>
  markets: Map<string, number>
  pucTotals: Map<string, number>
  distributorSpreadTotals: Map<string, Map<string, number>>
} {
  return {
    tons: 0,
    packagingWeightKg: 0,
    bins: new Set<string>(),
    classTotals: {
      "Class I": 0,
      "Class II": 0,
      "Class III": 0,
    },
    spreads: new Map<string, number>(),
    distributors: new Map<string, number>(),
    markets: new Map<string, number>(),
    pucTotals: new Map<string, number>(),
    distributorSpreadTotals: new Map<string, Map<string, number>>(),
  }
}

function increment(map: Map<string, number>, key: string, value: number) {
  if (!key) return
  const current = map.get(key) ?? 0
  map.set(key, current + value)
}

function incrementNested(
  map: Map<string, Map<string, number>>,
  outerKey: string,
  innerKey: string,
  value: number
) {
  if (!outerKey || !innerKey) return
  let nested = map.get(outerKey)
  if (!nested) {
    nested = new Map<string, number>()
    map.set(outerKey, nested)
  }
  const current = nested.get(innerKey) ?? 0
  nested.set(innerKey, current + value)
}

function toFixedNumber(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function buildPackingProgress(
  bucket: ReturnType<typeof createAggregationBucket>,
  config: PackhouseServerConfig
): PackingProgressMetric[] {
  const entries: PackingProgressMetric[] = []
  const included = new Set<string>()

  config.spreadOrder.forEach((label) => {
    const value = bucket.spreads.get(label) ?? 0
    entries.push({ key: label, label, value })
    included.add(label)
  })
  bucket.spreads.forEach((value, label) => {
    if (included.has(label)) return
    entries.push({ key: label, label, value })
    included.add(label)
  })

  config.distributorOrder.forEach((label) => {
    const canonicalKey = label
    const value = bucket.distributors.get(canonicalKey) ?? 0
    entries.push({ key: canonicalKey, label: canonicalKey, value })
    included.add(canonicalKey)
  })
  bucket.distributors.forEach((value, label) => {
    if (included.has(label)) return
    entries.push({ key: label, label, value })
    included.add(label)
  })

  config.marketOrder.forEach((code) => {
    const value = bucket.markets.get(code) ?? 0
    entries.push({ key: code, label: code, value })
    included.add(code)
  })
  bucket.markets.forEach((value, code) => {
    if (included.has(code)) return
    entries.push({ key: code, label: code, value })
    included.add(code)
  })

  return entries
}

function transformRows(rows: TeamdeskRow[], config: PackhouseServerConfig): PackhouseRecord[] {
  const heuristics = computeWeightHeuristics(rows)
  const groups = new Map<string, ReturnType<typeof createAggregationBucket>>()

  for (const row of rows) {
    const dateInfo = resolveIsoDate(row)
    if (!dateInfo) continue

    const season = resolveSeason(row, dateInfo.iso)
    const variety = resolveVariety(row)
  const block = resolveBlock(row, config)
    const key = `${variety}|${season}|${block}|${dateInfo.iso}`

    let bucket = groups.get(key)
    if (!bucket) {
      bucket = createAggregationBucket()
      groups.set(key, bucket)
    }

    const packQty = toNumber(row["Pack QTY"]) ?? 0
    const resolvedPuc = resolvePuc(row, config, block)
    if (resolvedPuc) {
      const weight = packQty > 0 ? packQty : 1
      increment(bucket.pucTotals, resolvedPuc, weight)
    }
    const packagingWeightKgRaw = toNumber(row["Packaging Weight"]) ?? 0
    const heuristicParts = getHeuristicKeyParts(row)
    const heuristicKeys = getHeuristicKeyCandidates(heuristicParts)

    const palletWeightValue = toNumber(row["Pallet Weight"])
    const directWeightValue = toNumber(row["Weight"])

    let grossWeightKg = palletWeightValue && palletWeightValue > 0 ? palletWeightValue : null
    if ((grossWeightKg === null || grossWeightKg <= 0) && directWeightValue && directWeightValue > 0 && packagingWeightKgRaw >= 0) {
      grossWeightKg = directWeightValue + packagingWeightKgRaw
    }

    let netWeightKg: number | null = grossWeightKg && grossWeightKg > 0 ? Math.max(grossWeightKg - packagingWeightKgRaw, 0) : null
    if ((netWeightKg === null || netWeightKg <= 0) && directWeightValue && directWeightValue > 0) {
      netWeightKg = directWeightValue
    }

    if ((grossWeightKg === null || grossWeightKg <= 0) && packQty > 0) {
      const estimatedGross = estimateWeightKg(heuristics.grossPerPack, heuristicKeys, packQty)
      if (estimatedGross !== null) {
        grossWeightKg = estimatedGross
      }
    }

    if ((netWeightKg === null || netWeightKg <= 0) && packQty > 0) {
      const estimatedNet = estimateWeightKg(heuristics.netPerPack, heuristicKeys, packQty)
      if (estimatedNet !== null) {
        netWeightKg = estimatedNet
      }
    }

    let packagingWeightKg = packagingWeightKgRaw
    if (!(packagingWeightKg > 0) && packQty > 0) {
      const perPackPackaging = getAveragePerPack(heuristics.packagingPerPack, heuristicKeys)
      if (perPackPackaging !== null) {
        packagingWeightKg = perPackPackaging * packQty
      }
    }

    if ((grossWeightKg === null || grossWeightKg <= 0) && netWeightKg !== null && netWeightKg > 0) {
      const packagingContribution = packagingWeightKg > 0 ? packagingWeightKg : 0
      grossWeightKg = netWeightKg + packagingContribution
    }

    const resolvedGrossKg = grossWeightKg && grossWeightKg > 0 ? grossWeightKg : 0

    bucket.tons += resolvedGrossKg / 1000

    const packagingWeightContribution =
      packagingWeightKgRaw && packagingWeightKgRaw > 0
        ? packagingWeightKgRaw
        : packagingWeightKg && packagingWeightKg > 0
          ? packagingWeightKg
          : 0

    if (packagingWeightContribution > 0) {
      bucket.packagingWeightKg += packagingWeightContribution
    }

    if (packQty > 0) {
      const gradeClass = resolveGradeClass(row, config)
      if (gradeClass) {
        bucket.classTotals[gradeClass] += packQty
      }

      const spreadLabel = resolveSpread(row, config)
      if (spreadLabel) {
        increment(bucket.spreads, spreadLabel, packQty)
      }

      const distributorKey = resolveDistributor(row, config)
      if (distributorKey) {
        increment(bucket.distributors, distributorKey, packQty)
      }

      if (spreadLabel && distributorKey) {
        incrementNested(bucket.distributorSpreadTotals, distributorKey, spreadLabel, packQty)
      }

      const marketKey = resolveMarket(row, config)
      if (marketKey) {
        increment(bucket.markets, marketKey, packQty)
      }
    }

    const palletId = normalizeDisplay(row["Pallet ID"] ?? row["Id"])
    if (palletId) {
      bucket.bins.add(palletId)
    }
  }

  const records: PackhouseRecord[] = []

  groups.forEach((bucket, compositeKey) => {
    const [variety, season, block, isoDate] = compositeKey.split("|")
  const tonsTipped = toFixedNumber(bucket.tons, 3)
  const packagingWeightTons = bucket.packagingWeightKg / 100
  const ctnWeight = toFixedNumber(packagingWeightTons, 3)
  const ratio = bucket.tons > 0 ? packagingWeightTons / bucket.tons : 0
  const boundedRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(ratio, 1.5)) : 0
  const packPercentage = toFixedNumber(boundedRatio, 4)

    const record: PackhouseRecord = {
      variety,
      season,
      block,
      date: isoDate,
      timestamp: Date.parse(isoDate),
      tonsTipped,
      ctnWeight,
      binsTipped: bucket.bins.size,
  classI: Math.round(bucket.classTotals["Class I"]),
  classII: Math.round(bucket.classTotals["Class II"]),
  classIII: Math.round(bucket.classTotals["Class III"]),
      packPercentage,
      packingProgress: buildPackingProgress(bucket, config),
    }

    if (bucket.distributorSpreadTotals.size > 0) {
      const distributorSpreads: DistributorSpreadTotal[] = []
      bucket.distributorSpreadTotals.forEach((spreadMap, distributor) => {
        spreadMap.forEach((value, spread) => {
          if (value > 0) {
            distributorSpreads.push({ distributor, spread, value: Math.round(value) })
          }
        })
      })

      if (distributorSpreads.length > 0) {
        record.distributorSpreads = distributorSpreads
      }
    }

    if (bucket.pucTotals.size > 0) {
      let selectedPuc: string | null = null
      let maxValue = -Infinity
      bucket.pucTotals.forEach((value, key) => {
        if (value > maxValue) {
          maxValue = value
          selectedPuc = key
        }
      })
      if (selectedPuc) {
        record.puc = selectedPuc
      }
    }

    if (!record.puc) {
      const variants = collectBlockKeyVariants(block)
      for (const variant of variants) {
        const fallbackPuc = config.blockToPuc.get(variant)
        if (fallbackPuc) {
          record.puc = fallbackPuc
          break
        }
      }
    }

    records.push(record)
  })

  records.sort((a, b) => a.timestamp - b.timestamp)
  return records
}

async function loadPackhouseRecords(slug: string, forceRefresh: boolean): Promise<RecordsCacheEntry> {
  const cached = recordsCache.get(slug)
  const now = Date.now()
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached
  }

  const config = await loadPackhouseConfig(slug)
  const rows = await fetchTeamdeskRows()
  const records = transformRows(rows, config)

  const entry: RecordsCacheEntry = {
    records,
    sourceRowCount: rows.length,
    expiresAt: now + CACHE_TTL_MS,
  }

  recordsCache.set(slug, entry)
  return entry
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const clientSlug = url.searchParams.get("client") ?? url.searchParams.get("clientSlug")
    if (!clientSlug) {
      return NextResponse.json({ error: "Missing client parameter" }, { status: 400 })
    }

    const forceRefresh = url.searchParams.get("refresh") === "1"

    const { records, sourceRowCount, expiresAt } = await loadPackhouseRecords(clientSlug, forceRefresh)

    console.log("[packhouse temporal]", {
      client: clientSlug,
      recordCount: records.length,
      sourceRowCount,
      firstRecord: records[0],
      lastRecord: records[records.length - 1],
    })

    const response = NextResponse.json({
      records,
      meta: {
        client: clientSlug,
        recordCount: records.length,
        sourceRowCount,
        generatedAt: new Date().toISOString(),
        cacheExpiresAt: new Date(expiresAt).toISOString(),
        cache: forceRefresh ? "refreshed" : "cached",
      },
    })

    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("Failed to load packhouse data:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
