export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-24 rounded bg-gray-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-gray-100" />
          <div className="h-6 w-16 rounded-full bg-gray-100" />
        </div>
      </div>

      {/* Compliance rows */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div className="h-4 w-36 rounded bg-gray-200" />
          <div className="h-5 w-24 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-5 w-24 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Footer text */}
      <div className="mt-4 h-3 w-52 rounded bg-gray-100" />

      {/* Remove button */}
      <div className="mt-5 h-9 w-full rounded-xl bg-gray-100" />
    </div>
  )
}
