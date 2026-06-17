"use client"

import { useState } from "react"
import { Loader2, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LeadPackage } from "@/lib/config"

export function PackageGrid({ packages }: { packages: LeadPackage[] }) {
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null)
  const [submittedLabel, setSubmittedLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function requestPackage(pkg: LeadPackage) {
    setError(null)
    setLoadingLabel(pkg.label)
    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: pkg.credits, label: pkg.label }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unable to submit request. Please try again.")
      } else {
        setSubmittedLabel(pkg.label)
      }
    } catch {
      setError("Unable to submit request. Please try again.")
    }
    setLoadingLabel(null)
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {submittedLabel && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Your request for the <strong>{submittedLabel}</strong> package has been submitted. Your NDRT rep will be in touch to confirm.
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {packages.map((pkg) => (
          <Card
            key={pkg.label}
            className={cn(
              "relative flex flex-col",
              pkg.popular && "border-2 border-gold shadow-md"
            )}
          >
            {pkg.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy">
                Most Popular
              </Badge>
            )}
            <CardContent className="flex flex-1 flex-col p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {pkg.label}
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-navy">{pkg.credits}</span>
                <span className="text-sm text-gray-500">leads</span>
              </div>
              <Button
                variant="gold"
                className="mt-6"
                disabled={loadingLabel !== null || submittedLabel === pkg.label}
                onClick={() => requestPackage(pkg)}
              >
                {loadingLabel === pkg.label && <Loader2 className="h-4 w-4 animate-spin" />}
                {submittedLabel === pkg.label ? "Request Sent" : "Request Package"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
