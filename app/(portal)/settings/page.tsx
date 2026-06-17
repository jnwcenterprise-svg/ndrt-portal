import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/layout/topbar"
import { ProfileForm } from "@/components/settings/profile-form"
import { StatesForm } from "@/components/settings/states-form"
import { PasswordForm } from "@/components/settings/password-form"
import { ApiKeyCard } from "@/components/settings/api-key-card"
import { CrmWebhookForm } from "@/components/settings/crm-webhook-form"
import type { Contractor } from "@/lib/types"

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: contractor } = await supabase
    .from("contractors")
    .select("*")
    .eq("id", user.id)
    .single<Contractor>()

  if (!contractor) redirect("/login")

  return (
    <>
      <Topbar title="Settings" />
      <div className="max-w-2xl space-y-8">
        <ProfileForm
          fullName={contractor.full_name}
          phone={contractor.phone ?? ""}
          companyName={contractor.company_name}
        />
        <StatesForm states={contractor.states ?? []} />
        <PasswordForm />
        <CrmWebhookForm initialUrl={contractor.crm_webhook_url ?? null} />
        {contractor.api_key && <ApiKeyCard initialKey={contractor.api_key} />}
      </div>
    </>
  )
}
