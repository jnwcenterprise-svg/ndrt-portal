// Monday.com API helpers. Server-side only — requires MONDAY_API_TOKEN.
import type { Lead } from "@/lib/types"

const MONDAY_API_URL = "https://api.monday.com/v2"

export const NEW_LEADS_GROUP = "NEW LEADS"

// Monday group title → portal statuses.
// Keys are stored uppercase-trimmed; use lookupGroupStatus() for all lookups
// so casing and extra whitespace in Monday never cause a silent miss.
export const MONDAY_GROUP_STATUS_MAP: Record<
  string,
  { lead_status: string; billing_status: string }
> = {
  "NEW LEADS":      { lead_status: "new",        billing_status: "delivered" },
  "PENDING PAYROLL":{ lead_status: "pending",    billing_status: "pending_payroll" },
  "PAID DIALER":    { lead_status: "paid",        billing_status: "paid" },
  "SIGNED":         { lead_status: "signed",      billing_status: "paid" },
  "DENIED LEAD":    { lead_status: "denied",      billing_status: "delivered" },
  "DO NOT CALL":    { lead_status: "do_not_call", billing_status: "delivered" },
}

/** Case- and whitespace-insensitive group title lookup. */
export function lookupGroupStatus(
  groupTitle: string
): { lead_status: string; billing_status: string } | undefined {
  return MONDAY_GROUP_STATUS_MAP[groupTitle.trim().toUpperCase()]
}

async function mondayRequest<T = any>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()
  if (!res.ok || json.errors) {
    throw new Error(
      `Monday API error: ${JSON.stringify(json.errors ?? json)}`
    )
  }
  return json.data as T
}

interface BoardMeta {
  groups: { id: string; title: string }[]
  columns: { id: string; title: string; type: string }[]
}

export async function getBoardMeta(boardId: string): Promise<BoardMeta> {
  const data = await mondayRequest<{
    boards: { groups: BoardMeta["groups"]; columns: BoardMeta["columns"] }[]
  }>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        groups { id title }
        columns { id title type }
      }
    }`,
    { boardId: [boardId] }
  )
  const board = data.boards?.[0]
  if (!board) throw new Error(`Monday board ${boardId} not found`)
  return board
}

// Duplicate the master template board for a newly activated contractor and
// rename it "[Company Name] — NDRT Leads".
export async function duplicateMasterBoard(companyName: string): Promise<{
  boardId: string
  workspaceId: string | null
}> {
  const data = await mondayRequest<{
    duplicate_board: { board: { id: string; workspace_id: string | null } }
  }>(
    `mutation ($boardId: ID!) {
      duplicate_board(
        board_id: $boardId,
        duplicate_type: duplicate_board_with_structure
      ) {
        board { id workspace_id }
      }
    }`,
    { boardId: process.env.MONDAY_MASTER_BOARD_ID! }
  )

  const board = data.duplicate_board.board
  const name = `${companyName} — NDRT Leads`

  await mondayRequest(
    `mutation ($boardId: ID!, $name: String!) {
      update_board(board_id: $boardId, board_attribute: name, new_value: $name)
    }`,
    { boardId: board.id, name }
  )

  return {
    boardId: String(board.id),
    workspaceId: board.workspace_id ? String(board.workspace_id) : null,
  }
}

// Register portal webhooks on a contractor board. Monday's subscription enums
// are change_column_value / item_moved_to_any_group; the delivered payloads
// arrive as change_column_value(s) / move_item_to_group events.
export async function registerBoardWebhooks(boardId: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/monday`
  const events = ["change_column_value", "item_moved_to_any_group", "create_update", "create_item"]

  for (const event of events) {
    await mondayRequest(
      `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
        create_webhook(board_id: $boardId, url: $url, event: $event) { id }
      }`,
      { boardId, url, event }
    )
  }
}

