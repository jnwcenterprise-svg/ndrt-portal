"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ManagePaymentButton() {
  const [loading, setLoading] = useState(false)

  async function openPortal() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={openPortal} disabled={loading}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Manage Payment Method
    </Button>
  )
}
