# Render Deployment Guide

## Web Service Setup
- Environment: Node
- Build Command: npm ci && npm run build
- Start Command: node .next/standalone/server.js
- Port: 3000

## Required Environment Variables (copy from .env.local)
Set all of these in Render's dashboard under Environment:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MONDAY_API_TOKEN=
MONDAY_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://portal.naturaldisasterresponseteam.com
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NDRT_ADMIN_API_KEY=
CRON_SECRET=<generate a random 32-char string>
NDRT_SANDBOX_BOARD_IDS=18416066044

## After Deploy
1. Update NEXT_PUBLIC_APP_URL to your Render URL (or custom domain)
2. Re-run scripts/register-update-webhooks.ts with the new URL to update
   Monday's registered webhook endpoints
3. Update the Stripe webhook endpoint in the Stripe dashboard to the new URL
4. Point DNS for portal.naturaldisasterresponseteam.com to Render
