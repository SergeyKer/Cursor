const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(process.cwd(), 'debug-6a780e.log');

function debugLog(payload) {
  try {
    const line =
      JSON.stringify({
        sessionId: '6a780e',
        timestamp: Date.now(),
        ...payload,
      }) + '\n';
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  } catch {
    // ignore logging failures
  }
}

module.exports = { debugLog, LOG_PATH };
