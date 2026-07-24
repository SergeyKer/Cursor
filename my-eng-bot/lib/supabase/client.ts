import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv, isSupabaseV1Enabled } from '@/lib/supabase/env'

let browserClient: SupabaseClient | null = null

/** Browser singleton. Returns null when flag off or env missing — never throws on import. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (!isSupabaseV1Enabled()) return null
  const env = getSupabasePublicEnv()
  if (!env) return null
  if (!browserClient) {
    browserClient = createClient(env.url, env.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  }
  return browserClient
}

/** Test helper */
export function resetSupabaseBrowserClientForTests(): void {
  browserClient = null
}
