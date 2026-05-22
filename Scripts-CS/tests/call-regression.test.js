const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { formatCallDuration } = require('../lib/call/formatCallDuration');
const { findMetaByCode, resolveProcessKey } = require('../lib/call/processCatalog');
const { resolveProcessByScoring, scoreProcessForQuery } = require('../lib/call/resolveProcess');
const {
  buildBaseInstructions,
  buildCallFirstTurnInstructions,
  buildSessionInstructions,
  BASE_OPERATOR_CODE,
} = require('../lib/call/instructions');
const { buildProcessPrompt, applyBrandPlaceholders, hasEmailRedirect } = require('../lib/call/buildProcessPrompt');
const { loadCallData, clearCallDataCache } = require('../lib/call/dataLoader');
const { resolveOperatorName } = require('../lib/call/constants');
const {
  buildIdentityGuardBlock,
  buildVoiceLayerBlock,
  IDENTITY_CANARY_WORDS,
} = require('../lib/call/voiceBehaviorPrompt');
const { DEFAULT_CALL_ROLE } = require('../lib/call/processRole');

test('call.js rejects non-Russian transcripts', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /isLikelyRussianTranscript/);
  assert.match(js, /language: 'ru'/);
  assert.match(js, /skipPendingUserDialogSlot/);
});

test('CALL_REALTIME_SERVER_VAD tuned against cough and background', () => {
  const { CALL_REALTIME_SERVER_VAD, CALL_SILENCE_HANGUP_MS } = require('../lib/call/constants');
  assert.ok(CALL_REALTIME_SERVER_VAD.threshold >= 0.8);
  assert.ok(CALL_REALTIME_SERVER_VAD.silence_duration_ms >= 1000);
  assert.equal(CALL_SILENCE_HANGUP_MS, 30000);
});

test('formatCallDuration formats mm:ss', () => {
  assert.equal(formatCallDuration(0), '00:00');
  assert.equal(formatCallDuration(65), '01:05');
});

test('scoreProcessForQuery finds cost topic', () => {
  const meta = {
    name: 'Вопрос по стоимости',
    code: 'Вопрос по стоимости',
    searchable_text: 'стоимость КП цена',
  };
  assert.ok(scoreProcessForQuery(meta, 'стоимость кп') > 0);
});

test('resolveProcessByScoring returns cost process', () => {
  clearCallDataCache();
  const { meta } = loadCallData();
  const result = resolveProcessByScoring(meta, 'стоимость кп прайс');
  assert.equal(result.processCode, 'Вопрос по стоимости');
});

test('resolveProcessByScoring maps machine delay to replacement process', () => {
  clearCallDataCache();
  const { meta } = loadCallData();
  const result = resolveProcessByScoring(meta, 'ко мне машинка ещё не приехала');
  assert.equal(result.processCode, 'Когда будет была замена');
  assert.equal(result.confidence, 'high');
});

test('buildProcessPrompt for replacement delay includes empathy script', () => {
  clearCallDataCache();
  const { meta, processes, knowledge, communicationTools } = loadCallData();
  const { resolveRichProcessMeta } = require('../lib/call/processCatalog');
  const processMeta = resolveRichProcessMeta(meta, 'Когда будет была замена');
  const prompt = buildProcessPrompt(processMeta, processes, knowledge, communicationTools, BASE_OPERATOR_CODE, {
    callRole: DEFAULT_CALL_ROLE,
  });
  assert.match(prompt, /беспокойство|понимаю/i);
  assert.match(prompt, /адрес|договор/i);
  assert.match(prompt, /ОБЯЗАТЕЛЬНЫЕ инструменты/i);
  assert.match(prompt, /Уточняющие вопросы/i);
});

