import SkeletonCard from '@/components/ui/SkeletonCard'

export default function MyCompaniesLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-border-light" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-border-light" />
          <div className="mt-2 h-5 w-12 animate-pulse rounded-full bg-border-light" />
        </div>
        <div className="h-10 w-48 animate-pulse rounded-[var(--button-radius)] bg-border-light" />
      </div>

      <div className="h-px bg-border-light" />

      {/* Portfolio summary skeleton */}
      <div className="mt-6 animate-pulse rounded-[var(--card-radius)] border border-border bg-surface p-5">
        <div className="grid gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-border-light" />
              <div>
                <div className="h-3 w-24 rounded bg-border-light" />
                <div className="mt-2 h-6 w-8 rounded bg-border-light" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card skeletons */}
      <div className="mt-6 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </>
  )
}
