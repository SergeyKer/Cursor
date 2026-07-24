import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

describe('ensureAnonSession concurrency', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const originalV1 = process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test'
    process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1 = 'true'
    vi.resetModules()
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
    if (originalV1 === undefined) delete process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1
    else process.env.NEXT_PUBLIC_FEATURE_SUPABASE_V1 = originalV1
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('shares one signInAnonymously across concurrent callers', async () => {
    let signInCalls = 0
    const client = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
        signInAnonymously: vi.fn(async () => {
          signInCalls += 1
          await new Promise((r) => setTimeout(r, 20))
          return {
            data: { user: { id: 'user-a' }, session: { user: { id: 'user-a' } } },
            error: null,
          }
        }),
      },
    }

    vi.doMock('@/lib/supabase/client', () => ({
      getSupabaseBrowserClient: () => client,
    }))

    const { ensureAnonSession } = await import('@/lib/supabase/ensureAnonSession')
    const [a, b] = await Promise.all([ensureAnonSession(), ensureAnonSession()])
    expect(a).toBe('user-a')
    expect(b).toBe('user-a')
    expect(signInCalls).toBe(1)
  })
})
