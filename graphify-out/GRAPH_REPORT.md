# Graph Report - /Users/codychandler/ndrt-portal  (2026-06-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 534 nodes · 1139 edges · 36 communities (26 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin API Routes|Admin API Routes]]
- [[_COMMUNITY_Lead & Review Pages|Lead & Review Pages]]
- [[_COMMUNITY_Auth & Application Pages|Auth & Application Pages]]
- [[_COMMUNITY_BM25 Search Engine|BM25 Search Engine]]
- [[_COMMUNITY_Billing & Dashboard Pages|Billing & Dashboard Pages]]
- [[_COMMUNITY_Package Config|Package Config]]
- [[_COMMUNITY_Contractor Buy & Notifications|Contractor Buy & Notifications]]
- [[_COMMUNITY_Stripe Webhook Handler|Stripe Webhook Handler]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Lead Notes & Feed|Lead Notes & Feed]]
- [[_COMMUNITY_Loading State Components|Loading State Components]]
- [[_COMMUNITY_Monday Board Standardization|Monday Board Standardization]]
- [[_COMMUNITY_Monday Lead Importer|Monday Lead Importer]]
- [[_COMMUNITY_Monday Webhook Registration|Monday Webhook Registration]]
- [[_COMMUNITY_Contractor Provisioning|Contractor Provisioning]]
- [[_COMMUNITY_Contractor Board Setup|Contractor Board Setup]]
- [[_COMMUNITY_Appointment Backfill Script|Appointment Backfill Script]]
- [[_COMMUNITY_Sandbox Webhook Setup|Sandbox Webhook Setup]]
- [[_COMMUNITY_Database Seeding|Database Seeding]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Master Column Management|Master Column Management]]
- [[_COMMUNITY_Update Webhook Registration|Update Webhook Registration]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_TruPro Provisioning|TruPro Provisioning]]
- [[_COMMUNITY_Search Output Formatter|Search Output Formatter]]
- [[_COMMUNITY_TruPro Login Update|TruPro Login Update]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Vercel Cron Config|Vercel Cron Config]]

