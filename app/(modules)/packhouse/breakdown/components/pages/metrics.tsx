"use client"

import React from "react"
import html2canvas from "html2canvas"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { PackhouseRecord } from "../../../utils/usePackhouseData"
import { Component as PackingClassTotal } from "../../../performance/components/charts/packing-class-total"
import { Component as PackingSpreadTotal } from "../../../performance/components/charts/packing-spread-total"
import { Component as DistributorClassStacked } from "../charts/distributor-class-stacked"
import { Component as MarketClassStacked } from "../charts/market-class-stacked"
import { Component as DistributorSpreadBubble } from "../charts/distributor-spread-bubble"
import { Component as MarketSpreadBubble } from "../charts/market-spread-bubble"

const sanitizeForDom = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_")

function useChartDomId(prefix: string) {
  const reactId = React.useId()
  return React.useMemo(() => `${prefix}-${sanitizeForDom(reactId)}`, [prefix, reactId])
}

type DownloadButtonProps = {
  targetId: string
  filename: string
}

function DownloadButton({ targetId, filename }: DownloadButtonProps) {
  const handleDownload = React.useCallback(async () => {
    const node = document.getElementById(targetId)
    if (!node) {
      return
    }
    const canvas = await html2canvas(node, { backgroundColor: null })
    const link = document.createElement("a")
    link.download = filename
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [targetId, filename])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDownload}
      title="Download as PNG"
      aria-label="Download chart as PNG"
    >
      <Download className="h-4 w-4" />
    </Button>
  )
}

export type CategoryKey = "class" | "spread"

type MetricsPageProps = {
  selectionLabel: string
  records: PackhouseRecord[]
  previousRecords?: PackhouseRecord[]
  category: CategoryKey
  showPrevSeason?: boolean
}

export function MetricsPage({ 
  selectionLabel, 
  records, 
  previousRecords,
  showPrevSeason = false 
}: MetricsPageProps) {
  const classTotalId = useChartDomId("packhouse-breakdown-class")
  const distributorClassId = useChartDomId("packhouse-breakdown-distributor-class")
  const marketClassId = useChartDomId("packhouse-breakdown-market-class")
  const spreadTotalId = useChartDomId("packhouse-breakdown-spread")
  const distributorSpreadId = useChartDomId("packhouse-breakdown-distributor-spread")
  const marketSpreadId = useChartDomId("packhouse-breakdown-market-spread")

  const resolvedPreviousRecords = previousRecords ?? []

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-[calc(20%-0.4rem)_calc(40%-0.8rem)_calc(40%-0.8rem)] auto-rows-[minmax(420px,_auto)] md:[grid-template-rows:400px_minmax(520px,_auto)] [&>div]:min-w-0">
      <div id={classTotalId} className="h-full">
        <PackingClassTotal 
        selectionLabel={selectionLabel} 
        records={records}
        previousRecords={previousRecords}
        showPrevSeason={showPrevSeason}
        titleClassName="text-[20px] text-left"
        headerActions={<DownloadButton targetId={classTotalId} filename="packhouse-breakdown-class.png" />}
      />
      </div>
      <div id={distributorClassId} className="h-full">
        <DistributorClassStacked 
        subtitle={selectionLabel} 
        records={records}
        previousRecords={previousRecords}
        showPrevSeason={showPrevSeason}
        titleClassName="text-[20px] text-left"
        headerActions={<DownloadButton targetId={distributorClassId} filename="packhouse-breakdown-distributor-class.png" />}
      />
      </div>
      <div id={marketClassId} className="h-full">
        <MarketClassStacked 
        subtitle={selectionLabel} 
        records={records}
        previousRecords={previousRecords}
        showPrevSeason={showPrevSeason}
        titleClassName="text-[20px] text-left"
        headerActions={<DownloadButton targetId={marketClassId} filename="packhouse-breakdown-market-class.png" />}
      />
      </div>
      <div id={spreadTotalId} className="h-full">
        <PackingSpreadTotal 
        selectionLabel={selectionLabel} 
        records={records}
        previousRecords={resolvedPreviousRecords}
        showPrevSeason={showPrevSeason}
        titleClassName="text-[20px] text-left"
        headerActions={<DownloadButton targetId={spreadTotalId} filename="packhouse-breakdown-spread.png" />}
      />
      </div>
  <div id={distributorSpreadId} className="h-full min-h-[520px] md:min-h-0">
        <DistributorSpreadBubble 
        subtitle={selectionLabel}
        records={records}
        previousRecords={previousRecords}
        showPrevSeason={showPrevSeason}
        titleClassName="text-[20px] text-left"
        headerActions={<DownloadButton targetId={distributorSpreadId} filename="packhouse-breakdown-distributor-spread.png" />}
      />
      </div>
  <div id={marketSpreadId} className="h-full min-h-[520px] md:min-h-0">
        <MarketSpreadBubble
        subtitle={selectionLabel}
        records={records}
        previousRecords={previousRecords}
        showPrevSeason={showPrevSeason}
        titleClassName="text-[20px] text-left"
        headerActions={<DownloadButton targetId={marketSpreadId} filename="packhouse-breakdown-market-spread.png" />}
      />
      </div>
    </div>
  )
}
