import { Component as ActiveDonutChart } from "@/components/charts/active-donut-chart"
import { Component as RadialChart } from "@/components/charts/radial-chart"
import { Component as StackedBarChart } from "@/components/charts/stacked-bar-chart"
import { Component as RadarChart } from "@/components/charts/radar-chart"

export function MetricsOverview() {
  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StackedBarChart />
      <ActiveDonutChart />
      <RadialChart />
      <RadarChart />
    </div>
  )
} 