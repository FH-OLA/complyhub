import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-indigo-600">ComplyHub</span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      <Hero />
      <Features />

      {/* Pricing */}
      <section className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Simple, transparent pricing</h2>
          <p className="mt-4 text-lg text-gray-600">Start free. Upgrade when you need more.</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { name: 'Starter', price: '£12', period: '/month', description: 'Perfect for sole traders and freelancers.' },
              { name: 'Business', price: '£29', period: '/month', description: 'For growing businesses with more to manage.', highlight: true },
              { name: 'Accountant', price: '£99', period: '/month', description: 'Manage compliance across multiple clients.' },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 text-left ${
                  plan.highlight
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <p className={`text-sm font-semibold ${plan.highlight ? 'text-indigo-200' : 'text-indigo-600'}`}>
                  {plan.name}
                </p>
                <p className={`mt-3 text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}
                  <span className={`text-base font-normal ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>
                    {plan.period}
                  </span>
                </p>
                <p className={`mt-4 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-gray-600'}`}>
                  {plan.description}
                </p>
                <Link
                  href="/auth/signup"
                  className={`mt-6 block rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
                    plan.highlight
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} ComplyHub. Built for UK small businesses.
      </footer>
    </div>
  )
}
