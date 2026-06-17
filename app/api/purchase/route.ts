import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { NDRT_CONTACT, EMAIL_FROM, LEAD_PACKAGES } from "@/lib/config"
import { Resend } from "resend"
import type { Contractor } from "@/lib/types"

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { credits, label } = body ?? {}
  const pkg = LEAD_PACKAGES.find((p) => p.credits === credits && p.label === label)
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 })
  }

  const { data: contractor } = await supabase
    .from("contractors")
    .select("*")
    .eq("id", user.id)
    .single<Contractor>()

  if (!contractor || contractor.status !== "active") {
    return NextResponse.json({ error: "Account is not active." }, { status: 403 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: ["cody@naturaldisasterresponseteam.com", "Jennifer@naturaldisasterresponseteam.com"],
      subject: `Lead Package Request — ${contractor.company_name}`,
      text: [
        `A contractor has requested a lead package and is awaiting your approval.`,
        ``,
        `Contractor: ${contractor.company_name}`,
        `Email: ${contractor.email}`,
        `Package: ${label} (${credits} leads)`,
        `Current Credit Balance: ${contractor.lead_credits}`,
        ``,
        `Log in to the admin dashboard to approve and process this order.`,
        ``,
        `—`,
        `Natural Disaster Response Team`,
        NDRT_CONTACT.email,
        NDRT_CONTACT.phone,
      ].join("\n"),
    })
  } else {
    console.warn(`[purchase] RESEND_API_KEY not set — package request from ${contractor.email} for ${label} (${credits} leads) not emailed`)
  }

  return NextResponse.json({ ok: true })
}
