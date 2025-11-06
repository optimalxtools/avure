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
import { Database, Lock, Unlock, TrendingUp, DollarSign, Users, Target, RotateCcw } from "lucide-react"
import { Card, CardContent, CardTitle, CardHeader, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { LOCKED_SELECT_TRIGGER_CLASS } from "@/lib/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useMasterConfigFilters } from "@/lib/hooks/useMasterConfigFilters"
import { FILTER_WRAPPER_CLASS } from "@/lib/filter-styles"

const SEASON_OPTIONS = ["2025", "2024"]

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
    title: "Inbound loads",
    description:
      "Sketch the information we expect to collect when fruit arrives at the packhouse.",
    fields: [
      {
        id: "inbound-date",
        label: "Delivery date",
        placeholder: "When did the load arrive?",
        type: "date",
      },
      {
        id: "inbound-source",
        label: "Source orchard",
        placeholder: "Select or enter the supplier block",
        type: "select",
        options: ["Orchard placeholder", "External supplier"],
      },
      {
        id: "inbound-variety",
        label: "Variety",
        placeholder: "Variety included in the load",
        type: "select",
        options: ["Variety placeholder", "Mixed"],
      },
      {
        id: "inbound-weight",
        label: "Gross weight",
        placeholder: "Record the delivered weight",
        type: "number",
      },
      {
        id: "inbound-notes",
        label: "Receiving notes",
        placeholder: "Inspection comments or special handling",
        type: "textarea",
      },
    ],
    actionLabel: "Capture inbound load (placeholder)",
  },
  {
    title: "Processing run",
    description: "Placeholder for runtime statistics that will support efficiency reporting.",
    fields: [
      {
        id: "run-date",
        label: "Run date",
        placeholder: "Date of the processing run",
        type: "date",
      },
      {
        id: "run-line",
        label: "Line",
        placeholder: "Which line handled the fruit?",
      },
      {
        id: "run-output",
        label: "Packed cases",
        placeholder: "Number of finished cases",
        type: "number",
      },
      {
        id: "run-downtime",
        label: "Downtime notes",
        placeholder: "Summarise stoppages or slowdowns",
        type: "textarea",
      },
    ],
  },
  {
    title: "Packaging materials",
    description: "Capture packaging inventory updates that inform procurement views.",
    fields: [
      {
        id: "packaging-item",
        label: "Material",
        placeholder: "Type of packaging used",
        type: "select",
        options: ["Cartons", "Liners", "Labels"],
      },
      {
        id: "packaging-lot",
        label: "Lot number",
        placeholder: "Internal or supplier lot reference",
      },
      {
        id: "packaging-quantity",
        label: "Quantity used",
        placeholder: "Units consumed this run",
        type: "number",
      },
      {
        id: "packaging-reorder",
        label: "Reorder signal",
        placeholder: "Describe thresholds or follow-up actions",
        type: "textarea",
      },
    ],
  },
]

const CAPTURE_HELPER_CARD = (
  <Card className="border-dashed border-muted/50 bg-muted/20">
    <CardHeader>
      <CardTitle>Packhouse capture planning</CardTitle>
      <CardDescription>
        Align the data we want to gather at intake and processing before wiring it into live
        dashboards.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        These placeholders highlight the integration points between harvest, packhouse and
        distribution metrics without persisting anything yet.
      </p>
    </CardContent>
  </Card>
)

const preventSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
}