// Encode a value for change_column_value/create_item based on the column's
// actual type. The NDRT master board uses plain text columns for Phone
// Number, Email, and Notes, and a dropdown for Booked By — resolved at
// runtime so boards with the standard typed columns also work.
function encodeColumnValue(type: string, value: string): unknown {
  switch (type) {
    case "text":
      return value
    case "long_text":
      return { text: value }
    case "phone":
      return { phone: value.replace(/\D/g, ""), countryShortName: "US" }
    case "email":
      return { email: value, text: value }
    case "date":
      return { date: value }
    case "dropdown":
      return { labels: [value] }
    default:
      return value
  }
}

export function buildBriefingBlock(lead: Lead): string {
  return [
    `Address: ${lead.address}, ${lead.city}, ${lead.state}`,
    `Squares: ${lead.squares ?? "—"} | Roof Type: ${lead.roof_type ?? "—"}`,
    `DOL: ${lead.dol ?? "—"} | Damage: ${lead.damage_type ?? "—"} | Hail: ${lead.hail_size ?? "—"}`,
    `Contact: ${lead.contact_name ?? "—"}, ${lead.contact_title ?? "—"}`,
    `Phone: ${lead.contact_phone ?? "—"} | Email: ${lead.contact_email ?? "—"}`,
  ].join("\n")
}

// Create a lead item in the NEW LEADS group on a contractor's board.
// Column ids can differ between duplicated boards, so columns are resolved by
// title against the live board.
export async function createLeadItem(
  boardId: string,
  lead: Lead,
  deliveredAt: Date
): Promise<{ itemId: string; groupId: string }> {
  const meta = await getBoardMeta(boardId)

  // Match "NEW LEADS", "New Lead", "new leads", etc.
  const group = meta.groups.find(
    (g) => g.title.trim().toUpperCase().replace(/S$/, "") === NEW_LEADS_GROUP.replace(/S$/, "")
  )
  if (!group) {
    throw new Error(`No "new lead(s)" group found on board ${boardId}`)
  }

  const col = (...titles: string[]) =>
    titles.reduce<(typeof meta.columns)[0] | undefined>(
      (found, t) => found ?? meta.columns.find((c) => c.title.toLowerCase() === t.toLowerCase()),
      undefined
    )

  const columnValues: Record<string, unknown> = {}
  const set = (value: string | null | undefined, ...titles: string[]) => {
    const column = col(...titles)
    if (!column || value == null || value === "") return
    columnValues[column.id] = encodeColumnValue(column.type, value)
  }

  set(lead.booked_by, "Booked By", "Owner Name", "Rep Name")
  set(lead.property_name, "Business Name", "Property Name", "Company")
  set(lead.contact_phone, "Phone Number", "Phone", "Contact Phone")
  set(lead.contact_email, "Email", "Contact Email")
  set(deliveredAt.toISOString().slice(0, 10), "Date", "Delivery Date")
  set(buildBriefingBlock(lead), "Notes", "Details", "Description")

  const data = await mondayRequest<{ create_item: { id: string } }>(
    `mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues,
        create_labels_if_missing: true
      ) { id }
    }`,
    {
      boardId,
      groupId: group.id,
      itemName: lead.property_name,
      columnValues: JSON.stringify(columnValues),
    }
  )

  return { itemId: String(data.create_item.id), groupId: group.id }
}

