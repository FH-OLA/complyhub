import Link from 'next/link'

export default function Hero() {
  return (
    <section className="px-4 py-16 text-center sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[640px]">
        <h1 className="font-display text-4xl font-bold tracking-tight text-text-1 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
          Every deadline.{' '}
          <span className="text-accent">Every company.</span>{' '}
          One clear view.
        </h1>
        <p className="mx-auto mt-6 max-w-[480px] text-lg leading-relaxed text-text-2">
          ComplyHub monitors your Companies House obligations, tracks filing deadlines, and alerts
          you before anything falls overdue — so you can focus on your business.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--button-radius)] bg-accent px-6 py-3 text-base font-medium text-accent-fg transition-colors hover:bg-accent-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:ring-offset-ground"
          >
            Get started free
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--button-radius)] border border-accent bg-surface px-6 py-3 text-base font-medium text-accent transition-colors hover:bg-accent-muted active:scale-95 focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:ring-offset-ground"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-sm text-text-3">No credit card required</p>
      </div>
    </section>
  )
}
