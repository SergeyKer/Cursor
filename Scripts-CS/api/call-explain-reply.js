const { loadCallData } = require('../lib/call/dataLoader');
const { buildProcessPrompt } = require('../lib/call/buildProcessPrompt');
const { buildExplainSystemPrompt, BASE_OPERATOR_CODE } = require('../lib/call/instructions');
const processCatalog = require('../lib/call/processCatalog');
const { canonicalProcessCode } = require('../lib/call/processAliases');

function resolveProcessMeta(metaList, code) {
  if (typeof processCatalog.resolveRichProcessMeta === 'function') {
    return processCatalog.resolveRichProcessMeta(metaList, code);
  }
  return processCatalog.findMetaByCode(metaList, code);
}
const { resolveCallOpenAiUserMessage } = require('../lib/call/errors');
const { fetchWithProxyFallback } = require('../lib/proxyFetch');

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

function normalizeKey(raw) {
  return String(raw || '').replace(/^["'\s]+|["'\s]+$/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const key = normalizeKey(process.env.OPENAI_API_KEY);
    if (!key) {
      res.status(500).json({ error: 'На сервере не задан OPENAI_API_KEY' });
      return;
    }

    const body = req.body || {};
    const text = String(body.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const { meta, processes, knowledge, communicationTools } = loadCallData();
    const processCode = String(body.processCode || BASE_OPERATOR_CODE).trim();
    const processMeta =
      resolveProcessMeta(meta, canonicalProcessCode(processCode)) ||
      resolveProcessMeta(meta, BASE_OPERATOR_CODE);
    const processPrompt =
      String(body.processPromptContext || '').trim() ||
      buildProcessPrompt(processMeta, processes, knowledge, communicationTools, BASE_OPERATOR_CODE, {
        audience: 'call',
      });

    const response = await fetchWithProxyFallback(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildExplainSystemPrompt(processPrompt) },
          {
            role: 'user',
            content: `Реплика менеджера: «${text}»\n\nКратко объясни, почему менеджер сказал именно так.`,
          },
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
        raw: data?.error?.message || raw || 'Не удалось получить объяснение',
        httpStatus: response.status,
        fallback: 'Не удалось получить объяснение',
      });
      res.status(response.status || 502).json({
        error: apiMessage,
        userMessage,
      });
      return;
    }

    const explanation = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!explanation) {
      res.status(502).json({ error: 'Пустой ответ модели' });
      return;
    }

    res.status(200).json({ explanation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: message,
      userMessage: 'Не удалось загрузить объяснение. Перезапустите сервер и попробуйте снова.',
    });
  }
};
