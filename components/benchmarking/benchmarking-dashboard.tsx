
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompetitorComparison } from "./competitor-comparison"
import { MarketTrends } from "./market-trends"
import { MetricsOverview } from "./metrics-overview"

export function BenchmarkingDashboard() {
  return (
    <div
      className="space-y-4 overflow-x-auto debug-border-2" // Unique debug class
      style={{ overflowX: "auto", maxWidth: "100%" }} // Inline style
    >
      <MetricsOverview />
      <Tabs defaultValue="comparison" className="space-y-4">
        <div className="flex items-center justify-center">
          <TabsList>
            <TabsTrigger value="comparison">Competitor Comparison</TabsTrigger>
            <TabsTrigger value="trends">Market Trends</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="comparison" className="space-y-4">
          <CompetitorComparison />
        </TabsContent>
        <TabsContent value="trends" className="space-y-4">
          <MarketTrends />
        </TabsContent>
      </Tabs>
    </div>
  )
}