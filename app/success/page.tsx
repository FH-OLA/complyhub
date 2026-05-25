export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-gray-900">
        🎉 You’re now on ComplyHub Pro
      </h1>

      <p className="mt-4 text-gray-600">
        You can now track unlimited companies and receive full compliance alerts.
      </p>

      <a
        href="/my-companies"
        className="mt-8 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700"
      >
        Go to dashboard
      </a>
    </div>
  )
}