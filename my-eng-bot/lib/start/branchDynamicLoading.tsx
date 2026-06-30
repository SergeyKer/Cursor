import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import RuntimeLoadingOverlay from '@/components/start/RuntimeLoadingOverlay'

export function branchDynamic<P = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> }>
) {
  return dynamic(loader, {
    loading: () => <RuntimeLoadingOverlay variant="branch" />,
  })
}
