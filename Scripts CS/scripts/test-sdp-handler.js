const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  const k = line.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
}

const SAMPLE_SDP = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:testpasswordtestpassword\r\na=rtpmap:111 opus/48000/2\r\n';

const handler = require('../api/realtime-session/sdp');

const res = {
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  setHeader() {
    return this;
  },
  json(data) {
    fs.writeFileSync(
      path.join(ROOT, 'scripts', 'test-sdp-handler-result.json'),
      JSON.stringify({ status: this.statusCode, data }, null, 2)
    );
  },
};

handler(
  { method: 'POST', body: { sdp: SAMPLE_SDP, voice: 'coral' } },
  res
).catch((e) => {
  fs.writeFileSync(
    path.join(ROOT, 'scripts', 'test-sdp-handler-result.json'),
    JSON.stringify({ error: e.message, stack: e.stack })
  );
  process.exit(1);
});
