const { fetchWithProxyFallback } = require('../proxyFetch');
const { resolveCallOpenAiUserMessage } = require('../call/errors');
const { normalizeKey } = require('../call/resolveProcessForQuery');

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * @param {{ system: string, user: string, maxTokens?: number, temperature?: number, apiKey?: string }} opts
 * @returns {Promise<{ content: string } | { error: 'no_api_key' } | { httpError: true, status: number, userMessage: string, apiMessage: string }>}
 */
async function chatMini(opts) {
  const apiKey = normalizeKey(opts.apiKey ?? process.env.OPENAI_API_KEY);
  if (!apiKey) return { error: 'no_api_key' };

  const response = await fetchWithProxyFallback(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 900,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const { userMessage, apiMessage } = resolveCallOpenAiUserMessage({
      raw: data?.error?.message || raw || 'Не удалось получить ответ модели',
      httpStatus: response.status,
      fallback: 'Не удалось получить ответ модели',
    });
    return { httpError: true, status: response.status || 502, userMessage, apiMessage };
  }

  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!content) {
    return {
      httpError: true,
      status: 502,
      userMessage: 'Пустой ответ модели',
      apiMessage: 'empty_response',
    };
  }

  return { content };
}

module.exports = { chatMini, OPENAI_CHAT_COMPLETIONS_URL, DEFAULT_MODEL };
