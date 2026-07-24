import { featureFlags } from '@/lib/featureFlags'

export type SupabasePublicEnv = {
  url: string
  anonKey: string
}

export function hasSupabaseEnv(): boolean {
  return getSupabasePublicEnv() !== null
}

export function isSupabaseV1Enabled(): boolean {
  return featureFlags.supabaseV1 && hasSupabaseEnv()
}

export function isSupabaseLessonProgressSyncEnabled(): boolean {
  return featureFlags.supabaseLessonProgressSync && isSupabaseV1Enabled()
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!rawUrl || !anonKey) return null

  // Project URL only — never include /rest/v1 or /auth/v1 (supabase-js adds those).
  let url = rawUrl.replace(/\/$/, '')
  url = url.replace(/\/rest\/v1$/i, '').replace(/\/auth\/v1$/i, '')
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    return null
  }
  return { url, anonKey }
}
