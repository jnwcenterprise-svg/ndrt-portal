-- Retry queue for Monday webhook events that failed processing.
-- When processEvent throws, the raw payload is stored here.
-- The reconcile cron retries up to MAX_ATTEMPTS times, then leaves the row
-- for manual review.
--
-- Run this in the Supabase SQL editor before deploying.

CREATE TABLE IF NOT EXISTS failed_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payload         jsonb       NOT NULL,
  last_error      text        NOT NULL,
  attempts        int         NOT NULL DEFAULT 1,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz           -- set when successfully retried
);

-- Fast lookup of pending retries (unresolved, under attempt limit)
CREATE INDEX IF NOT EXISTS failed_events_pending_idx
  ON failed_events (attempts, created_at)
  WHERE resolved_at IS NULL;
