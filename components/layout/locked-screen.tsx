import { NDRT_CONTACT } from "@/lib/config"
import { SignOutButton } from "@/components/layout/sign-out-button"

export function LockedScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-md rounded-lg bg-navy-light p-10 text-center shadow-xl ring-1 ring-navy-border">
        <div className="text-3xl font-bold text-white">
          NDRT<span className="text-gold">.</span>
        </div>
        <h1 className="mt-6 text-xl font-semibold text-white">
          Your account has been suspended.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          Contact your NDRT rep at{" "}
          <a
            href={`tel:${NDRT_CONTACT.phone.replace(/\D/g, "")}`}
            className="font-medium text-gold hover:underline"
          >
            {NDRT_CONTACT.phone}
          </a>
          .
        </p>
        <div className="mt-8 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </main>
  )
}
