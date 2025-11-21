"use client"

import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SnapshotToggleOption = {
  id: string
  label: string
  dateLabel?: string
}

interface SnapshotToggleProps {
  options: SnapshotToggleOption[]
  value: string
  onChange: (nextId: string) => void
  disabled?: boolean
}

export function SnapshotToggle({ options, value, onChange, disabled = false }: SnapshotToggleProps) {
  const selected = useMemo(() => {
    if (options.length === 0) return null
    return options.find((option) => option.id === value) ?? options[0]
  }, [options, value])

  const toggleOptions = useMemo(() => {
    const preferred = options.slice(0, Math.min(2, options.length))

    if (!selected) {
      return preferred
    }

    if (preferred.some((option) => option.id === selected.id)) {
      return preferred
    }

    return [selected, ...preferred.filter((option) => option.id !== selected.id)].slice(0, 2)
  }, [options, selected])

  if (!selected) {
    return null
  }

  if (options.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        {selected.dateLabel ? (
          <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            {selected.dateLabel}
          </span>
        ) : null}
        <div className="rounded-md border bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground">
          {selected.label}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {selected.dateLabel ? (
        <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          {selected.dateLabel}
        </span>
      ) : null}
      <div
        role="radiogroup"
        aria-label="Select snapshot"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border bg-background p-1",
          disabled && "pointer-events-none opacity-70",
        )}
      >
  {toggleOptions.map((option) => {
          const isActive = option.id === selected.id

          const handleSelect = () => {
            if (disabled || isActive) return
            onChange(option.id)
          }

          return (
            <Button
              key={option.id}
              type="button"
              variant="ghost"
              size="sm"
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              onClick={handleSelect}
              className={cn(
                "h-8 min-w-[88px] justify-center whitespace-nowrap px-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-sm font-medium leading-none">{option.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
