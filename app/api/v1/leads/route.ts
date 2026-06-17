export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const admin = createAdminClient()
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 })
  }

  const { data: contractor, error } = await admin
    .from("contractors")
    .select("id, company_name, status")
    .eq("api_key", token)
    .single()

  if (error || !contractor) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
  }

  if (contractor.status !== "active") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 })
  }

  const { data: leads, error: leadsError } = await admin
    .from("contractor_leads")
    .select(`
      id,
      delivered_at,
      lead_status,
      billing_status,
      paid_at,
      notes,
      monday_item_id,
      lead:leads (
        id,
        property_name,
        address,
        city,
        state,
        square_footage,
        asset_class,
        contact_name,
        contact_title,
        contact_phone,
        contact_email,
        insurance_carrier,
        claim_verified,
        storm_event_date,
        roof_type,
        damage_type,
        hail_size,
        squares,
        dol
      )
    `)
    .eq("contractor_id", contractor.id)
    .order("delivered_at", { ascending: false })

  if (leadsError) {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }

  return NextResponse.json({
    contractor: contractor.company_name,
    count: leads?.length ?? 0,
    leads,
  })
}
