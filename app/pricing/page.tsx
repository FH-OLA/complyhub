import Link from 'next/link'
import { PLANS } from '@/lib/plans'
import PublicNav from '@/components/landing/PublicNav'
import Footer from '@/components/landing/Footer'

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <PublicNav />

      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[640px] text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-1 sm:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-base text-text-2">Start free. Upgrade when you need more.</p>

          <div className="mt-12 grid gap-6 text-left md:grid-cols-2">
            {/* Free */}
            <div className="rounded-[var(--card-radius)] border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-text-1">{PLANS.free.name}</h2>
              <p className="mt-1 text-sm text-text-2">{PLANS.free.description}</p>
              <p className="mt-4 text-3xl font-bold text-text-1">{PLANS.free.price}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-text-2">
                {PLANS.free.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckMark />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm font-medium text-text-3">Always free</p>
            </div>

            {/* Pro */}
            <div className="rounded-[var(--card-radius)] border-2 border-accent bg-surface p-6">
              <h2 className="text-lg font-semibold text-text-1">{PLANS.pro.name}</h2>
              <p className="mt-1 text-sm text-text-2">{PLANS.pro.description}</p>
              <p className="mt-4 text-3xl font-bold text-text-1">
                {PLANS.pro.price}
                <span className="text-base font-medium text-text-3">{PLANS.pro.period}</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-text-2">
                {PLANS.pro.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckMark />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/upgrade"
                className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-[var(--button-radius)] bg-accent text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-semantic-green" aria-hidden="true">
      <path d="M4 8.5l2.5 2.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
