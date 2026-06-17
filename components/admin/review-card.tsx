"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Building2, Calendar, ThumbsUp, ThumbsDown, Wrench, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ReviewCardProps {
  row: {
    id: string
    lead_quality: string | null
    damage_found: boolean | null
    outcome_notes: string | null
    outcome_submitted_at: string | null
    outcome_status: string | null
    outcome_reviewed_at?: string | null
    outcome_reviewed_by?: string | null
    outcome_review_notes?: string | null
    contractor: { company_name: string; email?: string } | null
    lead: {
      property_name: string
      address?: string
      city?: string
      state?: string
      appt_date?: string | null
      appt_time?: string | null
      lead_type?: string | null
      contact_name?: string | null
      contact_phone?: string | null
      dol?: string | null
      hail_size?: string | null
      insurance_carrier?: string | null
    } | null
  }
  reviewed?: boolean
}

export function ReviewCard({ row, reviewed = false }: ReviewCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(!reviewed)
  const [reviewNotes, setReviewNotes] = useState("")
  const [loading, setLoading] = useState<"approved" | "disputed" | null>(null)

  const lead = row.lead
  const contractor = row.contractor

  async function submitReview(decision: "approved" | "disputed") {
    setLoading(decision)
    try {
      const res = await fetch(`/api/admin/leads/${row.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, review_notes: reviewNotes || null }),
      })
      if (!res.ok) throw new Error("Request failed")
      router.refresh()
    } catch {
      alert("Something went wrong. Please try again.")
      setLoading(null)
    }
  }

  const statusColor =
    row.outcome_status === "approved"
      ? "border-emerald-200 bg-emerald-50"
      : row.outcome_status === "disputed"
      ? "border-amber-200 bg-amber-50"
      : "border-blue-200 bg-white"

  return (
    <div className={`overflow-hidden rounded-lg border shadow-sm ${statusColor}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between px-5 py-4 text-left"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-900">{lead?.property_name ?? "Unknown"}</span>
            {lead?.lead_type && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">
                {lead.lead_type}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>{contractor?.company_name}</span>
            {lead?.appt_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Appt: {formatDate(lead.appt_date)}{lead.appt_time ? ` @ ${lead.appt_time}` : ""}
              </span>
            )}
            <span>Submitted {formatDate(row.outcome_submitted_at)}</span>
          </div>
          {/* Outcome pills */}
          <div className="flex items-center gap-2 pt-1">
            {row.lead_quality && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                row.lead_quality === "good"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {row.lead_quality === "good" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                {row.lead_quality === "good" ? "Good Lead" : "Bad Lead"}
              </span>
            )}
            {row.damage_found !== null && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                row.damage_found
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {row.damage_found ? <Wrench className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {row.damage_found ? "Damage Found" : "No Damage"}
              </span>
            )}
            {reviewed && row.outcome_status && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                row.outcome_status === "approved"
                  ? "bg-emerald-200 text-emerald-800"
                  : "bg-amber-200 text-amber-800"
              }`}>
                {row.outcome_status === "approved" ? "Approved" : "Disputed"}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-gray-400" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Lead details */}
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {lead?.address && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Address</dt>
                <dd className="font-medium text-gray-800">{lead.address}, {lead.city}, {lead.state}</dd>
              </div>
            )}
            {lead?.contact_name && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Contact</dt>
                <dd className="font-medium text-gray-800">{lead.contact_name}</dd>
              </div>
            )}
            {lead?.contact_phone && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Phone</dt>
                <dd className="font-medium text-gray-800">{lead.contact_phone}</dd>
              </div>
            )}
            {lead?.insurance_carrier && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Carrier</dt>
                <dd className="font-medium text-gray-800">{lead.insurance_carrier}</dd>
              </div>
            )}
            {lead?.hail_size && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Hail Size</dt>
                <dd className="font-medium text-gray-800">{lead.hail_size}</dd>
              </div>
            )}
            {lead?.dol && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Date of Loss</dt>
                <dd className="font-medium text-gray-800">{formatDate(lead.dol)}</dd>
              </div>
            )}
          </div>

          {/* Contractor notes */}
          {row.outcome_notes && (
            <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Contractor Notes</p>
              <p className="whitespace-pre-wrap">{row.outcome_notes}</p>
            </div>
          )}

          {/* Already reviewed */}
          {reviewed ? (
            <div className="rounded-md bg-white border border-gray-100 px-4 py-3 text-sm space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {row.outcome_status === "approved" ? "Approved" : "Disputed"} by {row.outcome_reviewed_by} on {formatDate(row.outcome_reviewed_at)}
              </p>
              {row.outcome_review_notes && (
                <p className="text-gray-700 whitespace-pre-wrap">{row.outcome_review_notes}</p>
              )}
            </div>
          ) : (
            /* Review actions */
            <div className="space-y-3 pt-1">
              <Textarea
                placeholder="Optional notes for the contractor about this review…"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => submitReview("approved")}
                  disabled={!!loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading === "approved" ? "Approving…" : (
                    <><CheckCircle className="mr-2 h-4 w-4" /> Approve</>
                  )}
                </Button>
                <Button
                  onClick={() => submitReview("disputed")}
                  disabled={!!loading}
                  variant="outline"
                  className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {loading === "disputed" ? "Disputing…" : (
                    <><XCircle className="mr-2 h-4 w-4" /> Dispute</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
