"use client"

import * as React from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SectionTitle } from "@/components/section-title"
import { SlidersHorizontal } from "lucide-react"

export default function Page() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex w-full items-center justify-between px-4">
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
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-1 pb-4 md:px-4" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <span className="text-muted-foreground">Organisation</span>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <SlidersHorizontal className="h-6 w-6" />
            Configuration
          </h1>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="capture">Capture</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              Configuration overview coming soon
            </div>
          </TabsContent>

      <TabsContent value="capture" className="space-y-4">
        <div className="rounded-md border p-6 text-sm text-muted-foreground">
          Capture templates coming soon
        </div>
      </TabsContent>

      <TabsContent value="connections" className="space-y-4">
        <div className="rounded-md border p-6 text-sm text-muted-foreground">
          Integration status coming soon
        </div>
      </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
