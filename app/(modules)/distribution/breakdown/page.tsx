"use client"

import * as React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, Unlock, RotateCcw } from "lucide-react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { LOCKED_SELECT_TRIGGER_CLASS } from "@/lib/select"

import { MetricsPage } from "./components/pages/metrics"
import { InsightsPage } from "./components/pages/insights"
import { SectionTitle } from "@/components/section-title"
import { useMasterConfigFilters } from "@/lib/hooks/useMasterConfigFilters"
import { FILTER_WRAPPER_CLASS } from "@/lib/filter-styles"
import { AIButton } from "@/components/ai-button"
import { ExportButton } from "@/components/export-button"

const SEASON_OPTIONS = ["2025", "2024"]

export default function Page() {
  const {
    loading: configLoading,
    error: configError,
    variety,
    block,
    puc,
    season,
    setVariety,
    setBlock,
    setPuc,
    setSeason,
  resetVariety,
  resetBlock,
  resetPuc,
  resetSeason,
    lockVariety,
    lockBlock,
    lockPuc,
    lockSeason,
    setLockVariety,
    setLockBlock,
    setLockPuc,
    setLockSeason,
    varietyOptions,
    blockOptions,
    pucOptions,
    seasonOptions,
    formatLabel,
    formatBlockLabel,
    defaultVarietyValue,
    defaultBlockValue,
    defaultPucValue,
    defaultSeasonValue,
    allVarietiesValue,
    allBlocksValue,
    allPucsValue,
  } = useMasterConfigFilters({
    sharedKey: "filters:shared",
    pageKey: "filters:distribution:breakdown",
    seasons: SEASON_OPTIONS,
    autoSelectFirstVariety: true,
    autoSelectFirstSeason: true,
  })

  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(() => { setHydrated(true) }, [])

  const loadingOrError = configLoading || Boolean(configError)
  const varietyDisabled = lockVariety || loadingOrError
  const blockDisabled = lockBlock || loadingOrError
  const pucDisabled = lockPuc || loadingOrError
  const seasonDisabled = lockSeason || seasonOptions.length === 0

  const varietyLabel =
    variety === allVarietiesValue
      ? "All Varieties"
      : formatLabel(variety)
  const blockLabel =
    block === allBlocksValue
      ? "All Blocks"
      : formatBlockLabel(block)
  const pucLabel =
    puc === allPucsValue
      ? "All PUCs"
      : formatLabel(puc)
  const seasonLabel = season || (seasonOptions[0] ?? "Season")

  const selectionLabel = hydrated
    ? `${varietyLabel} | ${blockLabel} | ${pucLabel} | ${seasonLabel}`
    : ""

  const isVarietyDefault = variety === defaultVarietyValue
  const isBlockDefault = block === defaultBlockValue
  const isPucDefault = puc === defaultPucValue
  const isSeasonDefault = season === defaultSeasonValue

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
                  <BreadcrumbPage><SectionTitle /></BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <AIButton currentPage="Distribution - Breakdown" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto debug-border-2" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <span className="text-muted-foreground">Distribution</span>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Breakdown
            </h1>
            <ExportButton />
          </div>
        </div>

        <Tabs defaultValue="metrics" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="order-2 md:order-1 grid w-full gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 md:flex-1">
              <div className={FILTER_WRAPPER_CLASS}>
                <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-xs text-muted-foreground">Variety</span>
                <Select value={variety} onValueChange={setVariety}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm",
                      lockVariety && LOCKED_SELECT_TRIGGER_CLASS,
                      varietyDisabled && !lockVariety && "opacity-60 pointer-events-none"
                    )}
                    aria-label="Variety"
                    disabled={varietyDisabled}
                    aria-disabled={varietyDisabled}
                  >
                    <SelectValue placeholder={configLoading ? "Loading..." : "Select variety"} />
                  </SelectTrigger>
                  <SelectContent>
                    {varietyOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === allVarietiesValue ? "All Varieties" : formatLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute -top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={lockVariety}
                    onClick={() => setLockVariety(!lockVariety)}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground"
                    title={lockVariety ? "Unlock" : "Lock"}
                  >
                    {lockVariety ? (
                      <Lock className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetVariety}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
                    title="Reset"
                    aria-label="Reset variety"
                    disabled={lockVariety || isVarietyDefault}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className={FILTER_WRAPPER_CLASS}>
                <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-xs text-muted-foreground">PUC</span>
                <Select value={puc} onValueChange={setPuc}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm",
                      lockPuc && LOCKED_SELECT_TRIGGER_CLASS,
                      pucDisabled && !lockPuc && "opacity-60 pointer-events-none"
                    )}
                    aria-label="PUC"
                    disabled={pucDisabled}
                    aria-disabled={pucDisabled}
                  >
                    <SelectValue placeholder={configLoading ? "Loading..." : "Select PUC"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pucOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === allPucsValue ? "All PUCs" : formatLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute -top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={lockPuc}
                    onClick={() => setLockPuc(!lockPuc)}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground"
                    title={lockPuc ? "Unlock" : "Lock"}
                  >
                    {lockPuc ? (
                      <Lock className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetPuc}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
                    title="Reset"
                    aria-label="Reset PUC"
                    disabled={lockPuc || isPucDefault}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className={FILTER_WRAPPER_CLASS}>
                <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-xs text-muted-foreground">Block</span>
                <Select value={block} onValueChange={setBlock}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm",
                      lockBlock && LOCKED_SELECT_TRIGGER_CLASS,
                      blockDisabled && !lockBlock && "opacity-60 pointer-events-none"
                    )}
                    aria-label="Block"
                    disabled={blockDisabled}
                    aria-disabled={blockDisabled}
                  >
                    <SelectValue placeholder={configLoading ? "Loading..." : "Select block"} />
                  </SelectTrigger>
                  <SelectContent>
                    {blockOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === allBlocksValue ? "All Blocks" : formatBlockLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute -top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={lockBlock}
                    onClick={() => setLockBlock(!lockBlock)}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground"
                    title={lockBlock ? "Unlock" : "Lock"}
                  >
                    {lockBlock ? (
                      <Lock className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetBlock}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
                    title="Reset"
                    aria-label="Reset block"
                    disabled={lockBlock || isBlockDefault}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className={FILTER_WRAPPER_CLASS}>
                <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-xs text-muted-foreground">Season</span>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm",
                      lockSeason && LOCKED_SELECT_TRIGGER_CLASS,
                      seasonDisabled && !lockSeason && "opacity-60 pointer-events-none"
                    )}
                    aria-label="Season"
                    disabled={seasonDisabled}
                    aria-disabled={seasonDisabled}
                  >
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasonOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute -top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={lockSeason}
                    onClick={() => setLockSeason(!lockSeason)}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground"
                    title={lockSeason ? "Unlock" : "Lock"}
                  >
                    {lockSeason ? (
                      <Lock className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetSeason}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
                    title="Reset"
                    aria-label="Reset season"
                    disabled={lockSeason || isSeasonDefault}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <TabsList>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="metrics" className="space-y-4">
            <MetricsPage selectionLabel={selectionLabel} />
          </TabsContent>
          <TabsContent value="insights" className="space-y-4">
            <InsightsPage />
          </TabsContent>
          <TabsContent value="compare" className="space-y-4">
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              Comparisons coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
