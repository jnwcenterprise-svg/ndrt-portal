"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError("Invalid email or password.")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetError(null)
    setResetLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

    if (err) {
      setResetError("Could not send reset email. Check the address and try again.")
    } else {
      setResetSent(true)
    }
    setResetLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="text-4xl font-bold tracking-tight text-white">
            NDRT<span className="text-gold">.</span>
          </div>
          <div className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-gray-400">
            Natural Disaster Response Team
          </div>
        </div>

        <div className="rounded-lg bg-navy-light p-8 shadow-xl ring-1 ring-navy-border">
          {resetMode ? (
            <>
              <h1 className="mb-2 text-lg font-semibold text-white">Reset Password</h1>
              <p className="mb-6 text-sm text-gray-400">
                Enter your email and we'll send a reset link.
              </p>
              {resetSent ? (
                <div className="rounded-md bg-emerald-900/40 px-4 py-3 text-sm text-emerald-300">
                  Check your email for a password reset link.
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-gray-300">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-navy-border bg-navy text-white placeholder:text-gray-500"
                    />
                  </div>
                  {resetError && <p className="text-sm text-red-400">{resetError}</p>}
                  <Button type="submit" variant="gold" className="w-full" disabled={resetLoading}>
                    {resetLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              )}
              <button
                onClick={() => { setResetMode(false); setResetSent(false); setResetError(null) }}
                className="mt-4 text-sm text-gray-400 hover:text-white"
              >
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <h1 className="mb-6 text-lg font-semibold text-white">Contractor Portal Sign In</h1>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-navy-border bg-navy text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-300">Password</Label>
                    <button
                      type="button"
                      onClick={() => { setResetMode(true); setError(null) }}
                      className="text-xs text-gold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-navy-border bg-navy text-white"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Not yet a partner?{" "}
          <Link href="/apply" className="font-medium text-gold hover:underline">
            Request Access
          </Link>
        </p>
      </div>
    </main>
  )
}
