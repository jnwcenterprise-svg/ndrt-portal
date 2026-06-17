import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Builds a stable, discriminating key for a Monday webhook event.
 *
 * Monday retries the exact same payload if it doesn't receive a 200, so the
 * same (type, pulseId, destGroupId, timestamp) tuple is safe to treat as one
 * event. Genuine re-moves of an item to the same group will have a different
 * timestamp, so they correctly produce a new key.
 */
function makeEventKey(event: any): string {
  // Monday includes event.id on app-webhook events; use it when present.
  if (event?.id) return `monday:${event.id}`

  const parts = [
    event?.type        ?? "unknown",
    event?.boardId     ?? "",
    event?.pulseId     ?? "",
    event?.updateId    ?? "",
    event?.columnId    ?? "",
    event?.destGroupId ?? "",
    event?.timestamp   ?? "",
  ]
  return `monday:${parts.join(":")}`
}

/**
 * Atomically records an event as processed. Returns true if the event was
 * already in the table (duplicate), false if it's new.
 *
 * On a DB failure the function logs and returns false — better to process a
 * duplicate than to silently drop an event.
 *
 * Requires the webhook_events table from:
 *   supabase/migrations/20260617_webhook_events.sql
 */
export async function isDuplicateEvent(
  admin: SupabaseClient,
  event: any
): Promise<boolean> {
  const key = makeEventKey(event)
  const { error } = await admin.from("webhook_events").insert({ id: key })

  if (error?.code === "23505") {
    // PostgreSQL unique_violation — this key was already inserted
    return true
  }
  if (error) {
    // Table missing, connection error, etc. — don't block processing
    console.error("[webhook-dedup] insert failed (non-fatal):", error.message, "key:", key)
    return false
  }
  return false
}

/**
 * Deletes webhook_events older than 48 hours. Call from the reconcile cron
 * to keep the table from growing unboundedly.
 */
export async function pruneOldEvents(admin: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { error } = await admin
    .from("webhook_events")
    .delete()
    .lt("processed_at", cutoff)

  if (error) {
    console.error("[webhook-dedup] prune failed:", error.message)
  }
}
