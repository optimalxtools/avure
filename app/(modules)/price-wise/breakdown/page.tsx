export const dynamic = "force-dynamic"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { SectionTitle } from "@/components/section-title"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AIButton } from "@/components/ai-button"
import { ExportButton } from "@/components/export-button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { getScraperAnalysis } from "@/lib/price-wise/scraper"
import { RefreshButton } from "@/components/price-wise-refresh-button"
import { PriceDifferenceChart, PriceRangeChart, OccupancyComparisonChart as MetricsOccupancyChart, RoomInventoryChart } from "@/components/price-wise/breakdown-metrics-charts"
import { PriceComparisonChart, OpportunityCostChart } from "@/components/price-wise/breakdown-insights-charts"

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const toStringValue = (value: unknown): string => (typeof value === "string" ? value : "")

type PricingMetric = {
  hotel_name?: string
  avg_price_per_night?: number | string | null
  min_price?: number | string | null
  max_price?: number | string | null
}

type OccupancyMetric = {
  hotel_name?: string
  occupancy_rate?: number | string | null
  sold_out?: number | string | null
  available?: number | string | null
}

type ComparisonMetric = {
  hotel_name?: string
  avg_price?: number | string | null
  price_vs_ref?: number | string | null
  price_vs_ref_pct?: number | string | null
  occupancy?: number | string | null
  position?: string | null
}

type RoomInventoryMetric = {
  hotel_name?: string
  avg_room_occupancy_rate?: number | string | null
  avg_total_room_types?: number | string | null
  avg_available_room_types?: number | string | null
  avg_sold_out_room_types?: number | string | null
  room_type_count_estimate?: number | string | null
  avg_room_price?: number | string | null
  avg_room_price_avg?: number | string | null
  room_price_spread?: number | string | null
  room_price_spread_pct?: number | string | null
  uses_room_tiering?: boolean | null
}

export default async function Page() {
  const analysis = await getScraperAnalysis()

  const rawPricing = (analysis?.pricing_metrics as PricingMetric[] | undefined) ?? []
  const rawOccupancy = (analysis?.occupancy_metrics as OccupancyMetric[] | undefined) ?? []
  const rawComparison = (analysis?.comparison as ComparisonMetric[] | undefined) ?? []
  const rawRoomInventory = (analysis?.room_inventory as RoomInventoryMetric[] | undefined) ?? []

  const pricingMetrics = rawPricing
    .map((entry) => ({
      hotel_name: toStringValue(entry.hotel_name),
      avg_price_per_night: toNumber(entry.avg_price_per_night) ?? 0,
      min_price: toNumber(entry.min_price) ?? 0,
      max_price: toNumber(entry.max_price) ?? 0,
    }))
    .filter((entry) => entry.hotel_name)

  const occupancyMetrics = rawOccupancy
    .map((entry) => ({
      hotel_name: toStringValue(entry.hotel_name),
      occupancy_rate: toNumber(entry.occupancy_rate) ?? 0,
      sold_out: toNumber(entry.sold_out) ?? 0,
      available: toNumber(entry.available) ?? 0,
    }))
    .filter((entry) => entry.hotel_name)

  const comparisonMetrics = rawComparison
    .map((entry) => ({
      hotel_name: toStringValue(entry.hotel_name),
      avg_price: toNumber(entry.avg_price) ?? 0,
      price_vs_ref: toNumber(entry.price_vs_ref) ?? 0,
      price_vs_ref_pct: toNumber(entry.price_vs_ref_pct) ?? 0,
      occupancy: toNumber(entry.occupancy) ?? 0,
      position: toStringValue(entry.position),
    }))
    .filter((entry) => entry.hotel_name)

  const roomInventoryMetrics = rawRoomInventory
    .map((entry) => ({
      hotel_name: toStringValue(entry.hotel_name),
      avg_room_occupancy_rate: toNumber(entry.avg_room_occupancy_rate),
      avg_total_room_types: toNumber(entry.avg_total_room_types),
      avg_available_room_types: toNumber(entry.avg_available_room_types),
      avg_sold_out_room_types: toNumber(entry.avg_sold_out_room_types),
      room_type_count_estimate: toNumber(entry.room_type_count_estimate),
      avg_room_price: toNumber(entry.avg_room_price),
      avg_room_price_avg: toNumber(entry.avg_room_price_avg),
      room_price_spread: toNumber(entry.room_price_spread),
      room_price_spread_pct: toNumber(entry.room_price_spread_pct),
      uses_room_tiering: entry.uses_room_tiering === true,
    }))
    .filter((entry) => entry.hotel_name)

  const sortedComparison = [...comparisonMetrics].sort((a, b) => a.price_vs_ref_pct - b.price_vs_ref_pct)
  const sortedRoomInventory = [...roomInventoryMetrics].sort(
    (a, b) => (b.avg_room_occupancy_rate ?? 0) - (a.avg_room_occupancy_rate ?? 0),
  )

  const referenceProperty = analysis?.reference_property || ""
  const referencePricingMetric = pricingMetrics.find((entry) => entry.hotel_name === referenceProperty)
  const referenceOccupancyMetric = occupancyMetrics.find((entry) => entry.hotel_name === referenceProperty)

  const comparisonWithRef = [...sortedComparison]
  if (
    analysis &&
    referencePricingMetric &&
    !comparisonWithRef.some((entry) => entry.hotel_name === analysis.reference_property)
  ) {
    comparisonWithRef.push({
      hotel_name: analysis.reference_property,
      avg_price: referencePricingMetric.avg_price_per_night,
      price_vs_ref: 0,
      price_vs_ref_pct: 0,
      occupancy: referenceOccupancyMetric?.occupancy_rate ?? 0,
      position: "Reference",
    })
    comparisonWithRef.sort((a, b) => a.price_vs_ref_pct - b.price_vs_ref_pct)
  }

  const currentReferencePrice = referencePricingMetric?.avg_price_per_night ?? 0
  const currentReferenceOccupancy = referenceOccupancyMetric?.occupancy_rate ?? 0

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
          <div className="flex items-center gap-2">
            <RefreshButton lastUpdated={analysis?.generated_at || null} />
            <AIButton currentPage="Price-Wise - Breakdown" />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-muted-foreground">Price Wise</span>
              <h1 className="text-3xl font-semibold tracking-tight">Breakdown</h1>
              <p className="text-sm text-muted-foreground">
                {analysis?.generated_at
                  ? `Generated at ${new Date(analysis.generated_at).toLocaleString()}`
                  : "No analysis has been produced yet"}
              </p>
            </div>
            <ExportButton />
          </div>
        </div>
        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {comparisonWithRef.length > 0 && (
                <PriceDifferenceChart
                  comparisonData={comparisonWithRef}
                  referenceProperty={referenceProperty}
                />
              )}

              {pricingMetrics.length > 0 && (
                <PriceRangeChart
                  pricingData={pricingMetrics}
                  referenceProperty={referenceProperty}
                />
              )}

              {occupancyMetrics.length > 0 && (
                <MetricsOccupancyChart
                  data={occupancyMetrics}
                  referenceProperty={referenceProperty}
                />
              )}

              {roomInventoryMetrics.length > 0 && (
                <RoomInventoryChart 
                  data={sortedRoomInventory} 
                  referenceProperty={referenceProperty}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <PriceComparisonChart
                pricingData={pricingMetrics}
                occupancyData={occupancyMetrics}
                referenceProperty={referenceProperty}
              />

              <OpportunityCostChart
                currentPrice={currentReferencePrice}
                currentOccupancy={currentReferenceOccupancy}
                referenceProperty={referenceProperty}
              />
            </div>
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

