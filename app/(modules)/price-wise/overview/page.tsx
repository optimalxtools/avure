export const dynamic = "force-dynamic"

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { SectionTitle } from "@/components/section-title"
import { ExportButton } from "@/components/export-button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AIButton } from "@/components/ai-button"
import { Card, CardContent } from "@/components/ui/card"
import { getScraperAnalysis, getDailyPricingData } from "@/lib/price-wise/scraper"
import { RefreshButton } from "@/components/price-wise-refresh-button"
import { SimplePriceChart, SimpleOccupancyChart, DailyBookingStatusChart, DailyAvailabilityChart } from "@/components/price-wise/overview-charts"

export default async function Page() {
  const analysis = await getScraperAnalysis()
  const dailyData = await getDailyPricingData()

  const generatedLabel = analysis?.generated_at
    ? `Generated at ${new Date(analysis.generated_at).toLocaleString()}`
    : "No analysis has been produced yet"

  const toNullableNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  const toNumberOrZero = (value: unknown): number => toNullableNumber(value) ?? 0

  const toHotelName = (value: unknown): string => {
    if (typeof value === "string") return value.trim()
    if (typeof value === "number") return value.toString()
    return ""
  }

  type PricingMetric = {
    hotel_name?: string
    avg_price_per_night?: number | string | null
    min_price?: number | string | null
    max_price?: number | string | null
    discount_frequency?: number | string | null
    preferred_price_per_night?: number | string | null
    preferred_price_source?: string | null
    property_avg_price_per_night?: number | string | null
    avg_room_price_avg?: number | string | null
    room_type_count_estimate?: number | string | null
  }

  type OccupancyMetric = {
    hotel_name?: string
    occupancy_rate?: number | string | null
    preferred_occupancy_rate?: number | string | null
    preferred_occupancy_source?: string | null
    property_occupancy_rate?: number | string | null
    avg_room_occupancy_rate?: number | string | null
    sold_out?: number | string | null
    available?: number | string | null
    room_type_count_estimate?: number | string | null
  }

  type RoomInventoryMetric = {
    hotel_name?: string
    avg_room_occupancy_rate?: number | string | null
    avg_total_room_types?: number | string | null
    avg_available_room_types?: number | string | null
    avg_sold_out_room_types?: number | string | null
    room_type_count_estimate?: number | string | null
  }

  const pricingMetrics = ((analysis?.pricing_metrics as PricingMetric[] | undefined) ?? [])
    .map((entry) => ({
      hotel_name: toHotelName(entry.hotel_name),
      avg_price_per_night: toNumberOrZero(entry.avg_price_per_night),
      min_price: toNumberOrZero(entry.min_price),
      max_price: toNumberOrZero(entry.max_price),
      discount_frequency: toNumberOrZero(entry.discount_frequency),
      preferred_price_per_night: toNullableNumber(entry.preferred_price_per_night),
      preferred_price_source: entry.preferred_price_source ?? null,
      property_avg_price_per_night: toNullableNumber(entry.property_avg_price_per_night),
      avg_room_price_avg: toNullableNumber(entry.avg_room_price_avg),
      room_type_count_estimate: toNullableNumber(entry.room_type_count_estimate),
    }))
    .filter((entry) => entry.hotel_name.length > 0)

  const occupancyMetrics = ((analysis?.occupancy_metrics as OccupancyMetric[] | undefined) ?? [])
    .map((entry) => ({
      hotel_name: toHotelName(entry.hotel_name),
      occupancy_rate: toNumberOrZero(entry.occupancy_rate),
      preferred_occupancy_rate: toNullableNumber(entry.preferred_occupancy_rate),
      preferred_occupancy_source: entry.preferred_occupancy_source ?? null,
      property_occupancy_rate: toNullableNumber(entry.property_occupancy_rate),
      avg_room_occupancy_rate: toNullableNumber(entry.avg_room_occupancy_rate),
      sold_out: toNumberOrZero(entry.sold_out),
      available: toNumberOrZero(entry.available),
      room_type_count_estimate: toNullableNumber(entry.room_type_count_estimate),
    }))
    .filter((entry) => entry.hotel_name.length > 0)

  const roomInventoryMetrics = ((analysis?.room_inventory as RoomInventoryMetric[] | undefined) ?? [])
    .map((entry) => ({
      hotel_name: toHotelName(entry.hotel_name),
      avg_room_occupancy_rate: toNullableNumber(entry.avg_room_occupancy_rate),
      avg_total_room_types: toNullableNumber(entry.avg_total_room_types),
      avg_available_room_types: toNullableNumber(entry.avg_available_room_types),
      avg_sold_out_room_types: toNullableNumber(entry.avg_sold_out_room_types),
      room_type_count_estimate: toNullableNumber(entry.room_type_count_estimate),
    }))
    .filter((entry) => entry.hotel_name.length > 0)

  // Find reference property data
  const refPricing = pricingMetrics.find((p) => p.hotel_name === analysis?.reference_property)
  const refOccupancy = occupancyMetrics.find((o) => o.hotel_name === analysis?.reference_property)

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
            <RefreshButton lastUpdated={analysis?.generated_at || null} />
            <AIButton currentPage="Price-Wise - Overview" />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-muted-foreground">Price Wise</span>
              <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
              <p className="text-sm text-muted-foreground">{generatedLabel}</p>
            </div>
            <ExportButton />
          </div>
        </div>

        {!analysis ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground text-center">
                Run the scraper to generate competitive pricing analysis.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Executive Summary - Snapshot Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {refPricing && (
                <Card className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">Average Price/Night</p>
                        <h3 className="text-3xl font-bold tracking-tight">
                          R {Number(refPricing.avg_price_per_night || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.reference_property}
                        </p>
                      </div>
                      <div className="rounded-lg bg-primary/10 p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {refOccupancy && (
                <Card className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">Property Occupancy</p>
                        <h3 className="text-3xl font-bold tracking-tight">
                          {Number(refOccupancy.occupancy_rate || 0).toFixed(1)}%
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Current booking rate
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-500/10 p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {refPricing && (
                <Card className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">Property Price Range</p>
                        <h3 className="text-2xl font-bold tracking-tight">
                          R {Number(refPricing.min_price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0 })} - {Number(refPricing.max_price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Min - Max pricing
                        </p>
                      </div>
                      <div className="rounded-lg bg-orange-500/10 p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                          <line x1="3" y1="6" x2="21" y2="6"/>
                          <path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {refPricing && (
                <Card className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">Discount Frequency</p>
                        <h3 className="text-3xl font-bold tracking-tight">
                          {Number(refPricing.discount_frequency || 0).toFixed(1)}%
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">Discounted listings</p>
                      </div>
                      <div className="rounded-lg bg-pink-500/10 p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                          <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                          <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                          <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Data Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pricingMetrics.length > 0 && (
                <SimplePriceChart 
                  pricingData={pricingMetrics}
                  referenceProperty={analysis.reference_property}
                />
              )}
              {occupancyMetrics.length > 0 && (
                <SimpleOccupancyChart 
                  occupancyData={occupancyMetrics}
                  roomInventoryData={roomInventoryMetrics}
                  referenceProperty={analysis.reference_property}
                />
              )}
            </div>

            {/* Daily Booking Status with Competitor Comparison */}
            {dailyData.length > 0 && (
              <DailyBookingStatusChart 
                dailyData={dailyData}
                referenceProperty={analysis.reference_property}
                roomInventoryData={roomInventoryMetrics}
              />
            )}

            {/* Daily Availability Tracking */}
            {dailyData.length > 0 && (
              <DailyAvailabilityChart 
                dailyData={dailyData}
                referenceProperty={analysis.reference_property}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}