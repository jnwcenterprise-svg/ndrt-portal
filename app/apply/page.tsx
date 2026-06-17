"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { StatesMultiSelect } from "@/components/ui/states-multi-select"

const TRADE_TYPES = [
  "Commercial Roofing",
  "Residential Roofing",
  "General Contractor",
  "Restoration",
  "Other",
]

export default function ApplyPage() {
  const [fullName, setFullName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [states, setStates] = useState<string[]>([])
  const [tradeType, setTradeType] = useState(TRADE_TYPES[0])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (states.length === 0) {
      setError("Select at least one state you cover.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          company_name: companyName,
          phone,
          email,
          states,
          trade_type: tradeType,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Submission failed")
      }
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Submission failed. Please try again."
      )
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy px-4">
        <div className="w-full max-w-md rounded-lg bg-navy-light p-10 text-center shadow-xl ring-1 ring-navy-border">
          <div className="text-3xl font-bold text-white">
            NDRT<span className="text-gold">.</span>
          </div>
          <h1 className="mt-6 text-xl font-semibold text-white">
            Application received.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            We&apos;ll review it within 24 hours and reach out to get you set up.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-gold hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-navy px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight text-white">
            NDRT<span className="text-gold">.</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white">
            Contractor Application
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            NDRT partners with vetted commercial roofing contractors. Tell us
            about your operation.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg bg-navy-light p-8 shadow-xl ring-1 ring-navy-border"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-gray-300">
                Full Name
              </Label>
              <Input
                id="full_name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-navy-border bg-navy text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company_name" className="text-gray-300">
                Company Name
              </Label>
              <Input
                id="company_name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="border-navy-border bg-navy text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-gray-300">
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-navy-border bg-navy text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-navy-border bg-navy text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trade_type" className="text-gray-300">
              Trade Type
            </Label>
            <Select
              id="trade_type"
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value)}
              className="border-navy-border bg-navy text-white"
            >
              {TRADE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">States Covered</Label>
            <div className="rounded-md bg-white p-3">
              <StatesMultiSelect value={states} onChange={setStates} />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Application
          </Button>

          <p className="text-center text-sm text-gray-400">
            Already approved?{" "}
            <Link href="/login" className="font-medium text-gold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
