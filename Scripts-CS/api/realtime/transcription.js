const { fetchWithProxyFallback } = require('../../lib/proxyFetch');
const { buildRealtimeCallsFormBody } = require('../../lib/call/realtimeSession');

const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

function normalizeKey(raw) {
  return String(raw || '').replace(/^["'\s]+|["'\s]+$/g, '');
}

function buildRealtimeTranscriptionSession(language) {
  const lang = language === 'ru' ? 'ru' : 'en';
  return {
    type: 'transcription',
    audio: {
      input: {
        noise_reduction: { type: 'near_field' },
        transcription: {
          model: 'gpt-4o-mini-transcribe',
          language: lang,
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: false,
        },
      },
    },
  };
}

async function prepareRealtimeCallsMultipart(sdp, session) {
  const form = buildRealtimeCallsFormBody(sdp, session);
  const req = new Request('http://localhost/', { method: 'POST', body: form });
  const contentType = req.headers.get('content-type');
  if (!contentType) {
    return { body: form, headers: {}, buffered: false };
  }
  const buffer = Buffer.from(await req.arrayBuffer());
  return {
    body: buffer,
    headers: {
      'content-type': contentType,
      'content-length': String(buffer.length),
    },
    buffered: true,
    bodyLen: buffer.length,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const key = normalizeKey(process.env.OPENAI_API_KEY);
    if (!key) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
      return;
    }

    const body = req.body || {};
    const sdpRaw = typeof body.sdp === 'string' ? body.sdp : '';
    if (!sdpRaw.trim()) {
      res.status(400).json({ error: 'SDP offer is required' });
      return;
    }

    const multipart = await prepareRealtimeCallsMultipart(
      sdpRaw,
      buildRealtimeTranscriptionSession(body.language || 'ru')
    );

    const response = await fetchWithProxyFallback(OPENAI_REALTIME_CALLS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, ...multipart.headers },
      body: multipart.body,
    });

    const answerSdp = await response.text();
    if (!response.ok || !answerSdp.trim()) {
      res.status(response.status || 502).json({
        error: answerSdp || 'Failed to initialize realtime transcription',
      });
      return;
    }

    res.status(200).json({ sdp: answerSdp });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
