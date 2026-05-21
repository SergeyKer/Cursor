/**
 * Проверка: Realtime API доступен через прокси (не geo-block 403), multipart не обрывается.
 */
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const filePath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const SAMPLE_SDP =
  'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:testpasswordtestpassword\r\na=rtpmap:111 opus/48000/2\r\n';

async function main() {
  loadEnvLocal();
  const { describeProxyConfig, fetchWithProxyFallback } = require('../lib/proxyFetch');
  const { prepareRealtimeCallsMultipart, getRealtimeFetchHeaders } = require('../lib/call/realtimeSession');

  const proxy = await describeProxyConfig();
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    console.error('FAIL: OPENAI_API_KEY not set');
    process.exit(1);
  }

  const multipart = await prepareRealtimeCallsMultipart(SAMPLE_SDP, {
    type: 'realtime',
    model: 'gpt-realtime-2',
    audio: { output: { voice: 'coral' } },
  });

  const response = await fetchWithProxyFallback('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: getRealtimeFetchHeaders({ Authorization: `Bearer ${key}` }, multipart.headers),
    body: multipart.body,
  });
  const body = await response.text();
  const geoBlocked = /country|region|territory/i.test(body);
  const eofSdp = /unmarshal SDP: EOF/i.test(body);
  const multipartEof = /NextPart: EOF/i.test(body);

  console.log(
    JSON.stringify(
      {
        proxy,
        buffered: multipart.buffered,
        bodyLen: multipart.bodyLen,
        status: response.status,
        geoBlocked,
        eofSdp,
        multipartEof,
        bodySnippet: body.slice(0, 200),
      },
      null,
      2
    )
  );

  if (geoBlocked || response.status === 403) {
    console.error('FAIL: geo-blocked');
    process.exit(1);
  }
  if (eofSdp || multipartEof) {
    console.error('FAIL: broken multipart / SDP');
    process.exit(1);
  }
  if (response.status >= 500) {
    console.error('FAIL: server error');
    process.exit(1);
  }
  console.log('OK: multipart reaches OpenAI (status', response.status + ')');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
