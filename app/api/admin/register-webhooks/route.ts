import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

const MONDAY_API_URL = "https://api.monday.com/v2"

function isValidAdminKey(provided: string | null): boolean {
  const expected = process.env.NDRT_ADMIN_API_KEY
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

async function mondayPost<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json))
  return json.data as T
}

async function getBoardWebhooks(boardId: string): Promise<{ id: string; event: string }[]> {
  const data = await mondayPost<{ webhooks: { id: string; event: string }[] }>(
    `query ($boardId: ID!) { webhooks(board_id: $boardId) { id event } }`,
    { boardId }
  )
  return data.webhooks ?? []
}

async function registerWebhook(boardId: string, event: string, url: string): Promise<string> {
  const data = await mondayPost<{ create_webhook: { id: string } }>(
    `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
      create_webhook(board_id: $boardId, url: $url, event: $event) { id }
    }`,
    { boardId, url, event }
  )
  return data.create_webhook.id
}

// POST /api/admin/register-webhooks
// Adds the create_pulse webhook to all active contractor boards that don't have it yet.
// Safe to run multiple times — checks existing webhooks before registering.
export async function POST(request: Request) {
  if (!isValidAdminKey(request.headers.get("x-ndrt-admin-key"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { body = {} }
  const webhookUrl: string =
    body?.webhook_url ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/monday`
  const admin = createAdminClient()

  const { data: contractors } = await admin
    .from("contractors")
    .select("id, company_name, monday_board_id")
    .not("monday_board_id", "is", null)
    .eq("status", "active")

  if (!contractors?.length) {
    return NextResponse.json({ ok: true, message: "No active contractors with boards" })
  }

  const results: { contractor: string; board_id: string; registered: boolean; skipped: boolean; error?: string }[] = []

  for (const c of contractors) {
    const boardId = c.monday_board_id!
    try {
      const existing = await getBoardWebhooks(boardId)
      const alreadyHas = existing.some((w) => w.event === "create_item" || w.event === "create_pulse")

      if (alreadyHas) {
        results.push({ contractor: c.company_name, board_id: boardId, registered: false, skipped: true })
        continue
      }

      await registerWebhook(boardId, "create_item", webhookUrl)
      results.push({ contractor: c.company_name, board_id: boardId, registered: true, skipped: false })
    } catch (err: any) {
      results.push({ contractor: c.company_name, board_id: boardId, registered: false, skipped: false, error: err.message })
    }
  }

  return NextResponse.json({
    ok: true,
    registered: results.filter((r) => r.registered).length,
    skipped: results.filter((r) => r.skipped).length,
    errors: results.filter((r) => r.error).length,
    results,
  })
}
