import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white px-6 py-12 text-center sm:py-24">
      <div className="mx-auto max-w-3xl">
        <span className="mb-4 inline-block rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700">
          Built for UK small businesses
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Stay compliant. <span className="text-indigo-600">Automatically.</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
          ComplyHub monitors your regulatory obligations, tracks filing deadlines, and generates
          compliance policies — so you can focus on running your business.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/auth/signup">
            <Button size="lg">Get started free</Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="secondary">Sign in</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">No credit card required · Cancel anytime</p>
      </div>
    </section>
  )
}
