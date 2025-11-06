import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function MarketTrends() {
  const trends = [
    {
      category: "Industry News",
      items: [
        {
          title: "New Market Entrant",
          description: "StartupX raises $50M, plans to enter market Q3 2024",
          impact: "medium",
        },
        {
          title: "Regulatory Change",
          description: "New compliance requirements effective July 2024",
          impact: "high",
        },
      ],
    },
    {
      category: "Economic Indicators",
      items: [
        {
          title: "Market Growth",
          description: "Industry expected to grow 12% in next quarter",
          impact: "positive",
        },
        {
          title: "Consumer Sentiment",
          description: "5% increase in positive sentiment",
          impact: "positive",
        },
      ],
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {trends.map((category) => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle>{category.category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {category.items.map((item) => (
              <div
                key={item.title}
                className="flex flex-col space-y-2 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{item.title}</h4>
                  <Badge
                    variant={
                      item.impact === "high"
                        ? "destructive"
                        : item.impact === "positive"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {item.impact}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 