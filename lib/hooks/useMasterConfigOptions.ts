"use client"

import * as React from "react"

import { buildMasterConfigIndex, parseMasterConfigCsv, type MasterConfigIndex } from "../master-config"
import { useClientDatasetPaths } from "./useClientDatasetPaths"

type State = {
  index: MasterConfigIndex | null
  error: string | null
  loading: boolean
}

const indexCache = new Map<string, MasterConfigIndex>()
const errorCache = new Map<string, string>()
const pendingPromises = new Map<string, Promise<MasterConfigIndex>>()

async function loadMasterConfig(path: string): Promise<MasterConfigIndex> {
  const response = await fetch(path, { cache: "no-store" })
  if (response.status === 404) {
    throw new Error("No master configuration file configured for this client.")
  }
  if (!response.ok) {
    throw new Error(`Failed to load master configuration: ${response.status}`)
  }
  const text = await response.text()
  const records = parseMasterConfigCsv(text)
  return buildMasterConfigIndex(records)
}

function createEmptyIndex(): MasterConfigIndex {
  return {
    records: [],
    varieties: [],
    blocksByVariety: {},
    allBlocks: [],
    pucs: [],
    pucsByVariety: {},
  }
}

export function useMasterConfigOptions() {
  const { masterConfigPath } = useClientDatasetPaths()

  const [state, setState] = React.useState<State>(() => {
    if (!masterConfigPath) {
      return { index: null, error: null, loading: false }
    }

    const cachedIndex = indexCache.get(masterConfigPath)
    if (cachedIndex) {
      return { index: cachedIndex, error: null, loading: false }
    }

    const cachedError = errorCache.get(masterConfigPath)
    if (cachedError) {
      return { index: null, error: cachedError, loading: false }
    }

    return { index: null, error: null, loading: true }
  })

  React.useEffect(() => {
    if (!masterConfigPath) {
      setState({ index: null, error: null, loading: false })
      return
    }

    const cachedIndex = indexCache.get(masterConfigPath)
    if (cachedIndex) {
      setState({ index: cachedIndex, error: null, loading: false })
      return
    }

    const cachedError = errorCache.get(masterConfigPath)
    if (cachedError) {
      setState({ index: null, error: cachedError, loading: false })
      return
    }

    let cancelled = false

    setState({ index: null, error: null, loading: true })

    const fetchData = async () => {
      try {
        let promise = pendingPromises.get(masterConfigPath)
        if (!promise) {
          promise = loadMasterConfig(masterConfigPath)
          pendingPromises.set(masterConfigPath, promise)
        }
        const index = await promise
        indexCache.set(masterConfigPath, index)
        errorCache.delete(masterConfigPath)
        if (!cancelled) {
          setState({ index, error: null, loading: false })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        errorCache.set(masterConfigPath, message)
        indexCache.delete(masterConfigPath)
        if (!cancelled) {
          setState({ index: null, error: message, loading: false })
        }
      } finally {
        pendingPromises.delete(masterConfigPath)
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [masterConfigPath])

  const index = state.index ?? createEmptyIndex()

  return {
    loading: state.loading,
    error: state.error,
    records: index.records,
    varieties: index.varieties,
    blocksByVariety: index.blocksByVariety,
    allBlocks: index.allBlocks,
    pucs: index.pucs,
    pucsByVariety: index.pucsByVariety,
  }
}
