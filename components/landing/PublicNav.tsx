'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function PublicNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const hasOpenedRef = useRef(false)

  const openDrawer = () => setDrawerOpen(true)
  const closeDrawer = () => setDrawerOpen(false)

  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [drawerOpen])

  useEffect(() => {
    if (drawerOpen) {
      hasOpenedRef.current = true
      const first = drawerRef.current?.querySelector<HTMLElement>('a, button')
      first?.focus()
    } else if (hasOpenedRef.current) {
      hamburgerRef.current?.focus()
    }
  }, [drawerOpen])

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
        const last = focusable[focusable.length - 1]

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

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[960px] items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-xl font-bold text-accent">
            ComplyHub
          </Link>

          {/* Desktop — sm and above */}
          <div className="hidden items-center gap-3 sm:flex">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="flex min-h-[44px] items-center px-3 text-sm font-medium text-text-2 transition-colors hover:text-accent"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="flex min-h-[44px] items-center rounded-[var(--button-radius)] bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              Get started
            </Link>
          </div>

          {/* Hamburger — below sm */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={openDrawer}
            aria-expanded={drawerOpen}
            aria-controls="public-nav"
            aria-label="Open navigation"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--button-radius)] text-text-2 hover:bg-accent-muted focus:outline-none focus:ring-2 focus:ring-focus-ring sm:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          aria-hidden="true"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        id="public-nav"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!drawerOpen}
        className={[
          'fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-surface shadow-xl sm:hidden',
          'motion-safe:transition-transform motion-safe:duration-300',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-light px-4 py-4">
          <span className="font-display text-lg font-bold text-accent">ComplyHub</span>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close navigation"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--button-radius)] text-text-3 hover:bg-accent-muted focus:outline-none focus:ring-2 focus:ring-focus-ring"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Public navigation">
          <Link
            href="/auth/login"
            onClick={closeDrawer}
            className="flex min-h-[44px] items-center rounded-[var(--button-radius)] px-3 text-sm font-medium text-text-1 hover:bg-accent-muted hover:text-accent"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            onClick={closeDrawer}
            className="flex min-h-[44px] items-center rounded-[var(--button-radius)] px-3 text-sm font-medium text-text-1 hover:bg-accent-muted hover:text-accent"
          >
            Get started
          </Link>
          <Link
            href="/pricing"
            onClick={closeDrawer}
            className="flex min-h-[44px] items-center rounded-[var(--button-radius)] px-3 text-sm font-medium text-text-1 hover:bg-accent-muted hover:text-accent"
          >
            Pricing
          </Link>
        </nav>

        <div className="shrink-0 border-t border-border-light px-4 pt-4 pb-safe">
          <div className="mb-3 flex items-center gap-2">
            <ThemeToggle />
            <span className="text-xs text-text-3">Theme</span>
          </div>
        </div>
      </div>
    </>
  )
}