export default function Page() {
  const {
    loading: configLoading,
    error: configError,
    variety,
    block,
    puc,
    season,
    setVariety,
    setBlock,
    setPuc,
    setSeason,
  resetVariety,
  resetBlock,
  resetPuc,
  resetSeason,
    lockVariety,
    lockBlock,
    lockPuc,
    lockSeason,
    setLockVariety,
    setLockBlock,
    setLockPuc,
    setLockSeason,
    varietyOptions,
    blockOptions,
    pucOptions,
    seasonOptions,
    formatLabel,
    formatBlockLabel,
    defaultVarietyValue,
    defaultBlockValue,
    defaultPucValue,
    defaultSeasonValue,
    allVarietiesValue,
    allBlocksValue,
    allPucsValue,
  } = useMasterConfigFilters({
    sharedKey: "filters:shared",
    pageKey: "filters:packhouse:data-acquisition",
    seasons: SEASON_OPTIONS,
    autoSelectFirstVariety: true,
    autoSelectFirstSeason: true,
  })

  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(() => { setHydrated(true) }, [])

  const loadingOrError = configLoading || Boolean(configError)
  const varietyDisabled = lockVariety || loadingOrError
  const blockDisabled = lockBlock || loadingOrError
  const pucDisabled = lockPuc || loadingOrError
  const seasonDisabled = lockSeason || seasonOptions.length === 0

  const varietyLabel =
    variety === allVarietiesValue ? "All Varieties" : formatLabel(variety)
  const blockLabel =
    block === allBlocksValue ? "All Blocks" : formatBlockLabel(block)
  const pucLabel = puc === allPucsValue ? "All PUCs" : formatLabel(puc)
  const seasonLabelRaw = season || (seasonOptions[0] ?? "")
  const seasonLabel = seasonLabelRaw || "Season"

  const selectionLabel = hydrated
    ? `${varietyLabel} | ${blockLabel} | ${pucLabel} | ${seasonLabel}`
    : ""

  const isVarietyDefault = variety === defaultVarietyValue
  const isBlockDefault = block === defaultBlockValue
  const isPucDefault = puc === defaultPucValue
  const isSeasonDefault = season === defaultSeasonValue

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
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <span className="text-muted-foreground">Packhouse</span>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6" />
            Data Acquisition
          </h1>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="grid w-full gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              <div className={FILTER_WRAPPER_CLASS}>
                <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-xs text-muted-foreground">Variety</span>
                <Select value={variety} onValueChange={(value) => { if (lockVariety) return; setVariety(value) }}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm",
                      lockVariety && LOCKED_SELECT_TRIGGER_CLASS,
                      varietyDisabled && !lockVariety && "opacity-60 pointer-events-none"
                    )}
                    aria-label="Variety"
                    aria-disabled={varietyDisabled}
                    disabled={varietyDisabled}
                  >
                    <SelectValue placeholder={configLoading ? "Loading..." : "Select variety"} />
                  </SelectTrigger>
                  <SelectContent>
                    {varietyOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === allVarietiesValue ? "All Varieties" : formatLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute -top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={lockVariety}
                    onClick={() => setLockVariety(!lockVariety)}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground"
                    title={lockVariety ? "Unlock" : "Lock"}
                  >
                    {lockVariety ? (
                      <Lock className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetVariety}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
                    title="Reset"
                    aria-label="Reset variety"
                    disabled={lockVariety || isVarietyDefault}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className={FILTER_WRAPPER_CLASS}>
                <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-xs text-muted-foreground">PUC</span>
                <Select value={puc} onValueChange={(value) => { if (lockPuc) return; setPuc(value) }}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm",
                      lockPuc && LOCKED_SELECT_TRIGGER_CLASS,
                      pucDisabled && !lockPuc && "opacity-60 pointer-events-none"
                    )}
                    aria-label="PUC"
                    aria-disabled={pucDisabled}
                    disabled={pucDisabled}
                  >
                    <SelectValue placeholder={configLoading ? "Loading..." : "Select PUC"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pucOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === allPucsValue ? "All PUCs" : formatLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute -top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={lockPuc}
                    onClick={() => setLockPuc(!lockPuc)}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground"
                    title={lockPuc ? "Unlock" : "Lock"}
                  >
                    {lockPuc ? (
                      <Lock className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetPuc}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
                    title="Reset"
                    aria-label="Reset PUC"
                    disabled={lockPuc || isPucDefault}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className={FILTER_WRAPPER_CLASS}>
                <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-xs text-muted-foreground">Block</span>
                <Select value={block} onValueChange={(value) => { if (lockBlock) return; setBlock(value) }}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm",
                      lockBlock && LOCKED_SELECT_TRIGGER_CLASS,
                      blockDisabled && !lockBlock && "opacity-60 pointer-events-none"
                    )}
                    aria-label="Block"
                    aria-disabled={blockDisabled}
                    disabled={blockDisabled}
                  >
                    <SelectValue placeholder={configLoading ? "Loading..." : "Select block"} />
                  </SelectTrigger>
                  <SelectContent>
                    {blockOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === allBlocksValue ? "All Blocks" : formatBlockLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute -top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={lockBlock}
                    onClick={() => setLockBlock(!lockBlock)}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground"
                    title={lockBlock ? "Unlock" : "Lock"}
                  >
                    {lockBlock ? (
                      <Lock className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetBlock}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
                    title="Reset"
                    aria-label="Reset block"
                    disabled={lockBlock || isBlockDefault}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className={FILTER_WRAPPER_CLASS}>
                <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-xs text-muted-foreground">Season</span>
                <Select value={season} onValueChange={(value) => { if (lockSeason) return; setSeason(value) }}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm",
                      lockSeason && LOCKED_SELECT_TRIGGER_CLASS,
                      seasonDisabled && !lockSeason && "opacity-60 pointer-events-none"
                    )}
                    aria-label="Season"
                    aria-disabled={seasonDisabled}
                    disabled={seasonDisabled}
                  >
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasonOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="absolute -top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={lockSeason}
                    onClick={() => setLockSeason(!lockSeason)}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground"
                    title={lockSeason ? "Unlock" : "Lock"}
                  >
                    {lockSeason ? (
                      <Lock className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetSeason}
                    className="bg-background px-1 rounded text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
                    title="Reset"
                    aria-label="Reset season"
                    disabled={lockSeason || isSeasonDefault}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="capture">Capture</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Data Volumes
                  </CardTitle>
                  <CardDescription>Last synced volumes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tons Imported</p>
                      <p className="text-2xl font-semibold">1,284</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Records Processed</p>
                      <p className="text-2xl font-semibold">74.2k</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Freshness</p>
                      <p className="text-2xl font-semibold">12h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data Coverage</p>
                      <p className="text-2xl font-semibold">92%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Signals
                  </CardTitle>
                  <CardDescription>Cost + revenue feeds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cost Coverage</p>
                      <p className="text-2xl font-semibold">86%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue Signals</p>
                      <p className="text-2xl font-semibold">74%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Forecast Alignment</p>
                      <p className="text-2xl font-semibold text-emerald-600">+12%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Alerts</p>
                      <p className="text-2xl font-semibold">3</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Operational Feeds
                  </CardTitle>
                  <CardDescription>Workflow + QA pipelines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Active Pipelines</p>
                      <p className="text-2xl font-semibold">12</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Health</p>
                      <p className="text-2xl font-semibold text-emerald-600">Good</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">QA Status</p>
                      <p className="text-2xl font-semibold">99.4%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending Actions</p>
                      <p className="text-2xl font-semibold">5</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Key insights and decisions</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sources">Priority Sources</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sap">SAP ERP</SelectItem>
                      <SelectItem value="crm">CRM Sync</SelectItem>
                      <SelectItem value="qa">QA Pipeline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founded">Founded Year</Label>
                  <Input id="founded" type="number" placeholder="e.g. 2020" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Primary Location</Label>
                  <Input id="location" placeholder="City, Country" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team &amp; Operations
                </CardTitle>
                <CardDescription>Workforce and operational details</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="employees">Total Employees</Label>
                  <Input id="employees" type="number" placeholder="Number of employees" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departments">Key Departments</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="challenges">Key Operational Challenges</Label>
                  <Textarea
                    id="challenges"
                    placeholder="Describe your main operational challenges"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Strategic Goals
                </CardTitle>
                <CardDescription>Future objectives and targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="shortTerm">Short-term Goals (6-12 months)</Label>
                  <Textarea
                    id="shortTerm"
                    placeholder="What are your short-term objectives?"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longTerm">Long-term Vision (2-5 years)</Label>
                  <Textarea
                    id="longTerm"
                    placeholder="Describe your long-term vision"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capture" className="space-y-6">
            <div className="px-2 md:px-0">
              {CAPTURE_HELPER_CARD}
              <p className="mt-3 text-xs text-muted-foreground">
                {selectionLabel
                  ? `Current filters: ${selectionLabel}`
                  : "Current filters will appear once loaded."}
              </p>
            </div>

            <div className="grid gap-4 px-2 md:grid-cols-2 xl:grid-cols-3 md:px-0">
              {CAPTURE_SECTIONS.map((section) => (
                <Card key={section.title} className="flex h-full flex-col">
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <form className="flex flex-1 flex-col gap-4" onSubmit={preventSubmit}>
                      {section.fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>{field.label}</Label>
                          {field.type === "textarea" ? (
                            <Textarea
                              id={field.id}
                              placeholder={field.placeholder}
                              readOnly
                              className="min-h-[120px] resize-none"
                            />
                          ) : field.type === "select" ? (
                            <Select defaultValue={undefined}>
                              <SelectTrigger id={field.id} disabled>
                                <SelectValue placeholder={field.placeholder} />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options ?? []).map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={field.id}
                              type={field.type ?? "text"}
                              placeholder={field.placeholder}
                              readOnly
                            />
                          )}
                        </div>
                      ))}

                      <Button type="submit" disabled variant="secondary" className="mt-auto">
                        {section.actionLabel ?? "Save placeholder"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>API Connections</CardTitle>
                  <CardDescription>Live integrations overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>Review API keys and authentication health.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Data Warehouse</CardTitle>
                  <CardDescription>Warehouse sync status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>Monitor warehouse loads and replication windows.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Quality Checks</CardTitle>
                  <CardDescription>Automated validations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>Track validation rules and quality guardrails.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
