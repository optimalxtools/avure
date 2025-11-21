export const dynamic = "force-dynamic"

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { SectionTitle } from "@/components/section-title"
import { ExportButton } from "@/components/export-button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AIButton } from "@/components/ai-button"
import { Card, CardContent } from "@/components/ui/card"
import { getPriceWiseSnapshots } from "@/lib/price-wise/scraper"
import { buildSnapshotViews } from "@/lib/price-wise/snapshot-utils"
import type { PriceWiseSnapshotView } from "@/lib/price-wise/types"
import { RefreshButton } from "@/components/price-wise-refresh-button"
import { SimplePriceChart, SimpleOccupancyChart, DailyBookingStatusChart, DailyAvailabilityChart } from "@/components/price-wise/overview-charts"

export default async function Page() {
  const rawSnapshots = await getPriceWiseSnapshots(2)
  const snapshotViews = buildSnapshotViews(rawSnapshots, ["Current", "Previous"])
  const latestSnapshot: PriceWiseSnapshotView | null = snapshotViews[0] ?? null

  const generatedLabel = latestSnapshot
    ? `Generated ${latestSnapshot.fullLabel}`
    : "No analysis has been produced yet"

  const referenceProperty = latestSnapshot?.referenceProperty ?? ""
  const refPricing = referenceProperty
    ? latestSnapshot?.pricingMetrics.find((metric) => metric.hotel_name === referenceProperty)
    : undefined
  const refOccupancy = referenceProperty
    ? latestSnapshot?.occupancyMetrics.find((metric) => metric.hotel_name === referenceProperty)
    : undefined

  const priceChartSnapshots = snapshotViews.map((snapshot) => ({
    id: snapshot.id,
    label: snapshot.label,
    dateLabel: snapshot.dateLabel,
    fullLabel: snapshot.fullLabel,
    pricingData: snapshot.pricingMetrics,
    referenceProperty: snapshot.referenceProperty,
  }))

  const occupancyChartSnapshots = snapshotViews.map((snapshot) => ({
    id: snapshot.id,
    label: snapshot.label,
    dateLabel: snapshot.dateLabel,
    fullLabel: snapshot.fullLabel,
    occupancyData: snapshot.occupancyMetrics,
    roomInventoryData: snapshot.roomInventoryMetrics,
    referenceProperty: snapshot.referenceProperty,
  }))

  const bookingStatusSnapshots = snapshotViews.map((snapshot) => ({
    id: snapshot.id,
    label: snapshot.label,
    dateLabel: snapshot.dateLabel,
    fullLabel: snapshot.fullLabel,
    dailyData: snapshot.dailyData,
    referenceProperty: snapshot.referenceProperty,
    roomInventoryData: snapshot.roomInventoryMetrics,
  }))

  const availabilitySnapshots = snapshotViews.map((snapshot) => ({
    id: snapshot.id,
    label: snapshot.label,
    dateLabel: snapshot.dateLabel,
    fullLabel: snapshot.fullLabel,
    dailyData: snapshot.dailyData,
    referenceProperty: snapshot.referenceProperty,
  }))

  const hasPricingData = snapshotViews.some((snapshot) => snapshot.pricingMetrics.length > 0)
  const hasOccupancyData = snapshotViews.some((snapshot) => snapshot.occupancyMetrics.length > 0)
  const hasDailyData = snapshotViews.some((snapshot) => snapshot.dailyData.length > 0)

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
            <RefreshButton lastUpdated={latestSnapshot?.generatedAt ?? null} />
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

        {snapshotViews.length === 0 ? (
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
                          R {refPricing.avg_price_per_night.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {referenceProperty}
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
                          {refOccupancy.occupancy_rate.toFixed(1)}%
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
                          R {refPricing.min_price.toLocaleString('en-ZA', { minimumFractionDigits: 0 })} - {refPricing.max_price.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
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
                          {refPricing.discount_frequency.toFixed(1)}%
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
              {hasPricingData && (
                <SimplePriceChart 
                  snapshots={priceChartSnapshots}
                />
              )}
              {hasOccupancyData && (
                <SimpleOccupancyChart 
                  snapshots={occupancyChartSnapshots}
                />
              )}
            </div>

            {/* Daily Booking Status with Competitor Comparison */}
            {hasDailyData && (
              <DailyBookingStatusChart 
                snapshots={bookingStatusSnapshots}
              />
            )}

            {/* Daily Availability Tracking */}
            {hasDailyData && (
              <DailyAvailabilityChart 
                snapshots={availabilitySnapshots}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}