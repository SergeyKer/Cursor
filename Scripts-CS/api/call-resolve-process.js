const { loadCallData } = require('../lib/call/dataLoader');
const { buildProcessPrompt } = require('../lib/call/buildProcessPrompt');
const {
  BASE_OPERATOR_CODE,
  buildBaseInstructions,
  buildSessionInstructions,
} = require('../lib/call/instructions');
const processCatalog = require('../lib/call/processCatalog');
const { canonicalProcessCode } = require('../lib/call/processAliases');
const { resolveProcessForQuery } = require('../lib/call/resolveProcessForQuery');
const { isCallRealtimeVoice, CALL_DEFAULT_VOICE } = require('../lib/call/constants');
const { DEFAULT_CALL_ROLE } = require('../lib/call/processRole');

function resolveProcessMeta(metaList, code) {
  if (typeof processCatalog.resolveRichProcessMeta === 'function') {
    return processCatalog.resolveRichProcessMeta(metaList, code);
  }
  return processCatalog.findMetaByCode(metaList, code);
}

function parseVoice(body) {
  const voice = body && body.voice;
  return isCallRealtimeVoice(voice) ? voice : CALL_DEFAULT_VOICE;
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
    const clarifyCount = Number(req.body && req.body.clarifyCount) || 0;
    const conversationText = String((req.body && req.body.conversationText) || query).trim();

    const { meta, processes, knowledge, communicationTools } = loadCallData();
    const resolved = await resolveProcessForQuery(query, meta, { conversationText });

    const processMeta =
      resolveProcessMeta(meta, canonicalProcessCode(resolved.processCode)) ||
      resolveProcessMeta(meta, BASE_OPERATOR_CODE);
    const processPrompt = buildProcessPrompt(
      processMeta,
      processes,
      knowledge,
      communicationTools,
      BASE_OPERATOR_CODE,
      { callRole: DEFAULT_CALL_ROLE, audience: 'call' }
    );
    const baseInstructions = buildBaseInstructions(communicationTools, {
      callRole: DEFAULT_CALL_ROLE,
      voice,
    });
    const sessionInstructions = buildSessionInstructions(baseInstructions, processPrompt, {
      clarifyPrompt: resolved.clarifyPrompt,
      clarifyCount,
      greetingOnly: Boolean(resolved.greetingOnly),
      terminationScenarioBlock: resolved.terminationScenarioBlock,
    });

    res.status(200).json({
      processCode: processMeta.code,
      name: processMeta.name || processMeta.code,
      menu_done: Boolean(processMeta.menu_done),
      confidence: resolved.confidence,
      clarifyPrompt: resolved.clarifyPrompt || null,
      termination: resolved.termination || null,
      processPrompt,
      sessionInstructions,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
