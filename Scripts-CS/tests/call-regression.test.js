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
  buildCallCompletionBlock,
  buildClosingReminder,
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

test('resolveCallRealtimeModel accepts mini, 1.5 and 2 from picker', () => {
  const {
    resolveCallRealtimeModel,
    CALL_DEFAULT_REALTIME_MODEL,
    isCallRealtimeModel,
  } = require('../lib/call/constants');
  assert.equal(resolveCallRealtimeModel('gpt-realtime-mini'), 'gpt-realtime-mini');
  assert.equal(resolveCallRealtimeModel('gpt-realtime-1.5'), 'gpt-realtime-1.5');
  assert.equal(resolveCallRealtimeModel('gpt-realtime-2'), 'gpt-realtime-2');
  assert.equal(resolveCallRealtimeModel(''), 'gpt-realtime-1.5');
  assert.equal(CALL_DEFAULT_REALTIME_MODEL, 'gpt-realtime-1.5');
  assert.ok(isCallRealtimeModel('gpt-realtime-mini'));
  assert.ok(isCallRealtimeModel('gpt-realtime-2'));
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

test('applyBrandPlaceholders replaces company and operator script placeholders', () => {
  const text = applyBrandPlaceholders('Компания Наша Компания, оператор [Имя].');
  assert.match(text, /E-liss/);
  assert.match(text, /голосовой помощник/i);
  assert.doesNotMatch(text, /Ольга|Александр/i);
});

test('buildBaseInstructions uses voice assistant role and voice layer', () => {
  clearCallDataCache();
  const { communicationTools } = loadCallData();
  const instructions = buildBaseInstructions(communicationTools, {
    callRole: DEFAULT_CALL_ROLE,
    voice: 'marin',
  });
  assert.match(instructions, /голосовой помощник/i);
  assert.match(instructions, /E-liss/);
  assert.match(instructions, /ЗАЩИТА ЛИЧНОСТИ/);
  assert.match(instructions, /ANTI-LOOP/);
  assert.doesNotMatch(instructions, /Твоё имя:/i);
  assert.doesNotMatch(instructions, /Каталог тем/);
  assert.doesNotMatch(instructions, /Базовый процесс «Ответ оператора»/);
});

test('buildBaseInstructions prioritizes voice layer before role', () => {
  clearCallDataCache();
  const { communicationTools } = loadCallData();
  const instructions = buildBaseInstructions(communicationTools, { voice: 'echo' });
  assert.match(instructions, /ГЛАВНЫЙ ИСТОЧНИК/i);
  const voicePos = instructions.indexOf('ЗАЩИТА ЛИЧНОСТИ');
  const toolsPos = instructions.indexOf('ОБЯЗАТЕЛЬНЫЕ инструменты');
  const rolePos = instructions.indexOf('Пользователь — клиент');
  assert.ok(voicePos >= 0 && toolsPos > voicePos && rolePos > toolsPos);
});

test('buildBaseInstructions session size under 12250 chars', () => {
  clearCallDataCache();
  const { communicationTools } = loadCallData();
  const instructions = buildBaseInstructions(communicationTools, { voice: 'marin' });
  assert.ok(instructions.length <= 12250, `base instructions too large: ${instructions.length}`);
});

test('resolveOperatorName maps marin voice to female name', () => {
  assert.equal(resolveOperatorName('marin'), 'Ольга');
});

test('buildIdentityGuardBlock contains canary list and forbids personal names', () => {
  const block = buildIdentityGuardBlock();
  assert.match(block, /никогда/i);
  assert.match(block, /голосовой помощник/i);
  assert.match(block, /имя по просьбе клиента не принимай/i);
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
  const layer = buildVoiceLayerBlock();
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
  const block = buildVoiceLayerBlock();
  assert.match(block, /tri-filter/i);
  assert.match(block, /партнёр/i);
});

test('call prompts require listening after questions', () => {
  const completion = buildCallCompletionBlock();
  const reminder = buildClosingReminder();
  const layer = buildVoiceLayerBlock();
  assert.match(completion, /дождись ответа/i);
  assert.match(completion, /Не совмещай/i);
  assert.match(reminder, /После вопроса клиенту/i);
  assert.match(layer, /Один вопрос — одна реплика/i);
  assert.match(layer, /сначала ответ клиента/i);
  assert.doesNotMatch(layer, /решение в той же реплике/i);
});

test('buildCallFirstTurnInstructions uses voice assistant greeting', () => {
  const text = buildCallFirstTurnInstructions();
  assert.match(text, /голосовой помощник/i);
  assert.match(text, /E-liss/);
  assert.match(text, /без личного имени/i);
  assert.doesNotMatch(text, /меня зовут/i);
});

test('buildSessionInstructions adds clarify block', () => {
  const base = 'BASE';
  const session = buildSessionInstructions(base, 'PROCESS', {
    clarifyPrompt: 'Уточните тему',
    clarifyCount: 0,
  });
  assert.match(session, /Уточните тему/);
});

test('buildSessionInstructions puts termination block before process', () => {
  const session = buildSessionInstructions('BASE', 'PROCESS_BLOCK', {
    terminationScenarioBlock: 'TERMINATION_BLOCK',
    clarifyPrompt: 'CLARIFY_PROMPT',
    clarifyCount: 0,
  });
  const terminationPos = session.indexOf('TERMINATION_BLOCK');
  const processPos = session.indexOf('PROCESS_BLOCK');
  assert.ok(terminationPos >= 0 && processPos > terminationPos);
});

test('hasEmailRedirect detects mail phrases', () => {
  assert.ok(hasEmailRedirect('отправьте на почту'));
  assert.ok(!hasEmailRedirect('зафиксировал заявку'));
});

test('call.js parses without syntax errors', () => {
  const { execSync } = require('node:child_process');
  execSync('node --check frontend/call.js', { cwd: process.cwd(), stdio: 'pipe' });
});

test('call.js guards stale WebRTC session on hangUp and redial', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /callGeneration/);
  assert.match(js, /isCallSessionStale/);
  assert.match(js, /isPeerConnectionUsable/);
  assert.match(js, /sessionAbortController/);
  assert.match(js, /signal: abortController\.signal/);
});

