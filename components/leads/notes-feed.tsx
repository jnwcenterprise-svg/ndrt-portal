"use client"

import { useEffect, useRef, useState } from "react"
import { Send, Loader2, MessageSquare } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface LeadNote {
  id: string
  source: "contractor" | "monday" | "ndrt"
  author: string | null
  content: string
  created_at: string
}

interface NotesFeedProps {
  contractorLeadId: string
  initialNotes: LeadNote[]
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}

const SOURCE_STYLES: Record<string, { dot: string; label: string }> = {
  contractor: { dot: "bg-blue-400", label: "You" },
  monday:     { dot: "bg-amber-400", label: "NDRT" },
  ndrt:       { dot: "bg-emerald-400", label: "NDRT" },
}

export function NotesFeed({ contractorLeadId, initialNotes }: NotesFeedProps) {
  const [notes, setNotes] = useState<LeadNote[]>(initialNotes)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [notes])

  async function submit() {
    const content = draft.trim()
    if (!content || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${contractorLeadId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to save")
      setNotes((prev) => [...prev, json.note as LeadNote])
      setDraft("")
    } catch (err: any) {
      setError(err.message ?? "Could not save — try again")
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <MessageSquare className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">No notes yet. Add your first note below.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {notes.map((note) => {
            const style = SOURCE_STYLES[note.source] ?? SOURCE_STYLES.ndrt
            return (
              <div key={note.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className="text-xs font-semibold text-gray-700">
                    {note.author ?? style.label}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{formatTs(note.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{note.content}</p>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note… (Cmd+Enter to send)"
          rows={3}
          disabled={saving}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Notes are visible to your NDRT rep.</p>
          <Button
            size="sm"
            onClick={submit}
            disabled={!draft.trim() || saving}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
