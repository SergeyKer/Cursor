const {
  resolveProcessByScoring,
  parseLlmResolveResult,
  buildLlmResolvePrompt,
  isGreetingOnlyQuery,
} = require('./resolveProcess');
const { fetchWithProxyFallback } = require('../proxyFetch');

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

function normalizeKey(raw) {
  return String(raw || '').replace(/^["'\s]+|["'\s]+$/g, '');
}

async function classifyWithLlm(query, metaList, apiKey) {
  const response = await fetchWithProxyFallback(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: 'Отвечай только JSON без markdown.' },
        { role: 'user', content: buildLlmResolvePrompt(metaList, query) },
      ],
    }),
  });
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return parseLlmResolveResult(content, metaList);
}

/**
 * @param {string} query
 * @param {object[]} metaList
 * @param {{ useLlm?: boolean }} [options]
 */
async function resolveProcessForQuery(query, metaList, options = {}) {
  const useLlm = options.useLlm !== false;
  const conversationText = options.conversationText || query;
  let resolved = resolveProcessByScoring(metaList, query, { conversationText });
  const apiKey = normalizeKey(process.env.OPENAI_API_KEY);

  const needsLlm =
    useLlm &&
    apiKey &&
    !isGreetingOnlyQuery(query) &&
    !resolved.greetingOnly &&
    resolved.confidence !== 'high';

  if (needsLlm) {
    const llmResolved = await classifyWithLlm(query, metaList, apiKey);
    if (llmResolved) resolved = { ...llmResolved, score: resolved.score };
  }

  return resolved;
}

module.exports = {
  resolveProcessForQuery,
  normalizeKey,
  classifyWithLlm,
};
