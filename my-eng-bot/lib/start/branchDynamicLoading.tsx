import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import RuntimeLoadingOverlay from '@/components/start/RuntimeLoadingOverlay'

const CHUNK_RELOAD_SESSION_KEY = 'engvo_branch_chunk_reload'

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.name === 'ChunkLoadError' || /loading chunk [\s\S]* failed/i.test(error.message)
}

/** После build/deploy или сбоя dev-кэша браузер может запросить устаревший chunk hash. */
function withChunkLoadRetry<P>(
  loader: () => Promise<{ default: ComponentType<P> }>
): () => Promise<{ default: ComponentType<P> }> {
  return () =>
    loader().catch((error: unknown) => {
      if (typeof window === 'undefined' || !isChunkLoadError(error)) {
        throw error
      }
      try {
        if (!sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)) {
          sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, '1')
          window.location.reload()
        }
        sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY)
      } catch {
        window.location.reload()
      }
      throw error
    })
}

export function branchDynamic<P = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> }>
) {
  return dynamic(withChunkLoadRetry(loader), {
    loading: () => <RuntimeLoadingOverlay variant="branch" />,
  })
}
