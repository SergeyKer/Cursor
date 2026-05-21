const SESSION_CONFIG_MESSAGE =
  'Не удалось настроить голосовую сессию. Попробуйте ещё раз через несколько секунд.';
const RATE_LIMIT_MESSAGE =
  'Слишком много запросов к голосовому сервису. Подождите немного и попробуйте снова.';
const NETWORK_MESSAGE =
  'Не удалось подключиться к голосовому сервису. Проверьте сеть или VPN.';

function extractOpenAiErrorMessage(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error.trim();
    if (parsed.error && typeof parsed.error === 'object') {
      return (parsed.error.message || '').trim();
    }
  } catch {
    // not json
  }
  return trimmed;
}

const GEO_PROXY_MESSAGE =
  'OpenAI недоступен из вашего региона. Укажите HTTPS_PROXY=http://127.0.0.1:10801 в .env.local (или включите системный прокси) и перезапустите сервер.';

function mapOpenAiApiMessage(apiMessage, httpStatus) {
  const normalized = (apiMessage || '').toLowerCase();
  if (
    normalized.includes('country') ||
    normalized.includes('region') ||
    normalized.includes('territory') ||
    normalized.includes('unsupported_country')
  ) {
    return GEO_PROXY_MESSAGE;
  }
  if (
    normalized.includes('invalid modalities') ||
    normalized.includes('session.type') ||
    normalized.includes('unknown parameter')
  ) {
    return SESSION_CONFIG_MESSAGE;
  }
  if (httpStatus === 429 || normalized.includes('rate limit')) {
    return RATE_LIMIT_MESSAGE;
  }
  if (normalized.includes('network') || normalized.includes('timeout')) {
    return NETWORK_MESSAGE;
  }
  return null;
}

function resolveCallRealtimeUserMessage(params) {
  const apiMessage = extractOpenAiErrorMessage(params.raw) || (params.raw || '').trim();
  const mapped = apiMessage ? mapOpenAiApiMessage(apiMessage, params.httpStatus) : null;
  return {
    userMessage: mapped || apiMessage || 'Не удалось начать звонок. Попробуйте ещё раз.',
    apiMessage,
  };
}

function resolveCallOpenAiUserMessage(params) {
  const apiMessage = extractOpenAiErrorMessage(params.raw) || (params.raw || '').trim();
  const mapped = apiMessage ? mapOpenAiApiMessage(apiMessage, params.httpStatus) : null;
  return {
    userMessage: mapped || apiMessage || params.fallback || 'Не удалось выполнить запрос к OpenAI.',
    apiMessage,
  };
}

module.exports = {
  resolveCallRealtimeUserMessage,
  resolveCallOpenAiUserMessage,
  SESSION_CONFIG_MESSAGE,
  GEO_PROXY_MESSAGE,
};
