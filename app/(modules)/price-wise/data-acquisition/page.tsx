"use client"

import * as React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { SectionTitle } from "@/components/section-title"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  History,
  ListChecks,
  Loader2,
  PlayCircle,
  StopCircle,
} from "lucide-react"

import type {
  PriceWiseConfig,
  PriceWiseStatusPayload,
} from "@/lib/price-wise/types"

const STATUS_ENDPOINT = "/api/price-wise/scraper/status"
const RUN_ENDPOINT = "/api/price-wise/scraper/run"
const STOP_ENDPOINT = "/api/price-wise/scraper/stop"
const CONFIG_ENDPOINT = "/api/price-wise/config"
const FILE_ENDPOINT = "/api/price-wise/scraper/file"
const POLL_INTERVAL_MS = 5000

type ListDraft = {
  checkInOffsets: string
  stayDurations: string
}

type ConfigFeedback = {
  type: "success" | "error"
  message: string
}

function formatDateTime(value?: string) {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function buildArrayLabel(values: number[]) {
  if (!values.length) return "—"
  return values.join(", ")
}

export default function Page() {
  const [status, setStatus] = React.useState<PriceWiseStatusPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [runPending, setRunPending] = React.useState(false)
  const [stopPending, setStopPending] = React.useState(false)

  const [configDraft, setConfigDraft] = React.useState<PriceWiseConfig | null>(null)
  const [configDirty, setConfigDirty] = React.useState(false)
  const [configSaving, setConfigSaving] = React.useState(false)
  const [configFeedback, setConfigFeedback] = React.useState<ConfigFeedback | null>(null)
  const [listInputs, setListInputs] = React.useState<ListDraft>({
    checkInOffsets: "",
    stayDurations: "",
  })

  const fetchStatus = React.useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setLoading(true)
        }
        setError(null)

        const response = await fetch(STATUS_ENDPOINT)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const payload = (await response.json()) as PriceWiseStatusPayload
        setStatus(payload)
        if (!configDirty) {
          setConfigDraft(payload.config)
          setListInputs({
            checkInOffsets: buildArrayLabel(payload.config.checkInOffsets),
            stayDurations: buildArrayLabel(payload.config.stayDurations),
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load scraper status"
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [configDirty],
  )

  React.useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  React.useEffect(() => {
    if (status?.runState.status !== "running") {
      return
    }
    const interval = window.setInterval(() => {
      void fetchStatus({ silent: true })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [status?.runState.status, fetchStatus])

  React.useEffect(() => {
    if (!configFeedback) return
    const timeout = window.setTimeout(() => setConfigFeedback(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [configFeedback])

  const handleRun = React.useCallback(async () => {
    try {
      setRunPending(true)
      setError(null)
      const response = await fetch(RUN_ENDPOINT, { method: "POST" })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to start scraper" }))
        throw new Error(payload.error || "Unable to start scraper")
      }
      await fetchStatus({ silent: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start scraper"
      setError(message)
    } finally {
      setRunPending(false)
    }
  }, [fetchStatus])

  const handleStop = React.useCallback(async () => {
    try {
      setStopPending(true)
      setError(null)
      const response = await fetch(STOP_ENDPOINT, { method: "POST" })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to stop scraper" }))
        throw new Error(payload.error || "Unable to stop scraper")
      }
      await fetchStatus({ silent: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to stop scraper"
      setError(message)
    } finally {
      setStopPending(false)
    }
  }, [fetchStatus])

  const handleBooleanChange = React.useCallback(
    (key: keyof Pick<PriceWiseConfig, "occupancyMode" | "headless" | "enableArchiving" | "showProgress">) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked
        setConfigDirty(true)
        setConfigDraft((prev) => (prev ? { ...prev, [key]: checked } : prev))
      },
    [],
  )

  const handleNumberChange = React.useCallback(
    (
      key: keyof Pick<
        PriceWiseConfig,
        | "daysAhead"
        | "occupancyCheckInterval"
        | "guests"
        | "rooms"
        | "browserTimeout"
        | "maxArchiveFiles"
        | "progressInterval"
      >,
    ) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value)
        setConfigDirty(true)
        setConfigDraft((prev) =>
          prev
            ? {
                ...prev,
                [key]: Number.isFinite(value) ? value : 0,
              }
            : prev,
        )
      },
    [],
  )

  const handleTextChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setConfigDirty(true)
      setConfigDraft((prev) => (prev ? { ...prev, referenceProperty: value } : prev))
    },
    [],
  )

  const handleListChange = React.useCallback(
    (key: keyof Pick<PriceWiseConfig, "checkInOffsets" | "stayDurations">) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        setListInputs((prev) => ({ ...prev, [key]: value }))
        const items = value
          .split(/[,\s]+/)
          .map((entry) => entry.trim())
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry))
        setConfigDirty(true)
        setConfigDraft((prev) => (prev ? { ...prev, [key]: items } : prev))
      },
    [],
  )

  const handleConfigReset = React.useCallback(() => {
    if (!status?.config) return
    setConfigDraft(status.config)
    setListInputs({
      checkInOffsets: buildArrayLabel(status.config.checkInOffsets),
      stayDurations: buildArrayLabel(status.config.stayDurations),
    })
    setConfigDirty(false)
    setConfigFeedback(null)
  }, [status?.config])

  const handleConfigSubmit = React.useCallback(async () => {
    if (!configDraft) return
    try {
      setConfigSaving(true)
      setConfigFeedback(null)
      const response = await fetch(CONFIG_ENDPOINT, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configDraft),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to update configuration" }))
        throw new Error(payload.error || "Unable to update configuration")
      }
      const updated = (await response.json()) as PriceWiseConfig
      setConfigDraft(updated)
      setListInputs({
        checkInOffsets: buildArrayLabel(updated.checkInOffsets),
        stayDurations: buildArrayLabel(updated.stayDurations),
      })
      setConfigDirty(false)
      setConfigFeedback({ type: "success", message: "Configuration saved" })
      await fetchStatus({ silent: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update configuration"
      setConfigFeedback({ type: "error", message })
    } finally {
      setConfigSaving(false)
    }
  }, [configDraft, fetchStatus])

  const isRunning = status?.runState.status === "running"
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    <SectionTitle />
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>
      <div
        className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto"
        style={{ maxWidth: "100vw" }}
      >
        <div className="px-2 md:px-0">
          <span className="text-muted-foreground">Price Wise</span>
          <h1 className="text-3xl font-semibold tracking-tight">Data Acquisition</h1>
        </div>

        {error ? (
          <Card className="border-destructive/60 bg-destructive/5">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <CardTitle className="text-lg">There was a problem loading the scraper status</CardTitle>
                <CardDescription>{error}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        <Tabs defaultValue="capture" className="space-y-4">
          <div>
            <TabsList>
              <TabsTrigger value="capture">Scraper</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="capture" className="space-y-4">
            {loading && !status ? (
              <Card>
                <CardHeader>
                  <CardTitle>Loading scraper status…</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching latest data
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {status ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="lg:row-span-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">Scraper control</CardTitle>
                          <CardDescription>
                            Completed properties for {status.dailyProgress?.date ?? "—"}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isRunning ? "secondary" : status.runState.lastExitCode === 0 ? "secondary" : "destructive"}
                            className={!isRunning && status.runState.lastExitCode === 0 ? "bg-blue-100 text-blue-700 hover:bg-blue-100/80" : ""}
                          >
                            {isRunning ? "Running" : status.runState.lastExitCode === 0 ? "Ready" : "Attention"}
                          </Badge>
                          <Button
                            onClick={handleRun}
                            disabled={runPending || isRunning}
                            size="icon"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {runPending || isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                          </Button>
                          {isRunning && (
                            <Button
                              onClick={handleStop}
                              disabled={stopPending}
                              variant="destructive"
                              size="icon"
                            >
                              {stopPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{status.dailyProgress?.completed_properties?.length || 0} of 16 completed</span>
                          <span>{Math.round(((status.dailyProgress?.completed_properties?.length || 0) / 16) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div 
                            className="h-full bg-green-600 transition-all duration-300 ease-in-out"
                            style={{ width: `${((status.dailyProgress?.completed_properties?.length || 0) / 16) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="space-y-3">
                        {status.dailyProgress?.completed_properties?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {status.dailyProgress.completed_properties.map((property) => (
                              <Badge key={property} variant="secondary" className="capitalize">
                                {property.replace(/[-_]/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No completion data available yet.</p>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Last update: {formatDateTime(status.dailyProgress?.last_updated)}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Activity className="h-4 w-4" />
                          <span className="font-medium">Recent output</span>
                        </div>
                        {status.logTail?.length ? (
                          <pre className="max-h-[420px] overflow-y-auto rounded-md bg-muted/40 p-3 text-xs">
                            {status.logTail.join("\n")}
                          </pre>
                        ) : (
                          <p className="text-muted-foreground">No log output captured yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">Execution history</CardTitle>
                          <CardDescription>Latest feedback from scraper runs</CardDescription>
                        </div>
                        <History className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        {status.history.length ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Days Ahead</TableHead>
                                <TableHead>Guests</TableHead>
                                <TableHead>Rooms</TableHead>
                                <TableHead>Output</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {status.history.slice(0, 8).map((entry, index) => {
                                const success = entry.scrape_success && entry.analysis_success
                                const timestamp = new Date(entry.timestamp)
                                const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '')
                                const isToday = index === 0
                                const target = isToday ? 'pricing-csv' : `archive-${dateStr}`
                                
                                return (
                                  <TableRow key={entry.timestamp}>
                                    <TableCell className="whitespace-nowrap">{formatDateTime(entry.timestamp)}</TableCell>
                                    <TableCell>
                                      <Badge variant={success ? "default" : "destructive"} className={success ? "bg-green-600 hover:bg-green-600/80" : ""}>
                                        {success ? "Success" : "Failed"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{entry.config.days_ahead}</TableCell>
                                    <TableCell>{entry.config.guests}</TableCell>
                                    <TableCell>{entry.config.rooms}</TableCell>
                                    <TableCell>
                                      {success ? (
                                        <a 
                                          href={`${FILE_ENDPOINT}?target=${target}`}
                                          className="text-primary hover:text-primary/80"
                                        >
                                          <Download className="h-4 w-4" />
                                        </a>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No execution history recorded yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Scraper configuration</CardTitle>
                <CardDescription>
                  Adjust scrape cadence, execution behaviour and reference property details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="occupancyMode" className="flex items-center gap-2 text-sm font-medium">
                        <input
                          id="occupancyMode"
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          onChange={handleBooleanChange("occupancyMode")}
                          checked={configDraft?.occupancyMode ?? false}
                        />
                        Occupancy tracking mode
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Toggle to switch between occupancy tracking and pricing analysis.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="daysAhead">Days ahead to analyse</Label>
                      <Input
                        id="daysAhead"
                        type="number"
                        min={1}
                        value={configDraft?.daysAhead ?? ""}
                        onChange={handleNumberChange("daysAhead")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="checkInterval">Occupancy check interval (days)</Label>
                      <Input
                        id="checkInterval"
                        type="number"
                        min={1}
                        value={configDraft?.occupancyCheckInterval ?? ""}
                        onChange={handleNumberChange("occupancyCheckInterval")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="checkInOffsets">Check-in offsets (comma separated)</Label>
                      <Input
                        id="checkInOffsets"
                        value={listInputs.checkInOffsets}
                        onChange={handleListChange("checkInOffsets")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="stayDurations">Stay durations (comma separated)</Label>
                      <Input
                        id="stayDurations"
                        value={listInputs.stayDurations}
                        onChange={handleListChange("stayDurations")}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="guests">Guests</Label>
                      <Input
                        id="guests"
                        type="number"
                        min={1}
                        value={configDraft?.guests ?? ""}
                        onChange={handleNumberChange("guests")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="rooms">Rooms</Label>
                      <Input
                        id="rooms"
                        type="number"
                        min={1}
                        value={configDraft?.rooms ?? ""}
                        onChange={handleNumberChange("rooms")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="referenceProperty">Reference property</Label>
                      <Input
                        id="referenceProperty"
                        value={configDraft?.referenceProperty ?? ""}
                        onChange={handleTextChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="headless" className="flex items-center gap-2 text-sm font-medium">
                        <input
                          id="headless"
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          onChange={handleBooleanChange("headless")}
                          checked={configDraft?.headless ?? false}
                        />
                        Run browser headless
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Headless mode is now supported for room data extraction. The scraper creates a fresh browser 
                        instance for each date check to bypass detection. This is slower but works reliably on servers.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="browserTimeout">Browser timeout (ms)</Label>
                      <Input
                        id="browserTimeout"
                        type="number"
                        min={1000}
                        step={1000}
                        value={configDraft?.browserTimeout ?? ""}
                        onChange={handleNumberChange("browserTimeout")}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="enableArchiving" className="flex items-center gap-2 text-sm font-medium">
                        <input
                          id="enableArchiving"
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          onChange={handleBooleanChange("enableArchiving")}
                          checked={configDraft?.enableArchiving ?? false}
                        />
                        Archive previous output before new runs
                      </Label>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="maxArchiveFiles">Max archive files</Label>
                      <Input
                        id="maxArchiveFiles"
                        type="number"
                        min={1}
                        value={configDraft?.maxArchiveFiles ?? ""}
                        onChange={handleNumberChange("maxArchiveFiles")}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="showProgress" className="flex items-center gap-2 text-sm font-medium">
                        <input
                          id="showProgress"
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          onChange={handleBooleanChange("showProgress")}
                          checked={configDraft?.showProgress ?? false}
                        />
                        Verbose progress logging
                      </Label>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="progressInterval">Progress interval</Label>
                      <Input
                        id="progressInterval"
                        type="number"
                        min={1}
                        value={configDraft?.progressInterval ?? ""}
                        onChange={handleNumberChange("progressInterval")}
                      />
                    </div>
                    <div className="grid gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Request delay automatically adjusts to {status?.config.requestDelay ?? 0}s for the active mode.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t pt-4">
                  {configFeedback ? (
                    <div
                      className={
                        configFeedback.type === "success"
                          ? "text-sm text-emerald-600"
                          : "text-sm text-destructive"
                      }
                    >
                      {configFeedback.message}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleConfigSubmit()}
                      disabled={!configDirty || configSaving}
                    >
                      {configSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Apply changes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleConfigReset}
                      disabled={configSaving}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
