import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import type { Contractor } from "@/lib/types"

export async function POST() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: contractor } = await supabase
    .from("contractors")
    .select("*")
    .eq("id", user.id)
    .single<Contractor>()

  if (!contractor?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No payment method on file yet. Make a purchase first." },
      { status: 400 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const session = await stripe.billingPortal.sessions.create({
    customer: contractor.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
