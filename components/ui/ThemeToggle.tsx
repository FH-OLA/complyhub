'use client'

import { useState, useSyncExternalStore, useCallback } from 'react'

type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'complyhub-theme'
const CYCLE: ThemeMode[] = ['system', 'light', 'dark']

function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'system'
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  try {
    if (mode === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, mode)
    }
  } catch {}
}

const labels: Record<ThemeMode, string> = {
  system: 'Theme: System',
  light: 'Theme: Light',
  dark: 'Theme: Dark',
}

const subscribeMounted = (cb: () => void) => { cb(); return () => {} }
const getMounted = () => true
const getServerMounted = () => false

export default function ThemeToggle() {
  const mounted = useSyncExternalStore(subscribeMounted, getMounted, getServerMounted)
  const [mode, setMode] = useState<ThemeMode>(() =>
    typeof window !== 'undefined' ? getStoredTheme() : 'system'
  )

  const cycle = useCallback(() => {
    setMode((prev) => {
      const next = CYCLE[(CYCLE.indexOf(prev) + 1) % CYCLE.length]
      applyTheme(next)
      return next
    })
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--button-radius)] text-text-3 transition-colors hover:bg-accent-muted hover:text-text-1"
        aria-label="Theme: System"
        disabled
      >
        <SystemIcon />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--button-radius)] text-text-3 transition-colors hover:bg-accent-muted hover:text-text-1 focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:ring-offset-ground"
      aria-label={labels[mode]}
    >
      {mode === 'light' && <SunIcon />}
      {mode === 'dark' && <MoonIcon />}
      {mode === 'system' && <SystemIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="3.5" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15.1 10.4A6.5 6.5 0 0 1 7.6 2.9 6.5 6.5 0 1 0 15.1 10.4z" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="14" height="10" rx="1.5" />
      <path d="M6 16h6M9 13v3" />
    </svg>
  )
}
