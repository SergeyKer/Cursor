const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { formatCallDuration } = require('../lib/call/formatCallDuration');
const { findMetaByCode, resolveProcessKey } = require('../lib/call/processCatalog');
const { resolveProcessByScoring, scoreProcessForQuery } = require('../lib/call/resolveProcess');
const { buildBaseInstructions, buildCallFirstTurnInstructions, BASE_OPERATOR_CODE } = require('../lib/call/instructions');
const { buildProcessPrompt, applyBrandPlaceholders } = require('../lib/call/buildProcessPrompt');
const { loadCallData, clearCallDataCache } = require('../lib/call/dataLoader');

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
  const prompt = buildProcessPrompt(processMeta, processes, knowledge, communicationTools, BASE_OPERATOR_CODE);
  assert.match(prompt, /беспокойство|понимаю/i);
  assert.match(prompt, /адрес|договор/i);
  assert.match(prompt, /ОБЯЗАТЕЛЬНЫЕ инструменты/i);
  assert.match(prompt, /Уточняющие вопросы/i);
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
  const prompt = buildProcessPrompt(processMeta, processes, knowledge, communicationTools, BASE_OPERATOR_CODE);
  assert.match(prompt, /E-liss/);
  assert.match(prompt, /стоимост/i);
});

test('applyBrandPlaceholders replaces company and operator', () => {
  const text = applyBrandPlaceholders('Компания Наша Компания, оператор [Имя].');
  assert.match(text, /E-liss/);
  assert.match(text, /Наталия/);
});

test('buildBaseInstructions includes catalog and operator role', () => {
  clearCallDataCache();
  const { meta, processes, communicationTools } = loadCallData();
  const key = resolveProcessKey({ code: BASE_OPERATOR_CODE }, processes);
  const instructions = buildBaseInstructions(meta, processes[key], communicationTools);
  assert.match(instructions, /оператор/i);
  assert.match(instructions, /E-liss/);
  assert.match(instructions, /Вопрос по стоимости/);
});

test('buildBaseInstructions prioritizes processes and communication tools', () => {
  clearCallDataCache();
  const { meta, processes, communicationTools } = loadCallData();
  const key = resolveProcessKey({ code: BASE_OPERATOR_CODE }, processes);
  const instructions = buildBaseInstructions(meta, processes[key], communicationTools);
  assert.match(instructions, /ГЛАВНЫЙ ИСТОЧНИК/i);
  assert.match(instructions, /Инструменты коммуникации/i);
  assert.match(instructions, /рабочий помощник/i);
  assert.match(instructions, /Установление контакта/i);
  const toolsPos = instructions.indexOf('Инструменты коммуникации');
  const rolePos = instructions.indexOf('Ты — оператор');
  assert.ok(toolsPos >= 0 && rolePos >= 0 && toolsPos < rolePos);
});

test('buildCallFirstTurnInstructions mentions greeting without operator name', () => {
  const text = buildCallFirstTurnInstructions();
  assert.match(text, /Слушаю Вас/i);
  assert.match(text, /E-liss/);
  assert.doesNotMatch(text, /меня зовут/i);
});

test('frontend index includes call view and scripts', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'frontend/index.html'), 'utf8');
  assert.match(html, /data-view="call"/);
  assert.match(html, /id="callView"/);
  assert.match(html, /call\.js/);
  assert.match(html, /callGoToCallBtn/);
  assert.match(html, /call-voice-meter\.js/);
});

test('app.js wires call view without breaking assistant', () => {
  const appJs = fs.readFileSync(path.join(process.cwd(), 'frontend/app.js'), 'utf8');
  assert.match(appJs, /call: document.getElementById\("callView"\)/);
  assert.match(appJs, /initCallView/);
  assert.match(appJs, /runAssistantQuery/);
});
