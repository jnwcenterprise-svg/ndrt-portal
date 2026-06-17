export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { reconcileAllBoards } from "@/lib/reconcile"
import { pruneOldEvents } from "@/lib/webhook-dedup"
import { retryFailedEvents } from "@/lib/webhook-retry"

export async function GET(request: Request) {
  const provided = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  const valid =
    a.length === b.length &&
    (() => {
      try { return crypto.timingSafeEqual(a, b) } catch { return false }
    })()
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // 1. Replay any events that failed on first delivery
  const retryResult = await retryFailedEvents(admin)
  if (retryResult.permanently_failed > 0) {
    console.error(
      `[reconcile] ${retryResult.permanently_failed} event(s) permanently failed — ` +
      `check failed_events table for manual review`
    )
  }

  // 2. Full board reconciliation — catches anything still missing after retries
  const reconcileResults = await reconcileAllBoards()

  // 3. Prune stale dedup entries to keep webhook_events small
  await pruneOldEvents(admin)

  const summary = {
    retry: retryResult,
    reconcile: {
      boards_checked:  reconcileResults.length,
      missing_created: reconcileResults.reduce((s, r) => s + r.missing_created, 0),
      drift_corrected: reconcileResults.reduce((s, r) => s + r.drift_corrected, 0),
      drift_skipped:   reconcileResults.reduce((s, r) => s + r.drift_skipped, 0),
      error_count:     reconcileResults.reduce((s, r) => s + r.errors.length, 0),
      errors:          reconcileResults.flatMap(r => r.errors),
    },
  }

  console.log("[reconcile] Complete:", JSON.stringify({
    retry_resolved:      summary.retry.resolved,
    retry_perm_failed:   summary.retry.permanently_failed,
    missing_created:     summary.reconcile.missing_created,
    drift_corrected:     summary.reconcile.drift_corrected,
    drift_skipped:       summary.reconcile.drift_skipped,
  }))

  return NextResponse.json(summary)
}
