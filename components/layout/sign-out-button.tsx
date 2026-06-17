"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="mt-3 flex w-full items-center gap-2 rounded-md px-0 py-1 text-xs text-gray-400 transition-colors hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  )
}
