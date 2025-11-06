"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type LatLngTuple = [number, number]

interface LeafletBoundsLike {
  isValid: () => boolean
  pad: (bufferRatio: number) => LeafletBoundsLike
}

type LeafletBoundsCandidate = Partial<LeafletBoundsLike> | null

function getValidLeafletBounds(
  bounds: LeafletBoundsCandidate
): LeafletBoundsLike | null {
  if (
    bounds &&
    typeof bounds.isValid === "function" &&
    typeof bounds.pad === "function" &&
    bounds.isValid()
  ) {
    return bounds as LeafletBoundsLike
  }

  return null
}

type LeafletPolygonLayer = {
  bindTooltip: (content: string, options?: Record<string, unknown>) => void
  getBounds: () => LeafletBoundsLike
}

type LeafletLayerGroup = {
  addLayer: (layer: LeafletPolygonLayer) => LeafletLayerGroup
  addTo: (map: LeafletMapInstance) => LeafletLayerGroup
  clearLayers: () => void
  getBounds: () => LeafletBoundsLike
}

type LeafletTileLayer = {
  addTo: (map: LeafletMapInstance) => void
}

type LeafletMapInstance = {
  remove: () => void
  setView: (center: LatLngTuple, zoom: number) => void
  fitBounds: (bounds: LeafletBoundsLike, options?: { padding?: [number, number] }) => void
  removeLayer: (layer: LeafletLayerGroup) => void
}

type LeafletNamespace = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMapInstance
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletTileLayer
  featureGroup: () => LeafletLayerGroup
  polygon: (latLngs: LatLngTuple[][], options?: Record<string, unknown>) => LeafletPolygonLayer
}

type MapPolygonStyle = {
  fill: string
  stroke: string
  fillActive?: string
  strokeActive?: string
}

type MapPolygon = {
  id: number
  label: string
  coordinates: LatLngTuple[][]
  isActive: boolean
  style?: MapPolygonStyle
}

type ConfigurationMapProps = {
  polygons: MapPolygon[]
  className?: string
}

export type { MapPolygon as ConfigurationMapPolygon }

declare global {
  interface Window {
    L?: LeafletNamespace
  }
}

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"

let leafletLoader: Promise<LeafletNamespace> | null = null

function ensureLeafletAssets() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only be loaded in the browser"))
  }

  if (window.L) {
    return Promise.resolve(window.L)
  }

  if (!leafletLoader) {
    leafletLoader = new Promise<LeafletNamespace>((resolve, reject) => {
      if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = LEAFLET_CSS
        document.head.appendChild(link)
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${LEAFLET_JS}"]`
      )

      const handleResolve = () => {
        if (window.L) {
          resolve(window.L)
        } else {
          reject(new Error("Leaflet failed to initialise"))
        }
      }
      const handleReject = () => reject(new Error("Failed to load Leaflet assets"))

      if (existingScript) {
        if (window.L) {
          resolve(window.L)
          return
        }
        existingScript.addEventListener("load", handleResolve, { once: true })
        existingScript.addEventListener("error", handleReject, { once: true })
        return
      }

      const script = document.createElement("script")
      script.src = LEAFLET_JS
      script.async = true
      script.onload = handleResolve
      script.onerror = handleReject
      document.body.appendChild(script)
    })
  }

  return leafletLoader
}

const DEFAULT_POLYGON_STYLE: Required<MapPolygonStyle> = {
  fill: "#f4f4f5",
  stroke: "#a1a1aa",
  fillActive: "#e4e4e7",
  strokeActive: "#4b5563",
}

export function ConfigurationMap({ polygons, className }: ConfigurationMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<LeafletMapInstance | null>(null)
  const layerGroupRef = React.useRef<LeafletLayerGroup | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading"
  )

  React.useEffect(() => {
    let active = true

    ensureLeafletAssets()
      .then((L) => {
        if (!active || !containerRef.current) return

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
          })

          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
              attribution:
                "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
            }
          ).addTo(mapRef.current)

          mapRef.current.setView([0, 0], 2)
        }

        setStatus("ready")
      })
      .catch((error) => {
        console.error(error)
        if (!active) return
        setStatus("error")
      })

    return () => {
      active = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        layerGroupRef.current = null
      }
    }
  }, [])

  React.useEffect(() => {
    if (status !== "ready") return

    let cancelled = false

    ensureLeafletAssets()
      .then((L) => {
        if (cancelled || !mapRef.current) return

        if (layerGroupRef.current) {
          layerGroupRef.current.clearLayers()
          mapRef.current.removeLayer(layerGroupRef.current)
        }

        layerGroupRef.current = L.featureGroup()

        let activeBounds: LeafletBoundsCandidate = null

        polygons.forEach((polygon) => {
          const style = polygon.style ?? DEFAULT_POLYGON_STYLE
          const strokeColor = polygon.isActive
            ? style.strokeActive ?? style.stroke
            : style.stroke
          const fillColor = polygon.isActive
            ? style.fillActive ?? style.fill
            : style.fill

          const latLngs = polygon.coordinates.map((ring) =>
            ring.map(([lat, lng]) => [lat, lng] as LatLngTuple)
          )

          if (latLngs.length === 0) return

          const layer = L.polygon(latLngs, {
            color: strokeColor,
            fillColor,
            weight: polygon.isActive ? 3 : 1.5,
            fillOpacity: polygon.isActive ? 0.35 : 0.22,
            dashArray: polygon.isActive ? undefined : "4 4",
          })

          if (polygon.isActive) {
            activeBounds = layer.getBounds()
          }

          layer.bindTooltip(polygon.label, { sticky: true })
          layerGroupRef.current?.addLayer(layer)
        })

        layerGroupRef.current.addTo(mapRef.current)

        let bounds = layerGroupRef.current.getBounds().pad(0.1)

        const validActiveBounds = getValidLeafletBounds(activeBounds)

        if (validActiveBounds) {
          bounds = validActiveBounds.pad(0.08)
        }

        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds)
        } else if (polygons[0]?.coordinates[0]?.[0]) {
          mapRef.current.setView(polygons[0].coordinates[0][0], 16)
        }
      })
      .catch((error) => {
        console.error(error)
        setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [polygons, status])

  return (
    <div className={cn("relative h-64 w-full overflow-hidden rounded-md border", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
      {status === "error" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-destructive">
          Unable to load the basemap right now.
        </div>
      )}
    </div>
  )
}
