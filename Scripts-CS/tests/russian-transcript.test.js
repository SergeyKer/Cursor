const test = require('node:test');
const assert = require('node:assert/strict');
const { isLikelyRussianTranscript } = require('../lib/call/russianTranscript');
const { buildInputAudioTranscriptionConfig } = require('../lib/call/constants');

test('accepts Russian transcript', () => {
  assert.ok(isLikelyRussianTranscript('Здрасте, когда будет замена?'));
  assert.ok(isLikelyRussianTranscript('хотим договор на ковры'));
});

test('rejects Latin-only transcript', () => {
  assert.ok(!isLikelyRussianTranscript('Resti märgist.'));
  assert.ok(!isLikelyRussianTranscript('Hello world'));
});

test('accepts digits-only short replies', () => {
  assert.ok(isLikelyRussianTranscript('12345'));
});

test('transcription config forces Russian language', () => {
  const cfg = buildInputAudioTranscriptionConfig();
  assert.equal(cfg.language, 'ru');
  assert.match(cfg.prompt || '', /русск/i);
});
