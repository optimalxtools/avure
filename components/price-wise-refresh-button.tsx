"use client"

import * as React from "react"
import { RefreshCcw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface RefreshButtonProps {
  lastUpdated: string | null
}

export function RefreshButton({ lastUpdated }: RefreshButtonProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)
  const [needsRefresh, setNeedsRefresh] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    setHydrated(true)
  }, [])

  // Auto-hide error message after 5 seconds
  React.useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  // Check if refresh is needed on mount
  React.useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/price-wise/analyzer/status")
        if (response.ok) {
          const data = await response.json()
          setNeedsRefresh(data.outdated)
          
          // Auto-refresh if outdated
          if (data.outdated) {
            await handleRefresh()
          }
        }
      } catch (error) {
        console.error("Failed to check analysis status:", error)
      }
    }
    checkStatus()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setErrorMessage(null)
    try {
      const response = await fetch("/api/price-wise/analyzer/run", { method: "POST" })
      if (!response.ok) {
        const error = await response.json()
        setErrorMessage(error.error || "Failed to refresh analysis")
        return
      }
      setNeedsRefresh(false)
      router.refresh()
    } catch (error) {
      console.error("Failed to refresh:", error)
      setErrorMessage("Failed to refresh analysis. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const refreshStatus = React.useMemo(() => {
    if (!hydrated) {
      return { full: "Never", compact: "Never" }
    }

    if (!lastUpdated) {
      const label = isRefreshing ? "Refreshing..." : "Never"
      return { full: label, compact: label }
    }

    const date = new Date(lastUpdated)
    if (Number.isNaN(date.getTime())) {
      return { full: "Unknown", compact: "Unknown" }
    }

    return {
      full: date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
      compact: date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }),
    }
  }, [lastUpdated, isRefreshing, hydrated])

  return (
    <div className="relative flex items-center gap-2">
      {hydrated && (
        <>
          <span className="hidden text-xs text-muted-foreground whitespace-nowrap md:inline">
            Last refreshed: {refreshStatus.full}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap md:hidden">
            {refreshStatus.compact}
          </span>
        </>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
          needsRefresh && !isRefreshing && "text-orange-500 hover:text-orange-600"
        )}
        aria-label="Refresh analysis"
        title={needsRefresh ? "Analysis outdated - click to refresh" : "Refresh analysis"}
        disabled={isRefreshing}
      >
        <RefreshCcw
          className={cn("h-5 w-5", isRefreshing && "animate-spin")}
          style={isRefreshing ? { animationDirection: "reverse" } : undefined}
        />
      </button>
      
      {errorMessage && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50 animate-in slide-in-from-top-2 fade-in">
          <div className="rounded-lg border bg-background shadow-lg">
            <div className="flex items-start gap-3 p-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">Unable to refresh</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-muted-foreground hover:text-foreground transition flex-shrink-0"
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
