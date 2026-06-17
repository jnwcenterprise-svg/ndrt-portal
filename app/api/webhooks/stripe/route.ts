import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { LEAD_PACKAGES } from "@/lib/config"
import { sendCreditsAddedEmail, sendPaymentFailedEmail } from "@/lib/resend"
import type { Contractor } from "@/lib/types"

type Admin = ReturnType<typeof createAdminClient>

const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
]

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await request.text()
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (!HANDLED_EVENTS.includes(event.type)) {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const admin = createAdminClient()

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // Card payments are already paid here. ACH sessions complete with
        // payment_status "unpaid" while the debit settles — record the
        // purchase as pending but do NOT grant credits yet.
        if (session.payment_status === "paid") {
          await fulfillSession(session, stripe, admin)
        } else {
          await recordPendingPurchase(session, admin)
        }
        break
      case "checkout.session.async_payment_succeeded":
        // ACH settled — grant the credits now
        await fulfillSession(session, stripe, admin)
        break
      case "checkout.session.async_payment_failed":
        await markPurchaseFailed(session, admin)
        break
    }
  } catch (err) {
    console.error(`[stripe webhook] ${event.type} handling failed:`, err)
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null
}

async function findContractor(
  session: Stripe.Checkout.Session,
  admin: Admin
): Promise<Contractor | null> {
  if (session.metadata?.contractor_id) {
    const { data } = await admin
      .from("contractors")
      .select("*")
      .eq("id", session.metadata.contractor_id)
      .single<Contractor>()
    if (data) return data
  }
  if (session.customer) {
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer.id
    const { data } = await admin
      .from("contractors")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .single<Contractor>()
    if (data) return data
  }
  return null
}

function resolveCredits(session: Stripe.Checkout.Session): number {
  const priceId = session.metadata?.stripe_price_id ?? null
  const pkg = LEAD_PACKAGES.find(
    (p) => p.stripe_price_id && p.stripe_price_id === priceId
  )
  return pkg?.credits ?? 0
}

// Idempotent fulfillment: grants credits exactly once per payment intent,
// whether the purchase row already exists as pending (ACH) or not (card).
async function fulfillSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  admin: Admin
) {
  const intentId = paymentIntentId(session)
  const contractor = await findContractor(session, admin)
  if (!contractor) {
    console.error("[stripe webhook] contractor not found for session", session.id)
    return
  }
  const credits = resolveCredits(session)
  if (!credits) {
    console.error("[stripe webhook] could not resolve credits for session", session.id)
    return
  }

  const { data: existing } = intentId
    ? await admin
        .from("purchases")
        .select("id, status")
        .eq("stripe_payment_intent_id", intentId)
        .maybeSingle()
    : { data: null }

  if (existing?.status === "completed") return // already fulfilled

  let receiptUrl: string | null = null
  if (intentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(intentId, {
        expand: ["latest_charge"],
      })
      receiptUrl = (pi.latest_charge as Stripe.Charge | null)?.receipt_url ?? null
    } catch (err) {
      console.error("[stripe webhook] receipt lookup failed:", err)
    }
  }

  const newBalance = contractor.lead_credits + credits
  const { error: creditError } = await admin
    .from("contractors")
    .update({ lead_credits: newBalance })
    .eq("id", contractor.id)
  if (creditError) throw creditError

  if (existing) {
    await admin
      .from("purchases")
      .update({ status: "completed", receipt_url: receiptUrl })
      .eq("id", existing.id)
  } else {
    await admin.from("purchases").insert({
      contractor_id: contractor.id,
      stripe_payment_intent_id: intentId,
      stripe_price_id: session.metadata?.stripe_price_id ?? null,
      amount: session.amount_total ?? 0,
      credits_purchased: credits,
      status: "completed",
      receipt_url: receiptUrl,
    })
  }

  await sendCreditsAddedEmail(contractor.email, credits, newBalance)
}

// ACH checkout completed but the debit hasn't settled — record it so the
// contractor sees the purchase as processing on the billing page.
async function recordPendingPurchase(
  session: Stripe.Checkout.Session,
  admin: Admin
) {
  const intentId = paymentIntentId(session)
  const contractor = await findContractor(session, admin)
  if (!contractor) return

  if (intentId) {
    const { data: existing } = await admin
      .from("purchases")
      .select("id")
      .eq("stripe_payment_intent_id", intentId)
      .maybeSingle()
    if (existing) return
  }

  await admin.from("purchases").insert({
    contractor_id: contractor.id,
    stripe_payment_intent_id: intentId,
    stripe_price_id: session.metadata?.stripe_price_id ?? null,
    amount: session.amount_total ?? 0,
    credits_purchased: resolveCredits(session),
    status: "pending",
  })
}

async function markPurchaseFailed(
  session: Stripe.Checkout.Session,
  admin: Admin
) {
  const intentId = paymentIntentId(session)
  const contractor = await findContractor(session, admin)

  if (intentId) {
    await admin
      .from("purchases")
      .update({ status: "failed" })
      .eq("stripe_payment_intent_id", intentId)
      .neq("status", "completed")
  }
  if (contractor) {
    await sendPaymentFailedEmail(contractor.email)
  }
}
