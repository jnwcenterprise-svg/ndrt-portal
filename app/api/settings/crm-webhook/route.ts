export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { lookup } from "dns/promises"

function isPrivateOrReservedIP(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
    const [a, b] = parts
    if (a === 127) return true                         // loopback
    if (a === 10) return true                          // RFC-1918
    if (a === 172 && b >= 16 && b <= 31) return true  // RFC-1918
    if (a === 192 && b === 168) return true            // RFC-1918
    if (a === 169 && b === 254) return true            // link-local / cloud metadata
    if (a === 0) return true                           // "this" network
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  }
  const lower = ip.toLowerCase()
  if (lower === "::1") return true
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true // IPv6 ULA
  if (lower.startsWith("fe80")) return true                          // IPv6 link-local
  return false
}

async function isSafeWebhookUrl(raw: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }
  if (parsed.protocol !== "https:") return false

  const hostname = parsed.hostname
  if (hostname === "localhost") return false

  // If a bare IPv4 address was supplied, check it directly
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return !isPrivateOrReservedIP(hostname)
  }

  // Resolve the hostname and block if it points into a private range
  try {
    const { address } = await lookup(hostname, { family: 4 })
    if (isPrivateOrReservedIP(address)) return false
  } catch {
    return false
  }
  return true
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const url: string | null = body?.url ?? null

  if (url !== null) {
    const safe = await isSafeWebhookUrl(url)
    if (!safe) {
      return NextResponse.json(
        { error: "URL must be a valid public HTTPS address." },
        { status: 400 }
      )
    }
  }

  const { error } = await supabase
    .from("contractors")
    .update({ crm_webhook_url: url })
    .eq("id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
