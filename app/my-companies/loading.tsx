import SkeletonCard from '@/components/ui/SkeletonCard'

export default function MyCompaniesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header skeleton */}
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="h-10 w-52 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-44 animate-pulse rounded-xl bg-gray-200" />
      </div>

      <div className="mb-8 h-px bg-gray-200" />

      {/* Stats strip skeleton */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border p-5">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="mt-2 h-8 w-10 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Card skeletons */}
      <div className="grid gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
