import { Component as ActiveDonutChart } from "../charts/active-donut-chart"
import { Component as RadialChart } from "../charts/radial-chart"
import { Component as StackedBarChart } from "../charts/stacked-bar-chart"
import { Component as RadarChart } from "../charts/radar-chart"
import { Component as ExtendedAreaChart } from "../charts/extended-area-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function MetricsPage({ selectionLabel }: { selectionLabel: string }) {
  const competitors = [
    {
      name: "Your Company",
      marketShare: "23.5%",
      growth: "12.8%",
      pricing: "$99",
      satisfaction: "4.5",
    },
    {
      name: "Competitor A",
      marketShare: "18.2%",
      growth: "15.3%",
      pricing: "$129",
      satisfaction: "4.2",
    },
    // Add more competitors as needed
  ]

  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="md:col-span-4">
        <ExtendedAreaChart subtitle={selectionLabel} />
      </div>
      <div className="md:col-span-4">
        <Card className="w-full debug-border">
          <CardHeader>
            <CardTitle>Competitive Analysis</CardTitle>
          </CardHeader>
          <CardContent className="debug-border">
            {/* Mobile: stacked list */}
            <div className="md:hidden space-y-3">
              {competitors.map((c) => (
                <div key={c.name} className="rounded-md border p-3">
                  <div className="font-medium mb-2">{c.name}</div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Market Share</dt>
                    <dd className="text-right">{c.marketShare}</dd>
                    <dt className="text-muted-foreground">Growth Rate</dt>
                    <dd className="text-right">{c.growth}</dd>
                    <dt className="text-muted-foreground">Pricing</dt>
                    <dd className="text-right">{c.pricing}</dd>
                    <dt className="text-muted-foreground">Satisfaction</dt>
                    <dd className="text-right">{c.satisfaction}</dd>
                  </dl>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table className="w-full debug-border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Market Share</TableHead>
                    <TableHead>Growth Rate</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Customer Satisfaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map((competitor) => (
                    <TableRow key={competitor.name}>
                      <TableCell className="font-medium">{competitor.name}</TableCell>
                      <TableCell>{competitor.marketShare}</TableCell>
                      <TableCell>{competitor.growth}</TableCell>
                      <TableCell>{competitor.pricing}</TableCell>
                      <TableCell>{competitor.satisfaction}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <StackedBarChart subtitle={selectionLabel} />
      <ActiveDonutChart subtitle={selectionLabel} />
      <RadialChart subtitle={selectionLabel} />
      <RadarChart subtitle={selectionLabel} />
    </div>
  )
}
