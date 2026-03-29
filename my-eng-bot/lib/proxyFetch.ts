/**
 * Общий прокси для исходящих fetch к OpenAI из Node (локальная разработка):
 * HTTPS_PROXY / HTTP_PROXY / ALL_PROXY или системный прокси Windows (реестр Internet Settings).
 * Если прокси задан без схемы, пробуем HTTP и HTTPS варианты, чтобы не ломаться
 * на конфиге, где строка прокси хранится только как host:port.
 */

type ProxyDispatcher = unknown
type ProxyOptions = {
  /** Подключать системный прокси Windows (реестр). */
  includeSystemProxy?: boolean
}

type ProxyFetchOptions = ProxyOptions & {
  /** Сначала пробуем прямое соединение, затем прокси-кандидаты. */
  directFirst?: boolean
}

let cachedWindowsSystemProxyCandidates: string[] | null | undefined
let cachedProxyDispatcherByUrl = new Map<string, ProxyDispatcher>()

function hasScheme(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url)
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function expandProxyHostPort(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  if (hasScheme(trimmed)) return [trimmed]

  const hostPort = trimmed.match(/^[^=:\s]+:\d{2,5}$/)
  if (!hostPort) return []

  return [`http://${trimmed}`, `https://${trimmed}`]
}

function parseProxyServerValue(raw: string): string[] {
  const entries = raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  const candidates: string[] = []

  for (const entry of entries) {
    const value = entry.includes('=') ? entry.slice(entry.indexOf('=') + 1).trim() : entry
    candidates.push(...expandProxyHostPort(value))
    if (hasScheme(value)) {
      candidates.push(value)
    }
  }

  return uniqueStrings(candidates)
}

async function getWindowsSystemProxyCandidates(): Promise<string[]> {
  if (cachedWindowsSystemProxyCandidates !== undefined) return cachedWindowsSystemProxyCandidates
  if (process.platform !== 'win32') {
    cachedWindowsSystemProxyCandidates = null
    return []
  }

  try {
    const { execSync } = await import('child_process')
    const ps = [
      '$p=(Get-ItemProperty -Path \"HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\" -Name ProxyEnable,ProxyServer -ErrorAction SilentlyContinue);',
      'if(-not $p){\"\"} elseif($p.ProxyEnable -ne 1){\"\"} else {$p.ProxyServer}',
    ].join('')

    const out = execSync(`powershell -NoProfile -Command ${JSON.stringify(ps)}`, { encoding: 'utf8' }).trim()
    const candidates = out ? parseProxyServerValue(out) : []
    cachedWindowsSystemProxyCandidates = candidates.length > 0 ? candidates : []
    return cachedWindowsSystemProxyCandidates
  } catch {
    cachedWindowsSystemProxyCandidates = []
    return []
  }
}

function getEnvProxyCandidates(): string[] {
  const envProxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    ''

  const normalizedEnvProxy = envProxy.trim()
  if (normalizedEnvProxy) {
    return hasScheme(normalizedEnvProxy) ? [normalizedEnvProxy] : expandProxyHostPort(normalizedEnvProxy)
  }

  return []
}

async function getProxyCandidates(options: ProxyOptions = {}): Promise<string[]> {
  const envCandidates = getEnvProxyCandidates()
  if (envCandidates.length > 0) return envCandidates
  if (options.includeSystemProxy === false) return []
  return getWindowsSystemProxyCandidates()
}

async function getProxyDispatcher(proxyUrl: string): Promise<ProxyDispatcher> {
  const cached = cachedProxyDispatcherByUrl.get(proxyUrl)
  if (cached) return cached

  const undici = (await import('undici')) as unknown as {
    ProxyAgent: new (proxy: string) => ProxyDispatcher
  }
  const dispatcher = new undici.ProxyAgent(proxyUrl)
  cachedProxyDispatcherByUrl.set(proxyUrl, dispatcher)
  return dispatcher
}

export async function fetchWithProxyFallback(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ProxyFetchOptions = {}
): Promise<Response> {
  if (options.directFirst) {
    try {
      return await fetch(input, init)
    } catch {
      // Сетевой сбой прямого канала: пробуем прокси-кандидаты ниже.
    }
  }

  const candidates = await getProxyCandidates(options)
  if (candidates.length === 0) {
    return fetch(input, init)
  }

  let lastError: unknown = null

  for (const proxyUrl of candidates) {
    try {
      const dispatcher = await getProxyDispatcher(proxyUrl)
      return await fetch(input, {
        ...init,
        dispatcher,
      } as RequestInit)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Proxy fetch failed')
}

export async function buildProxyFetchExtra(): Promise<Record<string, unknown>> {
  const candidates = await getProxyCandidates()
  if (candidates.length === 0) return {}

  try {
    const dispatcher = await getProxyDispatcher(candidates[0])
    return { dispatcher }
  } catch {
    return {}
  }
}
