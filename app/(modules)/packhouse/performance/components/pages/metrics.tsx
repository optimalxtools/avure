"use client"


import dynamic from "next/dynamic"
// Secondary chart imports
const PackingProgressSecondaryChart = dynamic(() => import("../charts/packing-progress-total").then(mod => mod.Component), { ssr: false })
const PackingClassSecondaryChart = dynamic(() => import("../charts/packing-class-total").then(mod => mod.Component), { ssr: false })
const PackingSpreadSecondaryChart = dynamic(() => import("../charts/packing-spread-total").then(mod => mod.Component), { ssr: false })
const PackingDistributorSecondaryChart = dynamic(() => import("../charts/packing-distributor-total").then(mod => mod.Component), { ssr: false })
const PackingMarketSecondaryChart = dynamic<PackingMarketSecondaryChartProps>(
  () => import("../charts/packing-market-total").then((mod) => mod.Component),
  { ssr: false }
)
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import html2canvas from "html2canvas"
import React from "react"

import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import type { Granularity } from "../charts/packing-analytics"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type MetricsPageProps = {
  selectionLabel: string
  records: PackhouseRecord[]
  previousRecords?: PackhouseRecord[]
  granularity: Granularity
  showPrevSeason: boolean
  onProgressPrevAvailabilityChange?: (available: boolean) => void
  onDistributorPrevAvailabilityChange?: (available: boolean) => void
  onMarketPrevAvailabilityChange?: (available: boolean) => void
}

type PackingProgressChartProps = React.ComponentProps<
  typeof import("../charts/packing-progress-time").PackingProgressChart
>

type PackingClassChartProps = React.ComponentProps<
  typeof import("../charts/packing-class-time").PackingClassChart
>

type PackingSpreadChartProps = React.ComponentProps<
  typeof import("../charts/packing-spread-time").PackingSpreadChart
>

type PackingDistributorChartProps = React.ComponentProps<
  typeof import("../charts/packing-distributor-time").PackingDistributorChart
>

type PackingMarketChartProps = React.ComponentProps<
  typeof import("../charts/packing-market-time").PackingMarketChart
>

type PackingMarketSecondaryChartProps = {
  selectionLabel?: string
  records: PackhouseRecord[]
  previousRecords: PackhouseRecord[]
  showPrevSeason: boolean
}

const PackingProgressChart = dynamic<PackingProgressChartProps>(
  () => import("../charts/packing-progress-time").then((mod) => mod.PackingProgressChart),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full">
            <CardHeader className="gap-2 space-y-0 border-b py-5 sm:flex-row" style={{alignItems:'flex-start',textAlign:'left'}}>
          <div className="grid flex-1 gap-1 text-left">
            <CardTitle className="text-3xl sm:text-base text-left">Packing Percentage</CardTitle>
            <p className="text-sm text-muted-foreground text-left">Loading chart…</p>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Preparing data…
          </div>
        </CardContent>
      </Card>
    ),
  }
)

const PackingClassChart = dynamic<PackingClassChartProps>(
  () => import("../charts/packing-class-time").then((mod) => mod.PackingClassChart),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full">
            <CardHeader className="gap-2 space-y-0 border-b py-5 sm:flex-row" style={{alignItems:'flex-start',textAlign:'left'}}>
          <div className="grid flex-1 gap-1 text-left">
            <CardTitle className="text-3xl sm:text-base text-left">Packing Class</CardTitle>
            <p className="text-sm text-muted-foreground text-left">Loading chart…</p>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Preparing data…
          </div>
        </CardContent>
      </Card>
    ),
  }
)

const PackingSpreadChart = dynamic<PackingSpreadChartProps>(
  () => import("../charts/packing-spread-time").then((mod) => mod.PackingSpreadChart),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full">
            <CardHeader className="gap-2 space-y-0 border-b py-5 sm:flex-row" style={{alignItems:'flex-start',textAlign:'left'}}>
          <div className="grid flex-1 gap-1 text-left">
            <CardTitle className="text-3xl sm:text-base text-left">Packing Spread</CardTitle>
            <p className="text-sm text-muted-foreground text-left">Loading heatmap…</p>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Preparing data…
          </div>
        </CardContent>
      </Card>
    ),
  }
)

