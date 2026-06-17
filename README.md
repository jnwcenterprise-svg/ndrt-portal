# NDRT Contractor Portal

B2B portal for vetted commercial roofing contractors — storm leads, pipeline
tracking, and prepaid lead credits. Deploys to Vercel at
`portal.naturaldisasterresponseteam.com`.

**Stack:** Next.js 14 (App Router) · Supabase (auth + Postgres + RLS) ·
Stripe Checkout · Monday.com sync · Resend · Tailwind CSS

## Setup

1. **Supabase** — create a project, then run `supabase/schema.sql` in the SQL
   editor. It creates all tables, enums, indexes, and RLS policies (including
   the column-level grants that make `notes` the only contractor-writable
   field on `contractor_leads`).
2. **Env vars** — `cp .env.example .env.local` and fill everything in.
   `NDRT_ADMIN_API_KEY` is a shared secret you generate (e.g. `openssl rand
   -hex 32`); NDRT internal tooling sends it as the `x-ndrt-admin-key` header
   when calling the `/api/monday/*` routes.
3. **Stripe** — create one Product per lead package with a one-time Price,
   then fill `stripe_price_id` into `lib/config.ts` (single source of truth —
   UI and webhook fulfillment both read from it; pricing is $795/lead).
   Point a webhook at `/api/webhooks/stripe` for `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, and
   `checkout.session.async_payment_failed`, and put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.

   **ACH / Grand Bank:** checkout offers card and ACH Direct Debit
   (`us_bank_account`). Enable "ACH Direct Debit" under Settings → Payment
   methods in Stripe, and set Grand Bank as the payout bank account under
   Settings → Bank accounts and scheduling — Stripe deposits all settled
   payments (card and ACH) there. ACH settles in ~4 business days; the
   webhook records the purchase as `pending` at checkout and only grants
   credits on `async_payment_succeeded`. Failed ACH payments are marked
   `failed` and the contractor is emailed.
4. **Monday** — set `MONDAY_MASTER_BOARD_ID` to the master template board
   (groups: NEW LEADS, PENDING PAYROLL, PAID DIALER, Do Not Call, SIGNED,
   DENIED LEAD). `MONDAY_WEBHOOK_SECRET` is the app signing secret used to
   verify inbound webhooks.
5. **Seed test data** — `npm install && npm run seed`, then `npm run dev`.
   Test login: `jake@morrisonroofing.com` / `ndrt-demo-2026!`

## NDRT operator flow (activating a contractor)

Applications from `/apply` land in `contractors` with `status = pending` and
a random id (no auth account yet). To activate:

1. Create the auth user in Supabase (Auth → Add user) with the applicant's
   email.
2. Update the contractor row: set `id` to the new auth user id and
   `status = 'active'`.
3. `POST /api/monday/create-board` with `{ "contractor_id": "<id>" }` and the
   `x-ndrt-admin-key` header — duplicates the master board, renames it
   "[Company] — NDRT Leads", stores the board id, registers webhooks.
4. Assign leads via `POST /api/monday/create-item` with
   `{ "contractor_id": "...", "lead_id": "..." }` — creates the
   `contractor_leads` record, the Monday item in NEW LEADS, and emails the
   contractor.

From then on, everything is driven by moving items between groups in Monday.
Moving to **PAID DIALER** deducts 1 credit, stamps `paid_at`, and emails the
contractor (plus a low-balance warning at ≤ 3 credits). **DENIED LEAD** never
deducts.

## Security model

- Contractors can only ever do two writes: save notes on their own leads and
  buy a credit package. Enforced in the UI (no status controls exist), in the
  API (notes is the only mutation endpoint), and in Postgres (RLS + column
  grants — `lead_status`/`billing_status`/credits are service-role only).
- `/api/monday/*` admin routes require `x-ndrt-admin-key`.
- Stripe webhooks are signature-verified and idempotent on payment intent id.
- Monday webhooks verify the JWT Authorization header against
  `MONDAY_WEBHOOK_SECRET` and answer the challenge handshake.

## Deploy

```bash
npx vercel --prod
```

Add all env vars in Vercel project settings, point
`portal.naturaldisasterresponseteam.com` at the project, and set
`NEXT_PUBLIC_APP_URL` to the production URL (Monday webhook registration and
Stripe redirect URLs both derive from it).
