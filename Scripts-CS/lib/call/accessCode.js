const { CALL_DEFAULT_VOICE } = require('./constants');

const CALL_ACCESS_DEFAULT_MODEL = 'gpt-realtime-1.5';

const CALL_ACCESS_MODEL_BY_SUFFIX = {
  1: 'gpt-realtime-mini',
  2: 'gpt-realtime-1.5',
  3: 'gpt-realtime-2',
};

function getCallAccessDayCode(date = new Date()) {
  return String(date.getDate()).padStart(2, '0');
}

function normalizeCallAccessCodeInput(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 3);
}

function parseCallAccessCode(raw, date = new Date()) {
  const digits = normalizeCallAccessCodeInput(raw);
  const dayCode = getCallAccessDayCode(date);

  if (digits === dayCode) {
    return { ok: true, model: CALL_ACCESS_DEFAULT_MODEL, voice: CALL_DEFAULT_VOICE };
  }

  if (digits.length === dayCode.length + 1 && digits.startsWith(dayCode)) {
    const suffix = digits.charAt(dayCode.length);
    const model = CALL_ACCESS_MODEL_BY_SUFFIX[suffix];
    if (model) {
      return { ok: true, model, voice: CALL_DEFAULT_VOICE };
    }
  }

  return { ok: false };
}

module.exports = {
  CALL_ACCESS_DEFAULT_MODEL,
  CALL_ACCESS_MODEL_BY_SUFFIX,
  getCallAccessDayCode,
  normalizeCallAccessCodeInput,
  parseCallAccessCode,
};
