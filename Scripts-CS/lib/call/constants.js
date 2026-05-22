const CALL_REALTIME_MODEL = 'gpt-realtime-2';
const CALL_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
const CALL_DEFAULT_VOICE = 'coral';
const CALL_VOICE_STORAGE_KEY = 'cs-call-realtime-voice';
const CALL_COMPANY_NAME = 'E-liss';
const CALL_OPERATOR_NAME = 'Ольга';
const CALL_FINISHED_TEXT = 'Звонок завершён';
const CALL_CONNECTING_TEXT = 'Соединение…';
const PARTNERSHIP_INBOX_EMAIL = 'partners@e-liss.ru';

const CALL_OPERATOR_NAMES = {
  male: 'Александр',
  female: 'Ольга',
};

const CALL_VOICE_GENDER = {
  alloy: 'female',
  ash: 'male',
  ballad: 'male',
  coral: 'female',
  echo: 'male',
  sage: 'female',
  shimmer: 'female',
  verse: 'male',
  marin: 'female',
  cedar: 'male',
};

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

/** Тишина на линии (мс) без осмысленной речи → авто-завершение (клиентский таймер). */
const CALL_SILENCE_HANGUP_MS = 30000;

/**
 * server_vad: выше threshold — меньше ложных срабатываний на кхе-кхе и фон.
 * silence_duration_ms — пауза перед концом реплики (не путать с CALL_SILENCE_HANGUP_MS).
 */
const CALL_REALTIME_SERVER_VAD = {
  type: 'server_vad',
  threshold: 0.84,
  prefix_padding_ms: 300,
  silence_duration_ms: 1200,
  create_response: true,
  interrupt_response: false,
};

function isCallRealtimeVoice(value) {
  return CALL_REALTIME_VOICES.includes(value);
}

function resolveOperatorName(voice) {
  const gender = CALL_VOICE_GENDER[voice] || 'female';
  return CALL_OPERATOR_NAMES[gender] || CALL_OPERATOR_NAME;
}

function buildInputAudioTranscriptionConfig() {
  return {
    model: CALL_TRANSCRIPTION_MODEL,
    language: 'ru',
    prompt:
      'Транскрибируй только русскую речь. Если слышишь не русский язык — не выводи латиницу, верни пустую строку.',
  };
}

function buildCallGreetingPhrase() {
  return `Добрый день. Вас приветствует голосовой помощник компании ${CALL_COMPANY_NAME}. Чем могу помочь?`;
}

module.exports = {
  CALL_REALTIME_MODEL,
  CALL_TRANSCRIPTION_MODEL,
  CALL_DEFAULT_VOICE,
  CALL_VOICE_STORAGE_KEY,
  CALL_COMPANY_NAME,
  CALL_OPERATOR_NAME,
  CALL_OPERATOR_NAMES,
  CALL_VOICE_GENDER,
  PARTNERSHIP_INBOX_EMAIL,
  CALL_FINISHED_TEXT,
  CALL_CONNECTING_TEXT,
  CALL_REALTIME_VOICES,
  CALL_SILENCE_HANGUP_MS,
  CALL_REALTIME_SERVER_VAD,
  isCallRealtimeVoice,
  resolveOperatorName,
  buildInputAudioTranscriptionConfig,
  buildCallGreetingPhrase,
};
