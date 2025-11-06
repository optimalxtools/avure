"use client"

import * as React from "react"

import { formatMasterConfigLabel } from "../master-config"
import { useMasterConfigOptions } from "./useMasterConfigOptions"

export const ALL_VARIETIES_VALUE = "__all_varieties__"
export const ALL_BLOCKS_VALUE = "__all_blocks__"
export const ALL_PUCS_VALUE = "__all_pucs__"

export type UseMasterConfigFiltersOptions = {
  sharedKey: string
  pageKey: string
  seasons?: string[]
  defaultVariety?: string
  defaultBlock?: string
  defaultPuc?: string
  defaultSeason?: string
  allowAllVarieties?: boolean
  allowAllBlocks?: boolean
  allowAllPucs?: boolean
  autoSelectFirstVariety?: boolean
  autoSelectFirstBlock?: boolean
  autoSelectFirstPuc?: boolean
  autoSelectFirstSeason?: boolean
}

export type UseMasterConfigFiltersResult = {
  loading: boolean
  error: string | null
  variety: string
  block: string
  puc: string
  season: string
  setVariety: (value: string) => void
  setBlock: (value: string) => void
  setPuc: (value: string) => void
  setSeason: (value: string) => void
  resetVariety: () => void
  resetBlock: () => void
  resetPuc: () => void
  resetSeason: () => void
  lockVariety: boolean
  lockBlock: boolean
  lockPuc: boolean
  lockSeason: boolean
  setLockVariety: (value: boolean) => void
  setLockBlock: (value: boolean) => void
  setLockPuc: (value: boolean) => void
  setLockSeason: (value: boolean) => void
  varietyOptions: string[]
  blockOptions: string[]
  pucOptions: string[]
  seasonOptions: string[]
  formatLabel: (value: string) => string
  formatBlockLabel: (value: string) => string
  defaultVarietyValue: string
  defaultBlockValue: string
  defaultPucValue: string
  defaultSeasonValue: string
  allVarietiesValue: string
  allBlocksValue: string
  allPucsValue: string
  getBlockPucs: (blockValue: string) => string[]
}

type PersistedPayload = {
  variety?: string
  block?: string
  puc?: string
  season?: string
  year?: string
  lockVariety?: boolean
  lockBlock?: boolean
  lockPuc?: boolean
  lockSeason?: boolean
  lockYear?: boolean
}

type FilterState = {
  variety: string
  block: string
  puc: string
  season: string
}

type LockState = {
  variety: boolean
  block: boolean
  puc: boolean
  season: boolean
}

