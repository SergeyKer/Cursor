import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { resetSupabaseBrowserClientForTests } from '@/lib/supabase/client'

describe('supabase env helpers', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const originalV1 = process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1
  const originalSync = process.env.NEXT_PUBLIC_FEATURE_SUPABASE_LESSON_PROGRESS_SYNC

  beforeEach(() => {
    resetSupabaseBrowserClientForTests()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1
    delete process.env.NEXT_PUBLIC_FEATURE_SUPABASE_LESSON_PROGRESS_SYNC
    vi.resetModules()
  })

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
    if (originalV1 === undefined) delete process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1
    else process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1 = originalV1
    if (originalSync === undefined) delete process.env.NEXT_PUBLIC_FEATURE_SUPABASE_LESSON_PROGRESS_SYNC
    else process.env.NEXT_PUBLIC_FEATURE_SUPABASE_LESSON_PROGRESS_SYNC = originalSync
    resetSupabaseBrowserClientForTests()
    vi.resetModules()
  })

  it('defaults flags off and returns null client without env', async () => {
    const { featureFlags } = await import('@/lib/featureFlags')
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
    const { isSupabaseV1Enabled, isSupabaseLessonProgressSyncEnabled } = await import('@/lib/supabase/env')
    expect(featureFlags.supabaseV1).toBe(false)
    expect(featureFlags.supabaseLessonProgressSync).toBe(false)
    expect(isSupabaseV1Enabled()).toBe(false)
    expect(isSupabaseLessonProgressSyncEnabled()).toBe(false)
    expect(getSupabaseBrowserClient()).toBeNull()
  })

  it('strips /rest/v1 from project URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co/rest/v1/'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test'
    process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1 = 'true'
    const { getSupabasePublicEnv } = await import('@/lib/supabase/env')
    expect(getSupabasePublicEnv()?.url).toBe('https://example.supabase.co')
  })
})
