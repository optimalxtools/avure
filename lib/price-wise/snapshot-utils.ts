import type {
  PriceWiseComparisonMetricView,
  PriceWisePricingMetricView,
  PriceWiseRoomInventoryMetricView,
  PriceWiseSnapshot,
  PriceWiseSnapshotView,
  PriceWiseOccupancyMetricView,
} from "./types"

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
})

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
})

type SnapshotLabel = {
  dateLabel: string
  fullLabel: string
}

const UNKNOWN_LABEL: SnapshotLabel = {
  dateLabel: "Date unavailable",
  fullLabel: "Date unavailable",
}

function normalizeDateLabel(value: string | null): SnapshotLabel {
  if (!value) return UNKNOWN_LABEL
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return UNKNOWN_LABEL
  const dateLabel = dateFormatter.format(date)
  const timeLabel = timeFormatter.format(date)
  return {
    dateLabel,
    fullLabel: `${dateLabel} • ${timeLabel}`,
  }
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toNumberOrZero(value: unknown): number {
  return toNullableNumber(value) ?? 0
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "true" || normalized === "1" || normalized === "yes"
  }
  if (typeof value === "number") {
    return value !== 0
  }
  return false
}

function field(record: Record<string, unknown>, key: string): unknown {
  return record[key]
}

function sanitizePricingMetrics(raw: Array<Record<string, unknown>> | undefined): PriceWisePricingMetricView[] {
  return (raw ?? [])
    .map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>
      const hotelName = toStringValue(field(record, "hotel_name"))
      if (!hotelName) return undefined

      return {
        hotel_name: hotelName,
        avg_price_per_night: toNumberOrZero(field(record, "avg_price_per_night")),
        min_price: toNumberOrZero(field(record, "min_price")),
        max_price: toNumberOrZero(field(record, "max_price")),
        discount_frequency: toNumberOrZero(field(record, "discount_frequency")),
        preferred_price_per_night: toNullableNumber(field(record, "preferred_price_per_night")),
        preferred_price_source: toStringValue(field(record, "preferred_price_source")) || null,
        preferred_price_range: toNullableNumber(field(record, "preferred_price_range")),
        avg_min_room_price: toNullableNumber(field(record, "avg_min_room_price")),
        avg_max_room_price: toNullableNumber(field(record, "avg_max_room_price")),
        property_avg_price_per_night: toNullableNumber(field(record, "property_avg_price_per_night")),
        property_min_price: toNullableNumber(field(record, "property_min_price")),
        property_max_price: toNullableNumber(field(record, "property_max_price")),
        avg_room_price_avg: toNullableNumber(field(record, "avg_room_price_avg")),
        room_type_count_estimate: toNullableNumber(field(record, "room_type_count_estimate")),
      }
    })
    .filter((entry): entry is PriceWisePricingMetricView => Boolean(entry))
}

function sanitizeOccupancyMetrics(raw: Array<Record<string, unknown>> | undefined): PriceWiseOccupancyMetricView[] {
  return (raw ?? [])
    .map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>
      const hotelName = toStringValue(field(record, "hotel_name"))
      if (!hotelName) return undefined

      return {
        hotel_name: hotelName,
        occupancy_rate: toNumberOrZero(field(record, "occupancy_rate")),
        preferred_occupancy_rate: toNullableNumber(field(record, "preferred_occupancy_rate")),
        preferred_occupancy_source: toStringValue(field(record, "preferred_occupancy_source")) || null,
        property_occupancy_rate: toNullableNumber(field(record, "property_occupancy_rate")),
        avg_room_occupancy_rate: toNullableNumber(field(record, "avg_room_occupancy_rate")),
        sold_out: toNumberOrZero(field(record, "sold_out")),
        available: toNumberOrZero(field(record, "available")),
        room_type_count_estimate: toNullableNumber(field(record, "room_type_count_estimate")),
      }
    })
    .filter((entry): entry is PriceWiseOccupancyMetricView => Boolean(entry))
}

function sanitizeRoomInventoryMetrics(raw: Array<Record<string, unknown>> | undefined): PriceWiseRoomInventoryMetricView[] {
  return (raw ?? [])
    .map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>
      const hotelName = toStringValue(field(record, "hotel_name"))
      if (!hotelName) return undefined

      return {
        hotel_name: hotelName,
        avg_room_occupancy_rate: toNullableNumber(field(record, "avg_room_occupancy_rate")),
        avg_total_room_types: toNullableNumber(field(record, "avg_total_room_types")),
        avg_available_room_types: toNullableNumber(field(record, "avg_available_room_types")),
        avg_sold_out_room_types: toNullableNumber(field(record, "avg_sold_out_room_types")),
        room_type_count_estimate: toNullableNumber(field(record, "room_type_count_estimate")),
        avg_room_price: toNullableNumber(field(record, "avg_room_price")),
        avg_room_price_avg: toNullableNumber(field(record, "avg_room_price_avg")),
        room_price_spread: toNullableNumber(field(record, "room_price_spread")),
        room_price_spread_pct: toNullableNumber(field(record, "room_price_spread_pct")),
        uses_room_tiering: toBoolean(field(record, "uses_room_tiering")),
      }
    })
    .filter((entry): entry is PriceWiseRoomInventoryMetricView => Boolean(entry))
}

function sanitizeComparisonMetrics(raw: Array<Record<string, unknown>> | undefined): PriceWiseComparisonMetricView[] {
  return (raw ?? [])
    .map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>
      const hotelName = toStringValue(field(record, "hotel_name"))
      if (!hotelName) return undefined

      return {
        hotel_name: hotelName,
        avg_price: toNumberOrZero(field(record, "avg_price")),
        price_vs_ref: toNumberOrZero(field(record, "price_vs_ref")),
        price_vs_ref_pct: toNumberOrZero(field(record, "price_vs_ref_pct")),
        occupancy: toNumberOrZero(field(record, "occupancy")),
        position: toStringValue(field(record, "position")) || "",
      }
    })
    .filter((entry): entry is PriceWiseComparisonMetricView => Boolean(entry))
}

export function buildSnapshotViews(
  rawSnapshots: PriceWiseSnapshot[],
  labels: string[] = [],
): PriceWiseSnapshotView[] {
  return rawSnapshots.map((snapshot, index) => {
    const label = labels[index] ?? `Snapshot ${index + 1}`
    const { dateLabel, fullLabel } = normalizeDateLabel(snapshot.generatedAt)

    const pricingMetrics = sanitizePricingMetrics(snapshot.analysis.pricing_metrics as Array<Record<string, unknown>> | undefined)
    const occupancyMetrics = sanitizeOccupancyMetrics(snapshot.analysis.occupancy_metrics as Array<Record<string, unknown>> | undefined)
    const roomInventoryMetrics = sanitizeRoomInventoryMetrics(snapshot.analysis.room_inventory as Array<Record<string, unknown>> | undefined)
    const comparisonMetrics = sanitizeComparisonMetrics(snapshot.analysis.comparison as Array<Record<string, unknown>> | undefined)

    return {
      id: snapshot.id,
      source: snapshot.source,
      generatedAt: snapshot.generatedAt,
      label,
      dateLabel,
      fullLabel,
      referenceProperty: snapshot.analysis.reference_property || "",
      pricingMetrics,
      occupancyMetrics,
      roomInventoryMetrics,
      comparisonMetrics,
      dailyData: snapshot.dailyData,
    }
  })
}
