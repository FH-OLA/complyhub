import PublicNav from '@/components/landing/PublicNav'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Footer from '@/components/landing/Footer'
import Link from 'next/link'
import { PLANS } from '@/lib/plans'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <PublicNav />

      <main className="flex-1">
        <Hero />
        <Features />

        {/* Trust */}
        <section className="border-t border-border-light px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-[800px] gap-6 text-center sm:grid-cols-3">
            {[
              { label: 'Live Companies House data', detail: 'Real-time company status and filing dates' },
              { label: 'Official filing destinations', detail: 'Direct links to Government services' },
              { label: 'Built for UK companies', detail: 'Confirmation Statements and Annual Accounts' },
            ].map(({ label, detail }) => (
              <div key={label}>
                <p className="text-sm font-semibold text-text-1">{label}</p>
                <p className="mt-1 text-xs text-text-3">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border-light bg-surface px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[640px] text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-base text-text-2">Start free. Upgrade when you need more.</p>

            <div className="mt-12 grid gap-6 text-left sm:grid-cols-2">
              {/* Free */}
              <div className="rounded-[var(--card-radius)] border border-border bg-ground p-6">
                <p className="text-sm font-semibold text-accent">{PLANS.free.name}</p>
                <p className="mt-3 text-3xl font-bold text-text-1">{PLANS.free.price}</p>
                <p className="mt-2 text-sm text-text-2">{PLANS.free.description}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-text-2">
                  {PLANS.free.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-[var(--button-radius)] border border-accent bg-surface text-sm font-medium text-accent transition-colors hover:bg-accent-muted"
                >
                  Get started free
                </Link>
              </div>

              {/* Pro */}
              <div className="rounded-[var(--card-radius)] border-2 border-accent bg-ground p-6">
                <p className="text-sm font-semibold text-accent">{PLANS.pro.name}</p>
                <p className="mt-3 text-3xl font-bold text-text-1">
                  {PLANS.pro.price}
                  <span className="text-base font-normal text-text-3">{PLANS.pro.period}</span>
                </p>
                <p className="mt-2 text-sm text-text-2">{PLANS.pro.description}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-text-2">
                  {PLANS.pro.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-[var(--button-radius)] bg-accent text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                >
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-semantic-green" aria-hidden="true">
      <path d="M4 8.5l2.5 2.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
