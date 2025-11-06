"use client"

import { useState, useCallback } from 'react'
import { PDFExporter, type ReportMetadata, type ChartData, type TableData, type ReportSection } from '@/lib/pdf-export'

interface ExportOptions {
  metadata: ReportMetadata
  sections?: ReportSection[]
  charts?: ChartData[]
  tables?: TableData[]
  keyMetrics?: { label: string; value: string | number; change?: string }[]
}

export function usePDFExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportReport = useCallback(async (options: ExportOptions) => {
    setIsExporting(true)
    setError(null)

    try {
      const exporter = new PDFExporter(options.metadata)

      // Add header with logo, company, module, page, and filters
      await exporter.addReportHeader()

      // Add charts only
      if (options.charts && options.charts.length > 0) {
        for (const chart of options.charts) {
          await exporter.addChart(chart)
        }
      }

      // Add tables if provided
      if (options.tables && options.tables.length > 0) {
        for (const table of options.tables) {
          exporter.addTable(table)
        }
      }

      // Save the PDF (no headers/footers for simple export)
      await exporter.save(undefined, false)

      setIsExporting(false)
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF'
      setError(errorMessage)
      setIsExporting(false)
      console.error('PDF Export Error:', err)
      return { success: false, error: errorMessage }
    }
  }, [])

  return {
    exportReport,
    isExporting,
    error,
  }
}
