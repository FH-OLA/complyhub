import PublicNav from '@/components/landing/PublicNav'
import Footer from '@/components/landing/Footer'

export default function Terms() {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <PublicNav />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[640px]">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-2">
            ComplyHub provides compliance monitoring only and is not legal or financial advice.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
