'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'basic' | 'futuristic'

const THEME_STORAGE_KEY = 'myeng_theme'
const DEFAULT_THEME: Theme = 'basic'

type ThemeContextValue = {
  theme: Theme
  setTheme: (nextTheme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

function isTheme(value: unknown): value is Theme {
  return value === 'basic' || value === 'futuristic'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    let resolvedTheme: Theme = DEFAULT_THEME
    try {
      const savedValue = localStorage.getItem(THEME_STORAGE_KEY)
      resolvedTheme = isTheme(savedValue) ? savedValue : DEFAULT_THEME
    } catch {
      resolvedTheme = DEFAULT_THEME
    }
    setThemeState(resolvedTheme)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolvedTheme)
    }
  }, [])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // storage может быть недоступен в ограниченных режимах браузера
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme)
    }
  }

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme]
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
