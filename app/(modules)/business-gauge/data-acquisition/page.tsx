"use client"

import * as React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { SectionTitle } from "@/components/section-title"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Database, Target } from "lucide-react"
import { Card, CardContent, CardTitle, CardHeader, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

type CaptureField = {
  id: string
  label: string
  placeholder: string
  type?: "text" | "number" | "date" | "textarea" | "select"
  options?: string[]
}

type CaptureSection = {
  title: string
  description: string
  fields: CaptureField[]
  actionLabel?: string
}

const CAPTURE_SECTIONS: CaptureSection[] = [
  {
    title: "Financial metrics",
    description:
      "Capture key financial indicators to track business performance.",
    fields: [
      {
        id: "finance-date",
        label: "Period date",
        placeholder: "Select reporting period",
        type: "date",
      },
      {
        id: "finance-revenue",
        label: "Revenue",
        placeholder: "Total revenue for the period",
        type: "number",
      },
      {
        id: "finance-costs",
        label: "Operating costs",
        placeholder: "Total operating costs",
        type: "number",
      },
      {
        id: "finance-profit",
        label: "Net profit",
        placeholder: "Net profit for the period",
        type: "number",
      },
      {
        id: "finance-notes",
        label: "Notes",
        placeholder: "Any additional context or observations",
        type: "textarea",
      },
    ],
    actionLabel: "Save financial metrics (placeholder)",
  },
  {
    title: "Performance indicators",
    description: "Track operational performance and efficiency metrics.",
    fields: [
      {
        id: "perf-date",
        label: "Period date",
        placeholder: "Select reporting period",
        type: "date",
      },
      {
        id: "perf-efficiency",
        label: "Operational efficiency",
        placeholder: "Efficiency percentage",
        type: "number",
      },
      {
        id: "perf-output",
        label: "Total output",
        placeholder: "Production output for period",
        type: "number",
      },
      {
        id: "perf-quality",
        label: "Quality score",
        placeholder: "Quality rating",
        type: "number",
      },
    ],
    actionLabel: "Save performance data (placeholder)",
  },
]

export default function Page() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4 flex-1">
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
      </header>
      <div
        className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto"
        style={{ maxWidth: "100vw" }}
      >
        <div className="px-2 md:px-0">
          <span className="text-muted-foreground">Business Gauge</span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Data Acquisition
          </h1>
        </div>

        <Tabs defaultValue="capture" className="space-y-4">
          <div>
            <TabsList>
              <TabsTrigger value="capture">Capture</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="capture" className="space-y-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <Database className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold">Data capture interface</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Below are placeholders for the types of information Business Gauge could collect. 
                    These forms will be replaced with actual integration workflows.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {CAPTURE_SECTIONS.map((section) => (
                <Card key={section.title}>
                  <CardHeader>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>{field.label}</Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            id={field.id}
                            placeholder={field.placeholder}
                            disabled
                          />
                        ) : field.type === "select" ? (
                          <Select disabled>
                            <SelectTrigger id={field.id}>
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={field.id}
                            type={field.type || "text"}
                            placeholder={field.placeholder}
                            disabled
                          />
                        )}
                      </div>
                    ))}
                    {section.actionLabel && (
                      <Button disabled className="w-full mt-4">
                        {section.actionLabel}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold">Configuration options</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Future configuration settings for Business Gauge data sources and integrations will appear here.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Data source configuration (placeholder)</CardTitle>
                <CardDescription>
                  Configure how Business Gauge connects to your data sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary data source</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual entry</SelectItem>
                      <SelectItem value="api">API integration</SelectItem>
                      <SelectItem value="file">File upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Update frequency</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
