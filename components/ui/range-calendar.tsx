"use client"

import * as React from "react"

type Range = { start?: Date; end?: Date }

function sameDay(a?: Date, b?: Date) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function inRange(d: Date, start?: Date, end?: Date) {
  if (!start || !end) return false
  const t = d.setHours(0, 0, 0, 0)
  const s = start.setHours(0, 0, 0, 0)
  const e = end.setHours(0, 0, 0, 0)
  return t > s && t < e
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function RangeCalendar({ value, onChange, limitYear }: { value: Range; onChange: (r: Range) => void; limitYear?: number }) {
  const today = React.useMemo(() => new Date(), [])
  const initialMonth = value.start ?? today
  const [viewYear, setViewYear] = React.useState(limitYear ?? initialMonth.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(initialMonth.getMonth()) // 0-11

  const start = value.start ? new Date(value.start) : undefined
  const end = value.end ? new Date(value.end) : undefined

  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const startWeekday = firstOfMonth.getDay() // 0=Sun
  const count = daysInMonth(viewYear, viewMonth)
  const days: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) days.push(null)
  for (let d = 1; d <= count; d++) days.push(new Date(viewYear, viewMonth, d))

  const goPrev = () => {
    const nm = new Date(viewYear, viewMonth - 1, 1)
    const y = nm.getFullYear()
    if (limitYear !== undefined && y < limitYear) {
      setViewYear(limitYear)
      setViewMonth(0) // January
    } else {
      setViewYear(y)
      setViewMonth(nm.getMonth())
    }
  }
  const goNext = () => {
    const nm = new Date(viewYear, viewMonth + 1, 1)
    const y = nm.getFullYear()
    if (limitYear !== undefined && y > limitYear) {
      setViewYear(limitYear)
      setViewMonth(11) // December
    } else {
      setViewYear(y)
      setViewMonth(nm.getMonth())
    }
  }

  const onSelect = (d: Date) => {
    if (!start || (start && end)) {
      onChange({ start: d, end: undefined })
    } else {
      // selecting end
      if (d < start) {
        onChange({ start: d, end: start })
      } else if (sameDay(d, start)) {
        onChange({ start: d, end: d })
      } else {
        onChange({ start, end: d })
      }
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, { month: "long", year: "numeric" })

  // Jump to end date (or start) when selection is updated externally
  React.useEffect(() => {
    if (end) {
      const y = end.getFullYear()
      const m = end.getMonth()
      const clampedY = limitYear !== undefined ? limitYear : y
      setViewYear(clampedY)
      setViewMonth(m)
    } else if (start) {
      const y = start.getFullYear()
      const m = start.getMonth()
      const clampedY = limitYear !== undefined ? limitYear : y
      setViewYear(clampedY)
      setViewMonth(m)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.getTime(), end?.getTime(), limitYear])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="px-2 py-1 text-sm rounded border hover:bg-accent" onClick={goPrev}>
          ‹
        </button>
        <div className="text-sm font-medium">{monthLabel}</div>
        <button type="button" className="px-2 py-1 text-sm rounded border hover:bg-accent" onClick={goNext}>
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, idx) => {
          if (!d) return <div key={idx} />
          const isStart = start && sameDay(d, start)
          const isEnd = end && sameDay(d, end)
          const isIn = inRange(d, start, end)
          const isSelected = isStart || isEnd || isIn
          return (
            <button
              key={idx}
              type="button"
              className={
                "h-8 rounded text-sm transition-colors " +
                (isSelected
                  ? (isStart || isEnd)
                    ? "bg-sidebar text-sidebar-foreground"
                    : "bg-sidebar/20"
                  : "hover:bg-sidebar/10")
              }
              onClick={() => onSelect(d)}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
