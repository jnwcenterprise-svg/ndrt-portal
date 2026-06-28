# NDRT Contractor Portal

B2B contractor onboarding portal for Natural Disaster Response Team.

## What this is
Public-facing portal where roofing contractors apply to join NDRT's storm-chasing network. Handles applications, Stripe payments, Monday.com sync, and email notifications.

## Stack
- Next.js 14, Supabase (auth + DB), Stripe, Render deploy (Docker)
- Monday.com API sync for lead/contractor management

## Key Details
- Application notifications are wired up
- `debug-auth` endpoint has been removed
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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
