export type MasterConfigRecord = {
  id: number
  variety: string
  puc: string
  block: string
  area: number
  description?: string
}

export type MasterConfigIndex = {
  records: MasterConfigRecord[]
  varieties: string[]
  blocksByVariety: Record<string, string[]>
  allBlocks: string[]
  pucs: string[]
  pucsByVariety: Record<string, string[]>
}

type ColumnMap = {
  id: number
  variety: number
  puc: number
  block: number
  area: number
  description: number | null
}

function cleanCell(value: string | undefined): string {
  return value?.trim() ?? ""
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
      result.push(cleanCell(current))
      current = ""
      continue
    }

    current += char
  }

  result.push(cleanCell(current))
  return result
}

function resolveColumns(headers: string[]): ColumnMap | null {
  const normalized = headers.map((header) => header.trim().toLowerCase())

  const indexOf = (name: string): number => normalized.indexOf(name)

  const id = indexOf("id")
  const variety = indexOf("variety")
  const puc = indexOf("puc")
  const block = indexOf("block")
  const area = indexOf("area")

  if (id === -1 || variety === -1 || block === -1 || area === -1) {
    return null
  }

  const descriptionIndex = indexOf("description")

  return {
    id,
    variety,
    puc: puc === -1 ? puc : puc,
    block,
    area,
    description: descriptionIndex === -1 ? null : descriptionIndex,
  }
}

function toNumber(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseMasterConfigCsv(raw: string): MasterConfigRecord[] {
  if (!raw) return []

  const text = raw.replace(/^\ufeff/, "").trim()
  if (!text) return []

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length <= 1) {
    return []
  }

  const headerCells = parseCsvLine(lines[0])
  const columns = resolveColumns(headerCells)
  if (!columns) {
    return []
  }

  const records: MasterConfigRecord[] = []

  for (const rawLine of lines.slice(1)) {
    const cells = parseCsvLine(rawLine)

    const idCell = cleanCell(cells[columns.id])
    const varietyCell = cleanCell(cells[columns.variety])
    const pucCell = cleanCell(cells[columns.puc])
    const blockCell = cleanCell(cells[columns.block])
    const areaCell = cleanCell(cells[columns.area])
    const descriptionCell =
      columns.description != null ? cleanCell(cells[columns.description]) : ""

    if (!idCell || !varietyCell || !blockCell) {
      continue
    }

    const idNumber = Number.parseInt(idCell, 10)
    if (!Number.isFinite(idNumber)) {
      continue
    }

    const areaNumber = toNumber(areaCell) ?? 0

    const record: MasterConfigRecord = {
      id: idNumber,
      variety: varietyCell,
      puc: pucCell,
      block: blockCell,
      area: areaNumber,
    }

    if (descriptionCell) {
      record.description = descriptionCell
    }

    records.push(record)
  }

  return records
}

function sortAlphaNumeric(values: Iterable<string>): string[] {
  return Array.from(new Set(values))
    .filter((value) => value.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
}

export function buildMasterConfigIndex(records: MasterConfigRecord[]): MasterConfigIndex {
  const blocksByVarietyMap = new Map<string, Set<string>>()
  const pucsByVarietyMap = new Map<string, Set<string>>()
  const allBlocksSet = new Set<string>()
  const allPucsSet = new Set<string>()

  for (const record of records) {
    const variety = record.variety.trim()
    if (!variety) continue

    const block = record.block.trim()
    if (block) {
      if (!blocksByVarietyMap.has(variety)) {
        blocksByVarietyMap.set(variety, new Set<string>())
      }
      blocksByVarietyMap.get(variety)!.add(block)
      allBlocksSet.add(block)
    }

    const puc = record.puc.trim()
    if (puc) {
      if (!pucsByVarietyMap.has(variety)) {
        pucsByVarietyMap.set(variety, new Set<string>())
      }
      pucsByVarietyMap.get(variety)!.add(puc)
      allPucsSet.add(puc)
    }
  }

  const varieties = sortAlphaNumeric(blocksByVarietyMap.keys())

  const blocksByVariety: Record<string, string[]> = {}
  const pucsByVariety: Record<string, string[]> = {}

  for (const variety of varieties) {
    const blocks = blocksByVarietyMap.get(variety)
    if (blocks) {
      blocksByVariety[variety] = sortAlphaNumeric(blocks)
    } else {
      blocksByVariety[variety] = []
    }

    const pucs = pucsByVarietyMap.get(variety)
    if (pucs) {
      pucsByVariety[variety] = sortAlphaNumeric(pucs)
    } else {
      pucsByVariety[variety] = []
    }
  }

  const allBlocks = sortAlphaNumeric(allBlocksSet)
  const pucs = sortAlphaNumeric(allPucsSet)

  return {
    records,
    varieties,
    blocksByVariety,
    allBlocks,
    pucs,
    pucsByVariety,
  }
}

export function formatMasterConfigLabel(value: string): string {
  if (!value) return ""

  return value
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
