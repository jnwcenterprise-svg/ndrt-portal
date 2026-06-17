import { config } from "dotenv"
config({ path: ".env.local" })

const MASTER_BOARD_ID = "18416170901"

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

async function createColumn(boardId: string, title: string, columnType: string) {
  const data = await mondayRequest(`
    mutation($boardId: ID!, $title: String!, $columnType: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $columnType) {
        id title
      }
    }
  `, { boardId, title, columnType })
  return data.create_column
}

async function main() {
  // Check existing columns
  const data = await mondayRequest(`
    query { boards(ids: [${MASTER_BOARD_ID}]) { columns { id title type } } }
  `)
  const existing = data.boards[0].columns.map((c: any) => c.title.toLowerCase())
  console.log("Existing columns:", existing)

  const toAdd = [
    { title: "Address",        columnType: "text" },
    { title: "DOL",            columnType: "date" },
    { title: "(if) Hail Size", columnType: "text" },
    { title: "Damage Type",    columnType: "text" },
    { title: "Roof Type",      columnType: "text" },
    { title: "sq ft",          columnType: "numbers" },
  ]

  for (const col of toAdd) {
    if (existing.includes(col.title.toLowerCase())) {
      console.log(`  Skip (exists): ${col.title}`)
      continue
    }
    const created = await createColumn(MASTER_BOARD_ID, col.title, col.columnType)
    console.log(`  Created: ${created.title} (${created.id})`)
  }

  console.log("\nDone.")
}

main().catch(console.error)