test('call.js waits for termination resolve before assistant reply', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /TERMINATION_HINT_RE/);
  assert.match(js, /resolveProcessForTranscript/);
  assert.match(js, /refreshSessionAfterTerminationResolve/);
  assert.match(js, /awaitTermination/);
  assert.match(js, /response\.cancel/);
});

test('parseCallAccessCode maps day and suffix codes to models', () => {
  const {
    parseCallAccessCode,
    getCallAccessDayCode,
    CALL_ACCESS_DEFAULT_MODEL,
  } = require('../lib/call/accessCode');
  const day25 = new Date(2026, 4, 25);
  const day05 = new Date(2026, 4, 5);

  assert.equal(getCallAccessDayCode(day25), '25');
  assert.equal(getCallAccessDayCode(day05), '05');

  assert.deepEqual(parseCallAccessCode('25', day25), {
    ok: true,
    model: CALL_ACCESS_DEFAULT_MODEL,
    voice: 'marin',
  });
  assert.deepEqual(parseCallAccessCode('251', day25), {
    ok: true,
    model: 'gpt-realtime-mini',
    voice: 'marin',
  });
  assert.deepEqual(parseCallAccessCode('252', day25), {
    ok: true,
    model: 'gpt-realtime-1.5',
    voice: 'marin',
  });
  assert.deepEqual(parseCallAccessCode('253', day25), {
    ok: true,
    model: 'gpt-realtime-2',
    voice: 'marin',
  });

  assert.deepEqual(parseCallAccessCode('05', day05), {
    ok: true,
    model: CALL_ACCESS_DEFAULT_MODEL,
    voice: 'marin',
  });
  assert.deepEqual(parseCallAccessCode('051', day05), {
    ok: true,
    model: 'gpt-realtime-mini',
    voice: 'marin',
  });
  assert.deepEqual(parseCallAccessCode('052', day05), {
    ok: true,
    model: 'gpt-realtime-1.5',
    voice: 'marin',
  });
  assert.deepEqual(parseCallAccessCode('053', day05), {
    ok: true,
    model: 'gpt-realtime-2',
    voice: 'marin',
  });

  assert.equal(parseCallAccessCode('24', day25).ok, false);
  assert.equal(parseCallAccessCode('254', day25).ok, false);
  assert.equal(parseCallAccessCode('259', day25).ok, false);
  assert.equal(parseCallAccessCode('5', day05).ok, false);
  assert.equal(parseCallAccessCode('51', day05).ok, false);

  const { normalizeCallAccessCodeInput } = require('../lib/call/accessCode');
  assert.equal(normalizeCallAccessCodeInput('2511'), '251');
  assert.deepEqual(parseCallAccessCode('2511', day25), {
    ok: true,
    model: 'gpt-realtime-mini',
    voice: 'marin',
  });
});

test('call access code input accepts up to 3 digits in UI', () => {
  const callJs = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  const html = fs.readFileSync(path.join(process.cwd(), 'frontend/index.html'), 'utf8');
  assert.match(callJs, /slice\(0, 3\)/);
  assert.match(callJs, /parseCallAccessCode/);
  assert.match(html, /maxlength="3"/);
});

test('call defaults to marin voice only', () => {
  const {
    CALL_DEFAULT_VOICE,
    CALL_REALTIME_VOICES,
    isCallRealtimeVoice,
  } = require('../lib/call/constants');
  assert.equal(CALL_DEFAULT_VOICE, 'marin');
  assert.deepEqual(CALL_REALTIME_VOICES, ['marin']);
  assert.ok(isCallRealtimeVoice('marin'));
  assert.ok(!isCallRealtimeVoice('coral'));
});

