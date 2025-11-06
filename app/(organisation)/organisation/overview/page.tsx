"use client"

import * as React from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/components/section-title"
import { ExportButton } from "@/components/export-button"
import { AIButton } from "@/components/ai-button"

import { cn } from "@/lib/utils"
import { ConfigurationMap, type ConfigurationMapPolygon } from "@/components/configuration-map"
import { useClientDatasetPaths } from "@/lib/hooks/useClientDatasetPaths"

type LatLngTuple = [number, number]

type ConfigRecord = {
  id: number
  variety: string
  puc: string
  block: string
  area: number
  description?: string
  geometry?: string
}

type PucGroup = {
  puc: string
  varieties: string[]
  blocks: ConfigRecord[]
  totalArea: number
}

type SwatchStyle = {
  button: string
  map: {
    fill: string
    stroke: string
    fillActive?: string
    strokeActive?: string
  }
}

const DEFAULT_SWATCH: SwatchStyle = {
  button:
    "bg-secondary text-secondary-foreground border-secondary/50 hover:bg-secondary/80",
  map: {
    fill: "#f4f4f5",
    stroke: "#a1a1aa",
    fillActive: "#e4e4e7",
    strokeActive: "#4b5563",
  },
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\""
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function parseWktPolygon(wkt: string | undefined | null) {
  if (!wkt) return [] as LatLngTuple[][]

  const trimmed = wkt.trim()
  if (!trimmed) return [] as LatLngTuple[][]

  const match = trimmed.match(/POLYGON\s*\(\((.+)\)\)/i)
  if (!match) return [] as LatLngTuple[][]

  const rings = match[1].split(/\)\s*,\s*\(/)

  return rings
    .map((ring) =>
      ring
        .split(/\s*,\s*/)
        .map((pair) => {
          const [lng, lat] = pair.trim().split(/\s+/)
          const latitude = Number.parseFloat(lat ?? "")
          const longitude = Number.parseFloat(lng ?? "")

          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return [latitude, longitude] as LatLngTuple
          }
          return null
        })
        .filter((coords): coords is LatLngTuple => Array.isArray(coords))
    )
    .filter((ring) => ring.length > 0)
}

function useMasterConfigData() {
  const { masterConfigPath } = useClientDatasetPaths()
  const [records, setRecords] = React.useState<ConfigRecord[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true

    if (!masterConfigPath) {
      setRecords([])
      setError(null)
      setLoading(false)
      return () => {
        active = false
      }
    }

    setRecords([])
    setError(null)
    setLoading(true)

    fetch(masterConfigPath, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          if (!active) return
          setRecords([])
          setError("No master configuration file configured for this client.")
          setLoading(false)
          return
        }
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
        const text = (await response.text()).replace(/^\ufeff/, "")
        if (!active) return

        const [header, ...rows] = text.trim().split(/\r?\n/)
        if (!header || rows.length === 0) {
          setRecords([])
          setLoading(false)
          return
        }

        const parsed: ConfigRecord[] = rows
          .map((line) => parseCsvLine(line))
          .filter((cols) => cols.length >= 5)
          .map(([id, variety, puc, block, area, description = "", geometry = ""]) => ({
            id: Number.parseInt(id, 10),
            variety: variety?.trim() ?? "",
            puc: puc?.trim() ?? "",
            block: block?.trim() ?? "",
            area: Number.parseFloat(area ?? "0") || 0,
            description: description?.trim() ?? "",
            geometry: geometry?.trim() ?? "",
          }))
        setRecords(parsed)
        setLoading(false)
        })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : "Unknown error")
        setRecords([])
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [masterConfigPath])

  const pucGroups = React.useMemo<PucGroup[]>(() => {
    const byPuc = new Map<string, { varieties: Set<string>; blocks: ConfigRecord[]; totalArea: number }>()

    for (const record of records) {
      const key = record.puc || "Unknown"
      const entry = byPuc.get(key) ?? {
        varieties: new Set<string>(),
        blocks: [] as ConfigRecord[],
        totalArea: 0,
      }

      entry.blocks.push(record)
      entry.totalArea += record.area
      if (record.variety) {
        entry.varieties.add(record.variety)
      }

      byPuc.set(key, entry)
    }

    return Array.from(byPuc.entries())
      .map(([puc, value]) => ({
        puc,
        varieties: Array.from(value.varieties).sort((a, b) => a.localeCompare(b)),
        blocks: value.blocks.sort((a, b) => a.block.localeCompare(b.block)),
        totalArea: value.totalArea,
      }))
      .sort((a, b) => a.puc.localeCompare(b.puc))
  }, [records])

  return { pucGroups, loading, error }
}

