export type PriceWiseConfig = {
  occupancyMode: boolean
  daysAhead: number
  occupancyCheckInterval: number
  checkInOffsets: number[]
  stayDurations: number[]
  guests: number
  rooms: number
  referenceProperty: string
  headless: boolean
  browserTimeout: number
  enableArchiving: boolean
  maxArchiveFiles: number
  showProgress: boolean
  progressInterval: number
  requestDelay: number
  modeName: string
}

export type PriceWiseRunState = {
  status: "idle" | "running"
  startedAt?: string
  runId?: string
  pid?: number
  logFile?: string
  lastEndedAt?: string
  lastExitCode?: number | null
  lastRunId?: string
  errorMessage?: string
}

export type PriceWiseHistoryEntry = {
  timestamp: string
  mode?: string
  scrape_success: boolean
  analysis_success: boolean
  config: {
    mode?: string
    occupancy_mode: boolean
    days_ahead: number
    guests: number
    rooms: number
    reference_property: string
    timestamp: string
  }
}

export type PriceWiseDailyProgress = {
  date: string
  completed_properties: string[]
  last_updated: string
}

export type PriceWiseStatusPayload = {
  runState: PriceWiseRunState
  history: PriceWiseHistoryEntry[]
  config: PriceWiseConfig
  outputs: {
    analysisJson: boolean
    pricingCsv: boolean
  }
  dailyProgress?: PriceWiseDailyProgress
  logTail?: string[]
}

export type PriceWiseAnalysis = {
  generated_at: string
  reference_property: string
  mode: string
  pricing_metrics?: Array<Record<string, number | string | null>>
  occupancy_metrics?: Array<Record<string, number | string | null>>
  comparison?: Array<Record<string, number | string | null>>
  room_inventory?: Array<Record<string, number | string | boolean | null>>
}

export type PriceWiseDailyPricingRecord = {
  hotel_name: string
  check_in_date: string
  availability: string
  total_price: number | null
  day_offset: number
  total_room_types?: number | null
  available_room_types?: number | null
  sold_out_room_types?: number | null
  property_occupancy_rate?: number | null
}

export type PriceWiseSnapshot = {
  id: string
  source: "current" | "archive"
  generatedAt: string | null
  analysis: PriceWiseAnalysis
  dailyData: PriceWiseDailyPricingRecord[]
}

export type PriceWisePricingMetricView = {
  hotel_name: string
  avg_price_per_night: number
  min_price: number
  max_price: number
  discount_frequency: number
  preferred_price_per_night: number | null
  preferred_price_source: string | null
  preferred_price_range: number | null
  avg_min_room_price: number | null
  avg_max_room_price: number | null
  property_avg_price_per_night: number | null
  property_min_price: number | null
  property_max_price: number | null
  avg_room_price_avg: number | null
  room_type_count_estimate: number | null
}

export type PriceWiseOccupancyMetricView = {
  hotel_name: string
  occupancy_rate: number
  preferred_occupancy_rate: number | null
  preferred_occupancy_source: string | null
  property_occupancy_rate: number | null
  avg_room_occupancy_rate: number | null
  sold_out: number
  available: number
  room_type_count_estimate: number | null
}

export type PriceWiseRoomInventoryMetricView = {
  hotel_name: string
  avg_room_occupancy_rate: number | null
  avg_total_room_types: number | null
  avg_available_room_types: number | null
  avg_sold_out_room_types: number | null
  room_type_count_estimate: number | null
  avg_room_price: number | null
  avg_room_price_avg: number | null
  room_price_spread: number | null
  room_price_spread_pct: number | null
  uses_room_tiering: boolean
}

export type PriceWiseComparisonMetricView = {
  hotel_name: string
  avg_price: number
  price_vs_ref: number
  price_vs_ref_pct: number
  occupancy: number
  position: string
}

export type PriceWiseSnapshotView = {
  id: string
  source: "current" | "archive"
  generatedAt: string | null
  label: string
  dateLabel: string
  fullLabel: string
  referenceProperty: string
  pricingMetrics: PriceWisePricingMetricView[]
  occupancyMetrics: PriceWiseOccupancyMetricView[]
  roomInventoryMetrics: PriceWiseRoomInventoryMetricView[]
  comparisonMetrics: PriceWiseComparisonMetricView[]
  dailyData: PriceWiseDailyPricingRecord[]
}
