'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Container from '@/components/ui/Container'

interface NavbarProps {
  userEmail: string
}

const NAV_LINKS = [
  { href: '/dashboard',    label: 'Dashboard' },
  { href: '/my-companies', label: 'My Companies' },
  { href: '/settings',     label: 'Settings' },
] as const

export default function Navbar({ userEmail }: NavbarProps) {
  const router   = useRouter()
  const pathname = usePathname()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const hamburgerRef  = useRef<HTMLButtonElement>(null)
  const drawerRef     = useRef<HTMLDivElement>(null)
  // Track whether the drawer has been opened so we only restore focus after
  // the first open, not on the initial render.
  const hasOpenedRef  = useRef(false)

  const openDrawer  = () => setDrawerOpen(true)
  const closeDrawer = () => setDrawerOpen(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // ── Lock body scroll while drawer is open ─────────────────────────────────
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [drawerOpen])

  // ── Focus: first drawer item on open; hamburger on close ──────────────────
  useEffect(() => {
    if (drawerOpen) {
      hasOpenedRef.current = true
      const first = drawerRef.current?.querySelector<HTMLElement>('a, button')
      first?.focus()
    } else if (hasOpenedRef.current) {
      hamburgerRef.current?.focus()
    }
  }, [drawerOpen])

  // ── Keyboard: Escape closes; Tab cycles inside drawer ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!drawerOpen) return

      if (e.key === 'Escape') {
        closeDrawer()
        return
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled])',
          ),
        )
        if (!focusable.length) return

        const first = focusable[0]
        const last  = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  // Note: drawer nav links close the drawer via their onClick prop directly.
  // No effect is used for route-change close to avoid calling setState
  // synchronously in an effect body (react-hooks/set-state-in-effect).

  const desktopLinkClass = (href: string) =>
    `flex min-h-[44px] items-center rounded px-2 text-sm font-medium transition-colors ${
      pathname === href
        ? 'text-indigo-600'
        : 'text-gray-600 hover:text-indigo-600'
    }`

  const drawerLinkClass = (href: string) =>
    `flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium transition-colors ${
      pathname === href
        ? 'bg-indigo-50 text-indigo-600'
        : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
    }`

  return (
    <>
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white">
        <Container className="flex items-center justify-between py-4">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-600">ComplyHub</span>
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              Beta
            </span>
          </div>

          {/* Desktop nav — md and above */}
          <div className="hidden items-center gap-1 md:flex lg:gap-4">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={desktopLinkClass(href)}>
                {label}
              </Link>
            ))}
            <span className="hidden text-sm text-gray-500 lg:block">{userEmail}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>

          {/* Hamburger — below md only */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={openDrawer}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav"
            aria-label="Open navigation"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

        </Container>
      </header>

      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={closeDrawer}
        />
      )}

      {/* ── Drawer ────────────────────────────────────────────────────────── */}
      {/*
        Always in the DOM so the CSS transition runs in both directions.
        aria-hidden prevents assistive technology from reading it when closed.
        motion-safe: ensures the slide animation is skipped for users who
        have requested reduced motion — the drawer still opens, but instantly.
      */}
      <div
        id="mobile-nav"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!drawerOpen}
        className={[
          'fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-white shadow-xl md:hidden',
          'motion-safe:transition-transform motion-safe:duration-300',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-4">
          <span className="text-lg font-bold text-indigo-600">ComplyHub</span>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close navigation"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Nav links — onClick closes the drawer before navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Mobile navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={closeDrawer} className={drawerLinkClass(href)}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Drawer footer — user info + sign out */}
        <div className="shrink-0 border-t border-gray-100 px-4 pt-4 pb-safe">
          <p className="mb-3 truncate text-xs text-gray-500">{userEmail}</p>
          <button
            type="button"
            onClick={() => { closeDrawer(); handleSignOut() }}
            className="flex w-full min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
