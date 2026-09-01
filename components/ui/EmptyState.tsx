import Link from 'next/link'

interface EmptyStateProps {
  icon?: React.ReactNode
  heading: string
  body: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export default function EmptyState({ icon, heading, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-[var(--card-radius)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ground text-text-3">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-text-1">{heading}</h3>
      <p className="mt-2 max-w-sm text-sm text-text-2">{body}</p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex min-h-[44px] items-center rounded-[var(--button-radius)] bg-accent px-5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex min-h-[44px] items-center rounded-[var(--button-radius)] bg-accent px-5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