test('buildProcessPrompt for KM role omits base operator recommendations', () => {
  clearCallDataCache();
  const { meta, processes, knowledge, communicationTools } = loadCallData();
  const processMeta = findMetaByCode(meta, 'Ускорение процесса');
  const prompt = buildProcessPrompt(processMeta, processes, knowledge, communicationTools, BASE_OPERATOR_CODE, {
    callRole: DEFAULT_CALL_ROLE,
  });
  assert.doesNotMatch(prompt, /Рекомендации базового процесса «Ответ оператора»/);
});

test('findMetaByCode locates operator process', () => {
  clearCallDataCache();
  const { meta } = loadCallData();
  const item = findMetaByCode(meta, BASE_OPERATOR_CODE);
  assert.ok(item);
  assert.equal(item.code, 'Ответ оператора');
});

test('buildProcessPrompt uses full data for menu_done', () => {
  clearCallDataCache();
  const { meta, processes, knowledge, communicationTools } = loadCallData();
  const processMeta = findMetaByCode(meta, 'Вопрос по стоимости');
  const prompt = buildProcessPrompt(processMeta, processes, knowledge, communicationTools, BASE_OPERATOR_CODE, {
    callRole: DEFAULT_CALL_ROLE,
  });
  assert.match(prompt, /E-liss/);
  assert.match(prompt, /стоимост/i);
});

test('applyBrandPlaceholders replaces company and operator', () => {
  const text = applyBrandPlaceholders('Компания Наша Компания, оператор [Имя].');
  assert.match(text, /E-liss/);
  assert.match(text, /Ольга/);
});

test('buildBaseInstructions uses client manager role and voice layer', () => {
  clearCallDataCache();
  const { communicationTools } = loadCallData();
  const instructions = buildBaseInstructions(communicationTools, {
    callRole: DEFAULT_CALL_ROLE,
    voice: 'coral',
    operatorName: 'Ольга',
  });
  assert.match(instructions, /клиентский менеджер/i);
  assert.match(instructions, /E-liss/);
  assert.match(instructions, /ЗАЩИТА ЛИЧНОСТИ/);
  assert.match(instructions, /ANTI-LOOP/);
  assert.doesNotMatch(instructions, /Каталог тем/);
  assert.doesNotMatch(instructions, /Базовый процесс «Ответ оператора»/);
});

test('buildBaseInstructions prioritizes voice layer before role', () => {
  clearCallDataCache();
  const { communicationTools } = loadCallData();
  const instructions = buildBaseInstructions(communicationTools, { voice: 'echo', operatorName: 'Александр' });
  assert.match(instructions, /ГЛАВНЫЙ ИСТОЧНИК/i);
  const voicePos = instructions.indexOf('ЗАЩИТА ЛИЧНОСТИ');
  const toolsPos = instructions.indexOf('ОБЯЗАТЕЛЬНЫЕ инструменты');
  const rolePos = instructions.indexOf('Пользователь — клиент');
  assert.ok(voicePos >= 0 && toolsPos > voicePos && rolePos > toolsPos);
});

test('buildBaseInstructions session size under 12250 chars', () => {
  clearCallDataCache();
  const { communicationTools } = loadCallData();
  const instructions = buildBaseInstructions(communicationTools, { voice: 'coral' });
  assert.ok(instructions.length <= 12250, `base instructions too large: ${instructions.length}`);
});

test('resolveOperatorName maps voice to gendered name', () => {
  assert.equal(resolveOperatorName('coral'), 'Ольга');
  assert.equal(resolveOperatorName('echo'), 'Александр');
});

