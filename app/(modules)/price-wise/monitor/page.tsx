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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getScraperAnalysis } from "@/lib/price-wise/scraper"
import type { PriceWiseAnalysis } from "@/lib/price-wise/types"
import { RefreshButton } from "@/components/price-wise-refresh-button"

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

function formatCurrency(value: unknown) {
  const num = toNumber(value)
  if (num === null) return "—"
  return currencyFormatter.format(num)
}

function formatPercent(value: unknown) {
  const num = toNumber(value)
  if (num === null) return "—"
  return percentFormatter.format(num / 100)
}

function formatNumber(value: unknown) {
  const num = toNumber(value)
  if (num === null) return "—"
  return numberFormatter.format(num)
}

function buildPricingRows(analysis?: PriceWiseAnalysis) {
  return analysis?.pricing_metrics?.map((entry) => ({
    hotel: String(entry.hotel_name ?? "Unknown"),
    average: formatCurrency(entry.avg_price_per_night),
    minimum: formatCurrency(entry.min_price),
    maximum: formatCurrency(entry.max_price),
    sample: formatNumber(entry.sample_size),
  }))
}

function buildOccupancyRows(analysis?: PriceWiseAnalysis) {
  return analysis?.occupancy_metrics?.map((entry) => ({
    hotel: String(entry.hotel_name ?? "Unknown"),
    occupancy: formatPercent(entry.occupancy_rate),
    soldOut: formatNumber(entry.sold_out),
    available: formatNumber(entry.available),
  }))
}

export default async function Page() {
  const analysis = await getScraperAnalysis()

  const pricingRows = buildPricingRows(analysis)
  const occupancyRows = buildOccupancyRows(analysis)

  // Parse additional data for new sections
  const pricingMetrics = analysis?.pricing_metrics || []
  const occupancyMetrics = analysis?.occupancy_metrics || []
  const comparison = analysis?.comparison || []
  
  // Sort occupancy by rate (descending)
  const sortedOccupancy = [...occupancyMetrics].sort((a: any, b: any) => (b.occupancy_rate || 0) - (a.occupancy_rate || 0))
  
  // Sort comparison by price difference
  const sortedComparison = [...comparison].sort((a: any, b: any) => (a.price_vs_ref_pct || 0) - (b.price_vs_ref_pct || 0))

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
            <AIButton currentPage="Price-Wise - Monitor" />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-muted-foreground">Price Wise</span>
              <h1 className="text-3xl font-semibold tracking-tight">Monitor</h1>
              <p className="text-sm text-muted-foreground">
                {analysis?.generated_at
                  ? `Generated at ${new Date(analysis.generated_at).toLocaleString()}`
                  : "No analysis has been produced yet"}
              </p>
            </div>
            <ExportButton />
          </div>
        </div>
        <Tabs defaultValue="pricing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing">
            {/* Price Comparison */}
            {comparison.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Price Difference</CardTitle>
                  <CardDescription>Competitive pricing position</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead className="text-right">% Diff</TableHead>
                        <TableHead className="text-right">Occupancy</TableHead>
                        <TableHead>Position</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedComparison.map((row: any, index: number) => {
                        const priceDiff = Number(row.price_vs_ref || 0)
                        const priceDiffPct = Number(row.price_vs_ref_pct || 0)
                        const isLower = priceDiff < 0
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{row.hotel_name}</TableCell>
                            <TableCell className="text-right">R {Number(row.avg_price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className={`text-right ${isLower ? 'text-green-600' : 'text-red-600'}`}>
                              R {priceDiff > 0 ? '+' : ''}{priceDiff.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className={`text-right ${isLower ? 'text-green-600' : 'text-red-600'}`}>
                              {priceDiffPct > 0 ? '+' : ''}{priceDiffPct.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">{Number(row.occupancy || 0).toFixed(1)}%</TableCell>
                            <TableCell>{row.position}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Price Range</CardTitle>
                <CardDescription>Average nightly rate by competitor</CardDescription>
              </CardHeader>
              <CardContent>
                {pricingRows?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Average</TableHead>
                        <TableHead>Minimum</TableHead>
                        <TableHead>Maximum</TableHead>
                        <TableHead>Samples</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingRows.map((row) => (
                        <TableRow key={row.hotel}>
                          <TableCell className="font-medium">{row.hotel}</TableCell>
                          <TableCell>{row.average}</TableCell>
                          <TableCell>{row.minimum}</TableCell>
                          <TableCell>{row.maximum}</TableCell>
                          <TableCell>{row.sample}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No pricing metrics were generated.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="occupancy">
            {/* Occupancy Rankings */}
            {occupancyMetrics.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Occupancy Rankings</CardTitle>
                  <CardDescription>Properties ranked by occupancy rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead className="text-right">Occupancy</TableHead>
                        <TableHead className="text-right">Sold Out</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedOccupancy.map((row: any, index: number) => (
                        <TableRow key={index} className={row.hotel_name === analysis?.reference_property ? "bg-muted/50" : ""}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {row.hotel_name}
                            {row.hotel_name === analysis?.reference_property && " ⭐"}
                          </TableCell>
                          <TableCell className="text-right">{Number(row.occupancy_rate || 0).toFixed(1)}%</TableCell>
                          <TableCell className="text-right">{row.sold_out || 0}</TableCell>
                          <TableCell className="text-right">{row.available || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">No occupancy metrics were generated.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

