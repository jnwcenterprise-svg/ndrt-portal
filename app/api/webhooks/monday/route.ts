import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { processEvent } from "@/lib/monday-webhook"
import { recordFailedEvent } from "@/lib/webhook-retry"

// Monday app webhooks are signed with HMAC-SHA256 in the Authorization header.
// Board automations do NOT sign requests — they pass a shared secret as ?secret=.
function verifyMondayRequest(authHeader: string | null, querySecret: string | null): boolean {
  const secret = process.env.MONDAY_WEBHOOK_SECRET
  if (!secret) {
    console.error("[monday webhook] MONDAY_WEBHOOK_SECRET not set — rejecting request")
    return false
  }

  if (querySecret) {
    try {
      return crypto.timingSafeEqual(Buffer.from(querySecret), Buffer.from(secret))
    } catch {
      return false
    }
  }

  if (!authHeader) return false
  const token = authHeader.replace(/^Bearer\s+/i, "")
  const parts = token.split(".")
  if (parts.length !== 3) return false
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts[0]}.${parts[1]}`)
    .digest("base64url")
  try {
    return crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get("secret")

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // Challenge handshake on webhook registration
  if (body?.challenge) {
    return NextResponse.json({ challenge: body.challenge })
  }

  if (!verifyMondayRequest(request.headers.get("authorization"), querySecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = body?.event

  // Return 200 immediately so Monday doesn't time out and disconnect.
  // On failure, record to the retry queue — the reconcile cron will replay it.
  processEvent(event).catch(async (err) => {
    console.error("[monday webhook] processEvent failed:", err)
    const admin = createAdminClient()
    await recordFailedEvent(admin, event, err).catch((e) =>
      console.error("[monday webhook] failed to record to retry queue:", e)
    )
  })

  return NextResponse.json({ received: true })
}
