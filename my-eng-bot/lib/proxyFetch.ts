/**
 * Общий прокси для исходящих fetch к OpenAI из Node (локальная разработка):
 * HTTPS_PROXY / HTTP_PROXY / ALL_PROXY или системный прокси Windows (реестр Internet Settings).
 * Клиенты вроде Xray в режиме «Системный прокси» обычно прописывают прокси в реестр — тогда env не нужен.
 * Если прокси только в приложении и Node его не видит — задай HTTPS_PROXY (см. .env.example).
 */

let cachedWindowsSystemProxyUrl: string | null | undefined

async function getWindowsSystemProxyUrl(): Promise<string | null> {
  if (cachedWindowsSystemProxyUrl !== undefined) return cachedWindowsSystemProxyUrl
  if (process.platform !== 'win32') {
    cachedWindowsSystemProxyUrl = null
    return null
  }

  try {
    const { execSync } = await import('child_process')
    const ps = [
      '$p=(Get-ItemProperty -Path \"HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\" -Name ProxyEnable,ProxyServer -ErrorAction SilentlyContinue);',
      'if(-not $p){\"\"} elseif($p.ProxyEnable -ne 1){\"\"} else {$p.ProxyServer}',
    ].join('')

    const out = execSync(`powershell -NoProfile -Command ${JSON.stringify(ps)}`, { encoding: 'utf8' }).trim()
    if (!out) {
      cachedWindowsSystemProxyUrl = null
      return null
    }

    const m = out.match(/([a-zA-Z0-9.\-]+):(\d{2,5})/)
    if (!m) {
      cachedWindowsSystemProxyUrl = null
      return null
    }
    const host = m[1]
    const port = m[2]
    cachedWindowsSystemProxyUrl = `http://${host}:${port}`
    return cachedWindowsSystemProxyUrl
  } catch {
    cachedWindowsSystemProxyUrl = null
    return null
  }
}

let cachedProxyUrlForAgent: string | null = null
let cachedProxyDispatcher: unknown = null

export async function buildProxyFetchExtra(): Promise<Record<string, unknown>> {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    ''
  const resolvedProxyUrl = proxyUrl || (await getWindowsSystemProxyUrl())
  if (!resolvedProxyUrl) return {}

  if (resolvedProxyUrl === cachedProxyUrlForAgent && cachedProxyDispatcher) {
    return { dispatcher: cachedProxyDispatcher }
  }

  try {
    const undici = (await import('undici')) as unknown as {
      ProxyAgent: new (proxy: string) => unknown
    }
    cachedProxyDispatcher = new undici.ProxyAgent(resolvedProxyUrl)
    cachedProxyUrlForAgent = resolvedProxyUrl
    return { dispatcher: cachedProxyDispatcher }
  } catch {
    return {}
  }
}
