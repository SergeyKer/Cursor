/** Коды-заглушки в meta → полноценный процесс со скриптом. */
const PROCESS_CODE_ALIASES = {
  'Когда будет/была замена?': 'Когда будет была замена',
};

function canonicalProcessCode(code) {
  const trimmed = String(code || '').trim();
  return PROCESS_CODE_ALIASES[trimmed] || trimmed;
}

function isSparseProcessMeta(meta) {
  if (!meta) return true;
  const text = String(meta.searchable_text || '').replace(/\s+/g, ' ').trim();
  return text.length < 80;
}

module.exports = {
  PROCESS_CODE_ALIASES,
  canonicalProcessCode,
  isSparseProcessMeta,
};
