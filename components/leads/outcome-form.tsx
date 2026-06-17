"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Loader2, ThumbsUp, ThumbsDown, AlertTriangle, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface OutcomeFormProps {
  contractorLeadId: string
  initialOutcome?: {
    lead_quality: string | null
    damage_found: boolean | null
    outcome_notes: string | null
    outcome_submitted_at: string | null
    outcome_status?: string | null
    outcome_reviewed_by?: string | null
    outcome_review_notes?: string | null
  }
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  activeClass,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  activeClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
        active
          ? `${activeClass} shadow-sm`
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export function OutcomeForm({ contractorLeadId, initialOutcome }: OutcomeFormProps) {
  const already = !!initialOutcome?.outcome_submitted_at

  const [leadQuality, setLeadQuality] = useState<"good" | "bad" | null>(
    (initialOutcome?.lead_quality as "good" | "bad" | null) ?? null
  )
  const [damageFound, setDamageFound] = useState<boolean | null>(
    initialOutcome?.damage_found ?? null
  )
  const [notes, setNotes] = useState(initialOutcome?.outcome_notes ?? "")
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(already)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${contractorLeadId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_quality: leadQuality, damage_found: damageFound, outcome_notes: notes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to submit")
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message ?? "Could not submit — try again")
    } finally {
      setSaving(false)
    }
  }

  if (submitted && !saving) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCheck className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">Outcome submitted — thank you!</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {leadQuality && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Lead Quality</p>
              <p className={`mt-1 text-sm font-semibold ${leadQuality === "good" ? "text-emerald-700" : "text-red-600"}`}>
                {leadQuality === "good" ? "✅ Good Lead" : "❌ Bad Lead"}
              </p>
            </div>
          )}
          {damageFound !== null && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Damage Found</p>
              <p className={`mt-1 text-sm font-semibold ${damageFound ? "text-emerald-700" : "text-red-600"}`}>
                {damageFound ? "✅ Yes" : "❌ No"}
              </p>
            </div>
          )}
        </div>
        {notes && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{notes}</p>
          </div>
        )}
        {/* NDRT review decision */}
        {initialOutcome?.outcome_status === "approved" && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              ✅ NDRT Approved{initialOutcome.outcome_reviewed_by ? ` — ${initialOutcome.outcome_reviewed_by}` : ""}
            </p>
            {initialOutcome.outcome_review_notes && (
              <p className="mt-1 text-sm text-emerald-700">{initialOutcome.outcome_review_notes}</p>
            )}
          </div>
        )}
        {initialOutcome?.outcome_status === "disputed" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              ⚠️ NDRT Disputed{initialOutcome.outcome_reviewed_by ? ` — ${initialOutcome.outcome_reviewed_by}` : ""}
            </p>
            {initialOutcome.outcome_review_notes && (
              <p className="mt-1 text-sm text-amber-700">{initialOutcome.outcome_review_notes}</p>
            )}
          </div>
        )}
        {(!initialOutcome?.outcome_status || initialOutcome.outcome_status === "pending_review") && (
          <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
            Edit Outcome
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Lead Quality</p>
        <div className="flex gap-3">
          <ToggleButton
            active={leadQuality === "good"}
            onClick={() => setLeadQuality(leadQuality === "good" ? null : "good")}
            icon={<ThumbsUp className="h-4 w-4" />}
            label="Good Lead"
            activeClass="border-emerald-400 bg-emerald-50 text-emerald-800"
          />
          <ToggleButton
            active={leadQuality === "bad"}
            onClick={() => setLeadQuality(leadQuality === "bad" ? null : "bad")}
            icon={<ThumbsDown className="h-4 w-4" />}
            label="Bad Lead"
            activeClass="border-red-300 bg-red-50 text-red-700"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Damage Found</p>
        <div className="flex gap-3">
          <ToggleButton
            active={damageFound === true}
            onClick={() => setDamageFound(damageFound === true ? null : true)}
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Yes — Damage Found"
            activeClass="border-amber-400 bg-amber-50 text-amber-800"
          />
          <ToggleButton
            active={damageFound === false}
            onClick={() => setDamageFound(damageFound === false ? null : false)}
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="No Damage"
            activeClass="border-gray-400 bg-gray-100 text-gray-700"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Additional Notes</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What happened at the appointment? Any details for your NDRT rep…"
          rows={3}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button onClick={submit} disabled={saving || (!leadQuality && damageFound === null && !notes.trim())} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit Outcome
      </Button>
    </div>
  )
}
