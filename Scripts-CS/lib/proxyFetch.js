/**
 * Прокси для исходящих fetch к OpenAI из Node:
 * HTTPS_PROXY / HTTP_PROXY / ALL_PROXY или системный прокси Windows.
 */

let cachedWindowsSystemProxyCandidates;
const cachedProxyDispatcherByUrl = new Map();

function hasScheme(url) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function expandProxyHostPort(value) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (hasScheme(trimmed)) return [trimmed];

  const hostPort = trimmed.match(/^[^=:\s]+:\d{2,5}$/);
  if (!hostPort) return [];

  return [`http://${trimmed}`, `https://${trimmed}`];
}

function parseProxyServerValue(raw) {
  const entries = raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  const candidates = [];

  for (const entry of entries) {
    const value = entry.includes('=') ? entry.slice(entry.indexOf('=') + 1).trim() : entry;
    candidates.push(...expandProxyHostPort(value));
    if (hasScheme(value)) {
      candidates.push(value);
    }
  }

  return uniqueStrings(candidates);
}

async function getWindowsSystemProxyCandidates() {
  if (cachedWindowsSystemProxyCandidates !== undefined) return cachedWindowsSystemProxyCandidates;
  if (process.platform !== 'win32') {
    cachedWindowsSystemProxyCandidates = [];
    return [];
  }

  try {
    const { execSync } = require('child_process');
    const ps = [
      '$p=(Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" -Name ProxyEnable,ProxyServer -ErrorAction SilentlyContinue);',
      'if(-not $p){""} elseif($p.ProxyEnable -ne 1){""} else {$p.ProxyServer}',
    ].join('');

    const out = execSync(`powershell -NoProfile -Command ${JSON.stringify(ps)}`, { encoding: 'utf8' }).trim();
    const candidates = out ? parseProxyServerValue(out) : [];
    cachedWindowsSystemProxyCandidates = candidates.length > 0 ? candidates : [];
    return cachedWindowsSystemProxyCandidates;
  } catch {
    cachedWindowsSystemProxyCandidates = [];
    return [];
  }
}

function getEnvProxyCandidates() {
  const envProxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    '';

  const normalizedEnvProxy = envProxy.trim();
  if (normalizedEnvProxy) {
    return hasScheme(normalizedEnvProxy) ? [normalizedEnvProxy] : expandProxyHostPort(normalizedEnvProxy);
  }

  return [];
}

async function getProxyCandidates(options = {}) {
  const envCandidates = getEnvProxyCandidates();
  if (envCandidates.length > 0) return envCandidates;
  if (options.includeSystemProxy === false) return [];
  return getWindowsSystemProxyCandidates();
}

async function getProxyDispatcher(proxyUrl) {
  const cached = cachedProxyDispatcherByUrl.get(proxyUrl);
  if (cached) return cached;

  const undici = require('undici');
  const dispatcher = new undici.ProxyAgent(proxyUrl);
  cachedProxyDispatcherByUrl.set(proxyUrl, dispatcher);
  return dispatcher;
}

async function fetchWithProxyFallback(input, init = {}, options = {}) {
  if (options.directFirst) {
    try {
      return await fetch(input, init);
    } catch {
      // Прямой канал недоступен — пробуем прокси ниже.
    }
  }

  const candidates = await getProxyCandidates(options);
  if (candidates.length === 0) {
    return fetch(input, init);
  }

  let lastError = null;

  for (const proxyUrl of candidates) {
    try {
      const dispatcher = await getProxyDispatcher(proxyUrl);
      return await fetch(input, {
        ...init,
        dispatcher,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Proxy fetch failed');
}

async function describeProxyConfig() {
  const envCandidates = getEnvProxyCandidates();
  const systemCandidates =
    envCandidates.length > 0 ? [] : await getWindowsSystemProxyCandidates();
  const candidates = envCandidates.length > 0 ? envCandidates : systemCandidates;
  return {
    candidateCount: candidates.length,
    source: envCandidates.length > 0 ? 'env' : systemCandidates.length > 0 ? 'windows' : 'none',
  };
}

module.exports = {
  fetchWithProxyFallback,
  describeProxyConfig,
};
