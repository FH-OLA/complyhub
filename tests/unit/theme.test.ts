import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Theme behaviour tests
//
// Tests the blocking theme script and ThemeToggle logic independently.
// These verify observable behaviour: data-theme attribute on <html>,
// localStorage persistence, and safe fallback from invalid stored values.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'complyhub-theme'

// The exact script injected into <head> by app/layout.tsx
const themeScript = `(function(){try{var t=localStorage.getItem('complyhub-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`

describe('Theme blocking script', () => {
  let mockStorage: Record<string, string>
  let dataTheme: string | null

  beforeEach(() => {
    mockStorage = {}
    dataTheme = null

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value },
      removeItem: (key: string) => { delete mockStorage[key] },
    })

    vi.stubGlobal('document', {
      documentElement: {
        setAttribute: (_name: string, value: string) => { dataTheme = value },
        removeAttribute: () => { dataTheme = null },
        getAttribute: () => dataTheme,
      },
    })
  })

  it('sets data-theme="dark" when localStorage has "dark"', () => {
    mockStorage[STORAGE_KEY] = 'dark'
    eval(themeScript)
    expect(dataTheme).toBe('dark')
  })

  it('sets data-theme="light" when localStorage has "light"', () => {
    mockStorage[STORAGE_KEY] = 'light'
    eval(themeScript)
    expect(dataTheme).toBe('light')
  })

  it('does not set data-theme when localStorage is empty (System mode)', () => {
    eval(themeScript)
    expect(dataTheme).toBeNull()
  })

  it('does not set data-theme for invalid stored values', () => {
    mockStorage[STORAGE_KEY] = 'purple'
    eval(themeScript)
    expect(dataTheme).toBeNull()
  })

  it('does not set data-theme for "system" stored value', () => {
    mockStorage[STORAGE_KEY] = 'system'
    eval(themeScript)
    expect(dataTheme).toBeNull()
  })

  it('handles localStorage throwing gracefully', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('SecurityError') },
      removeItem: () => { throw new Error('SecurityError') },
    })
    expect(() => eval(themeScript)).not.toThrow()
    expect(dataTheme).toBeNull()
  })
})

describe('Theme toggle logic', () => {
  let mockStorage: Record<string, string>
  let dataTheme: string | null

  const getStoredTheme = (): 'system' | 'light' | 'dark' => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') return stored
    } catch {}
    return 'system'
  }

  const applyTheme = (mode: 'system' | 'light' | 'dark') => {
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

  beforeEach(() => {
    mockStorage = {}
    dataTheme = null

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value },
      removeItem: (key: string) => { delete mockStorage[key] },
    })

    vi.stubGlobal('document', {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          if (name === 'data-theme') dataTheme = value
        },
        removeAttribute: (name: string) => {
          if (name === 'data-theme') dataTheme = null
        },
        getAttribute: (name: string) => name === 'data-theme' ? dataTheme : null,
      },
    })
  })

  // ── System mode ───────────────────────────────────────────────────────────

  it('defaults to system when no stored preference', () => {
    expect(getStoredTheme()).toBe('system')
  })

  it('system mode removes data-theme attribute and clears storage', () => {
    mockStorage[STORAGE_KEY] = 'dark'
    dataTheme = 'dark'
    applyTheme('system')
    expect(dataTheme).toBeNull()
    expect(mockStorage[STORAGE_KEY]).toBeUndefined()
  })

  // ── Explicit Light mode ───────────────────────────────────────────────────

  it('light mode sets data-theme="light" and persists to localStorage', () => {
    applyTheme('light')
    expect(dataTheme).toBe('light')
    expect(mockStorage[STORAGE_KEY]).toBe('light')
  })

  it('restores light mode from localStorage', () => {
    mockStorage[STORAGE_KEY] = 'light'
    expect(getStoredTheme()).toBe('light')
  })

  // ── Explicit Dark mode ────────────────────────────────────────────────────

  it('dark mode sets data-theme="dark" and persists to localStorage', () => {
    applyTheme('dark')
    expect(dataTheme).toBe('dark')
    expect(mockStorage[STORAGE_KEY]).toBe('dark')
  })

  it('restores dark mode from localStorage', () => {
    mockStorage[STORAGE_KEY] = 'dark'
    expect(getStoredTheme()).toBe('dark')
  })

  // ── localStorage persistence ──────────────────────────────────────────────

  it('persists the chosen mode across apply → restore cycle', () => {
    applyTheme('dark')
    const restored = getStoredTheme()
    expect(restored).toBe('dark')

    applyTheme('light')
    const restoredAgain = getStoredTheme()
    expect(restoredAgain).toBe('light')
  })

  it('clears persistence when returning to system', () => {
    applyTheme('dark')
    expect(mockStorage[STORAGE_KEY]).toBe('dark')

    applyTheme('system')
    expect(mockStorage[STORAGE_KEY]).toBeUndefined()
    expect(getStoredTheme()).toBe('system')
  })

  // ── Invalid / missing stored values ───────────────────────────────────────

  it('falls back to system for invalid stored value', () => {
    mockStorage[STORAGE_KEY] = 'invalid-theme'
    expect(getStoredTheme()).toBe('system')
  })

  it('falls back to system for empty string stored value', () => {
    mockStorage[STORAGE_KEY] = ''
    expect(getStoredTheme()).toBe('system')
  })

  it('falls back to system when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('SecurityError') },
      removeItem: () => { throw new Error('SecurityError') },
    })
    expect(getStoredTheme()).toBe('system')
  })

  it('handles localStorage write failure gracefully', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => { throw new Error('SecurityError') },
    })
    expect(() => applyTheme('dark')).not.toThrow()
    expect(dataTheme).toBe('dark')
  })

  // ── Full cycle ────────────────────────────────────────────────────────────

  it('cycles system → light → dark → system correctly', () => {
    const cycle: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']

    let current = 0
    for (const expected of ['light', 'dark', 'system'] as const) {
      current = (current + 1) % cycle.length
      const next = cycle[current]
      applyTheme(next)

      expect(next).toBe(expected)

      if (expected === 'system') {
        expect(dataTheme).toBeNull()
        expect(mockStorage[STORAGE_KEY]).toBeUndefined()
      } else {
        expect(dataTheme).toBe(expected)
        expect(mockStorage[STORAGE_KEY]).toBe(expected)
      }
    }
  })
})
