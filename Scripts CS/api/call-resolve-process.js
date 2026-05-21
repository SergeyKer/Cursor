const { loadCallData } = require('../lib/call/dataLoader');
const { buildProcessPrompt } = require('../lib/call/buildProcessPrompt');
const {
  BASE_OPERATOR_CODE,
  buildBaseInstructions,
  buildSessionInstructions,
} = require('../lib/call/instructions');
const { resolveProcessKey } = require('../lib/call/processCatalog');
const processCatalog = require('../lib/call/processCatalog');

function resolveProcessMeta(metaList, code) {
  if (typeof processCatalog.resolveRichProcessMeta === 'function') {
    return processCatalog.resolveRichProcessMeta(metaList, code);
  }
  return processCatalog.findMetaByCode(metaList, code);
}
const { canonicalProcessCode } = require('../lib/call/processAliases');
const {
  resolveProcessByScoring,
  parseLlmResolveResult,
  buildLlmResolvePrompt,
} = require('../lib/call/resolveProcess');
const { fetchWithProxyFallback } = require('../lib/proxyFetch');

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
    let resolved = resolveProcessByScoring(meta, query);

    const needsLlm =
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
      BASE_OPERATOR_CODE
    );
    const baseKey = resolveProcessKey(
      { code: BASE_OPERATOR_CODE, sheet_name: BASE_OPERATOR_CODE },
      processes
    );
    const baseProcess = baseKey ? processes[baseKey] : null;
    const baseInstructions = buildBaseInstructions(meta, baseProcess, communicationTools);
    const sessionInstructions = buildSessionInstructions(baseInstructions, processPrompt);

    res.status(200).json({
      processCode: processMeta.code,
      name: processMeta.name || processMeta.code,
      menu_done: Boolean(processMeta.menu_done),
      confidence: resolved.confidence,
      clarifyPrompt: resolved.clarifyPrompt || null,
      processPrompt,
      sessionInstructions,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
