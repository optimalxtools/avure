"use client"

import * as React from "react"

type CacheSnapshot<T> = {
  data: T
  timestamp: number
}

type UseSessionCachedResourceOptions<T> = {
  cacheKey: string | null
  enabled?: boolean
  load: () => Promise<T>
}

type UseSessionCachedResourceResult<T> = {
  data: T | null
  error: Error | null
  isLoading: boolean
  isRefreshing: boolean
  lastUpdatedAt: number | null
  refresh: () => Promise<void>
  clear: () => void
}

function readCacheSnapshot<T>(key: string): CacheSnapshot<T> | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CacheSnapshot<T>>
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
      return null
    }
    const timestamp = typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now()
    return {
      data: parsed.data as T,
      timestamp,
    }
  } catch {
    return null
  }
}

function writeCacheSnapshot<T>(key: string, snapshot: CacheSnapshot<T>) {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    /* noop */
  }
}

function removeCacheSnapshot(key: string) {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

export function useSessionCachedResource<T>(
  options: UseSessionCachedResourceOptions<T>
): UseSessionCachedResourceResult<T> {
  const { cacheKey, enabled = true, load } = options
  const normalizedKey = enabled && cacheKey ? cacheKey : null

  const mountedRef = React.useRef(true)
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const [data, setData] = React.useState<T | null>(() => {
    if (!normalizedKey) return null
    const snapshot = readCacheSnapshot<T>(normalizedKey)
    return snapshot?.data ?? null
  })
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<number | null>(() => {
    if (!normalizedKey) return null
    const snapshot = readCacheSnapshot<T>(normalizedKey)
    return snapshot?.timestamp ?? null
  })
  const [error, setError] = React.useState<Error | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(() => {
    if (!normalizedKey) return false
    const snapshot = readCacheSnapshot<T>(normalizedKey)
    return !snapshot
  })
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const loadFromSource = React.useCallback(async () => {
    if (!normalizedKey) return null
    const result = await load()
    if (!mountedRef.current) {
      return result
    }
    const timestamp = Date.now()
    setData(result)
    setLastUpdatedAt(timestamp)
    setError(null)
    writeCacheSnapshot(normalizedKey, { data: result, timestamp })
    return result
  }, [load, normalizedKey])

  React.useEffect(() => {
    if (!normalizedKey) {
      setData(null)
      setLastUpdatedAt(null)
      setError(null)
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    const cached = readCacheSnapshot<T>(normalizedKey)
    if (cached) {
      setData(cached.data)
      setLastUpdatedAt(cached.timestamp)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const resolve = async () => {
      try {
        await loadFromSource()
      } catch (err) {
        if (cancelled || !mountedRef.current) return
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        if (cancelled || !mountedRef.current) return
        setIsLoading(false)
      }
    }

    void resolve()

    return () => {
      cancelled = true
    }
  }, [normalizedKey, loadFromSource])

  const refresh = React.useCallback(async () => {
    if (!normalizedKey) return
    setIsRefreshing(true)
    setError(null)
    try {
      await loadFromSource()
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false)
        setIsLoading(false)
      }
    }
  }, [loadFromSource, normalizedKey])

  const clear = React.useCallback(() => {
    if (!normalizedKey) {
      setData(null)
      setLastUpdatedAt(null)
      setError(null)
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }
    removeCacheSnapshot(normalizedKey)
    setData(null)
    setLastUpdatedAt(null)
    setError(null)
    setIsLoading(true)
  }, [normalizedKey])

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    lastUpdatedAt,
    refresh,
    clear,
  }
}
