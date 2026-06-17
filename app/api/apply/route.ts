import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { US_STATES } from "@/lib/config"
import { Resend } from "resend"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function notifyNewApplication(companyName: string, contactName: string, contactEmail: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const safeCompany = escapeHtml(companyName)
  const safeContact = escapeHtml(contactName)
  const safeEmail = escapeHtml(contactEmail)
  return resend.emails.send({
    from: "NDRT <team@naturaldisasterresponseteam.com>",
    to: "team@naturaldisasterresponseteam.com",
    subject: `New contractor application — ${companyName}`,
    html: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f1e;color:#fff;padding:40px;border-radius:8px"><div style="font-size:24px;font-weight:700;margin-bottom:4px">NDRT<span style="color:#F59E0B">.</span></div><div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9ca3af;margin-bottom:32px">New Application</div><h2 style="color:#fff;margin-bottom:16px">New contractor application received</h2><table style="width:100%;border-collapse:collapse;margin-bottom:24px"><tr><td style="color:#9ca3af;padding:6px 0;font-size:13px">Company</td><td style="color:#fff;font-weight:600;font-size:13px">${safeCompany}</td></tr><tr><td style="color:#9ca3af;padding:6px 0;font-size:13px">Contact</td><td style="color:#fff;font-size:13px">${safeContact}</td></tr><tr><td style="color:#9ca3af;padding:6px 0;font-size:13px">Email</td><td style="color:#fff;font-size:13px">${safeEmail}</td></tr></table><a href="https://team.naturaldisasterresponseteam.com/applications" style="display:inline-block;background:#F59E0B;color:#0a0f1e;padding:12px 24px;border-radius:6px;font-weight:600;text-decoration:none">Review Application →</a></div>`,
  }).catch((e: any) => console.error("[apply] notify failed", e))
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const full_name    = String(body?.full_name    ?? "").trim().slice(0, 200)
  const company_name = String(body?.company_name ?? "").trim().slice(0, 200)
  const phone        = String(body?.phone        ?? "").trim().slice(0, 30)
  const email        = String(body?.email        ?? "").toLowerCase().trim().slice(0, 254)
  const { states, trade_type } = body ?? {}

  if (!full_name || !company_name || !email || !phone) {
    return NextResponse.json(
      { error: "Name, company, phone, and email are required." },
      { status: 400 }
    )
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 })
  }
  if (
    !Array.isArray(states) ||
    states.length === 0 ||
    !states.every((s: string) => (US_STATES as readonly string[]).includes(s))
  ) {
    return NextResponse.json(
      { error: "Select at least one valid state." },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { error } = await admin.from("contractors").insert({
    email,
    full_name,
    company_name,
    phone,
    states,
    trade_type: trade_type ?? null,
    status: "pending",
  })

  if (error) {
    console.error("[apply] insert failed:", error)
    const duplicate = error.code === "23505"
    return NextResponse.json(
      {
        error: duplicate
          ? "An application with this email already exists."
          : "Could not submit application. Please try again.",
      },
      { status: duplicate ? 409 : 500 }
    )
  }

  notifyNewApplication(company_name, full_name, email)
  return NextResponse.json({ ok: true })
}
