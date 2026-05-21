const fs = require('fs');
const path = require('path');

process.chdir(path.join(__dirname, '..'));
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  if (!process.env[line.slice(0, i).trim()]) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const SDP =
  'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:testpasswordtestpassword\r\na=rtpmap:111 opus/48000/2\r\n';

const { loadCallData } = require('../lib/call/dataLoader');
const { buildBaseInstructions, BASE_OPERATOR_CODE } = require('../lib/call/instructions');
const { resolveProcessKey } = require('../lib/call/processCatalog');
const { buildCallsApiSession, prepareRealtimeCallsMultipart, getRealtimeFetchHeaders } = require('../lib/call/realtimeSession');
const { CALL_REALTIME_MODEL, CALL_DEFAULT_VOICE } = require('../lib/call/constants');
const { fetchWithProxyFallback } = require('../lib/proxyFetch');

const { meta, processes, communicationTools } = loadCallData();
const baseKey = resolveProcessKey({ code: BASE_OPERATOR_CODE, sheet_name: BASE_OPERATOR_CODE }, processes);
const instructions = buildBaseInstructions(meta, processes[baseKey], communicationTools);

const sessions = {
  minimal: { type: 'realtime', model: CALL_REALTIME_MODEL, audio: { output: { voice: CALL_DEFAULT_VOICE } } },
  full: buildCallsApiSession({ model: CALL_REALTIME_MODEL, voice: CALL_DEFAULT_VOICE, instructions }),
};

async function run(label, session) {
  const multipart = await prepareRealtimeCallsMultipart(SDP, session);
  const res = await fetchWithProxyFallback('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: getRealtimeFetchHeaders({ Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}` }, multipart.headers),
    body: multipart.body,
  });
  const text = await res.text();
  return {
    label,
    sessionLen: JSON.stringify(session).length,
    bodyLen: multipart.bodyLen,
    status: res.status,
    eof: /SDP: EOF/i.test(text),
    invalid: /Invalid SDP/i.test(text),
    snippet: text.slice(0, 100),
  };
}

(async () => {
  const out = [];
  for (const [label, session] of Object.entries(sessions)) {
    out.push(await run(label, session));
  }
  fs.writeFileSync(path.join(__dirname, 'test-session-size.json'), JSON.stringify(out, null, 2));
})();
