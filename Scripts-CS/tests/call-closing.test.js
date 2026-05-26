const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CLOSING_PHASE,
  detectClosingQuestionsPrompt,
  detectHasMoreQuestions,
  detectNoQuestionsAnswer,
  detectFarewell,
  createCallClosingTracker,
} = require('../lib/call/callClosing');
const {
  CALL_CLOSING_HANGUP_DELAY_MS,
  CALL_CLOSING_FAREWELL_TIMEOUT_MS,
} = require('../lib/call/constants');
const { buildCallCompletionBlock } = require('../lib/call/voiceBehaviorPrompt');

test('closing constants are defined', () => {
  assert.equal(CALL_CLOSING_HANGUP_DELAY_MS, 1500);
  assert.equal(CALL_CLOSING_FAREWELL_TIMEOUT_MS, 9000);
});

test('detectClosingQuestionsPrompt matches closing question phrases', () => {
  assert.ok(detectClosingQuestionsPrompt('Подведу итог. Остались ли у вас вопросы?'));
  assert.ok(detectClosingQuestionsPrompt('Есть ли ещё вопросы?'));
  assert.ok(!detectClosingQuestionsPrompt('Когда будет замена машины?'));
});

test('detectNoQuestionsAnswer accepts short negative answers', () => {
  assert.ok(detectNoQuestionsAnswer('Нет'));
  assert.ok(detectNoQuestionsAnswer('Всё понятно, спасибо'));
  assert.ok(!detectNoQuestionsAnswer('Нет машины ещё'));
  assert.ok(!detectNoQuestionsAnswer('Нет, но у меня другой вопрос'));
});

test('detectHasMoreQuestions resets closing flow', () => {
  assert.ok(detectHasMoreQuestions('Да, есть вопрос'));
  assert.ok(detectHasMoreQuestions('А ещё один вопрос'));
});

test('detectFarewell matches goodbye phrases', () => {
  assert.ok(detectFarewell('До свидания, хорошего дня'));
  assert.ok(detectFarewell('Спасибо за обращение'));
  assert.ok(!detectFarewell('Машина не приехала'));
});

test('closing tracker follows asked → answered → aiFarewell → user farewell', () => {
  const tracker = createCallClosingTracker();

  let result = tracker.onAssistant('Итак, остались ли вопросы?');
  assert.equal(result.phase, CLOSING_PHASE.ASKED);

  result = tracker.onUser('Нет, всё понятно');
  assert.equal(result.phase, CLOSING_PHASE.ANSWERED);

  result = tracker.onAssistant('Спасибо за обращение. До свидания!');
  assert.equal(result.phase, CLOSING_PHASE.AI_FAREWELL);
  assert.ok(tracker.shouldScheduleFarewellTimeout());

  result = tracker.onUser('До свидания');
  assert.equal(result.event, 'user_farewell');
  assert.ok(tracker.shouldScheduleUserFarewellHangup());
});

test('closing tracker resets when client has more questions', () => {
  const tracker = createCallClosingTracker();
  tracker.onAssistant('Остались ли вопросы?');
  const result = tracker.onUser('Да, есть ещё вопрос');
  assert.equal(result.phase, CLOSING_PHASE.NONE);
  assert.equal(result.event, 'more_questions');
});

test('closing tracker ignores early farewell from client', () => {
  const tracker = createCallClosingTracker();
  const result = tracker.onUser('До свидания');
  assert.equal(result.changed, false);
  assert.equal(result.phase, CLOSING_PHASE.NONE);
});

test('onAssistantResponseDone arms farewell timeout only after ai farewell', () => {
  const tracker = createCallClosingTracker();
  assert.equal(tracker.onAssistantResponseDone().event, null);

  tracker.onAssistant('Остались ли вопросы?');
  tracker.onUser('Нет');
  tracker.onAssistant('Хорошего дня, до свидания');

  const result = tracker.onAssistantResponseDone();
  assert.equal(result.event, 'farewell_timeout_ready');
  assert.ok(tracker.shouldScheduleFarewellTimeout());
});

test('buildCallCompletionBlock mentions automatic hangup after goodbye', () => {
  const block = buildCallCompletionBlock();
  assert.match(block, /закроется сам/i);
});
