import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/format"
import { ReviewCard } from "@/components/admin/review-card"

export default async function AdminReviewsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: me } = await supabase
    .from("contractors")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!(me as any)?.is_admin) redirect("/dashboard")

  const { data: pending } = await supabase
    .from("contractor_leads")
    .select(`
      id,
      lead_quality,
      damage_found,
      outcome_notes,
      outcome_submitted_at,
      outcome_status,
      lead_status,
      contractor:contractors(company_name, email),
      lead:leads(property_name, address, city, state, appt_date, appt_time, lead_type, contact_name, contact_phone, dol, hail_size, insurance_carrier)
    `)
    .eq("outcome_status", "pending_review")
    .order("outcome_submitted_at", { ascending: false })

  const { data: reviewed } = await supabase
    .from("contractor_leads")
    .select(`
      id,
      lead_quality,
      damage_found,
      outcome_notes,
      outcome_submitted_at,
      outcome_status,
      outcome_reviewed_at,
      outcome_reviewed_by,
      outcome_review_notes,
      contractor:contractors(company_name),
      lead:leads(property_name, appt_date)
    `)
    .in("outcome_status", ["approved", "disputed"])
    .order("outcome_reviewed_at", { ascending: false })
    .limit(20)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Outcome Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">
          Contractor-submitted post-appointment outcomes awaiting NDRT review.
        </p>
      </div>

      {(pending?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">No pending outcomes — you're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600">
            Pending Review ({pending?.length})
          </h2>
          {pending?.map((row) => (
            <ReviewCard key={row.id} row={row as any} />
          ))}
        </div>
      )}

      {(reviewed?.length ?? 0) > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Recently Reviewed
          </h2>
          {reviewed?.map((row) => (
            <ReviewCard key={row.id} row={row as any} reviewed />
          ))}
        </div>
      )}
    </div>
  )
}
