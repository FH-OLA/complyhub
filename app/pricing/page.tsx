import Link from 'next/link'
import { PLANS } from '@/lib/plans'

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-center sm:py-16">
      <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
      <p className="mt-4 text-gray-600">Start free. Upgrade when you need more.</p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">

        {/* FREE PLAN */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-left">
          <h2 className="text-xl font-semibold text-gray-900">{PLANS.free.name}</h2>
          <p className="mt-1 text-sm text-gray-500">{PLANS.free.description}</p>
          <p className="mt-4 text-3xl font-bold text-gray-900">{PLANS.free.price}</p>

          <ul className="mt-6 space-y-3 text-sm text-gray-600">
            {PLANS.free.features.map((feature) => (
              <li key={feature}>&#10003; {feature}</li>
            ))}
          </ul>

          <div className="mt-8 text-sm font-medium text-gray-400">
            Always free
          </div>
        </div>

        {/* PRO PLAN */}
        <div className="rounded-2xl border-2 border-indigo-600 bg-white p-8 shadow-md text-left">
          <h2 className="text-xl font-semibold text-gray-900">{PLANS.pro.name}</h2>
          <p className="mt-1 text-sm text-gray-500">{PLANS.pro.description}</p>
          <p className="mt-4 text-3xl font-bold text-gray-900">
            {PLANS.pro.price}
            <span className="text-base font-medium text-gray-500">{PLANS.pro.period}</span>
          </p>

          <ul className="mt-6 space-y-3 text-sm text-gray-600">
            {PLANS.pro.features.map((feature) => (
              <li key={feature}>&#10003; {feature}</li>
            ))}
          </ul>

          <Link
            href="/upgrade"
            className="mt-8 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Upgrade to Pro
          </Link>
        </div>

      </div>
    </div>
  )
}
