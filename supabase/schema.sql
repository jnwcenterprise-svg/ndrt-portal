-- NDRT Contractor Portal — Supabase schema
-- Run in the Supabase SQL editor (or via supabase db push) before seeding.

-- =========================================================================
-- Enums
-- =========================================================================
create type contractor_status as enum ('pending', 'active', 'suspended');

create type asset_class as enum (
  'warehouse', 'distribution', 'retail', 'office', 'hotel',
  'school', 'municipal', 'multifamily', 'industrial'
);

create type lead_pool_status as enum ('available', 'assigned', 'closed');

create type contractor_lead_status as enum (
  'new', 'pending', 'paid', 'signed', 'denied', 'do_not_call'
);

create type billing_status as enum ('delivered', 'pending_payroll', 'paid');

-- 'pending' covers ACH payments still settling (~4 business days); credits
-- are only granted when Stripe confirms the payment succeeded.
create type purchase_status as enum ('pending', 'completed', 'refunded', 'failed');

-- =========================================================================
-- Tables
-- =========================================================================

-- contractors.id matches auth.users.id for activated accounts so RLS can use
-- auth.uid() = id. Applications submitted via /apply get a random uuid; when
-- NDRT activates a contractor, create the auth user and update the row's id
-- to the new auth user id.
create table contractors (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  company_name text not null,
  phone text,
  states text[] not null default '{}',
  trade_type text,
  status contractor_status not null default 'pending',
  stripe_customer_id text,
  lead_credits integer not null default 0,
  lead_credits_used integer not null default 0,
  monday_board_id text,
  monday_board_ids text[] not null default '{}',
  monday_workspace_id text,
  notification_emails text[] not null default '{}',
  crm_webhook_url text,
  portal_password text,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  property_name text not null,
  address text not null,
  city text not null,
  state text not null,
  square_footage integer,
  asset_class asset_class not null,
  contact_name text,
  contact_title text,
  contact_phone text,
  contact_email text,
  insurance_carrier text,
  claim_verified boolean not null default false,
  storm_event_date date,
  storm_event_id text,
  est_settlement_low integer,   -- cents
  est_settlement_high integer,  -- cents
  roof_type text,
  damage_type text,
  hail_size text,
  squares integer,
  dol date,
  appt_date date,
  appt_time text,
  lead_type text,
  ndrt_notes text,
  booked_by text,
  status lead_pool_status not null default 'available',
  created_at timestamptz not null default now()
);

create table contractor_leads (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  lead_status contractor_lead_status not null default 'new',
  billing_status billing_status not null default 'delivered',
  paid_at timestamptz,
  notes text,
  monday_item_id text,
  monday_group_id text,
  updated_at timestamptz not null default now(),
  unique (contractor_id, lead_id)
);

-- contractor_leads outcome fields (added post-launch):
-- lead_quality text ('good' | 'bad'), damage_found boolean,
-- outcome_notes text, outcome_submitted_at timestamptz, outcome_alert_sent_at timestamptz

-- Activity log for a lead — notes from contractor, Monday updates, NDRT
create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  contractor_lead_id uuid not null references contractor_leads(id) on delete cascade,
  source text not null default 'contractor', -- 'contractor' | 'monday' | 'ndrt'
  author text,
  content text not null,
  monday_update_id text unique,
  created_at timestamptz not null default now()
);

create index lead_notes_cl_idx on lead_notes (contractor_lead_id, created_at desc);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  stripe_payment_intent_id text,
  stripe_price_id text,
  amount integer not null default 0,  -- cents
  credits_purchased integer not null default 0,
  status purchase_status not null default 'pending',
  receipt_url text,
  created_at timestamptz not null default now()
);

create index contractor_leads_contractor_idx on contractor_leads (contractor_id, delivered_at desc);
create index contractor_leads_monday_item_idx on contractor_leads (monday_item_id);
create index purchases_contractor_idx on purchases (contractor_id, created_at desc);
create index purchases_payment_intent_idx on purchases (stripe_payment_intent_id);

-- updated_at maintenance
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger contractor_leads_updated_at
  before update on contractor_leads
  for each row execute function set_updated_at();

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table contractors enable row level security;
alter table leads enable row level security;
alter table contractor_leads enable row level security;
alter table purchases enable row level security;

-- contractors: SELECT and UPDATE own row only
create policy "contractors select own row"
  on contractors for select
  using (auth.uid() = id);

create policy "contractors update own row"
  on contractors for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Column-level lockdown: contractors may only change profile fields. Credits,
-- status, Stripe and Monday ids are service-role only.
revoke update on contractors from authenticated;
grant update (full_name, phone, company_name, states) on contractors to authenticated;

-- leads: read-only, and only leads linked to the contractor
create policy "leads select assigned"
  on leads for select
  using (
    exists (
      select 1 from contractor_leads cl
      where cl.lead_id = leads.id and cl.contractor_id = auth.uid()
    )
  );

-- contractor_leads: SELECT own rows; UPDATE own rows but ONLY the notes
-- column (column-level grant). lead_status / billing_status are never
-- updatable by the contractor role.
create policy "contractor_leads select own"
  on contractor_leads for select
  using (contractor_id = auth.uid());

create policy "contractor_leads update own notes"
  on contractor_leads for update
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

revoke update on contractor_leads from authenticated;
grant update (notes) on contractor_leads to authenticated;

-- purchases: SELECT own rows only
create policy "purchases select own"
  on purchases for select
  using (contractor_id = auth.uid());