## God Nodes (most connected - your core abstractions)
1. `createAdminClient()` - 50 edges
2. `createClient()` - 39 edges
3. `cn()` - 18 edges
4. `Contractor` - 15 edges
5. `compilerOptions` - 15 edges
6. `Button` - 13 edges
7. `ContractorLead` - 13 edges
8. `Card` - 12 edges
9. `CardContent` - 12 edges
10. `DesignSystemGenerator` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AdminReviewsPage()` --calls--> `createClient()`  [EXTRACTED]
  app/(portal)/admin/reviews/page.tsx → lib/supabase/server.ts
- `PortalLayout()` --calls--> `createClient()`  [EXTRACTED]
  app/(portal)/layout.tsx → lib/supabase/server.ts
- `LeadsPage()` --calls--> `createClient()`  [EXTRACTED]
  app/(portal)/leads/page.tsx → lib/supabase/server.ts
- `POST()` --calls--> `createClient()`  [EXTRACTED]
  app/api/purchase/route.ts → lib/supabase/server.ts
- `BillingPage()` --calls--> `createClient()`  [EXTRACTED]
  app/(portal)/billing/page.tsx → lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (36 total, 10 thin omitted)

### Community 0 - "Admin API Routes"
Cohesion: 0.06
Nodes (57): isValidAdminKey(), POST(), isValidAdminKey(), POST(), BoardItemsPage, BoardMeta, buildBriefingBlock(), createLeadItem() (+49 more)

### Community 1 - "Lead & Review Pages"
Cohesion: 0.08
Nodes (41): ReviewCard(), ReviewCardProps, BillingStatusPill(), STATUS_MAP, LeadLedgerTable(), PurchaseHistoryTable(), ASSET_CLASS_LABELS, LeadDetailPage() (+33 more)

### Community 2 - "Auth & Application Pages"
Cohesion: 0.10
Nodes (33): TRADE_TYPES, CreditBalanceCard(), CreditBalanceCardProps, ManagePaymentButton(), StatCard(), StatCardProps, Topbar(), TopbarProps (+25 more)

### Community 3 - "BM25 Search Engine"
Cohesion: 0.06
Nodes (40): BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25 (+32 more)

### Community 4 - "Billing & Dashboard Pages"
Cohesion: 0.10
Nodes (31): GET(), Home(), GET(), BillingPage(), POST(), isPrivateOrReservedIP(), isSafeWebhookUrl(), POST() (+23 more)

### Community 5 - "Package Config"
Cohesion: 0.05
Nodes (36): dependencies, clsx, lucide-react, next, node-cron, react, react-dom, resend (+28 more)

### Community 6 - "Contractor Buy & Notifications"
Cohesion: 0.11
Nodes (18): escapeHtml(), notifyNewApplication(), POST(), PackageGrid(), HoldingScreen(), LockedScreen(), MobileNav(), NAV_ITEMS (+10 more)

### Community 7 - "Stripe Webhook Handler"
Cohesion: 0.18
Nodes (20): FOOTER, sendApptFollowupEmail(), sendCreditsAddedEmail(), sendEmail(), sendLeadPaidEmail(), sendLowCreditEmail(), sendOutcomeSubmittedEmail(), sendPaymentFailedEmail() (+12 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "Lead Notes & Feed"
Cohesion: 0.16
Nodes (8): NotesEditorProps, LeadNote, NotesFeed(), NotesFeedProps, SOURCE_STYLES, OutcomeForm(), OutcomeFormProps, Textarea

### Community 11 - "Monday Board Standardization"
Cohesion: 0.32
Nodes (11): admin, createColumn(), createGroup(), getBoardStructure(), GROUP_ALIASES, main(), mondayRequest(), moveItemToGroup() (+3 more)

### Community 12 - "Monday Lead Importer"
Cohesion: 0.29
Nodes (9): admin, col(), GROUP_STATUS_MAP, importForContractor(), importFromBoard(), main(), parseAddress(), RESIDENTIAL_BOARD_IDS (+1 more)

### Community 13 - "Monday Webhook Registration"
Cohesion: 0.36
Nodes (8): admin, CONTRACTOR_EVENTS, getExistingWebhooks(), main(), mondayRequest(), registerMissingEvents(), SANDBOX_BOARD_IDS, sleep()

### Community 14 - "Contractor Provisioning"
Cohesion: 0.43
Nodes (6): admin, CONTRACTORS, generateApiKey(), main(), slug(), tempPassword()

### Community 15 - "Contractor Board Setup"
Cohesion: 0.47
Nodes (5): admin, EVENTS, main(), mondayRequest(), sleep()

### Community 16 - "Appointment Backfill Script"
Cohesion: 0.53
Nodes (5): admin, backfillForContractor(), col(), fetchBoardItems(), main()

### Community 17 - "Sandbox Webhook Setup"
Cohesion: 0.53
Nodes (5): EVENTS, getExistingWebhooks(), main(), mondayRequest(), SANDBOX_BOARD_IDS

### Community 18 - "Database Seeding"
Cohesion: 0.60
Nodes (4): admin, dateStr(), daysAgo(), main()

### Community 20 - "ESLint Config"
Cohesion: 0.50
Nodes (3): extends, rules, react/no-unescaped-entities

### Community 21 - "Master Column Management"
Cohesion: 1.00
Nodes (3): createColumn(), main(), mondayRequest()

### Community 22 - "Update Webhook Registration"
Cohesion: 0.67
Nodes (3): admin, main(), mondayRequest()

## Knowledge Gaps
- **126 isolated node(s):** `extends`, `react/no-unescaped-entities`, `ASSET_CLASS_LABELS`, `ALLOWED_TYPES`, `Admin` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createAdminClient()` connect `Billing & Dashboard Pages` to `Admin API Routes`, `Contractor Buy & Notifications`, `Stripe Webhook Handler`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Billing & Dashboard Pages` to `Admin API Routes`, `Lead & Review Pages`, `Auth & Application Pages`, `Contractor Buy & Notifications`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `cn()` connect `Auth & Application Pages` to `Lead & Review Pages`, `Loading State Components`, `Contractor Buy & Notifications`, `Lead Notes & Feed`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words`, `Build BM25 index from documents` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.0647887323943662 - nodes in this community are weakly interconnected._
- **Should `Lead & Review Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07656341320864991 - nodes in this community are weakly interconnected._
- **Should `Auth & Application Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.10042347247428918 - nodes in this community are weakly interconnected._