export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { password } = await req.json()
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  const admin = createAdminClient()

  // Update Supabase Auth password
  const { error: authError } = await admin.auth.admin.updateUserById(user.id, { password })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Get contractor info for the notification email
  const { data: contractor } = await admin
    .from("contractors")
    .select("company_name, email")
    .eq("id", user.id)
    .single()

  // Notify admin that a password was changed — never include the password itself
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "NDRT Portal <portal@naturaldisasterresponseteam.com>",
        to: "cody@naturaldisasterresponseteam.com",
        subject: `Password Changed – ${contractor?.company_name ?? user.email}`,
        html: `
          <p>A contractor changed their portal password.</p>
          <table style="font-family:monospace;border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;color:#888">Company:</td><td>${contractor?.company_name ?? "—"}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#888">Email:</td><td>${contractor?.email ?? user.email}</td></tr>
          </table>
          <p style="color:#888;font-size:12px;margin-top:16px">NDRT Contractor Portal</p>
        `,
      }),
    })
  }

  return NextResponse.json({ success: true })
}
