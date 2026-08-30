export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[var(--card-radius)] border border-border bg-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="h-4 w-48 rounded bg-border-light" />
          <div className="mt-2 h-3 w-24 rounded bg-border-light" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full bg-border-light" />
          <div className="h-5 w-16 rounded-full bg-border-light" />
        </div>
      </div>

      {/* Compliance rows */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between rounded-[var(--button-radius)] bg-ground px-4 py-3">
          <div className="h-3 w-36 rounded bg-border-light" />
          <div className="h-4 w-24 rounded-full bg-border-light" />
        </div>
        <div className="flex items-center justify-between rounded-[var(--button-radius)] bg-ground px-4 py-3">
          <div className="h-3 w-28 rounded bg-border-light" />
          <div className="h-4 w-24 rounded-full bg-border-light" />
        </div>
      </div>

      {/* Footer text */}
      <div className="mt-3 h-3 w-52 rounded bg-border-light" />

      {/* Actions section */}
      <div className="mt-4 border-t border-border-light pt-4">
        <div className="h-10 w-full rounded-[var(--button-radius)] bg-border-light" />
      </div>
    </div>
  )
}
