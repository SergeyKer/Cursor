import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { isSupabaseV1Enabled } from '@/lib/supabase/env'

let inflight: Promise<string | null> | null = null

/**
 * Idempotent anonymous session. Concurrent callers share one signInAnonymously().
 * Returns user id or null; never throws to callers.
 */
export async function ensureAnonSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!isSupabaseV1Enabled()) return null
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const client = getSupabaseBrowserClient()
      if (!client) return null
      const { data: existing, error: sessionError } = await client.auth.getSession()
      if (sessionError) {
        console.warn('[engvo][supabase] getSession failed', sessionError.message)
        return null
      }
      const currentId = existing.session?.user?.id ?? null
      if (currentId) return currentId

      const { data, error } = await client.auth.signInAnonymously()
      if (error) {
        console.warn('[engvo][supabase] signInAnonymously failed', error.message)
        return null
      }
      return data.user?.id ?? data.session?.user?.id ?? null
    } catch (err) {
      console.warn('[engvo][supabase] ensureAnonSession exception', err)
      return null
    } finally {
      inflight = null
    }
  })()

  return inflight
}
