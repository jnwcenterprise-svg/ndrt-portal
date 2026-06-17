"use client"

import { useState } from "react"
import { Copy, RefreshCw, Eye, EyeOff, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const ENDPOINT = "https://portal.naturaldisasterresponseteam.com/api/v1/leads"

export function ApiKeyCard({ initialKey }: { initialKey: string | null }) {
  const [apiKey, setApiKey] = useState(initialKey ?? "")
  const [visible, setVisible] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedEndpoint, setCopiedEndpoint] = useState(false)
  const [copiedHeader, setCopiedHeader] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")

  function copyWith(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  async function handleRegenerate() {
    if (!confirm("Regenerate your API key? Your current key will stop working immediately.")) return
    setStatus("loading")
    const res = await fetch("/api/v1/regenerate-key", { method: "POST" })
    if (!res.ok) { setStatus("error"); return }
    const { api_key } = await res.json()
    setApiKey(api_key)
    setVisible(true)
    setStatus("idle")
  }

  if (!apiKey) return null

  const headerValue = `Authorization: Bearer ${apiKey}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>CRM Integration</CardTitle>
        <CardDescription>
          Connect your CRM to automatically sync leads. Pass your API key as an Authorization header on a GET request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        <div className="space-y-1.5">
          <Label>Endpoint</Label>
          <div className="flex gap-2">
            <Input readOnly value={ENDPOINT} className="font-mono text-sm" />
            <Button variant="outline" size="sm" onClick={() => copyWith(ENDPOINT, setCopiedEndpoint)}>
              {copiedEndpoint ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>API Key</Label>
          <div className="flex gap-2">
            <Input readOnly type={visible ? "text" : "password"} value={apiKey} className="font-mono text-sm" />
            <Button variant="outline" size="sm" onClick={() => setVisible(v => !v)}>
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => copyWith(apiKey, setCopiedKey)}>
              {copiedKey ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Authorization Header</Label>
          <div className="flex gap-2">
            <Input readOnly value={headerValue} className="font-mono text-sm" />
            <Button variant="outline" size="sm" onClick={() => copyWith(headerValue, setCopiedHeader)}>
              {copiedHeader ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Add this header to your GET request.</p>
        </div>

        {status === "error" && <p className="text-xs text-red-600">Failed to regenerate key</p>}
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={status === "loading"}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Regenerate Key
        </Button>
      </CardContent>
    </Card>
  )
}
