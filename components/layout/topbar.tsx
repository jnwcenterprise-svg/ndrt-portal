import Link from "next/link"

interface TopbarProps {
  title: string
  action?: { label: string; href: string }
}

export function Topbar({ title, action }: TopbarProps) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
      {action && (
        <Link
          href={action.href}
          className="inline-flex h-10 items-center justify-center rounded-md bg-gold px-4 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
