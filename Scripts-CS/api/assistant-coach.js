const { loadCallData } = require('../lib/call/dataLoader');
const { buildProcessPrompt } = require('../lib/call/buildProcessPrompt');
const { BASE_OPERATOR_CODE, buildCoachSystemPrompt, buildCoachUserMessage } = require('../lib/call/instructions');
const { parseCoachLlmJson } = require('../lib/call/coachResponse');
const { resolveProcessForQuery, normalizeKey } = require('../lib/call/resolveProcessForQuery');
const processCatalog = require('../lib/call/processCatalog');
const { canonicalProcessCode } = require('../lib/call/processAliases');
const { resolveCallOpenAiUserMessage } = require('../lib/call/errors');
const { fetchWithProxyFallback } = require('../lib/proxyFetch');
const { DEFAULT_CALL_ROLE } = require('../lib/call/processRole');

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

function resolveProcessMeta(metaList, code) {
  if (typeof processCatalog.resolveRichProcessMeta === 'function') {
    return processCatalog.resolveRichProcessMeta(metaList, code);
  }
  return processCatalog.findMetaByCode(metaList, code);
}

function buildBasePayload(processMeta, resolved) {
  return {
    processCode: processMeta.code,
    processName: processMeta.name || processMeta.code,
    menuDone: Boolean(processMeta.menu_done),
    confidence: resolved.confidence || 'medium',
    clarifyPrompt: resolved.clarifyPrompt || null,
    summary: null,
    doNow: [],
    sayNow: [],
    askClient: [],
    readNext: [{ view: 'processes', sectionId: 'section-script', label: 'Скрипт' }],
    relatedTopics: [],
    warnings: [],
    clarifyQuestion: null,
    adviceMarkdown: null,
  };
}

async function fetchCoachAdvice(query, processPrompt, resolved) {
  const apiKey = normalizeKey(process.env.OPENAI_API_KEY);
  if (!apiKey) return { error: 'no_api_key' };

  const response = await fetchWithProxyFallback(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: buildCoachSystemPrompt(processPrompt, {
            processCode: resolved.processCode,
            processName: resolved.processName,
            confidence: resolved.confidence,
            clarifyPrompt: resolved.clarifyPrompt,
          }),
        },
        { role: 'user', content: buildCoachUserMessage(query) },
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
      raw: data?.error?.message || raw || 'Не удалось получить рекомендации',
      httpStatus: response.status,
      fallback: 'Не удалось получить рекомендации',
    });
    return { httpError: true, status: response.status || 502, userMessage, apiMessage };
  }

  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!content) {
    return { httpError: true, status: 502, userMessage: 'Пустой ответ модели', apiMessage: 'empty_response' };
  }

  return { content };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const query = String((req.body && req.body.query) || '').trim();
    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    const { meta, processes, knowledge, communicationTools } = loadCallData();
    const resolved = await resolveProcessForQuery(query, meta);
    const processMeta =
      resolveProcessMeta(meta, canonicalProcessCode(resolved.processCode)) ||
      resolveProcessMeta(meta, BASE_OPERATOR_CODE);

    const processPrompt = buildProcessPrompt(
      processMeta,
      processes,
      knowledge,
      communicationTools,
      BASE_OPERATOR_CODE,
      { callRole: DEFAULT_CALL_ROLE }
    );

    const payload = buildBasePayload(processMeta, resolved);
    resolved.processName = payload.processName;
    resolved.processCode = payload.processCode;

    const coachResult = await fetchCoachAdvice(query, processPrompt, resolved);

    if (coachResult.error === 'no_api_key') {
      res.status(200).json({
        ...payload,
        error: 'no_api_key',
        userMessage:
          'ИИ-рекомендации недоступны: не задан OPENAI_API_KEY. Откройте процесс вручную или настройте ключ в .env.local.',
      });
      return;
    }

    if (coachResult.httpError) {
      res.status(coachResult.status || 502).json({
        ...payload,
        error: coachResult.apiMessage,
        userMessage: coachResult.userMessage,
      });
      return;
    }

    const { coach, adviceMarkdown } = parseCoachLlmJson(coachResult.content);
    if (coach) {
      res.status(200).json({
        ...payload,
        summary: coach.summary || null,
        doNow: coach.doNow,
        sayNow: coach.sayNow,
        askClient: coach.askClient,
        readNext: coach.readNext,
        relatedTopics: coach.relatedTopics,
        warnings: coach.warnings,
        clarifyQuestion: coach.clarifyQuestion,
        adviceMarkdown: null,
      });
      return;
    }

    res.status(200).json({
      ...payload,
      adviceMarkdown: adviceMarkdown || coachResult.content,
      userMessage: 'Ответ получен в свободной форме — см. текст ниже.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: message,
      userMessage: 'Не удалось получить рекомендации. Перезапустите сервер и попробуйте снова.',
    });
  }
};
