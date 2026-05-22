const fs = require('fs');
const path = require('path');

process.chdir(path.join(__dirname, '..'));
const { loadCallData } = require('../lib/call/dataLoader');
const { buildBaseInstructions } = require('../lib/call/instructions');
const { DEFAULT_CALL_ROLE } = require('../lib/call/processRole');
const { buildCallsApiSession, prepareRealtimeCallsMultipart } = require('../lib/call/realtimeSession');
const { CALL_REALTIME_MODEL, CALL_DEFAULT_VOICE } = require('../lib/call/constants');

const shortSdp =
  'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:testpasswordtestpassword\r\na=rtpmap:111 opus/48000/2\r\n';
const longSdp = shortSdp + 'a=pad:' + 'x'.repeat(2406 - shortSdp.length - 10) + '\r\n';

const { communicationTools } = loadCallData();
const instructions = buildBaseInstructions(communicationTools, {
  callRole: DEFAULT_CALL_ROLE,
  voice: CALL_DEFAULT_VOICE,
});
const session = buildCallsApiSession({
  model: CALL_REALTIME_MODEL,
  voice: CALL_DEFAULT_VOICE,
  instructions,
});

function extractSdpPart(buf, boundary) {
  const text = buf.toString('utf8');
  const marker = `name="sdp"`;
  const i = text.indexOf(marker);
  if (i < 0) return { found: false };
  const after = text.slice(i);
  const bodyStart = after.indexOf('\r\n\r\n');
  const next = after.indexOf('\r\n--' + boundary, bodyStart + 4);
  const body = after.slice(bodyStart + 4, next);
  return {
    found: true,
    partLen: body.length,
    startsWithV: body.startsWith('v='),
    endsWithRn: body.endsWith('\r\n'),
    head: body.slice(0, 40),
    tail: body.slice(-40),
  };
}

async function inspect(label, sdp) {
  const m = await prepareRealtimeCallsMultipart(sdp, session);
  const ct = m.headers['content-type'] || '';
  const boundary = (ct.match(/boundary=(.+)/) || [])[1];
  const sdpPart = extractSdpPart(m.body, boundary);
  return { label, sdpLen: sdp.length, bodyLen: m.bodyLen, boundary, sdpPart };
}

(async () => {
  const out = [await inspect('short', shortSdp), await inspect('long', longSdp)];
  fs.writeFileSync(path.join(__dirname, 'inspect-multipart.json'), JSON.stringify(out, null, 2));
})();
