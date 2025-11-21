"use client"

import { useEffect, useMemo, useRef, type ChangeEvent } from "react"

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

  const sliderOptions = useMemo(() => options.slice(0, Math.min(3, options.length)), [options])

  const sliderContainsSelected = useMemo(
    () => (selected ? sliderOptions.some((option) => option.id === selected.id) : false),
    [sliderOptions, selected],
  )

  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!selected || sliderContainsSelected || sliderOptions.length === 0) {
      return
    }

    onChangeRef.current(sliderOptions[0].id)
    // only invoked when current selection falls outside the visible slider range
  }, [selected, sliderContainsSelected, sliderOptions])

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

  const selectedIndex = selected
    ? sliderOptions.findIndex((option) => option.id === selected.id)
    : -1
  const sliderValue = selectedIndex >= 0 ? selectedIndex : 0
  const activeOption = sliderOptions[sliderValue] ?? sliderOptions[0] ?? selected

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextIndex = Number(event.target.value)
    if (Number.isNaN(nextIndex)) return

    const nextOption = sliderOptions[nextIndex]
    if (!nextOption || nextOption.id === selected?.id) {
      return
    }

    onChangeRef.current(nextOption.id)
  }

  const sliderWidth = sliderOptions.length > 1 ? 240 : 160

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div
        className={cn("flex flex-col gap-2", disabled && "pointer-events-none opacity-60")}
        style={{ width: "100%", maxWidth: `${sliderWidth}px` }}
      >
        <div className="relative h-6">
          <input
            type="range"
            role="slider"
            min={0}
            max={Math.max(sliderOptions.length - 1, 0)}
            step={1}
            value={sliderValue}
            onChange={handleSliderChange}
            aria-valuemin={0}
            aria-valuemax={Math.max(sliderOptions.length - 1, 0)}
            aria-valuenow={sliderValue}
            aria-valuetext={activeOption?.label ?? ""}
            disabled={disabled || sliderOptions.length <= 1}
            className="snapshot-slider relative z-10 h-6 w-full cursor-pointer"
          />
          <div className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-muted" />
          <div
            className="pointer-events-none absolute left-0 top-1/2 h-1 rounded-full bg-primary/70 transition-all duration-200"
            style={{
              width:
                sliderOptions.length <= 1
                  ? "100%"
                  : `${(sliderValue / Math.max(sliderOptions.length - 1, 1)) * 100}%`,
              transform: "translateY(-50%)",
            }}
          />
          {sliderOptions.map((option, index) => {
            const position = sliderOptions.length <= 1 ? 0 : (index / Math.max(sliderOptions.length - 1, 1)) * 100
            const isActive = index === sliderValue
            return (
              <span
                key={option.id}
                className={cn(
                  "pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border",
                  isActive ? "border-primary bg-primary" : "border-border bg-background",
                )}
                style={{ left: `${position}%` }}
              />
            )
          })}
        </div>
        <div className="flex justify-between">
          {sliderOptions.map((option, index) => {
            const isActive = index === sliderValue
            return (
              <span
                key={option.id}
                className={cn(
                  "text-[0.55rem] tracking-wide",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground",
                )}
              >
                {option.dateLabel ?? ""}
              </span>
            )
          })}
        </div>
      </div>
      <style jsx>{`
        .snapshot-slider {
          appearance: none;
          width: 100%;
          background: transparent;
        }

        .snapshot-slider:focus-visible {
          outline: none;
        }

        .snapshot-slider::-webkit-slider-runnable-track {
          height: 4px;
          background: transparent;
        }

        .snapshot-slider::-webkit-slider-thumb {
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: hsl(var(--primary));
          border: 2px solid hsl(var(--background));
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
          cursor: pointer;
          margin-top: -7px;
        }

        .snapshot-slider:disabled::-webkit-slider-thumb {
          background: hsl(var(--muted));
          cursor: not-allowed;
        }

        .snapshot-slider::-moz-range-track {
          height: 4px;
          background: transparent;
        }

        .snapshot-slider::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: hsl(var(--primary));
          border: 2px solid hsl(var(--background));
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
          cursor: pointer;
        }

        .snapshot-slider:disabled::-moz-range-thumb {
          background: hsl(var(--muted));
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
