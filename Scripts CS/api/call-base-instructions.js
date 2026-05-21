const { loadCallData } = require('../lib/call/dataLoader');
const { buildBaseInstructions, BASE_OPERATOR_CODE } = require('../lib/call/instructions');
const { resolveProcessKey } = require('../lib/call/processCatalog');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { meta, processes, communicationTools } = loadCallData();
    const baseKey = resolveProcessKey({ code: BASE_OPERATOR_CODE, sheet_name: BASE_OPERATOR_CODE }, processes);
    const baseProcess = baseKey ? processes[baseKey] : null;
    const instructions = buildBaseInstructions(meta, baseProcess, communicationTools);
    res.status(200).json({ instructions });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
