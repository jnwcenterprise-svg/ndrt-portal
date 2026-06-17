"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

interface ProfileFormProps {
  fullName: string
  phone: string
  companyName: string
}

export function ProfileForm(props: ProfileFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(props.fullName)
  const [phone, setPhone] = useState(props.phone)
  const [companyName, setCompanyName] = useState(props.companyName)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState("saving")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return setState("error")

    const { error } = await supabase
      .from("contractors")
      .update({ full_name: fullName, phone, company_name: companyName })
      .eq("id", user.id)

    setState(error ? "error" : "saved")
    if (!error) router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-full-name">Full Name</Label>
            <Input
              id="settings-full-name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">Phone</Label>
            <Input
              id="settings-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-company">Company Name</Label>
            <Input
              id="settings-company"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="gold" disabled={state === "saving"}>
              {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
            {state === "saved" && (
              <span className="text-sm text-emerald-600">Saved</span>
            )}
            {state === "error" && (
              <span className="text-sm text-red-600">Could not save</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
