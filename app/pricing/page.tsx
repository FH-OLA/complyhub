export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Simple Pricing</h1>
      <p className="mt-4 text-gray-600">
        Stay compliant. Avoid penalties. Scale with confidence.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        
        {/* FREE PLAN */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Free</h2>
          <p className="mt-2 text-3xl font-bold">£0</p>

          <ul className="mt-6 space-y-3 text-sm text-gray-600 text-left">
            <li>✔ Track 1 company</li>
            <li>✔ Basic compliance alerts</li>
            <li>✔ Email notifications</li>
          </ul>

          <div className="mt-8 text-sm text-gray-400">
            Current plan
          </div>
        </div>

        {/* PRO PLAN */}
        <div className="rounded-2xl border-2 border-indigo-600 bg-white p-8 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900">Pro</h2>
          <p className="mt-2 text-3xl font-bold">£9<span className="text-base font-medium">/month</span></p>

          <ul className="mt-6 space-y-3 text-sm text-gray-600 text-left">
            <li>✔ Track unlimited companies</li>
            <li>✔ Priority alerts</li>
            <li>✔ Early deadline warnings</li>
            <li>✔ Future features</li>
          </ul>

          <a
  href="/upgrade"
  className="mt-8 inline-block w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
>
  Upgrade to Pro
</a>
        </div>

      </div>
    </div>
  )
}