const PackingDistributorChart = dynamic<PackingDistributorChartProps>(
  () => import("../charts/packing-distributor-time").then((mod) => mod.PackingDistributorChart),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full">
            <CardHeader className="gap-2 space-y-0 border-b py-5 sm:flex-row" style={{alignItems:'flex-start',textAlign:'left'}}>
          <div className="grid flex-1 gap-1 text-left">
            <CardTitle className="text-3xl sm:text-base text-left">Packing Distributor</CardTitle>
            <p className="text-sm text-muted-foreground text-left">Loading chart…</p>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Preparing data…
          </div>
        </CardContent>
      </Card>
    ),
  }
)

const PackingMarketChart = dynamic<PackingMarketChartProps>(
  () => import("../charts/packing-market-time").then((mod) => mod.PackingMarketChart),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full">
            <CardHeader className="gap-2 space-y-0 border-b py-5 sm:flex-row" style={{alignItems:'flex-start',textAlign:'left'}}>
          <div className="grid flex-1 gap-1 text-left">
            <CardTitle className="text-3xl sm:text-base text-left">Packing Market</CardTitle>
            <p className="text-sm text-muted-foreground text-left">Loading chart…</p>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Preparing data…
          </div>
        </CardContent>
      </Card>
    ),
  }
)


function DownloadButton({ targetId, filename }: { targetId: string; filename: string }) {
  const handleDownload = async () => {
    const el = document.getElementById(targetId)
    if (!el) return
    const canvas = await html2canvas(el, { backgroundColor: null })
    const link = document.createElement("a")
    link.download = filename
    link.href = canvas.toDataURL("image/png")
    link.click()
  }
  return (
    <Button variant="ghost" size="icon" onClick={handleDownload} title="Download as PNG">
      <Download className="w-4 h-4" />
    </Button>
  )
}