test('voice layer includes female voice persona for call dialog', () => {
  const { buildProfessionalToneBlock, buildVoiceLayerBlock } = require('../lib/call/voiceBehaviorPrompt');
  const block = buildProfessionalToneBlock();
  assert.match(block, /женск/i);
  assert.match(block, /поняла/i);
  assert.match(buildVoiceLayerBlock(), /женский род/i);
});

test('call start screen hides voice and realtime model pickers', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'frontend/index.html'), 'utf8');
  assert.match(html, /id="callVoicePicker"/);
  assert.match(html, /id="callModelPicker"/);
  assert.match(html, /call-start__block[\s\S]*hidden[\s\S]*callVoicePicker/);
  assert.match(html, /call-start__block[\s\S]*hidden[\s\S]*callModelPicker/);
});

test('frontend index includes call view and voice assistant copy', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'frontend/index.html'), 'utf8');
  assert.match(html, /data-view="call"/);
  assert.match(html, /голосовой помощник/i);
  assert.match(html, /call\.js/);
  assert.match(html, /id="callStartBtn"/);
  assert.match(html, /id="callHangupBtn"/);
});

test('call.js manages start/hangup button enablement', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /updateCallControls/);
  assert.match(js, /state\.screen === 'start'/);
  assert.match(js, /setCallButtonEnabled\(refs\.startBtn, !inCall\)/);
  assert.match(js, /setCallButtonEnabled\(refs\.hangupBtn, inCall\)/);
});

test('call view shows combined start and frozen call preview on one page', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'frontend/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');

  assert.match(html, /id="callActiveScreen" class="call-active call-active--frozen"/);
  assert.match(html, /id="callBackBtn" class="call-back-btn hidden"/);
  assert.doesNotMatch(html, /id="callActiveScreen" class="call-active hidden"/);
  assert.match(js, /call-active--frozen/);
  assert.match(js, /call-content--combined/);
  assert.match(js, /callPage\.classList\.toggle\('call-page--combined'/);
  assert.match(js, /resetCombinedCallPreview/);
  assert.doesNotMatch(js, /callScreen\.classList\.toggle\('hidden', screen !== 'call'\)/);
});

test('call.js keeps call status text stable during active conversation', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(js, /function renderStatus\(\)/);
  assert.match(js, /isCallInProgress\(state\.phase\)/);
  assert.match(js, /Разговор/);
  assert.doesNotMatch(js, /Слушаю/);
  assert.doesNotMatch(js, /Менеджер говорит/);
  assert.doesNotMatch(js, /Менеджер отвечает/);
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
  assert.match(appJs, /\/api\/assistant-coach/);
});

test('call-resolve-process uses shared resolveProcessForQuery', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'api/call-resolve-process.js'), 'utf8');
  assert.match(src, /resolveProcessForQuery/);
  assert.doesNotMatch(src, /resolveProcessByScoring/);
});

test('call voice meters use shared tuning and live streams during call', () => {
  const meterJs = fs.readFileSync(path.join(process.cwd(), 'frontend/call-voice-meter.js'), 'utf8');
  const callJs = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.doesNotMatch(meterJs, /METER_TUNING\s*=\s*\{[\s\S]*user:/);
  assert.match(meterJs, /_measureBarTargets/);
  assert.doesNotMatch(meterJs, /Math\.sin/);
  assert.match(meterJs, /CallVoiceMeter\.prototype\.reset/);
  assert.match(callJs, /rtc\.aiMeter\.setActive\(inCall\)/);
  assert.match(callJs, /rtc\.userMeter\.setActive\(inCall\)/);
  assert.doesNotMatch(callJs, /assistantPending.*assistantSpeaking.*setActive/);
});

test('call.js speeds up mobile first response (no blocking prefetch, shorter ICE wait)', () => {
  const callJs = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  const { buildCallFirstTurnInstructions } = require('../lib/call/instructions');

  assert.match(callJs, /CALL_FIRST_TURN_INSTRUCTIONS/);
  assert.match(callJs, /getFirstTurnInstructions/);
  assert.match(callJs, /prefetchBaseInstructions/);
  assert.match(callJs, /getIceGatheringTimeoutMs/);
  assert.match(callJs, /CALL_ICE_GATHERING_TIMEOUT_MS\.mobile/);
  assert.doesNotMatch(callJs, /await prefetchPromise/);
  assert.doesNotMatch(callJs, /waitForIceGathering\(pc, 12000\)/);
  assert.ok(callJs.includes(buildCallFirstTurnInstructions().slice(0, 40)));
});

test('call.js suppresses benign Realtime active-response race', () => {
  const callJs = fs.readFileSync(path.join(process.cwd(), 'frontend/call.js'), 'utf8');
  assert.match(callJs, /isBenignRealtimeError/);
  assert.match(callJs, /handleRealtimeError/);
  assert.match(callJs, /pendingSessionInstructions/);
  assert.match(callJs, /flushPendingSessionUpdate/);
  assert.match(callJs, /input_audio_buffer\.clear/);
});
