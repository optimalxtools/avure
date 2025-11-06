export type PackingProgressMetric = {
  key: string
  label: string
  value: number
}

export type DistributorSpreadTotal = {
  distributor: string
  spread: string
  value: number
}

export type PackhouseRecord = {
  variety: string
  season: string
  block: string
  date: string
  timestamp: number
  tonsTipped: number
  ctnWeight: number
  binsTipped: number
  classI: number
  classII: number
  classIII: number
  packPercentage: number
  packingProgress: PackingProgressMetric[]
  puc?: string
  distributorSpreads?: DistributorSpreadTotal[]
}