// Update the Notes column on a Monday item. This is the only Monday write any
// portal (contractor) action can trigger.
export async function updateItemNotes(
  boardId: string,
  itemId: string,
  notesText: string
): Promise<void> {
  const meta = await getBoardMeta(boardId)
  const notesCol = meta.columns.find((c) => c.title.toLowerCase() === "notes")
  if (!notesCol) throw new Error(`Notes column not found on board ${boardId}`)

  await mondayRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) { id }
    }`,
    {
      boardId,
      itemId,
      columnId: notesCol.id,
      value: JSON.stringify(encodeColumnValue(notesCol.type, notesText)),
    }
  )
}

// The group title an item currently sits in — used by the webhook handler,
// since move payloads don't reliably include the destination group title.
export async function getItemGroupTitle(itemId: string): Promise<string | null> {
  const data = await mondayRequest<{
    items: { group: { id: string; title: string } }[]
  }>(
    `query ($itemId: [ID!]) {
      items(ids: $itemId) { group { id title } }
    }`,
    { itemId: [itemId] }
  )
  return data.items?.[0]?.group?.title ?? null
}

// Fetch all item updates (comments) and return them as a formatted string
export async function getItemUpdates(itemId: string): Promise<string> {
  const data = await mondayRequest<{
    items: { updates: { text_body: string; created_at: string; creator: { name: string } }[] }[]
  }>(
    `query ($itemId: [ID!]) {
      items(ids: $itemId) {
        updates(limit: 50) {
          text_body
          created_at
          creator { name }
        }
      }
    }`,
    { itemId: [itemId] }
  )
  const updates = data.items?.[0]?.updates ?? []
  if (!updates.length) return ""
  return updates
    .filter((u) => u.text_body?.trim())
    .map((u) => {
      const date = new Date(u.created_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
      return `[${date} — ${u.creator?.name ?? "NDRT"}] ${u.text_body.trim()}`
    })
    .join("\n\n")
}

export async function getItemNotesText(itemId: string): Promise<string | null> {
  const data = await mondayRequest<{
    items: { column_values: { id: string; text: string | null; column: { title: string } }[] }[]
  }>(
    `query ($itemId: [ID!]) {
      items(ids: $itemId) {
        column_values { id text column { title } }
      }
    }`,
    { itemId: [itemId] }
  )
  const cols = data.items?.[0]?.column_values ?? []
  const notes = cols.find((c) => c.column?.title?.toLowerCase() === "notes")
  return notes?.text ?? null
}

// Fetch every item on a board, paginated via cursor. Returns raw item data
// including all column values — used by the board→Supabase sync.
export interface MondayBoardItem {
  id: string
  name: string
  group: { id: string; title: string }
  column_values: {
    id: string
    text: string | null
    value: string | null
    column: { title: string; type: string }
  }[]
}

type BoardItemsPage = {
  boards: { items_page: { cursor: string | null; items: MondayBoardItem[] } }[]
}

export async function fetchAllBoardItems(boardId: string): Promise<MondayBoardItem[]> {
  const items: MondayBoardItem[] = []
  let cursor: string | null = null
  const query = `query ($boardId: [ID!], $cursor: String) {
    boards(ids: $boardId) {
      items_page(limit: 100, cursor: $cursor) {
        cursor
        items {
          id name
          group { id title }
          column_values { id text value column { title type } }
        }
      }
    }
  }`

  do {
    const result: BoardItemsPage = await mondayRequest(query, { boardId: [boardId], cursor })
    const page = result.boards?.[0]?.items_page
    if (!page) break
    items.push(...page.items)
    cursor = page.cursor ?? null
  } while (cursor)

  return items
}

// Fetch a single item with all column values — used by the create_pulse webhook handler.
export async function fetchBoardItem(itemId: string): Promise<MondayBoardItem | null> {
  const data = await mondayRequest<{ items: MondayBoardItem[] }>(
    `query ($itemId: [ID!]) {
      items(ids: $itemId) {
        id name
        group { id title }
        column_values { id text value column { title type } }
      }
    }`,
    { itemId: [itemId] }
  )
  return data.items?.[0] ?? null
}

// Move a Monday item to a different group by target group title
export async function moveItemToGroup(itemId: string, boardId: string, targetGroupTitle: string): Promise<void> {
  const meta = await getBoardMeta(boardId)
  const group = meta.groups.find((g) => g.title.trim().toUpperCase() === targetGroupTitle.trim().toUpperCase())
  if (!group) throw new Error(`Group "${targetGroupTitle}" not found on board ${boardId}`)
  await mondayRequest(
    `mutation ($itemId: ID!, $groupId: String!) {
      move_item_to_group(item_id: $itemId, group_id: $groupId) { id }
    }`,
    { itemId, groupId: group.id }
  )
}

// Post a comment/update to a Monday item (appears in the Updates tab)
export async function postMondayUpdate(itemId: string, body: string): Promise<string> {
  const data = await mondayRequest<{ create_update: { id: string } }>(
    `mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }`,
    { itemId, body }
  )
  return data.create_update?.id ?? ""
}
