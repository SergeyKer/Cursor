const REALTIME_SESSION_TYPE = 'realtime';

const { buildInputAudioTranscriptionConfig, CALL_REALTIME_SERVER_VAD } = require('./constants');

function buildCallsApiSession(params) {
  return {
    type: REALTIME_SESSION_TYPE,
    model: params.model,
    instructions: params.instructions,
    audio: {
      input: {
        transcription: buildInputAudioTranscriptionConfig(),
        turn_detection: { ...CALL_REALTIME_SERVER_VAD },
      },
      output: {
        voice: params.voice,
      },
    },
  };
}

function buildClientSessionUpdate(params) {
  const audio = {
    input: {
      transcription: params.inputAudioTranscription || buildInputAudioTranscriptionConfig(),
      turn_detection: params.turnDetection || { ...CALL_REALTIME_SERVER_VAD },
    },
  };
  if (params.voice) {
    audio.output = { voice: params.voice };
  }
  return {
    type: REALTIME_SESSION_TYPE,
    model: params.model,
    instructions: params.instructions,
    output_modalities: ['audio'],
    audio,
  };
}

function buildRealtimeCallsFormBody(sdp, session) {
  const form = new FormData();
  form.append('sdp', sdp);
  form.append('session', JSON.stringify(session));
  return form;
}

/**
 * Сериализует FormData в Buffer — иначе ProxyAgent иногда обрывает streaming multipart (SDP EOF).
 */
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

function getRealtimeFetchHeaders(extraHeaders, multipartHeaders) {
  return { ...extraHeaders, ...multipartHeaders };
}

module.exports = {
  buildCallsApiSession,
  buildClientSessionUpdate,
  buildRealtimeCallsFormBody,
  prepareRealtimeCallsMultipart,
  getRealtimeFetchHeaders,
};
