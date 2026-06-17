"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PasswordForm() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setState("error")
      setMessage("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setState("error")
      setMessage("Passwords do not match.")
      return
    }
    setState("saving")
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    const json = await res.json()
    if (!res.ok) {
      setState("error")
      setMessage(json.error ?? "Something went wrong.")
      return
    }
    setState("saved")
    setPassword("")
    setConfirm("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="gold" disabled={state === "saving"}>
              {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </Button>
            {state === "saved" && (
              <span className="text-sm text-emerald-600">Password updated</span>
            )}
            {state === "error" && (
              <span className="text-sm text-red-600">{message}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
