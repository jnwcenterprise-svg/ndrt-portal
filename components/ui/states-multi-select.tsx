"use client"

import { US_STATES } from "@/lib/config"
import { cn } from "@/lib/utils"

interface StatesMultiSelectProps {
  value: string[]
  onChange: (states: string[]) => void
}

export function StatesMultiSelect({ value, onChange }: StatesMultiSelectProps) {
  function toggle(state: string) {
    onChange(
      value.includes(state) ? value.filter((s) => s !== state) : [...value, state]
    )
  }

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
      {US_STATES.map((state) => {
        const selected = value.includes(state)
        return (
          <button
            key={state}
            type="button"
            onClick={() => toggle(state)}
            aria-pressed={selected}
            className={cn(
              "rounded-md border px-1 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "border-gold bg-gold text-navy"
                : "border-gray-200 bg-white text-gray-600 hover:border-gold hover:text-navy"
            )}
          >
            {state}
          </button>
        )
      })}
    </div>
  )
}