function sortAlphaNumeric(values: Iterable<string>): string[] {
  return Array.from(
    new Set(
      Array.from(values)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
}

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase()
}

function readPersisted(key: string): PersistedPayload | null {
  try {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem(key) : null
    if (!raw) return null
    return JSON.parse(raw) as PersistedPayload
  } catch {
    return null
  }
}

function normalizePersisted(shared: PersistedPayload | null, local: PersistedPayload | null, defaults: FilterState) {
  const lockVariety = Boolean(shared?.lockVariety)
  const lockBlock = Boolean(shared?.lockBlock)
  const lockSeason = Boolean(shared?.lockSeason ?? shared?.lockYear)
  const lockPuc = Boolean(shared?.lockPuc)

  const sharedSeason = shared?.season ?? shared?.year ?? ""
  const localSeason = local?.season ?? local?.year ?? ""

  const variety = lockVariety
    ? shared?.variety ?? defaults.variety
    : local?.variety ?? defaults.variety

  const block = lockBlock
    ? shared?.block ?? defaults.block
    : local?.block ?? defaults.block

  const puc = lockPuc
    ? shared?.puc ?? defaults.puc
    : local?.puc ?? defaults.puc

  const season = lockSeason
    ? sharedSeason || defaults.season
    : localSeason || defaults.season

  return {
    filters: {
      variety: variety || defaults.variety,
      block: block || defaults.block,
      puc: puc || defaults.puc,
      season: season || defaults.season,
    } satisfies FilterState,
    locks: {
      variety: lockVariety,
      block: lockBlock,
      puc: lockPuc,
      season: lockSeason,
    } satisfies LockState,
  }
}

function isBrowser() {
  return typeof window !== "undefined"
}

export function useMasterConfigFilters(options: UseMasterConfigFiltersOptions): UseMasterConfigFiltersResult {
  const {
    sharedKey,
    pageKey,
    seasons = [],
    defaultVariety: defaultVarietyOption,
    defaultBlock: defaultBlockOption,
    defaultPuc: defaultPucOption,
    defaultSeason: defaultSeasonOption,
    allowAllVarieties = true,
    allowAllBlocks = true,
    allowAllPucs = true,
    autoSelectFirstVariety = false,
    autoSelectFirstBlock = false,
    autoSelectFirstPuc = false,
    autoSelectFirstSeason = true,
  } = options

  const defaultVariety = defaultVarietyOption ?? (allowAllVarieties ? ALL_VARIETIES_VALUE : "")
  const defaultBlock = defaultBlockOption ?? (allowAllBlocks ? ALL_BLOCKS_VALUE : "")
  const defaultPuc = defaultPucOption ?? (allowAllPucs ? ALL_PUCS_VALUE : "")
  const defaultSeason = defaultSeasonOption ?? ""

  const defaults: FilterState = {
    variety: defaultVariety,
    block: defaultBlock,
    puc: defaultPuc,
    season: defaultSeason,
  }

  const initial = React.useMemo(() => {
    if (!isBrowser()) {
      return {
        filters: defaults,
        locks: { variety: false, block: false, puc: false, season: false } satisfies LockState,
      }
    }
    const shared = readPersisted(sharedKey)
    const local = readPersisted(pageKey)
    return normalizePersisted(shared, local, defaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [filters, setFilters] = React.useState<FilterState>(initial.filters)
  const [locks, setLocks] = React.useState<LockState>(initial.locks)

  const {
    loading: configLoading,
    error: configError,
    records,
  } = useMasterConfigOptions()

  const recordList = React.useMemo(() => records ?? [], [records])

  const blockToPucMap = React.useMemo(() => {
    const map = new Map<string, Set<string>>()
    recordList.forEach((record) => {
      const blockValue = record.block?.trim()
      if (!blockValue) return
      const normalizedBlock = normalizeLookupValue(blockValue)
      if (!normalizedBlock) return
      if (!map.has(normalizedBlock)) {
        map.set(normalizedBlock, new Set<string>())
      }
      const pucValue = record.puc?.trim()
      if (pucValue) {
        map.get(normalizedBlock)!.add(pucValue)
      }
    })
    return map
  }, [recordList])

  const getBlockPucs = React.useCallback(
    (blockValue: string) => {
      if (!blockValue) return []
      const normalized = normalizeLookupValue(blockValue)
      if (!normalized) return []
      const values = blockToPucMap.get(normalized)
      if (!values || values.size === 0) {
        return []
      }
      return Array.from(values)
    },
    [blockToPucMap]
  )

  const currentSeasonOptions = React.useMemo(() => seasons ?? [], [seasons])

  const activeVariety = React.useMemo(() => {
    if (!filters.variety) return null
    if (allowAllVarieties && filters.variety === ALL_VARIETIES_VALUE) return null
    return filters.variety
  }, [allowAllVarieties, filters.variety])

  const activeBlock = React.useMemo(() => {
    if (!filters.block) return null
    if (allowAllBlocks && filters.block === ALL_BLOCKS_VALUE) return null
    return filters.block
  }, [allowAllBlocks, filters.block])

  const activePuc = React.useMemo(() => {
    if (!filters.puc) return null
    if (allowAllPucs && filters.puc === ALL_PUCS_VALUE) return null
    return filters.puc
  }, [allowAllPucs, filters.puc])

  const rawVarietyOptions = React.useMemo(() => {
    if (!recordList.length) return []

    const matching = recordList.filter((record) => {
      if (activeBlock && record.block !== activeBlock) return false
      if (activePuc && record.puc !== activePuc) return false
      return true
    })

    return sortAlphaNumeric(matching.map((record) => record.variety))
  }, [activeBlock, activePuc, recordList])

  const varietyOptions = React.useMemo(() => {
    if (allowAllVarieties) {
      return [ALL_VARIETIES_VALUE, ...rawVarietyOptions]
    }
    return [...rawVarietyOptions]
  }, [allowAllVarieties, rawVarietyOptions])

  const rawPucOptions = React.useMemo(() => {
    if (!recordList.length) return []

    const matching = recordList.filter((record) => {
      if (activeVariety && record.variety !== activeVariety) return false
      if (activeBlock && record.block !== activeBlock) return false
      return true
    })

    return sortAlphaNumeric(matching.map((record) => record.puc))
  }, [activeBlock, activeVariety, recordList])

  const pucOptions = React.useMemo(() => {
    if (allowAllPucs) {
      return [ALL_PUCS_VALUE, ...rawPucOptions]
    }
    return [...rawPucOptions]
  }, [allowAllPucs, rawPucOptions])

  const rawBlockOptions = React.useMemo(() => {
    if (!recordList.length) return []

    const matching = recordList.filter((record) => {
      if (activeVariety && record.variety !== activeVariety) return false
      if (activePuc && record.puc !== activePuc) return false
      return true
    })

    return sortAlphaNumeric(matching.map((record) => record.block))
  }, [activePuc, activeVariety, recordList])

  const blockOptions = React.useMemo(() => {
    if (allowAllBlocks) {
      return [ALL_BLOCKS_VALUE, ...rawBlockOptions]
    }
    return [...rawBlockOptions]
  }, [allowAllBlocks, rawBlockOptions])

  const isValidVariety = React.useCallback(
    (value: string) => {
      if (!value) return false
      if (allowAllVarieties && value === ALL_VARIETIES_VALUE) return true
      return rawVarietyOptions.includes(value)
    },
    [allowAllVarieties, rawVarietyOptions]
  )

  const isValidBlock = React.useCallback(
    (value: string) => {
      if (!value) return false
      if (allowAllBlocks && value === ALL_BLOCKS_VALUE) return true
      return rawBlockOptions.includes(value)
    },
    [allowAllBlocks, rawBlockOptions]
  )

  const isValidPuc = React.useCallback(
    (value: string) => {
      if (!value) return false
      if (allowAllPucs && value === ALL_PUCS_VALUE) return true
      return rawPucOptions.includes(value)
    },
    [allowAllPucs, rawPucOptions]
  )

  React.useEffect(() => {
    if (configLoading || configError) return

    setFilters((current) => {
      if (isValidVariety(current.variety)) {
        return current
      }

      let nextVariety = current.variety
      if (autoSelectFirstVariety && rawVarietyOptions.length > 0) {
        nextVariety = rawVarietyOptions[0]
      } else if (allowAllVarieties) {
        nextVariety = ALL_VARIETIES_VALUE
      } else if (rawVarietyOptions.length > 0) {
        nextVariety = rawVarietyOptions[0]
      } else {
        nextVariety = ""
      }

      if (nextVariety === current.variety) {
        return current
      }

      return { ...current, variety: nextVariety }
    })
  }, [
    allowAllVarieties,
    autoSelectFirstVariety,
    configError,
    configLoading,
    isValidVariety,
    rawVarietyOptions,
  ])

  React.useEffect(() => {
    if (configLoading || configError) return

    setFilters((current) => {
      if (isValidBlock(current.block)) {
        return current
      }

      let nextBlock = current.block
      if (autoSelectFirstBlock && rawBlockOptions.length > 0) {
        nextBlock = rawBlockOptions[0]
      } else if (allowAllBlocks) {
        nextBlock = ALL_BLOCKS_VALUE
      } else if (rawBlockOptions.length > 0) {
        nextBlock = rawBlockOptions[0]
      } else {
        nextBlock = ""
      }

      if (nextBlock === current.block) {
        return current
      }

      return { ...current, block: nextBlock }
    })
  }, [
    allowAllBlocks,
    autoSelectFirstBlock,
    configError,
    configLoading,
    isValidBlock,
    rawBlockOptions,
  ])

  React.useEffect(() => {
    if (configLoading || configError) return

    setFilters((current) => {
      if (isValidPuc(current.puc)) {
        return current
      }

      let nextPuc = current.puc
      if (autoSelectFirstPuc && rawPucOptions.length > 0) {
        nextPuc = rawPucOptions[0]
      } else if (allowAllPucs) {
        nextPuc = ALL_PUCS_VALUE
      } else if (rawPucOptions.length > 0) {
        nextPuc = rawPucOptions[0]
      } else {
        nextPuc = ""
      }

      if (nextPuc === current.puc) {
        return current
      }

      return { ...current, puc: nextPuc }
    })
  }, [
    allowAllPucs,
    autoSelectFirstPuc,
    configError,
    configLoading,
    isValidPuc,
    rawPucOptions,
  ])

  React.useEffect(() => {
    if (!currentSeasonOptions.length) {
      setFilters((current) => (current.season ? { ...current, season: "" } : current))
      return
    }

    setFilters((current) => {
      if (current.season && currentSeasonOptions.includes(current.season)) {
        return current
      }

      let nextSeason = current.season
      if (autoSelectFirstSeason && currentSeasonOptions.length > 0) {
        nextSeason = currentSeasonOptions[0]
      } else if (defaultSeason) {
        nextSeason = defaultSeason
      } else if (currentSeasonOptions.length > 0) {
        nextSeason = currentSeasonOptions[0]
      } else {
        nextSeason = ""
      }

      if (nextSeason === current.season) {
        return current
      }

      return { ...current, season: nextSeason }
    })
  }, [autoSelectFirstSeason, currentSeasonOptions, defaultSeason])

  React.useEffect(() => {
    if (!isBrowser()) return

    const sharedPayload: PersistedPayload = {
      lockVariety: locks.variety,
      lockBlock: locks.block,
      lockPuc: locks.puc,
      lockSeason: locks.season,
      lockYear: locks.season,
    }

    if (locks.variety && filters.variety) {
      sharedPayload.variety = filters.variety
    }
    if (locks.block && filters.block) {
      sharedPayload.block = filters.block
    }
    if (locks.puc && filters.puc) {
      sharedPayload.puc = filters.puc
    }
    if (locks.season && filters.season) {
      sharedPayload.season = filters.season
      sharedPayload.year = filters.season
    }

    try {
      sessionStorage.setItem(sharedKey, JSON.stringify(sharedPayload))
    } catch {
      /* ignore */
    }

    const pagePayload: PersistedPayload = {
      variety: filters.variety,
      block: filters.block,
      puc: filters.puc,
    }
    if (filters.season) {
      pagePayload.season = filters.season
      pagePayload.year = filters.season
    }

    try {
      sessionStorage.setItem(pageKey, JSON.stringify(pagePayload))
    } catch {
      /* ignore */
    }
  }, [filters, locks, pageKey, sharedKey])

  const setVariety = React.useCallback(
    (value: string) => {
      setFilters((current) => (locks.variety ? current : { ...current, variety: value }))
    },
    [locks.variety]
  )

  const setBlock = React.useCallback(
    (value: string) => {
      setFilters((current) => (locks.block ? current : { ...current, block: value }))
    },
    [locks.block]
  )

  const setPuc = React.useCallback(
    (value: string) => {
      setFilters((current) => (locks.puc ? current : { ...current, puc: value }))
    },
    [locks.puc]
  )

  const setSeason = React.useCallback(
    (value: string) => {
      setFilters((current) => (locks.season ? current : { ...current, season: value }))
    },
    [locks.season]
  )

  const setLockVariety = React.useCallback((value: boolean) => {
    setLocks((current) => (current.variety === value ? current : { ...current, variety: value }))
  }, [])

  const setLockBlock = React.useCallback((value: boolean) => {
    setLocks((current) => (current.block === value ? current : { ...current, block: value }))
  }, [])

  const setLockPuc = React.useCallback((value: boolean) => {
    setLocks((current) => (current.puc === value ? current : { ...current, puc: value }))
  }, [])

  const setLockSeason = React.useCallback((value: boolean) => {
    setLocks((current) => (current.season === value ? current : { ...current, season: value }))
  }, [])

  const resetVariety = React.useCallback(() => {
    setFilters((current) => (locks.variety ? current : { ...current, variety: defaultVariety }))
  }, [defaultVariety, locks.variety])

  const resetBlock = React.useCallback(() => {
    setFilters((current) => (locks.block ? current : { ...current, block: defaultBlock }))
  }, [defaultBlock, locks.block])

  const resetPuc = React.useCallback(() => {
    setFilters((current) => (locks.puc ? current : { ...current, puc: defaultPuc }))
  }, [defaultPuc, locks.puc])

  const resetSeason = React.useCallback(() => {
    setFilters((current) => (locks.season ? current : { ...current, season: defaultSeason }))
  }, [defaultSeason, locks.season])

  const formatBlockLabel = React.useCallback((value: string) => {
    const formatted = formatMasterConfigLabel(value)
    return formatted.toUpperCase()
  }, [])

  return {
    loading: configLoading,
    error: configError,
    variety: filters.variety,
    block: filters.block,
    puc: filters.puc,
    season: filters.season,
    setVariety,
    setBlock,
    setPuc,
    setSeason,
    resetVariety,
    resetBlock,
    resetPuc,
    resetSeason,
    lockVariety: locks.variety,
    lockBlock: locks.block,
    lockPuc: locks.puc,
    lockSeason: locks.season,
    setLockVariety,
    setLockBlock,
    setLockPuc,
    setLockSeason,
    varietyOptions,
    blockOptions,
    pucOptions,
    seasonOptions: currentSeasonOptions,
    formatLabel: formatMasterConfigLabel,
    formatBlockLabel,
    defaultVarietyValue: defaultVariety,
    defaultBlockValue: defaultBlock,
    defaultPucValue: defaultPuc,
    defaultSeasonValue: defaultSeason,
    allVarietiesValue: ALL_VARIETIES_VALUE,
    allBlocksValue: ALL_BLOCKS_VALUE,
    allPucsValue: ALL_PUCS_VALUE,
    getBlockPucs,
  }
}
