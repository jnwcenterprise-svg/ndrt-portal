"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface NotesEditorProps {
  contractorLeadId: string
  initialNotes: string
}

export function NotesEditor({ contractorLeadId, initialNotes }: NotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const lastSaved = useRef(initialNotes)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timer.current), [])

  function handleBlur() {
    clearTimeout(timer.current)
    // Debounced 500ms after blur, skip if nothing changed
    timer.current = setTimeout(async () => {
      if (notes === lastSaved.current) return
      setState("saving")
      try {
        const res = await fetch(`/api/leads/${contractorLeadId}/notes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        })
        if (!res.ok) throw new Error("save failed")
        lastSaved.current = notes
        setState("saved")
      } catch {
        setState("error")
      }
    }, 500)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="lead-notes">Your Notes</Label>
        {state === "saving" && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
        {state === "saved" && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
        {state === "error" && (
          <span className="text-xs text-red-600">Could not save — try again</span>
        )}
      </div>
      <Textarea
        id="lead-notes"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value)
          setState("idle")
        }}
        onBlur={handleBlur}
        placeholder="Add notes about this lead — site visit findings, owner conversations, scheduling…"
        rows={6}
      />
      <p className="text-xs text-gray-400">
        Notes sync to your NDRT rep automatically when you click away.
      </p>
    </div>
  )
}
