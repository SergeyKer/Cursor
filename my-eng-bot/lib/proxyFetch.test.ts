import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'

describe('fetchWithProxyFallback', () => {
  const originalEnv = {
    HTTPS_PROXY: process.env.HTTPS_PROXY,
    https_proxy: process.env.https_proxy,
    HTTP_PROXY: process.env.HTTP_PROXY,
    http_proxy: process.env.http_proxy,
    ALL_PROXY: process.env.ALL_PROXY,
    all_proxy: process.env.all_proxy,
  }

  const restoreEnv = (key: keyof typeof originalEnv) => {
    const value = originalEnv[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  beforeEach(() => {
    process.env.HTTPS_PROXY = ''
    process.env.https_proxy = ''
    process.env.HTTP_PROXY = ''
    process.env.http_proxy = ''
    process.env.ALL_PROXY = ''
    process.env.all_proxy = ''
  })

  afterEach(() => {
    restoreEnv('HTTPS_PROXY')
    restoreEnv('https_proxy')
    restoreEnv('HTTP_PROXY')
    restoreEnv('http_proxy')
    restoreEnv('ALL_PROXY')
    restoreEnv('all_proxy')
    vi.unstubAllGlobals()
  })

  it(
    'retries with the next proxy candidate when the first attempt fails',
    async () => {
      process.env.HTTPS_PROXY = '127.0.0.1:12334'

      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('first proxy failed'))
        .mockResolvedValueOnce(new Response('ok', { status: 200 }))

      vi.stubGlobal('fetch', fetchMock)

      const res = await fetchWithProxyFallback('https://example.com')

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(res.status).toBe(200)
    },
    15_000
  )

  it('uses direct fetch first when directFirst is enabled', async () => {
    process.env.HTTPS_PROXY = '127.0.0.1:12334'
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithProxyFallback('https://example.com', {}, { directFirst: true, includeSystemProxy: false })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as Record<string, unknown> | undefined
    expect(firstCallOptions?.dispatcher).toBeUndefined()
    expect(res.status).toBe(200)
  })

  it('falls back to env proxy candidates after direct failure', async () => {
    process.env.HTTPS_PROXY = '127.0.0.1:12334'
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('direct failed'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithProxyFallback('https://example.com', {}, { directFirst: true, includeSystemProxy: false })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondCallOptions = fetchMock.mock.calls[1]?.[1] as Record<string, unknown> | undefined
    expect(secondCallOptions?.dispatcher).toBeDefined()
    expect(res.status).toBe(200)
  })
})
