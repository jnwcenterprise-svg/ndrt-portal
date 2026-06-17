// Provisions all real contractors with Monday board IDs, credit data, and portal logins.
// Usage: npx tsx scripts/provision-all-contractors.ts
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "crypto"

config({ path: ".env.local" })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function generateApiKey() { return "ndrt_" + randomBytes(32).toString("hex") }
function slug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]/g, "") }
function tempPassword(name: string) { return `ndrt-${slug(name).slice(0, 12)}-2026!` }

const CONTRACTORS = [
  { company: "Pro Exteriors TX",           email: "portal@proexteriorstx.com",         boardId: "18181881264", purchased: 10, pd: 6,  owe: 4,  paused: true  },
  { company: "Claims Crafters",            email: "portal@claimscrafters.com",          boardId: "18403561705", purchased: 10, pd: 6,  owe: 4,  paused: false },
  { company: "JD Roofing Utah",            email: "portal@jdroofingyutah.com",          boardId: "18401831480", purchased: 10, pd: 2,  owe: 8,  paused: false },
  { company: "Texas Priority Roofing",     email: "portal@texaspriorityroofing.com",    boardId: "10000148317", purchased: 32, pd: 33, owe: 0,  paused: false },
  { company: "Levi & Elias Priority",      email: "portal@leviandelias.com",            boardId: "18386961210", purchased: 8,  pd: 4,  owe: 4,  paused: true  },
  { company: "Reviv Roofing",              email: "portal@revivroofing.com",            boardId: "18379403874", purchased: 10, pd: 7,  owe: 3,  paused: false },
  { company: "Mission Property Loss",      email: "portal@missionpropertyloss.com",     boardId: "18407742543", purchased: 10, pd: 6,  owe: 4,  paused: true  },
  { company: "Grace Forensic",             email: "portal@graceforensic.com",           boardId: "18407861445", purchased: 50, pd: 31, owe: 19, paused: false },
  { company: "Euclid-Liberte Roofing",     email: "portal@euclidliberte.com",           boardId: "18404344568", purchased: 25, pd: 20, owe: 4,  paused: false },
  { company: "Pic Global",                 email: "portal@picglobal.com",               boardId: "18402573347", purchased: 10, pd: 5,  owe: 5,  paused: false },
  { company: "T-Rock Contracting",         email: "portal@trockcontracting.com",        boardId: "8729135841",  purchased: 10, pd: 2,  owe: 8,  paused: false },
  { company: "Branded Roofing",            email: "portal@brandedroofing.com",          boardId: "18391310433", purchased: 15, pd: 10, owe: 5,  paused: false },
  { company: "Showtime Exteriors",         email: "portal@showtimeexteriors.com",       boardId: "18413978217", purchased: 5,  pd: 5,  owe: 0,  paused: false },
  { company: "Hochstetler Roofing",        email: "portal@hochstetlerroofing.com",      boardId: "18413930989", purchased: 10, pd: 5,  owe: 5,  paused: false },
  { company: "Rowley Roofing",             email: "portal@rowleyroofing.com",           boardId: "18413746979", purchased: 10, pd: 4,  owe: 6,  paused: false },
  { company: "All Trades Contracting",     email: "portal@alltradescontracting.com",    boardId: "18414366520", purchased: 20, pd: 16, owe: 4,  paused: true  },
  { company: "Five Star Roofing",          email: "portal@fivestarroofing.com",         boardId: null,          purchased: 0,  pd: 2,  owe: 0,  paused: false },
  { company: "DRT Adjusting",              email: "portal@drtadjusting.com",            boardId: "18415783808", purchased: 25, pd: 13, owe: 12, paused: false },
  { company: "DM Construction",            email: "portal@dmconstruction.com",          boardId: "8856170372",  purchased: 5,  pd: 2,  owe: 3,  paused: false },
  { company: "Storm Recovery",             email: "portal@stormrecovery.com",           boardId: "18403890191", purchased: 0,  pd: 0,  owe: 0,  paused: false },
  { company: "Oponos",                     email: "portal@oponos.com",                  boardId: "18403563169", purchased: 0,  pd: 0,  owe: 0,  paused: false },
  { company: "Lighthouse Construction",    email: "portal@lighthouseconstruction.com",  boardId: "18412005633", purchased: 0,  pd: 0,  owe: 0,  paused: false },
  { company: "Superior Restoration",       email: "portal@superiorrestoration.com",     boardId: "18401851830", purchased: 0,  pd: 0,  owe: 0,  paused: false },
]

async function main() {
  const results: { company: string; email: string; password: string; apiKey: string; status: string }[] = []

  for (const c of CONTRACTORS) {
    const password = tempPassword(c.company)
    const apiKey = generateApiKey()

    // Check if already exists
    const { data: existing } = await admin.from("contractors").select("id, email").eq("email", c.email).single()
    if (existing) {
      console.log(`  Skip (exists): ${c.company}`)
      results.push({ company: c.company, email: c.email, password: "(existing)", apiKey: "(existing)", status: c.paused ? "suspended" : "active" })
      continue
    }

    // Create auth user
    let userId: string
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email: c.email, password, email_confirm: true,
    })
    if (userError) {
      const { data: list } = await admin.auth.admin.listUsers()
      const found = list?.users.find(u => u.email === c.email)
      if (!found) { console.error(`  Error ${c.company}:`, userError.message); continue }
      userId = found.id
    } else {
      userId = created.user.id
    }

    const status = c.paused ? "suspended" : "active"

    const { error } = await admin.from("contractors").upsert({
      id: userId,
      email: c.email,
      full_name: c.company,
      company_name: c.company,
      status,
      lead_credits: c.owe,
      lead_credits_used: c.pd,
      monday_board_id: c.boardId,
      api_key: apiKey,
    }, { onConflict: "email" })

    if (error) { console.error(`  Error upserting ${c.company}:`, error.message); continue }

    console.log(`  ✓ ${c.company} (${status}) — ${c.owe} credits remaining`)
    results.push({ company: c.company, email: c.email, password, apiKey, status })
  }

  // Print CSV for Google Sheets
  console.log("\n\n=== CREDENTIALS CSV ===")
  console.log("Company,Email,Password,API Key,Status,Credits Remaining,Credits Used")
  for (const r of results) {
    const c = CONTRACTORS.find(x => x.company === r.company)!
    console.log(`"${r.company}","${r.email}","${r.password}","${r.apiKey}","${r.status}","${c.owe}","${c.pd}"`)
  }
}

main().catch(console.error)
