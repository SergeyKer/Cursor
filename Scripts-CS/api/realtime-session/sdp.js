const {
  CALL_REALTIME_MODEL,
  CALL_DEFAULT_VOICE,
  isCallRealtimeVoice,
  resolveOperatorName,
} = require('../../lib/call/constants');
const { DEFAULT_CALL_ROLE } = require('../../lib/call/processRole');
const { resolveCallRealtimeUserMessage } = require('../../lib/call/errors');
const {
  buildCallsApiSession,
  buildRealtimeCallsFormBody,
} = require('../../lib/call/realtimeSession');
const { loadCallData } = require('../../lib/call/dataLoader');
const { buildBaseInstructions } = require('../../lib/call/instructions');
const { debugLog } = require('../../lib/debugLog');
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
    // #region agent log
    debugLog({
      location: 'api/realtime-session/sdp.js:entry',
      message: 'sdp handler start',
      data: {
        hasOpenAiKey: Boolean(key),
        hasHttpsProxy: Boolean(process.env.HTTPS_PROXY || process.env.https_proxy),
        hasHttpProxy: Boolean(process.env.HTTP_PROXY || process.env.http_proxy),
        proxyCandidateCount: proxyConfig.candidateCount,
        proxySource: proxyConfig.source,
        fetchMode: proxyConfig.candidateCount > 0 ? 'proxy-fallback' : 'direct',
      },
      hypothesisId: 'H1-H2-H4',
      runId: 'post-fix',
    });
    // #endregion
    if (!key) {
      // #region agent log
      debugLog({
        location: 'api/realtime-session/sdp.js:missing-key',
        message: 'OPENAI_API_KEY missing',
        data: { hasOpenAiKey: false },
        hypothesisId: 'H2',
        runId: 'pre-fix',
      });
      // #endregion
      res.status(500).json({ error: 'На сервере не задан OPENAI_API_KEY' });
      return;
    }

    const body = req.body || {};
    const sdpRaw = typeof body.sdp === 'string' ? body.sdp : '';
    // #region agent log
    debugLog({
      location: 'api/realtime-session/sdp.js:sdp-received',
      message: 'sdp payload from client',
      data: {
        sdpLen: sdpRaw.length,
        rawLen: sdpRaw.length,
        hasAudioLine: /m=audio/i.test(sdpRaw),
        hasIceUfrag: /a=ice-ufrag:/i.test(sdpRaw),
        startsWithV: sdpRaw.startsWith('v='),
      },
      hypothesisId: 'H1-H3',
      runId: 'sdp-debug',
    });
    // #endregion
    if (!sdpRaw.trim()) {
      res.status(400).json({ error: 'SDP offer is required' });
      return;
    }

    const voice = isCallRealtimeVoice(body.voice) ? body.voice : CALL_DEFAULT_VOICE;
    const { communicationTools } = loadCallData();
    const instructions = buildBaseInstructions(communicationTools, {
      callRole: DEFAULT_CALL_ROLE,
      voice,
      operatorName: resolveOperatorName(voice),
    });

    const sessionPayload = buildCallsApiSession({
      model: CALL_REALTIME_MODEL,
      voice,
      instructions,
    });
    const multipart = await prepareRealtimeCallsMultipart(sdpRaw, sessionPayload);
    const openAiHeaders = {
      Authorization: `Bearer ${key}`,
      ...multipart.headers,
    };
    // #region agent log
    debugLog({
      location: 'api/realtime-session/sdp.js:before-openai',
      message: 'sending multipart to openai',
      data: {
        sdpLen: sdpRaw.length,
        sessionJsonLen: JSON.stringify(sessionPayload).length,
        multipartBuffered: multipart.buffered,
        multipartBodyLen: multipart.bodyLen || null,
        hasContentLength: Boolean(openAiHeaders['content-length']),
      },
      hypothesisId: 'H4-H5',
      runId: 'sdp-debug',
    });
    // #endregion

    const callsResponse = await fetchWithProxyFallback(OPENAI_REALTIME_CALLS_URL, {
      method: 'POST',
      headers: openAiHeaders,
      body: multipart.body,
    });

    const callsAnswer = await callsResponse.text();
    if (callsResponse.ok && callsAnswer.trim()) {
      // #region agent log
      debugLog({
        location: 'api/realtime-session/sdp.js:success',
        message: 'realtime sdp ok',
        data: { openAiStatus: callsResponse.status, sdpAnswerLen: callsAnswer.length },
        hypothesisId: 'H1',
        runId: 'post-fix',
      });
      // #endregion
      res.status(200).json({ sdp: callsAnswer });
      return;
    }

    const openAiStatus = callsResponse.status || 502;
    const { userMessage, apiMessage } = resolveCallRealtimeUserMessage({
      raw: callsAnswer || 'Failed to initialize realtime session',
      httpStatus: openAiStatus,
    });
    const geoBlocked =
      /country|region|territory|unsupported_country_region_territory/i.test(
        (apiMessage || '') + (callsAnswer || '')
      );
    // #region agent log
    debugLog({
      location: 'api/realtime-session/sdp.js:openai-error',
      message: 'realtime sdp failed',
      data: {
        openAiStatus,
        geoBlocked,
        apiMessageSnippet: String(apiMessage || '').slice(0, 160),
        userMessageSnippet: String(userMessage || '').slice(0, 160),
        fetchMode: proxyConfig.candidateCount > 0 ? 'proxy-fallback' : 'direct',
        proxySource: proxyConfig.source,
      },
      hypothesisId: 'H1-H3-H5',
      runId: 'post-fix',
    });
    // #endregion
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