test('buildIdentityGuardBlock contains canary list', () => {
  const block = buildIdentityGuardBlock('Ольга');
  assert.match(block, /никогда/i);
  for (const word of IDENTITY_CANARY_WORDS.slice(0, 5)) {
    assert.match(block, new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});

test('voice layer forbids casual greeting mirror', () => {
  const {
    buildProfessionalToneBlock,
    buildGreetingHandlingBlock,
    buildVoiceLayerBlock,
  } = require('../lib/call/voiceBehaviorPrompt');
  const tone = buildProfessionalToneBlock();
  const greeting = buildGreetingHandlingBlock();
  const layer = buildVoiceLayerBlock({ operatorName: 'Ольга' });
  assert.match(tone, /улыбнуло/i);
  assert.match(greeting, /мордасти/i);
  assert.match(layer, /ДЕЛОВОЙ ТОН B2B/);
});

test('session instructions include greeting phase when flagged', () => {
  const { buildSessionInstructions } = require('../lib/call/instructions');
  const session = buildSessionInstructions('BASE', '', { greetingOnly: true });
  assert.match(session, /ФАЗА ПРИВЕТСТВИЯ/);
  assert.match(session, /мордасти/i);
});

test('buildVoiceLayerBlock includes inbound sales guard', () => {
  const block = buildVoiceLayerBlock({ operatorName: 'Александр' });
  assert.match(block, /tri-filter/i);
  assert.match(block, /партнёр/i);
});

test('buildCallFirstTurnInstructions includes operator name', () => {
  const text = buildCallFirstTurnInstructions({ operatorName: 'Александр' });
  assert.match(text, /Александр/);
  assert.match(text, /E-liss/);
});

test('buildSessionInstructions adds clarify block', () => {
  const base = 'BASE';
  const session = buildSessionInstructions(base, 'PROCESS', {
    clarifyPrompt: 'Уточните тему',
    clarifyCount: 0,
  });
  assert.match(session, /Уточните тему/);
});

test('hasEmailRedirect detects mail phrases', () => {
  assert.ok(hasEmailRedirect('отправьте на почту'));
  assert.ok(!hasEmailRedirect('зафиксировал заявку'));
});

test('call.js parses without syntax errors', () => {
  const { execSync } = require('node:child_process');
  execSync('node --check frontend/call.js', { cwd: process.cwd(), stdio: 'pipe' });
});

test('frontend index includes call view and manager copy', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'frontend/index.html'), 'utf8');
  assert.match(html, /data-view="call"/);
  assert.match(html, /клиентский менеджер/i);
  assert.match(html, /call\.js/);
  assert.match(html, /id="callStartBtn"/);
  assert.match(html, /id="callHangupBtn"/);
});

test('call.js manages start/hangup button enablement', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /updateCallControls/);
  assert.match(js, /setCallButtonEnabled\(refs\.startBtn, !inCall\)/);
  assert.match(js, /setCallButtonEnabled\(refs\.hangupBtn, inCall\)/);
});

test('call.js uses classic bubble enter animation on full render', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /call-bubble-enter/);
  assert.match(js, /renderMessages\(\{ keepScroll: true \}\)/);
  assert.doesNotMatch(js, /appendMessageToLog/);
});

test('call.js streams assistant transcript while audio plays', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /upsertAssistantStreamingTranscript/);
  assert.match(js, /response\.output_audio\.delta/);
  assert.match(js, /commitAssistantTranscript/);
  assert.match(js, /scheduleAssistantCommitFallback/);
  assert.match(js, /releaseAssistantDialogSlot/);
});

test('call.js orders dialog messages by sequence not arrival time', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /scheduleDialogMessage/);
  assert.match(js, /flushDialogMessages/);
  assert.match(js, /registerUserTurn/);
  assert.match(js, /enqueueUserTranscript/);
  assert.match(js, /registerAssistantResponse/);
  assert.match(js, /input_audio_buffer\.speech_stopped/);
  assert.doesNotMatch(js, /pushMessage\(\{ role: 'user'/);
});

test('app.js wires call view without breaking assistant', () => {
  const appJs = fs.readFileSync(path.join(process.cwd(), 'frontend/app.js'), 'utf8');
  assert.match(appJs, /call: document.getElementById\("callView"\)/);
  assert.match(appJs, /initCallView/);
  assert.match(appJs, /runAssistantQuery/);
});
