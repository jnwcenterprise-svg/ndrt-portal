import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, BadgeCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LeadStatusBadge } from "@/components/leads/lead-status-badge"
import { BillingStatusPill } from "@/components/billing/billing-status-pill"
import { NotesFeed } from "@/components/leads/notes-feed"
import { OutcomeForm } from "@/components/leads/outcome-form"
import { PhotoUploader } from "@/components/leads/photo-uploader"
import { formatDate, formatNumber, formatSettlementRange } from "@/lib/format"
import type { ContractorLead } from "@/lib/types"

const ASSET_CLASS_LABELS: Record<string, string> = {
  warehouse: "Warehouse",
  distribution: "Distribution",
  retail: "Retail",
  office: "Office",
  hotel: "Hotel",
  school: "School",
  municipal: "Municipal",
  multifamily: "Multifamily",
  industrial: "Industrial",
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value ?? "—"}</dd>
    </div>
  )
}

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: row } = await supabase
    .from("contractor_leads")
    .select("*, lead:leads(*)")
    .eq("id", params.id)
    .eq("contractor_id", user.id)
    .single<ContractorLead>()

  if (!row || !row.lead) notFound()
  const lead = row.lead

  // Load notes for this lead (from all sources)
  const { data: leadNotes } = await supabase
    .from("lead_notes")
    .select("id, source, author, content, created_at")
    .eq("contractor_lead_id", row.id)
    .order("created_at", { ascending: true })

  return (
    <>
      <Link
        href="/leads"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          {lead.property_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {lead.address}, {lead.city}, {lead.state}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Property</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Field label="Property Name" value={lead.property_name} />
                <Field
                  label="Address"
                  value={`${lead.address}, ${lead.city}, ${lead.state}`}
                />
                <Field
                  label="Asset Class"
                  value={ASSET_CLASS_LABELS[lead.asset_class] ?? lead.asset_class}
                />
                <Field label="Squares" value={formatNumber(lead.squares)} />
                <Field label="Roof Type" value={lead.roof_type} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Field label="Appointment Date" value={formatDate((lead as any).appt_date)} />
                <Field label="Appointment Time" value={(lead as any).appt_time ?? null} />
                <Field label="Booked By" value={lead.booked_by} />
                <Field label="Type" value={(lead as any).lead_type ? ((lead as any).lead_type as string).charAt(0).toUpperCase() + ((lead as any).lead_type as string).slice(1) : null} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storm</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Field label="Date of Loss" value={formatDate(lead.dol)} />
                <Field
                  label="Storm Event Date"
                  value={formatDate(lead.storm_event_date)}
                />
                <Field label="Damage Type" value={lead.damage_type} />
                <Field label="Hail Size" value={lead.hail_size} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insurance</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Carrier" value={lead.insurance_carrier} />
                <Field
                  label="Claim Status"
                  value={
                    lead.claim_verified ? (
                      <Badge className="bg-emerald-100 text-emerald-800">
                        <BadgeCheck className="mr-1 h-3 w-3" />
                        Claim Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">Unverified</Badge>
                    )
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Field label="Name" value={lead.contact_name} />
                <Field label="Title" value={lead.contact_title} />
                <Field
                  label="Phone"
                  value={
                    lead.contact_phone ? (
                      <a
                        href={`tel:${lead.contact_phone.replace(/\D/g, "")}`}
                        className="text-gold-dark hover:underline"
                      >
                        {lead.contact_phone}
                      </a>
                    ) : null
                  }
                />
                <Field
                  label="Email"
                  value={
                    lead.contact_email ? (
                      <a
                        href={`mailto:${lead.contact_email}`}
                        className="text-gold-dark hover:underline"
                      >
                        {lead.contact_email}
                      </a>
                    ) : null
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Status is managed by your NDRT rep
              </p>
              <LeadStatusBadge status={row.lead_status} />
            </CardContent>
          </Card>

          {(lead as any).ndrt_notes && (
            <Card>
              <CardHeader>
                <CardTitle>NDRT Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {(lead as any).ndrt_notes}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Appointment Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <OutcomeForm
                contractorLeadId={row.id}
                initialOutcome={{
                  lead_quality: (row as any).lead_quality ?? null,
                  damage_found: (row as any).damage_found ?? null,
                  outcome_notes: (row as any).outcome_notes ?? null,
                  outcome_submitted_at: (row as any).outcome_submitted_at ?? null,
                  outcome_status: (row as any).outcome_status ?? null,
                  outcome_reviewed_by: (row as any).outcome_reviewed_by ?? null,
                  outcome_review_notes: (row as any).outcome_review_notes ?? null,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <NotesFeed
                contractorLeadId={row.id}
                initialNotes={(leadNotes ?? []) as any}
              />
            </CardContent>
          </Card>

          <PhotoUploader contractorLeadId={row.id} />
        </div>

        <div>
          <Card className="lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="Squares" value={formatNumber(lead.squares)} />
              <Field
                label="Est. Settlement Range"
                value={formatSettlementRange(
                  lead.est_settlement_low,
                  lead.est_settlement_high
                )}
              />
              <Field
                label="Billing Status"
                value={<BillingStatusPill status={row.billing_status} />}
              />
              <Field label="Date Delivered" value={formatDate(row.delivered_at)} />
              {row.billing_status === "paid" && (
                <Field label="Date Paid" value={formatDate(row.paid_at)} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
