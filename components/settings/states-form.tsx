"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatesMultiSelect } from "@/components/ui/states-multi-select"
import { createClient } from "@/lib/supabase/client"

export function StatesForm({ states: initialStates }: { states: string[] }) {
  const router = useRouter()
  const [states, setStates] = useState<string[]>(initialStates)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (states.length === 0) return setState("error")
    setState("saving")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return setState("error")

    const { error } = await supabase
      .from("contractors")
      .update({ states })
      .eq("id", user.id)

    setState(error ? "error" : "saved")
    if (!error) router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Covered States</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StatesMultiSelect value={states} onChange={setStates} />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="gold" disabled={state === "saving"}>
              {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
              Save States
            </Button>
            {state === "saved" && (
              <span className="text-sm text-emerald-600">Saved</span>
            )}
            {state === "error" && (
              <span className="text-sm text-red-600">
                Select at least one state
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
