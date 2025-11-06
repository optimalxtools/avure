import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { SectionTitle } from "@/components/section-title"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

import { Component as AreaChart } from "@/components/charts/area-chart"
import { Component as BarChart } from "@/components/charts/bar-chart"
import { Component as PieChart } from "@/components/charts/pie-chart"
import { Component as ExtendedAreaChart } from "@/components/charts/extended-area-chart"
import { Component as ActiveBarChart } from "@/components/charts/active-bar-chart"
import { Component as RadarChart } from "@/components/charts/radar-chart"
import { Component as RadialBarChart } from "@/components/charts/radial-chart"
import { Component as StackedBarChart } from "@/components/charts/stacked-bar-chart"
import { Download } from "lucide-react"

  export default function Page() {
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

            <Button>
              <Download className="size-4" />
              Fetch New Data
            </Button>
          </div>
        </header>
        <div
          className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto"
          style={{ maxWidth: "100vw" }}
        >
          <div className="px-2 md:px-0">
            <span className="text-muted-foreground">Packhouse</span>
            <h1 className="text-3xl font-semibold tracking-tight">
              <SectionTitle />
            </h1>
          </div>

          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <AreaChart />
            <BarChart />
            <PieChart />
            <div className="col-span-3">
              <ExtendedAreaChart />
            </div>
            <ActiveBarChart />
            <RadarChart />
            <RadialBarChart />
            <StackedBarChart />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </div>
      </>
    )
  }
