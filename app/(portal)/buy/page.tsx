import { Mail, Phone } from "lucide-react"
import { Topbar } from "@/components/layout/topbar"
import { PackageGrid } from "@/components/billing/package-grid"
import { LEAD_PACKAGES, NDRT_CONTACT } from "@/lib/config"

export default function BuyPage() {
  return (
    <>
      <Topbar title="Buy Lead Credits" />
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-gray-500">
        Select a package below to submit a request to your NDRT rep. They will
        reach out to confirm and get you set up.
      </p>

      <PackageGrid packages={LEAD_PACKAGES} />

      <div className="mt-10 rounded-lg border border-gray-200 bg-gray-100 p-6 text-center">
        <p className="text-sm font-medium text-gray-700">
          Need a custom amount or fewer than 15 leads?
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Reach out to your NDRT rep to arrange a custom order.
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:gap-6">
          <a
            href={`mailto:${NDRT_CONTACT.email}`}
            className="inline-flex items-center gap-1.5 font-medium text-gold-dark hover:underline"
          >
            <Mail className="h-4 w-4" />
            {NDRT_CONTACT.email}
          </a>
          <a
            href={`tel:${NDRT_CONTACT.phone.replace(/\D/g, "")}`}
            className="inline-flex items-center gap-1.5 font-medium text-gold-dark hover:underline"
          >
            <Phone className="h-4 w-4" />
            {NDRT_CONTACT.phone}
          </a>
        </div>
      </div>
    </>
  )
}
