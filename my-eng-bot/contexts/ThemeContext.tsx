'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  applyThemeToDocument,
  DEFAULT_THEME,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/theme'

type ThemeContextValue = {
  theme: Theme
  setTheme: (nextTheme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    const resolvedTheme = readStoredTheme()
    setThemeState(resolvedTheme)
    applyThemeToDocument(resolvedTheme)
  }, [])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // storage может быть недоступен в ограниченных режимах браузера
    }
    applyThemeToDocument(nextTheme)
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

export type { Theme }
