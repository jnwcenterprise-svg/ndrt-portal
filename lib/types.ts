export type ContractorStatus = "pending" | "active" | "suspended"

export type AssetClass =
  | "warehouse"
  | "distribution"
  | "retail"
  | "office"
  | "hotel"
  | "school"
  | "municipal"
  | "multifamily"
  | "industrial"

export type LeadPoolStatus = "available" | "assigned" | "closed"

export type LeadStatus = "new" | "pending" | "paid" | "signed" | "denied" | "do_not_call"

export type BillingStatus = "delivered" | "pending_payroll" | "paid"

export type PurchaseStatus = "pending" | "completed" | "refunded" | "failed"

export interface Contractor {
  id: string
  email: string
  full_name: string
  company_name: string
  phone: string | null
  states: string[]
  trade_type: string | null
  status: ContractorStatus
  stripe_customer_id: string | null
  lead_credits: number
  lead_credits_used: number
  lead_credits_total: number
  monday_board_id: string | null
  monday_board_ids: string[] | null
  monday_workspace_id: string | null
  notification_emails: string[] | null
  api_key: string | null
  crm_webhook_url: string | null
  created_at: string
}

export interface Lead {
  id: string
  property_name: string
  address: string
  city: string
  state: string
  square_footage: number | null
  asset_class: AssetClass
  contact_name: string | null
  contact_title: string | null
  contact_phone: string | null
  contact_email: string | null
  insurance_carrier: string | null
  claim_verified: boolean
  storm_event_date: string | null
  storm_event_id: string | null
  est_settlement_low: number | null
  est_settlement_high: number | null
  roof_type: string | null
  damage_type: string | null
  hail_size: string | null
  squares: number | null
  dol: string | null
  appt_date: string | null
  appt_time: string | null
  booked_by: string | null
  lead_type: string | null
  ndrt_notes: string | null
  status: LeadPoolStatus
  created_at: string
}

export interface ContractorLead {
  id: string
  contractor_id: string
  lead_id: string
  delivered_at: string
  lead_status: LeadStatus
  billing_status: BillingStatus
  paid_at: string | null
  notes: string | null
  monday_item_id: string | null
  monday_group_id: string | null
  lead_quality: "good" | "bad" | null
  damage_found: boolean | null
  outcome_notes: string | null
  outcome_submitted_at: string | null
  outcome_alert_sent_at: string | null
  updated_at: string
  lead?: Lead
}

export interface LeadNote {
  id: string
  contractor_lead_id: string
  source: "contractor" | "monday" | "ndrt"
  author: string | null
  content: string
  monday_update_id: string | null
  created_at: string
}

export interface Purchase {
  id: string
  contractor_id: string
  stripe_payment_intent_id: string | null
  stripe_price_id: string | null
  amount: number
  credits_purchased: number
  status: PurchaseStatus
  receipt_url: string | null
  created_at: string
}
