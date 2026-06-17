-- Idempotency table for Monday webhook events.
-- Prevents duplicate processing when Monday retries a delivery or two
-- concurrent requests race on the same event.
--
-- Run this in the Supabase SQL editor (or supabase db push) before deploying.

CREATE TABLE IF NOT EXISTS webhook_events (
  id           text        PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Allow fast cleanup of old rows by the reconcile cron.
CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx
  ON webhook_events (processed_at);

-- Auto-purge rows older than 48 hours via a Supabase scheduled function,
-- OR let the reconcile cron call pruneOldEvents() — either works.
