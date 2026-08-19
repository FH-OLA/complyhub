'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface NavbarProps {
  userEmail: string
}

export default function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-indigo-600">ComplyHub</span>
          <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          <Link
            href="/dashboard"
            className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
              pathname === '/dashboard'
                ? 'text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/my-companies"
            className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
              pathname === '/my-companies'
                ? 'text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            My Companies
          </Link>
          <Link
            href="/settings"
            className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
              pathname === '/settings'
                ? 'text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            Settings
          </Link>
          <span className="hidden text-sm text-gray-500 sm:block">{userEmail}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}
