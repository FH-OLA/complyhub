import PublicNav from '@/components/landing/PublicNav'
import Footer from '@/components/landing/Footer'

export default function Contact() {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <PublicNav />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[640px]">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">
            Contact
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-2">
            Email: support@complyhub.uk
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
