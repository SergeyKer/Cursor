'use client'

import { createContext, useContext } from 'react'
import type { BranchId } from '@/lib/start/branchRegistry'

export type AppShellContextValue = {
  activeBranch: BranchId | null
  isBranchMounted: (branchId: BranchId) => boolean
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

export function AppShellProvider({
  value,
  children,
}: {
  value: AppShellContextValue
  children: React.ReactNode
}) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
}

export function useAppShellContext(): AppShellContextValue {
  const ctx = useContext(AppShellContext)
  if (!ctx) {
    throw new Error('useAppShellContext must be used within AppShellProvider')
  }
  return ctx
}
