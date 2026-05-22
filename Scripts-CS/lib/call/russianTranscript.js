/** Проверка, что распознанный текст похож на русскую речь (STT language=ru — только подсказка). */

const CYRILLIC_RE = /[\u0401\u0451\u0410-\u044F\u0400-\u04FF]/g;
const LATIN_RE = /[A-Za-z\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]/g;

function isLikelyRussianTranscript(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;

  const cyrillic = (trimmed.match(CYRILLIC_RE) || []).length;
  const latin = (trimmed.match(LATIN_RE) || []).length;
  const letters = cyrillic + latin;

  if (cyrillic > 0) return true;

  if (letters === 0) {
    return /^[\d\s+().,\-–—]+$/.test(trimmed);
  }

  if (latin > 0 && cyrillic === 0) return false;

  return false;
}

module.exports = {
  isLikelyRussianTranscript,
};
