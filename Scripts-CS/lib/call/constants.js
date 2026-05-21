const CALL_REALTIME_MODEL = 'gpt-realtime-2';
const CALL_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
const CALL_DEFAULT_VOICE = 'coral';
const CALL_VOICE_STORAGE_KEY = 'cs-call-realtime-voice';
const CALL_COMPANY_NAME = 'E-liss';
const CALL_OPERATOR_NAME = 'Наталия';
const CALL_FINISHED_TEXT = 'Звонок завершён';
const CALL_CONNECTING_TEXT = 'Соединение…';

const CALL_REALTIME_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
];

const CALL_REALTIME_SERVER_VAD = {
  type: 'server_vad',
  threshold: 0.72,
  prefix_padding_ms: 300,
  silence_duration_ms: 900,
  create_response: true,
  interrupt_response: false,
};

function isCallRealtimeVoice(value) {
  return CALL_REALTIME_VOICES.includes(value);
}

function buildInputAudioTranscriptionConfig() {
  return {
    model: CALL_TRANSCRIPTION_MODEL,
    language: 'ru',
  };
}

function buildCallGreetingPhrase() {
  return `Добрый день, компания ${CALL_COMPANY_NAME}. Слушаю Вас.`;
}

module.exports = {
  CALL_REALTIME_MODEL,
  CALL_TRANSCRIPTION_MODEL,
  CALL_DEFAULT_VOICE,
  CALL_VOICE_STORAGE_KEY,
  CALL_COMPANY_NAME,
  CALL_OPERATOR_NAME,
  CALL_FINISHED_TEXT,
  CALL_CONNECTING_TEXT,
  CALL_REALTIME_VOICES,
  CALL_REALTIME_SERVER_VAD,
  isCallRealtimeVoice,
  buildInputAudioTranscriptionConfig,
  buildCallGreetingPhrase,
};
