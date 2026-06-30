'use client'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light')

  // Sync with whatever the no-flash boot script already set on <html>.
  useEffect(() => {
    let current = (document.documentElement.dataset.theme as Theme) || null
    if (!current) {
      // Fallback: check system preference if not set in boot script
      current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    setTheme(current)
  }, [])

  useEffect(() => {
    // Migrate old theme key to new one (single-time migration)
    try {
      const old = localStorage.getItem('sayso_theme')
      if (old && !localStorage.getItem('sayso_theme_v2')) {
        localStorage.setItem('sayso_theme_v2', old)
        localStorage.removeItem('sayso_theme')
      }
    } catch { /* ignore */ }
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('sayso_theme_v2', next) } catch { /* ignore */ }
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={`grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-[var(--text-dim)]
                  transition hover:border-[var(--accent)] hover:text-[var(--accent)] ${className}`}
    >
      {theme === 'light' ? (
        // moon (tap → dark)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // sun (tap → light)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  )
}
