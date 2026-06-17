"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CrmWebhookForm({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "")
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  async function handleSave() {
    setStatus("saving")
    const res = await fetch("/api/settings/crm-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() || null }),
    })
    if (!res.ok) { setStatus("error"); return }
    setStatus("saved")
    setTimeout(() => setStatus("idle"), 3000)
  }

  async function handleClear() {
    if (!confirm("Remove the CRM webhook URL? Leads will no longer be pushed automatically.")) return
    setUrl("")
    setStatus("saving")
    const res = await fetch("/api/settings/crm-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: null }),
    })
    if (!res.ok) { setStatus("error"); return }
    setStatus("saved")
    setTimeout(() => setStatus("idle"), 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CRM Push Webhook</CardTitle>
        <CardDescription>
          Paste your GoHighLevel (or any CRM) inbound webhook URL. When a lead is delivered to you, we'll instantly POST the full lead details to this URL so it appears in your CRM automatically — no manual entry required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="crm-webhook-url">Webhook URL</Label>
          <Input
            id="crm-webhook-url"
            type="url"
            placeholder="https://services.leadconnectorhq.com/hooks/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            In GoHighLevel: Settings → Integrations → Webhooks → New Webhook → copy the URL here.
          </p>
        </div>

        {status === "error" && <p className="text-xs text-red-600">Failed to save — please try again.</p>}
        {status === "saved" && <p className="text-xs text-emerald-600">Saved successfully.</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={status === "saving"} size="sm">
            {status === "saving" ? "Saving…" : "Save Webhook"}
          </Button>
          {url && (
            <Button variant="outline" size="sm" onClick={handleClear} disabled={status === "saving"}>
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
