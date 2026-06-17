export interface LeadPackage {
  credits: number
  price_cents: number
  label: string
  stripe_price_id: string
  popular?: boolean
}

// Single source of truth for lead credit packages.
// Pricing: $795 per lead, flat across all tiers.
// Fill in stripe_price_id before launch (one Stripe Price per package).
// Minimum package is 15 leads. No custom quantities exist in the portal UI —
// anything below 15 or outside these tiers is handled off-portal by NDRT.
export const PRICE_PER_LEAD_CENTS = 99500

export const LEAD_PACKAGES: LeadPackage[] = [
  { credits: 15, price_cents: 15 * PRICE_PER_LEAD_CENTS, label: "Starter",    stripe_price_id: "price_1ThGc35R0CUj0ySCCEIbxOQS" },
  { credits: 20, price_cents: 20 * PRICE_PER_LEAD_CENTS, label: "Growth",     stripe_price_id: "price_1ThGc45R0CUj0ySCGG2hrUTn" },
  { credits: 25, price_cents: 25 * PRICE_PER_LEAD_CENTS, label: "Pro",        stripe_price_id: "price_1ThGc55R0CUj0ySClabUrRBE", popular: true },
  { credits: 30, price_cents: 30 * PRICE_PER_LEAD_CENTS, label: "Advanced",   stripe_price_id: "price_1ThGc65R0CUj0ySCr3xrZ1mL" },
  { credits: 35, price_cents: 35 * PRICE_PER_LEAD_CENTS, label: "Scale",      stripe_price_id: "price_1ThGc75R0CUj0ySCiKow9YQD" },
  { credits: 40, price_cents: 40 * PRICE_PER_LEAD_CENTS, label: "Elite",      stripe_price_id: "price_1ThGc85R0CUj0ySCFFS8ugRx" },
  { credits: 50, price_cents: 50 * PRICE_PER_LEAD_CENTS, label: "Enterprise", stripe_price_id: "price_1ThGc95R0CUj0ySC7xXdLKKa" },
]

export const NDRT_CONTACT = {
  email: "intake@naturaldisasterresponseteam.com",
  phone: "(469) 756-5859",
}

export const EMAIL_FROM = "NDRT <leads@naturaldisasterresponseteam.com>"

// Credits remaining at or below this threshold triggers the low-balance email
export const LOW_CREDIT_THRESHOLD = 3

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const
