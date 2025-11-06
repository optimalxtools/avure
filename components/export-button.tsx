"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ExportButtonProps {
  onClick?: () => void
  disabled?: boolean
  isExporting?: boolean
  label?: string
  className?: string
}

export function ExportButton({ onClick, disabled, isExporting, label, className }: ExportButtonProps) {
  return (
    <Button 
      variant="ghost"
      className={cn(
        "bg-transparent hover:bg-transparent text-[hsl(87,9%,23%)] hover:text-[hsl(87,9%,23%)] [&_svg]:size-5 gap-2 h-10 w-10 p-0",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {isExporting ? (
        <>
          {label ? <span>{label}</span> : null}
          <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">Exporting...</span>
        </>
      ) : (
        <>
          {label ? <span>{label}</span> : null}
          <Download className="size-5" />
          <span className="sr-only">Export Report</span>
        </>
      )}
    </Button>
  )
}
