# NDRT Contractor Portal

B2B contractor onboarding portal for Natural Disaster Response Team.

## What this is
Public-facing portal where roofing contractors apply to join NDRT's storm-chasing network. Handles applications, Stripe payments, Monday.com sync, and email notifications.

## Stack
- Next.js 14, Supabase (auth + DB), Stripe, Render deploy (Docker)
- Monday.com API sync for lead/contractor management

## Key Details
- Application notifications are wired up
- `debug-auth` endpoint exists and needs to be REMOVED before production
- Stripe handles contractor subscription/onboarding fees

## Deploy
Deployed on **Render** (Docker, auto-deploy from `main` branch).
Live at: https://portal.naturaldisasterresponseteam.com
DNS: `portal.naturaldisasterresponseteam.com` → `ndrt-portal.onrender.com`
**Do NOT use `npx vercel --prod`** — this project is NOT on Vercel.

Just push to `main` and Render deploys automatically.

## Run locally
```bash
npm run dev
```

## Owner
Cody Chandler — BlackRidge / NDRT