export default function Page() {
  const { pucGroups, loading, error } = useMasterConfigData()
  const [selectedPuc, setSelectedPuc] = React.useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!selectedPuc && pucGroups.length > 0) {
      setSelectedPuc(pucGroups[0].puc)
    }
  }, [pucGroups, selectedPuc])

  const activePuc = React.useMemo(() => {
    if (!selectedPuc) return null
    return pucGroups.find((group) => group.puc === selectedPuc) ?? null
  }, [pucGroups, selectedPuc])

  React.useEffect(() => {
    if (!activePuc) {
      setSelectedBlockId(null)
      return
    }

    if (!activePuc.blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(null)
    }
  }, [activePuc, selectedBlockId])

  const activeBlock = React.useMemo(() => {
    if (!activePuc || selectedBlockId === null) return null
    return activePuc.blocks.find((block) => block.id === selectedBlockId) ?? null
  }, [activePuc, selectedBlockId])

  const blocksByVariety = React.useMemo(() => {
    if (!activePuc) return [] as { variety: string; blocks: ConfigRecord[] }[]

    const varietyMap = new Map<string, ConfigRecord[]>()

    for (const block of activePuc.blocks) {
      const key = block.variety?.trim() || "Unspecified"
      const list = varietyMap.get(key) ?? []
      list.push(block)
      varietyMap.set(key, list)
    }

    return Array.from(varietyMap.entries())
      .map(([variety, blocks]) => ({
        variety,
        blocks: blocks.sort((a, b) => a.block.localeCompare(b.block)),
      }))
      .sort((a, b) => a.variety.localeCompare(b.variety))
  }, [activePuc])

  const varietySwatches = React.useMemo(() => {
    if (!activePuc) return new Map<string, SwatchStyle>()

    const palette: SwatchStyle[] = [
      {
        button: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
        map: {
          fill: "#ecfdf5",
          stroke: "#34d399",
          fillActive: "#a7f3d0",
          strokeActive: "#047857",
        },
      },
      {
        button: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
        map: {
          fill: "#f0f9ff",
          stroke: "#38bdf8",
          fillActive: "#bae6fd",
          strokeActive: "#0369a1",
        },
      },
      {
        button: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        map: {
          fill: "#fffbeb",
          stroke: "#fbbf24",
          fillActive: "#fde68a",
          strokeActive: "#b45309",
        },
      },
      {
        button: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
        map: {
          fill: "#fff1f2",
          stroke: "#fb7185",
          fillActive: "#fecdd3",
          strokeActive: "#be123c",
        },
      },
      {
        button: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
        map: {
          fill: "#f5f3ff",
          stroke: "#a855f7",
          fillActive: "#ddd6fe",
          strokeActive: "#5b21b6",
        },
      },
      {
        button: "bg-lime-50 text-lime-700 border-lime-200 hover:bg-lime-100",
        map: {
          fill: "#f7fee7",
          stroke: "#a3e635",
          fillActive: "#d9f99d",
          strokeActive: "#4d7c0f",
        },
      },
      {
        button: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
        map: {
          fill: "#ecfeff",
          stroke: "#22d3ee",
          fillActive: "#a5f3fc",
          strokeActive: "#0e7490",
        },
      },
    ]

    const uniqueVarieties = Array.from(
      new Set(activePuc.blocks.map((block) => block.variety?.trim() || "Unspecified"))
    ).sort((a, b) => a.localeCompare(b))

    const swatchMap = uniqueVarieties.reduce((acc, variety, index) => {
      const swatch = palette[index % palette.length] ?? DEFAULT_SWATCH
      acc.set(variety, swatch)
      return acc
    }, new Map<string, SwatchStyle>())

    if (!swatchMap.has("Unspecified")) {
      swatchMap.set("Unspecified", DEFAULT_SWATCH)
    }

    return swatchMap
  }, [activePuc])

  const mapPolygons = React.useMemo<ConfigurationMapPolygon[]>(() => {
    if (!activePuc) return []

    return activePuc.blocks
      .map((block) => ({
        id: block.id,
        label: block.block || `Block ${block.id}`,
        coordinates: parseWktPolygon(block.geometry),
        isActive: activeBlock?.id === block.id,
        style:
          (varietySwatches.get(block.variety?.trim() || "Unspecified") ?? DEFAULT_SWATCH)
            .map,
      }))
      .filter((item) => item.coordinates.length > 0)
  }, [activeBlock, activePuc, varietySwatches])

  const mapKey = React.useMemo(() => {
    if (activeBlock) return `block-${activeBlock.id}`
    if (activePuc) return `puc-${activePuc.puc}`
    return "map"
  }, [activeBlock, activePuc])

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
          <div className="flex items-center gap-2">
            <AIButton currentPage="Organisation - Overview" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-1 pb-4 md:px-4" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <span className="text-muted-foreground">Organisation</span>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Overview
            </h1>
            <ExportButton />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <Card className="lg:basis-2/4">
              <CardHeader className="pb-4">
                <CardTitle>Entity Overview</CardTitle>
                <CardDescription>Select a PUC to explore its blocks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </>
                ) : error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    Failed to load configuration data: {error}
                  </div>
                ) : pucGroups.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No configuration data available yet.</div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {pucGroups.map((group) => (
                        <Button
                          key={group.puc}
                          variant={group.puc === activePuc?.puc ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedPuc(group.puc)
                            setSelectedBlockId(null)
                          }}
                        >
                          {group.puc || "Unknown"}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm font-medium text-muted-foreground">
                          {activePuc
                            ? `${activePuc.blocks.length} block${activePuc.blocks.length === 1 ? "" : "s"} in ${activePuc.puc}`
                            : "Select a PUC to view its blocks."}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {blocksByVariety.map(({ variety, blocks }) => {
                          const swatch =
                            varietySwatches.get(variety) ?? DEFAULT_SWATCH

                          return (
                            <div key={variety} className="space-y-2">
                              <div className="text-sm font-semibold text-muted-foreground">{variety}</div>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-10">
                                {blocks.map((block) => (
                                  <div key={block.id} className="space-y-1">
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "h-10 w-full min-h-0 truncate rounded-md px-2 text-sm font-medium leading-tight text-center transition-all",
                                        activeBlock?.id === block.id
                                          ? "border-0 bg-black text-white hover:bg-black focus-visible:bg-black focus-visible:text-white"
                                          : swatch.button
                                      )}
                                      onClick={() =>
                                        setSelectedBlockId((prev) =>
                                          prev === block.id ? null : block.id
                                        )
                                      }
                                    >
                                      {block.block || "Block"}
                                    </Button>
                                    {activeBlock?.id === block.id && (
                                      <Card className="md:hidden">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-lg">Details</CardTitle>
                                          <CardDescription className="text-base text-muted-foreground">
                                            Block specific information
                                          </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-base leading-relaxed">
                                          <div>
                                            <span className="font-semibold text-foreground">Block:</span> {activeBlock.block || "Unknown"}
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">PUC:</span> {activeBlock.puc || "Unknown"}
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Variety:</span> {activeBlock.variety || "Unknown"}
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Area:</span> {activeBlock.area.toFixed(2)} ha
                                          </div>
                                          {activeBlock.description && (
                                            <div>
                                              <span className="font-semibold text-foreground">Description:</span>
                                              <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
                                                {activeBlock.description}
                                              </div>
                                            </div>
                                          )}
                                          {mapPolygons.length > 0 ? (
                                            <ConfigurationMap
                                              key={`${mapKey}-mobile`}
                                              polygons={mapPolygons}
                                            />
                                          ) : (
                                            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                                              No spatial geometry available for this selection.
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}

                        {!activePuc && (
                          <div className="rounded-md border p-4 text-sm text-muted-foreground">
                            Pick a PUC above to see its blocks.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="hidden md:block md:basis-2/5 lg:basis-2/4">
              <CardHeader className="pb-2">
                <CardTitle>Details</CardTitle>
                <CardDescription className="text-base sm:text-sm">
                  {loading
                    ? "Fetching configuration data"
                    : error
                    ? "Unable to load details"
                    : activeBlock
                    ? "Block specific information"
                    : activePuc
                    ? "PUC overview"
                    : "Select a PUC to begin"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-base leading-relaxed sm:text-sm sm:leading-6">
                {loading ? (
                  <>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </>
                ) : error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    Failed to load configuration data: {error}
                  </div>
                ) : activeBlock ? (
                  <div className="space-y-4">
                    <dl className="space-y-4 text-sm sm:text-base">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid grid-cols-[minmax(0,100px)_1fr] gap-x-2">
                          <dt className="font-semibold text-muted-foreground">Block</dt>
                          <dd className="text-foreground">{activeBlock.block || "Unknown"}</dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,100px)_1fr] gap-x-2">
                          <dt className="font-semibold text-muted-foreground">PUC</dt>
                          <dd className="text-foreground">{activeBlock.puc || "Unknown"}</dd>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid grid-cols-[minmax(0,100px)_1fr] gap-x-2">
                          <dt className="font-semibold text-muted-foreground">Variety</dt>
                          <dd className="text-foreground">{activeBlock.variety || "Unknown"}</dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,100px)_1fr] gap-x-2">
                          <dt className="font-semibold text-muted-foreground">Area</dt>
                          <dd className="text-foreground">{activeBlock.area.toFixed(2)} ha</dd>
                        </div>
                      </div>
                      {activeBlock.description && (
                        <div className="grid grid-cols-[minmax(0,100px)_1fr] gap-x-2">
                          <dt className="font-semibold text-muted-foreground">Description</dt>
                          <dd className="whitespace-pre-wrap text-foreground">{activeBlock.description}</dd>
                        </div>
                      )}
                    </dl>
                    {mapPolygons.length > 0 ? (
                      <ConfigurationMap
                        key={`${mapKey}-desktop`}
                        polygons={mapPolygons}
                        className="h-72 w-full rounded-md md:h-96"
                      />
                    ) : (
                      <div className="flex items-center justify-center rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
                        No spatial geometry available for this selection.
                      </div>
                    )}
                  </div>
                ) : activePuc ? (
                  <div className="space-y-4">
                    <dl className="grid grid-cols-[minmax(0,140px)_1fr] gap-x-4 gap-y-2 text-sm sm:text-base">
                      <dt className="font-semibold text-muted-foreground">PUC</dt>
                      <dd className="text-foreground">{activePuc.puc || "Unknown"}</dd>
                      <dt className="font-semibold text-muted-foreground">Blocks</dt>
                      <dd className="text-foreground">{activePuc.blocks.length}</dd>
                      <dt className="font-semibold text-muted-foreground">Total area</dt>
                      <dd className="text-foreground">{activePuc.totalArea.toFixed(2)} ha</dd>
                      {activePuc.varieties.length > 0 && (
                        <>
                          <dt className="font-semibold text-muted-foreground">Varieties</dt>
                          <dd className="text-foreground">{activePuc.varieties.join(", ")}</dd>
                        </>
                      )}
                    </dl>
                    {mapPolygons.length > 0 ? (
                      <ConfigurationMap
                        key={`${mapKey}-puc`}
                        polygons={mapPolygons}
                        className="h-72 w-full rounded-md md:h-96"
                      />
                    ) : (
                      <div className="flex items-center justify-center rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
                        No spatial geometry available for this selection.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border p-4 text-muted-foreground">
                    Choose a PUC to see high level details.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
