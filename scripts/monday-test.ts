
import { createLeadItem, updateItemNotes } from "../lib/monday"

const BOARD = "18416170901"

const testLead: any = {
  property_name: "ZZ PORTAL TEST — DELETE ME",
  address: "123 Test St",
  city: "Dallas",
  state: "TX",
  squares: 100,
  roof_type: "TPO",
  dol: "2026-05-01",
  damage_type: "Hail",
  hail_size: '2"',
  contact_name: "Test Contact",
  contact_title: "Owner",
  contact_phone: "(214) 555-0100",
  contact_email: "test@example.com",
  booked_by: "Cody Chandler",
}

async function monday(query: string, variables: any = {}) {
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

async function main() {
  const { itemId, groupId } = await createLeadItem(BOARD, testLead, new Date())
  console.log("created item", itemId, "in group", groupId)

  await updateItemNotes(BOARD, itemId, "Updated notes from portal test — works.")
  console.log("notes updated")

  const data = await monday(
    `query ($id: [ID!]) { items(ids: $id) { name group { title } column_values { column { title } text } } }`,
    { id: [itemId] }
  )
  const item = data.items[0]
  console.log("readback:", item.name, "| group:", item.group.title)
  for (const cv of item.column_values) {
    if (cv.text) console.log(`  ${cv.column.title}: ${cv.text}`)
  }

  await monday(`mutation ($id: ID!) { delete_item(item_id: $id) { id } }`, { id: itemId })
  console.log("test item deleted")
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
