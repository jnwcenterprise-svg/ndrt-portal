// Standardizes all contractor Monday boards to match the master board structure.
// - Adds any missing columns
// - Adds any missing standard groups
// - Moves items from non-standard groups into the correct standard group
// - Never deletes items, columns, or data
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
config({ path: ".env.local" })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const MASTER_BOARD_ID = "18416170901"

// Standard groups in order — title must match master exactly
const STANDARD_GROUPS = [
  "PR- Rep Info Only",
  "NEW LEADS",
  "PENDING PAYROLL",
  "PAID DIALER",
  "Do Not Call",
  "SIGNED",
  "DENIED LEAD",
]

// Map non-standard group names (lowercase) → standard group title
const GROUP_ALIASES: Record<string, string> = {
  // New
  "new lead":                   "NEW LEADS",
  "new leads":                  "NEW LEADS",
  "new":                        "NEW LEADS",
  // Pending
  "pending payroll":            "PENDING PAYROLL",
  "pending":                    "PENDING PAYROLL",
  // Paid
  "paid dialer":                "PAID DIALER",
  "paid":                       "PAID DIALER",
  "paid leads":                 "PAID DIALER",
  "paid 2026":                  "PAID DIALER",
  "2025 paid":                  "PAID DIALER",
  // Signed
  "signed":                     "SIGNED",
  // Denied
  "denied lead":                "DENIED LEAD",
  "denied":                     "DENIED LEAD",
  "2025 denied":                "DENIED LEAD",
  "dead lead":                  "DENIED LEAD",
  "denied/ not inspected":      "DENIED LEAD",
  "need rescheduled or dead":   "DENIED LEAD",
  // Do Not Call
  "do not call":                "Do Not Call",
}

// Groups to leave as-is (rep/contractor info — not leads)
const SKIP_GROUPS = new Set([
  "pr- rep info only",
  "pr - rep info only",  // variant with spaces around dash
  "rep info",
  "contractor's contact info",
  "contact info",
  "exteriors rep info",
  "fix",
  "no answer",
  "follow up with owner",
  "overwatch",
  "pending",   // DM Construction uses this for something else — will be handled by alias
])

async function mondayRequest(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

async function getBoardStructure(boardId: string) {
  const data = await mondayRequest(`
    query {
      boards(ids: [${boardId}]) {
        columns { id title type }
        groups { id title }
        items_page(limit: 500) {
          items { id name group { id title } }
        }
      }
    }
  `)
  return data.boards[0]
}

async function createColumn(boardId: string, title: string, columnType: string) {
  const data = await mondayRequest(`
    mutation($boardId: ID!, $title: String!, $columnType: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $columnType) { id title }
    }
  `, { boardId, title, columnType })
  return data.create_column
}

async function createGroup(boardId: string, groupName: string) {
  const data = await mondayRequest(`
    mutation($boardId: ID!, $groupName: String!) {
      create_group(board_id: $boardId, group_name: $groupName) { id title }
    }
  `, { boardId, groupName })
  return data.create_group
}

async function moveItemToGroup(_boardId: string, itemId: string, groupId: string) {
  await mondayRequest(`
    mutation($itemId: ID!, $groupId: String!) {
      move_item_to_group(item_id: $itemId, group_id: $groupId) { id }
    }
  `, { itemId, groupId })
}

async function standardizeBoard(
  contractor: { company_name: string; monday_board_id: string },
  masterColumns: any[]
) {
  const boardId = contractor.monday_board_id
  console.log(`\n=== ${contractor.company_name} (board ${boardId}) ===`)

  let board: any
  try {
    board = await getBoardStructure(boardId)
  } catch (e: any) {
    console.log(`  ERROR fetching board: ${e.message}`)
    return
  }

  // --- 1. Add missing columns ---
  const existingCols = new Set(board.columns.map((c: any) => c.title.toLowerCase()))
  const skipColTypes = new Set(["subtasks", "name"])

  for (const col of masterColumns) {
    if (skipColTypes.has(col.type)) continue
    if (existingCols.has(col.title.toLowerCase())) continue

    // Map monday column types to create_column ColumnType enum
    const typeMap: Record<string, string> = {
      text: "text",
      date: "date",
      numbers: "numbers",
      email: "email",
      phone: "phone",
      people: "people",
      long_text: "long_text",
      status: "status",
      color: "status",
    }
    const colType = typeMap[col.type] ?? "text"

    try {
      await createColumn(boardId, col.title, colType)
      console.log(`  + Column: ${col.title}`)
    } catch (e: any) {
      console.log(`  ! Could not create column "${col.title}": ${e.message}`)
    }
  }

  // --- 2. Add missing standard groups ---
  const existingGroupTitles = new Set(board.groups.map((g: any) => g.title.trim()))
  const groupTitleToId: Record<string, string> = {}
  for (const g of board.groups) groupTitleToId[g.title.trim()] = g.id

  for (const groupName of STANDARD_GROUPS) {
    if (existingGroupTitles.has(groupName)) continue
    try {
      const created = await createGroup(boardId, groupName)
      groupTitleToId[groupName] = created.id
      console.log(`  + Group: ${groupName}`)
    } catch (e: any) {
      console.log(`  ! Could not create group "${groupName}": ${e.message}`)
    }
  }

  // Re-fetch groups to get IDs for any newly created ones
  const refreshed = await getBoardStructure(boardId)
  for (const g of refreshed.groups) groupTitleToId[g.title.trim()] = g.id

  // --- 3. Move items from non-standard groups to standard groups ---
  let moved = 0
  for (const item of board.items_page.items) {
    const groupTitle = item.group.title.trim()
    const groupKey = groupTitle.toLowerCase()

    // Already in a standard group — skip
    if (STANDARD_GROUPS.includes(groupTitle)) continue
    // Rep info groups — leave alone
    if (SKIP_GROUPS.has(groupKey)) continue

    const targetGroupName = GROUP_ALIASES[groupKey]
    if (!targetGroupName) {
      console.log(`  ? Unknown group "${groupTitle}" for item: ${item.name} — skipping`)
      continue
    }

    const targetGroupId = groupTitleToId[targetGroupName]
    if (!targetGroupId) {
      console.log(`  ! No ID for target group "${targetGroupName}" — skipping item: ${item.name}`)
      continue
    }

    try {
      await moveItemToGroup(boardId, item.id, targetGroupId)
      console.log(`  → Moved "${item.name}" from "${groupTitle}" → "${targetGroupName}"`)
      moved++
    } catch (e: any) {
      console.log(`  ! Failed to move "${item.name}": ${e.message}`)
    }
  }

  console.log(`  Done. ${moved} items moved.`)
}

async function main() {
  // Get master board columns to use as template
  const masterBoard = await getBoardStructure(MASTER_BOARD_ID)
  const masterColumns = masterBoard.columns
  console.log(`Master board columns: ${masterColumns.map((c: any) => c.title).join(", ")}`)

  // Get all active contractors with a Monday board
  const { data: contractors } = await admin
    .from("contractors")
    .select("company_name, monday_board_id")
    .not("monday_board_id", "is", null)
    .neq("monday_board_id", MASTER_BOARD_ID)

  for (const c of contractors ?? []) {
    await standardizeBoard(c as any, masterColumns)
  }

  console.log("\n=== ALL BOARDS STANDARDIZED ===")
}

main().catch(console.error)
