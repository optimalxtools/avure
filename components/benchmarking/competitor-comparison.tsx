import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function CompetitorComparison() {
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
    <Card className="w-full debug-border"> {/* Added debug-border */}
      <CardHeader>
        <CardTitle>Competitive Analysis</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto debug-border"> {/* Added debug-border */}
        <div className="min-w-[600px] w-full debug-border"> {/* Added debug-border */}
          <Table className="w-full debug-border"> {/* Added debug-border */}
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
  )
}