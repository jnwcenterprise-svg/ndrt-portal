// Seed script — creates test contractors, leads, and contractor_leads.
// Usage: cp .env.example .env.local && fill in keys, then: npm run seed
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })
config({ path: ".env" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const JAKE_EMAIL = "jake@morrisonroofing.com"
const JAKE_PASSWORD = "ndrt-demo-2026!"

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
const dateStr = (d: Date) => d.toISOString().slice(0, 10)

async function main() {
  console.log("Seeding NDRT portal…")

  // --- Active contractor with auth account -------------------------------
  let jakeId: string
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: JAKE_EMAIL,
    password: JAKE_PASSWORD,
    email_confirm: true,
  })
  if (userError) {
    // Already exists — look it up
    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users.find((u) => u.email === JAKE_EMAIL)
    if (!existing) throw userError
    jakeId = existing.id
    console.log("Auth user already existed:", JAKE_EMAIL)
  } else {
    jakeId = created.user.id
    console.log("Created auth user:", JAKE_EMAIL, "password:", JAKE_PASSWORD)
  }

  await admin.from("contractors").upsert(
    {
      id: jakeId,
      email: JAKE_EMAIL,
      full_name: "Jake Morrison",
      company_name: "Morrison Roofing",
      phone: "(214) 555-0142",
      states: ["TX", "OK"],
      trade_type: "Commercial Roofing",
      status: "active",
      lead_credits: 10,
      lead_credits_used: 2,
    },
    { onConflict: "id" }
  )

  // --- Pending contractor (no auth account yet) ---------------------------
  await admin.from("contractors").upsert(
    {
      email: "sarah@chencommercialroofing.com",
      full_name: "Sarah Chen",
      company_name: "Chen Commercial Roofing",
      phone: "(405) 555-0187",
      states: ["OK"],
      trade_type: "Commercial Roofing",
      status: "pending",
      lead_credits: 0,
    },
    { onConflict: "email" }
  )

  // --- Leads ---------------------------------------------------------------
  const leads = [
    {
      property_name: "Trinity Crossing Distribution Center",
      address: "4280 Singleton Blvd",
      city: "Dallas",
      state: "TX",
      square_footage: 412000,
      asset_class: "warehouse",
      contact_name: "Mark Reyes",
      contact_title: "Facilities Director",
      contact_phone: "(214) 555-0118",
      contact_email: "mreyes@trinitycrossing.com",
      insurance_carrier: "Travelers",
      claim_verified: true,
      storm_event_date: dateStr(daysAgo(34)),
      storm_event_id: "TX-2026-0507-HAIL",
      est_settlement_low: 95000000,
      est_settlement_high: 180000000,
      roof_type: "TPO",
      damage_type: "Hail",
      hail_size: '2.25"',
      squares: 1380,
      dol: dateStr(daysAgo(34)),
      booked_by: "Cody Chandler",
      status: "assigned",
    },
    {
      property_name: "Stockyards Gateway Hotel",
      address: "2451 N Main St",
      city: "Fort Worth",
      state: "TX",
      square_footage: 96000,
      asset_class: "hotel",
      contact_name: "Dana Whitfield",
      contact_title: "General Manager",
      contact_phone: "(817) 555-0173",
      contact_email: "dwhitfield@stockyardsgateway.com",
      insurance_carrier: "Zurich",
      claim_verified: true,
      storm_event_date: dateStr(daysAgo(48)),
      storm_event_id: "TX-2026-0423-HAIL",
      est_settlement_low: 42000000,
      est_settlement_high: 75000000,
      roof_type: "Modified Bitumen",
      damage_type: "Hail / Wind",
      hail_size: '1.75"',
      squares: 310,
      dol: dateStr(daysAgo(48)),
      booked_by: "Cody Chandler",
      status: "assigned",
    },
    {
      property_name: "Penn Square Retail Plaza",
      address: "1900 NW Expressway",
      city: "Oklahoma City",
      state: "OK",
      square_footage: 148000,
      asset_class: "retail",
      contact_name: "Tom Brackett",
      contact_title: "Property Manager",
      contact_phone: "(405) 555-0129",
      contact_email: "tbrackett@pennsquareplaza.com",
      insurance_carrier: "Liberty Mutual",
      claim_verified: false,
      storm_event_date: dateStr(daysAgo(21)),
      storm_event_id: "OK-2026-0520-HAIL",
      est_settlement_low: 38000000,
      est_settlement_high: 64000000,
      roof_type: "Built-Up",
      damage_type: "Hail",
      hail_size: '2"',
      squares: 480,
      dol: dateStr(daysAgo(21)),
      booked_by: "Marcus Hill",
      status: "assigned",
    },
    {
      property_name: "Riverbend Flats",
      address: "7800 S Riverside Dr",
      city: "Tulsa",
      state: "OK",
      square_footage: 264000,
      asset_class: "multifamily",
      contact_name: "Alicia Gomez",
      contact_title: "Regional Asset Manager",
      contact_phone: "(918) 555-0166",
      contact_email: "agomez@riverbendflats.com",
      insurance_carrier: "Chubb",
      claim_verified: true,
      storm_event_date: dateStr(daysAgo(62)),
      storm_event_id: "OK-2026-0409-HAIL",
      est_settlement_low: 110000000,
      est_settlement_high: 200000000,
      roof_type: "Composition Shingle",
      damage_type: "Hail",
      hail_size: '2.5"',
      squares: 1500,
      dol: dateStr(daysAgo(62)),
      booked_by: "Marcus Hill",
      status: "assigned",
    },
    {
      property_name: "Sheppard Commons Shopping Center",
      address: "3501 Kemp Blvd",
      city: "Wichita Falls",
      state: "TX",
      square_footage: 88000,
      asset_class: "retail",
      contact_name: "Greg Tatum",
      contact_title: "Owner",
      contact_phone: "(940) 555-0151",
      contact_email: "gtatum@sheppardcommons.com",
      insurance_carrier: "State Farm",
      claim_verified: true,
      storm_event_date: dateStr(daysAgo(75)),
      storm_event_id: "TX-2026-0327-HAIL",
      est_settlement_low: 30000000,
      est_settlement_high: 52000000,
      roof_type: "TPO",
      damage_type: "Hail / Wind",
      hail_size: '1.5"',
      squares: 290,
      dol: dateStr(daysAgo(75)),
      booked_by: "Cody Chandler",
      status: "assigned",
    },
    {
      property_name: "Lone Star Logistics Hub",
      address: "9100 Forney Rd",
      city: "Dallas",
      state: "TX",
      square_footage: 358000,
      asset_class: "distribution",
      contact_name: "Priya Nair",
      contact_title: "VP Operations",
      contact_phone: "(972) 555-0184",
      contact_email: "pnair@lonestarlogistics.com",
      insurance_carrier: "FM Global",
      claim_verified: false,
      storm_event_date: dateStr(daysAgo(12)),
      storm_event_id: "TX-2026-0529-HAIL",
      est_settlement_low: 80000000,
      est_settlement_high: 150000000,
      roof_type: "TPO",
      damage_type: "Hail",
      hail_size: '1.75"',
      squares: 1190,
      dol: dateStr(daysAgo(12)),
      booked_by: "Marcus Hill",
      status: "available",
    },
    {
      property_name: "Bricktown Suites",
      address: "120 E Sheridan Ave",
      city: "Oklahoma City",
      state: "OK",
      square_footage: 74000,
      asset_class: "hotel",
      contact_name: "Hannah Ortiz",
      contact_title: "Director of Operations",
      contact_phone: "(405) 555-0140",
      contact_email: "hortiz@bricktownsuites.com",
      insurance_carrier: "AIG",
      claim_verified: false,
      storm_event_date: dateStr(daysAgo(8)),
      storm_event_id: "OK-2026-0602-HAIL",
      est_settlement_low: 36000000,
      est_settlement_high: 60000000,
      roof_type: "Modified Bitumen",
      damage_type: "Hail",
      hail_size: '1.25"',
      squares: 240,
      dol: dateStr(daysAgo(8)),
      booked_by: "Cody Chandler",
      status: "available",
    },
    {
      property_name: "Greenline Business Park",
      address: "5402 S Mingo Rd",
      city: "Tulsa",
      state: "OK",
      square_footage: 132000,
      asset_class: "warehouse",
      contact_name: "Russ Calloway",
      contact_title: "Facilities Manager",
      contact_phone: "(918) 555-0122",
      contact_email: "rcalloway@greenlinebp.com",
      insurance_carrier: "Hartford",
      claim_verified: false,
      storm_event_date: dateStr(daysAgo(5)),
      storm_event_id: "OK-2026-0605-HAIL",
      est_settlement_low: 34000000,
      est_settlement_high: 58000000,
      roof_type: "Metal R-Panel",
      damage_type: "Hail / Wind",
      hail_size: '1.5"',
      squares: 410,
      dol: dateStr(daysAgo(5)),
      booked_by: "Marcus Hill",
      status: "available",
    },
  ]

  const { data: insertedLeads, error: leadError } = await admin
    .from("leads")
    .insert(leads)
    .select("id, property_name")
  if (leadError) throw leadError
  console.log(`Inserted ${insertedLeads.length} leads`)

  // --- contractor_leads for Jake: one per status ---------------------------
  const byName = (name: string) =>
    insertedLeads.find((l) => l.property_name === name)!.id

  const contractorLeads = [
    {
      contractor_id: jakeId,
      lead_id: byName("Trinity Crossing Distribution Center"),
      delivered_at: daysAgo(2).toISOString(),
      lead_status: "new",
      billing_status: "delivered",
    },
    {
      contractor_id: jakeId,
      lead_id: byName("Stockyards Gateway Hotel"),
      delivered_at: daysAgo(9).toISOString(),
      lead_status: "pending",
      billing_status: "pending_payroll",
      notes: "Met GM on site 6/3. Wants full TPO replacement quote by Friday.",
    },
    {
      contractor_id: jakeId,
      lead_id: byName("Penn Square Retail Plaza"),
      delivered_at: daysAgo(15).toISOString(),
      lead_status: "paid",
      billing_status: "paid",
      paid_at: daysAgo(6).toISOString(),
      notes: "Adjuster meeting scheduled. Carrier confirmed coverage on Bldg A & B.",
    },
    {
      contractor_id: jakeId,
      lead_id: byName("Riverbend Flats"),
      delivered_at: daysAgo(30).toISOString(),
      lead_status: "signed",
      billing_status: "paid",
      paid_at: daysAgo(18).toISOString(),
      notes: "Contract signed 5/28. Production scheduled for July.",
    },
    {
      contractor_id: jakeId,
      lead_id: byName("Sheppard Commons Shopping Center"),
      delivered_at: daysAgo(40).toISOString(),
      lead_status: "denied",
      billing_status: "delivered",
      notes: "Owner went with incumbent roofer. No credit deducted.",
    },
  ]

  const { error: clError } = await admin
    .from("contractor_leads")
    .insert(contractorLeads)
  if (clError) throw clError
  console.log(`Inserted ${contractorLeads.length} contractor_leads for Jake`)

  console.log("\nDone. Log in as:")
  console.log(`  ${JAKE_EMAIL} / ${JAKE_PASSWORD}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
