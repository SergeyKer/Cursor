const { loadCallData } = require('../lib/call/dataLoader');
const {
  buildBaseInstructions,
  buildCallFirstTurnInstructions,
  BASE_OPERATOR_CODE,
} = require('../lib/call/instructions');
const { resolveOperatorName, isCallRealtimeVoice, CALL_DEFAULT_VOICE } = require('../lib/call/constants');
const { DEFAULT_CALL_ROLE } = require('../lib/call/processRole');

function parseVoiceFromRequest(req) {
  const voice =
    (req.query && req.query.voice) ||
    (req.body && req.body.voice) ||
    CALL_DEFAULT_VOICE;
  return isCallRealtimeVoice(voice) ? voice : CALL_DEFAULT_VOICE;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const voice = parseVoiceFromRequest(req);
    const operatorName = resolveOperatorName(voice);
    const { communicationTools } = loadCallData();
    const instructions = buildBaseInstructions(communicationTools, {
      callRole: DEFAULT_CALL_ROLE,
      voice,
      operatorName,
    });
    const firstTurnInstructions = buildCallFirstTurnInstructions({ voice, operatorName });
    res.status(200).json({ instructions, firstTurnInstructions, operatorName, voice });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