export function MetricsPage({
  selectionLabel,
  records,
  previousRecords = [],
  granularity,
  showPrevSeason,
  onProgressPrevAvailabilityChange,
  onDistributorPrevAvailabilityChange,
  onMarketPrevAvailabilityChange,
}: MetricsPageProps) {
  // Unique IDs for each chart section
  const progressId = React.useId()
  const classId = React.useId()
  const spreadId = React.useId()
  const distributorId = React.useId()
  const marketId = React.useId()
  const [showActualValues, setShowActualValues] = React.useState(false)
  const [showMarketActualValues, setShowMarketActualValues] = React.useState(false)
  const [showProgressActualValues, setShowProgressActualValues] = React.useState(true)
  const [showClassActualValues, setShowClassActualValues] = React.useState(true)
  const [showSpreadActualValues, setShowSpreadActualValues] = React.useState(true)
  const [isMounted, setIsMounted] = React.useState(false)
  
  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  return (
    <div className="space-y-6">
      {/* Packing Progress Chart */}
      <div id="packing-analytics-chart" className="relative flex flex-col w-full gap-4 sm:grid sm:grid-cols-4">
        {/* Packing Percentage Chart */}
        <div className="relative w-full sm:col-span-3">
          <div className="absolute right-2 top-2 z-10 flex flex-row-reverse sm:flex-row items-center gap-2">
            {isMounted && (
              <div className="hidden sm:flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    checked={showProgressActualValues}
                    onChange={e => setShowProgressActualValues(e.target.checked)}
                  />
                  <span className="text-xs">Actual Values</span>
                </label>
              </div>
            )}
            <DownloadButton targetId={progressId} filename="packing-progress.png" />
          </div>
          <div id={progressId}>
            <PackingProgressChart
              selectionLabel={selectionLabel}
              records={records}
              previousRecords={previousRecords}
              granularity={granularity}
              showPrevYear={showPrevSeason}
              onPrevYearAvailabilityChange={onProgressPrevAvailabilityChange}
              showActualValues={showProgressActualValues}
              renderMobileActualToggle={
                isMounted ? (
                  <div className="flex sm:hidden mt-2 mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                        checked={showProgressActualValues}
                        onChange={e => setShowProgressActualValues(e.target.checked)}
                      />
                      <span className="text-xs">Actual Values</span>
                    </label>
                  </div>
                ) : null
              }
            />
          </div>
        </div>
        {/* Pie Chart - Donut with Text */}
        <div className="w-full sm:col-span-1 flex">
          <div className="relative w-full flex flex-col flex-1">
            <div className="absolute right-2 top-2 z-10">
              <DownloadButton targetId={progressId + '-secondary'} filename="packing-progress-secondary.png" />
            </div>
            <div id={progressId + '-secondary'} className="flex-1">
              <PackingProgressSecondaryChart 
                selectionLabel={`${selectionLabel} | Total`} 
                records={records}
                previousRecords={previousRecords}
                showPrevSeason={showPrevSeason}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Packing Class Chart */}
      <div id="packing-class-chart" className="relative flex flex-col w-full gap-4 sm:grid sm:grid-cols-4">
        <div className="relative w-full sm:col-span-3">
          <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
            {isMounted && (
              <label className="hidden sm:flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showClassActualValues}
                  onChange={(e) => setShowClassActualValues(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Actual Values
              </label>
            )}
            <DownloadButton targetId={classId} filename="packing-class.png" />
          </div>
          <div id={classId}>
            <PackingClassChart
              selectionLabel={selectionLabel}
              records={records}
              previousRecords={previousRecords}
              granularity={granularity}
              showActualValues={showClassActualValues}
              showPrevSeason={showPrevSeason}
              renderMobileActualToggle={
                isMounted ? (
                  <div className="flex items-center gap-2 pt-2 sm:hidden">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={showClassActualValues}
                        onChange={(e) => setShowClassActualValues(e.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                      Actual Values
                    </label>
                  </div>
                ) : null
              }
            />
          </div>
        </div>
        <div className="w-full sm:col-span-1 flex">
          <div className="relative w-full flex flex-col flex-1">
            <div className="absolute right-2 top-2 z-10">
              <DownloadButton targetId={classId + '-secondary'} filename="packing-class-secondary.png" />
            </div>
            <div id={classId + '-secondary'} className="flex-1">
              <PackingClassSecondaryChart 
                selectionLabel={`${selectionLabel} | Total`}
                records={records}
                previousRecords={previousRecords}
                showPrevSeason={showPrevSeason}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Packing Spread Chart */}
      <div id="packing-spread-chart" className="relative flex flex-col w-full gap-4 sm:grid sm:grid-cols-4">
        <div className="relative w-full sm:col-span-3">
          <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
            {isMounted && (
              <label className="hidden sm:flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showSpreadActualValues}
                  onChange={(e) => setShowSpreadActualValues(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Actual Values
              </label>
            )}
            <DownloadButton targetId={spreadId} filename="packing-spread.png" />
          </div>
          <div id={spreadId}>
            <PackingSpreadChart
              selectionLabel={selectionLabel}
              records={records}
              previousRecords={previousRecords}
              granularity={granularity}
              showActualValues={showSpreadActualValues}
              showPrevSeason={showPrevSeason}
              renderMobileActualToggle={
                isMounted ? (
                  <div className="flex items-center gap-2 pt-2 sm:hidden">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={showSpreadActualValues}
                        onChange={(e) => setShowSpreadActualValues(e.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                      Actual Values
                    </label>
                  </div>
                ) : null
              }
            />
          </div>
        </div>
        <div className="w-full sm:col-span-1 flex">
          <div className="relative w-full flex flex-col flex-1">
            <div className="absolute right-2 top-2 z-10">
              <DownloadButton targetId={spreadId + '-secondary'} filename="packing-spread-secondary.png" />
            </div>
            <div id={spreadId + '-secondary'} className="flex-1">
              <PackingSpreadSecondaryChart 
                selectionLabel={`${selectionLabel} | Total`} 
                records={records}
                previousRecords={previousRecords}
                showPrevSeason={showPrevSeason}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Packing Distributor Chart with Actual Values toggle */}
      <div id="packing-distributor-chart" className="relative flex flex-col w-full gap-4 sm:grid sm:grid-cols-4">
        <div className="relative w-full sm:col-span-3">
          {/* Desktop: checkbox left of download, Mobile: download button top right */}
          <div className="absolute right-2 top-2 z-10 flex flex-row-reverse sm:flex-row items-center gap-2">
            {isMounted && (
              <div className="hidden sm:flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    checked={showActualValues}
                    onChange={e => setShowActualValues(e.target.checked)}
                  />
                  <span className="text-xs">Actual Values</span>
                </label>
              </div>
            )}
            <DownloadButton targetId={distributorId} filename="packing-distributor.png" />
          </div>
          <div id={distributorId}>
            <PackingDistributorChart
              selectionLabel={selectionLabel}
              records={records}
              previousRecords={previousRecords}
              granularity={granularity}
              showPrevYear={showPrevSeason}
              onPrevYearAvailabilityChange={onDistributorPrevAvailabilityChange}
              showActualValues={showActualValues}
              renderMobileActualToggle={
                isMounted ? (
                  <div className="flex sm:hidden mt-2 mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                        checked={showActualValues}
                        onChange={e => setShowActualValues(e.target.checked)}
                      />
                      <span className="text-xs">Actual Values</span>
                    </label>
                  </div>
                ) : null
              }
            />
          </div>
        </div>
        <div className="w-full sm:col-span-1 flex">
          <div className="relative w-full flex flex-col flex-1">
            <div className="absolute right-2 top-2 z-10">
              <DownloadButton targetId={distributorId + '-secondary'} filename="packing-distributor-secondary.png" />
            </div>
            <div id={distributorId + '-secondary'} className="flex-1">
              <PackingDistributorSecondaryChart 
                selectionLabel={`${selectionLabel} | Total`} 
                records={records}
                previousRecords={previousRecords}
                showPrevSeason={showPrevSeason}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Packing Market Chart with Actual Values toggle */}
      <div id="packing-market-chart" className="relative flex flex-col w-full gap-4 sm:grid sm:grid-cols-4">
        <div className="relative w-full sm:col-span-3">
          {/* Desktop: checkbox left of download, Mobile: download button top right */}
          <div className="absolute right-2 top-2 z-10 flex flex-row-reverse sm:flex-row items-center gap-2">
            {isMounted && (
              <div className="hidden sm:flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    checked={showMarketActualValues}
                    onChange={e => setShowMarketActualValues(e.target.checked)}
                  />
                  <span className="text-xs">Actual Values</span>
                </label>
              </div>
            )}
            <DownloadButton targetId={marketId} filename="packing-market.png" />
          </div>
          <div id={marketId}>
            <PackingMarketChart
              selectionLabel={selectionLabel}
              records={records}
              previousRecords={previousRecords}
              granularity={granularity}
              showPrevYear={showPrevSeason}
              onPrevYearAvailabilityChange={onMarketPrevAvailabilityChange}
              showActualValues={showMarketActualValues}
              renderMobileActualToggle={
                isMounted ? (
                  <div className="flex sm:hidden mt-2 mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                        checked={showMarketActualValues}
                        onChange={e => setShowMarketActualValues(e.target.checked)}
                      />
                      <span className="text-xs">Actual Values</span>
                    </label>
                  </div>
                ) : null
              }
            />
          </div>
        </div>
        <div className="w-full sm:col-span-1 flex">
          <div className="relative w-full flex flex-col flex-1">
            <div className="absolute right-2 top-2 z-10">
              <DownloadButton targetId={marketId + '-secondary'} filename="packing-market-secondary.png" />
            </div>
            <div id={marketId + '-secondary'} className="flex-1">
              <PackingMarketSecondaryChart 
                selectionLabel={`${selectionLabel} | Total`} 
                records={records}
                previousRecords={previousRecords}
                showPrevSeason={showPrevSeason}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
