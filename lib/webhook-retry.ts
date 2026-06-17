import type { SupabaseClient } from "@supabase/supabase-js"
import { processEvent } from "@/lib/monday-webhook"

const MAX_ATTEMPTS = 5

export interface RetryResult {
  attempted: number
  resolved: number
  permanently_failed: number
  errors: string[]
}

/**
 * Records a failed webhook event for later retry.
 * Called in the catch handler of the webhook route's fire-and-forget.
 */
export async function recordFailedEvent(
  admin: SupabaseClient,
  event: any,
  err: unknown
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err)
  const { error } = await admin.from("failed_events").insert({
    payload:    event,
    last_error: message,
  })
  if (error) {
    console.error("[webhook-retry] failed to record failure:", error.message)
  } else {
    console.warn("[webhook-retry] event queued for retry:", event?.type, event?.pulseId)
  }
}

/**
 * Retries all pending failed events. Called by the reconcile cron.
 *
 * Events that succeed are marked resolved_at = now().
 * Events that fail increment attempts. Once attempts reaches MAX_ATTEMPTS
 * the row is left unresolved for manual review and logged as a permanent fail.
 */
export async function retryFailedEvents(admin: SupabaseClient): Promise<RetryResult> {
  const result: RetryResult = {
    attempted: 0,
    resolved: 0,
    permanently_failed: 0,
    errors: [],
  }

  const { data: pending, error: fetchErr } = await admin
    .from("failed_events")
    .select("id, payload, attempts")
    .is("resolved_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(50) // process at most 50 per run to avoid long cron cycles

  if (fetchErr) {
    result.errors.push(`Failed to fetch retry queue: ${fetchErr.message}`)
    return result
  }
  if (!pending?.length) return result

  for (const row of pending) {
    result.attempted++
    try {
      // skipDedup=true: the event key is already in webhook_events from the
      // first attempt — we want to replay, not block it as a duplicate.
      await processEvent(row.payload, true)

      await admin
        .from("failed_events")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", row.id)

      result.resolved++
      console.log(
        `[webhook-retry] resolved event ${row.id}`,
        row.payload?.type, row.payload?.pulseId
      )
    } catch (err: any) {
      const newAttempts = row.attempts + 1
      const isPermanent = newAttempts >= MAX_ATTEMPTS

      await admin
        .from("failed_events")
        .update({
          attempts:        newAttempts,
          last_error:      err.message ?? String(err),
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", row.id)

      if (isPermanent) {
        result.permanently_failed++
        console.error(
          `[webhook-retry] permanent failure after ${newAttempts} attempts — ` +
          `event ${row.id} (${row.payload?.type} pulseId=${row.payload?.pulseId}): ` +
          err.message
        )
      } else {
        result.errors.push(
          `Event ${row.id} attempt ${newAttempts}/${MAX_ATTEMPTS}: ${err.message}`
        )
      }
    }
  }

  return result
}
