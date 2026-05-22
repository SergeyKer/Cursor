const {
  CALL_DEFAULT_VOICE,
  isCallRealtimeVoice,
  resolveCallRealtimeModel,
} = require('../../lib/call/constants');
const { DEFAULT_CALL_ROLE } = require('../../lib/call/processRole');
const { resolveCallRealtimeUserMessage } = require('../../lib/call/errors');
const {
  buildCallsApiSession,
  buildRealtimeCallsFormBody,
} = require('../../lib/call/realtimeSession');
const { loadCallData } = require('../../lib/call/dataLoader');
const { buildBaseInstructions } = require('../../lib/call/instructions');
const { fetchWithProxyFallback, describeProxyConfig } = require('../../lib/proxyFetch');

const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

function normalizeKey(raw) {
  return String(raw || '').replace(/^["'\s]+|["'\s]+$/g, '');
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
    const proxyConfig = await describeProxyConfig();
    if (!key) {
      res.status(500).json({ error: 'На сервере не задан OPENAI_API_KEY' });
      return;
    }

    const body = req.body || {};
    const sdpRaw = typeof body.sdp === 'string' ? body.sdp : '';
    if (!sdpRaw.trim()) {
      res.status(400).json({ error: 'SDP offer is required' });
      return;
    }

    const voice = isCallRealtimeVoice(body.voice) ? body.voice : CALL_DEFAULT_VOICE;
    const { communicationTools } = loadCallData();
    const instructions = buildBaseInstructions(communicationTools, {
      callRole: DEFAULT_CALL_ROLE,
      voice,
    });

    const model = resolveCallRealtimeModel(body.model);
    const sessionPayload = buildCallsApiSession({
      model,
      voice,
      instructions,
    });
    const multipart = await prepareRealtimeCallsMultipart(sdpRaw, sessionPayload);
    const openAiHeaders = {
      Authorization: `Bearer ${key}`,
      ...multipart.headers,
    };

    const callsResponse = await fetchWithProxyFallback(OPENAI_REALTIME_CALLS_URL, {
      method: 'POST',
      headers: openAiHeaders,
      body: multipart.body,
    });

    const callsAnswer = await callsResponse.text();
    if (callsResponse.ok && callsAnswer.trim()) {
      res.status(200).json({ sdp: callsAnswer });
      return;
    }

    const openAiStatus = callsResponse.status || 502;
    const { userMessage, apiMessage } = resolveCallRealtimeUserMessage({
      raw: callsAnswer || 'Failed to initialize realtime session',
      httpStatus: openAiStatus,
    });
    res.status(openAiStatus).json({
      error: apiMessage,
      userMessage,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
