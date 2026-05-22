const { loadCallData } = require('../lib/call/dataLoader');
const { buildProcessPrompt } = require('../lib/call/buildProcessPrompt');
const {
  BASE_OPERATOR_CODE,
  buildBaseInstructions,
  buildSessionInstructions,
} = require('../lib/call/instructions');
const { resolveProcessKey } = require('../lib/call/processCatalog');
const processCatalog = require('../lib/call/processCatalog');
const { canonicalProcessCode } = require('../lib/call/processAliases');
const {
  resolveProcessByScoring,
  parseLlmResolveResult,
  buildLlmResolvePrompt,
  isGreetingOnlyQuery,
} = require('../lib/call/resolveProcess');
const { fetchWithProxyFallback } = require('../lib/proxyFetch');
const { resolveOperatorName, isCallRealtimeVoice, CALL_DEFAULT_VOICE } = require('../lib/call/constants');
const { DEFAULT_CALL_ROLE } = require('../lib/call/processRole');

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

function resolveProcessMeta(metaList, code) {
  if (typeof processCatalog.resolveRichProcessMeta === 'function') {
    return processCatalog.resolveRichProcessMeta(metaList, code);
  }
  return processCatalog.findMetaByCode(metaList, code);
}

function normalizeKey(raw) {
  return String(raw || '').replace(/^["'\s]+|["'\s]+$/g, '');
}

function parseVoice(body) {
  const voice = body && body.voice;
  return isCallRealtimeVoice(voice) ? voice : CALL_DEFAULT_VOICE;
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

    const voice = parseVoice(req.body);
    const operatorName = resolveOperatorName(voice);
    const clarifyCount = Number(req.body && req.body.clarifyCount) || 0;

    const { meta, processes, knowledge, communicationTools } = loadCallData();
    let resolved = resolveProcessByScoring(meta, query);

    const needsLlm =
      !isGreetingOnlyQuery(query) &&
      !resolved.greetingOnly &&
      resolved.confidence !== 'high' &&
      normalizeKey(process.env.OPENAI_API_KEY);

    if (needsLlm) {
      const llmResolved = await classifyWithLlm(query, meta, normalizeKey(process.env.OPENAI_API_KEY));
      if (llmResolved) resolved = { ...llmResolved, score: resolved.score };
    }

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
    const baseInstructions = buildBaseInstructions(communicationTools, {
      callRole: DEFAULT_CALL_ROLE,
      voice,
      operatorName,
    });
    const sessionInstructions = buildSessionInstructions(baseInstructions, processPrompt, {
      clarifyPrompt: resolved.clarifyPrompt,
      clarifyCount,
      greetingOnly: Boolean(resolved.greetingOnly),
    });

    res.status(200).json({
      processCode: processMeta.code,
      name: processMeta.name || processMeta.code,
      menu_done: Boolean(processMeta.menu_done),
      confidence: resolved.confidence,
      clarifyPrompt: resolved.clarifyPrompt || null,
      processPrompt,
      sessionInstructions,
      operatorName,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
