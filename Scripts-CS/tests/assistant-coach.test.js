const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildCoachSystemPrompt,
  buildCoachUserMessage,
  BASE_OPERATOR_CODE,
} = require('../lib/call/instructions');
const { parseCoachLlmJson, normalizeReadNext } = require('../lib/call/coachResponse');
const { resolveProcessForQuery } = require('../lib/call/resolveProcessForQuery');
const { loadCallData } = require('../lib/call/dataLoader');

test('buildCoachSystemPrompt targets novice employee and JSON output', () => {
  const prompt = buildCoachSystemPrompt('PROCESS BLOCK', {
    processCode: 'Тест',
    processName: 'Тестовый процесс',
    confidence: 'medium',
    clarifyPrompt: 'Уточните тему',
  });
  assert.match(prompt, /новичок/i);
  assert.match(prompt, /doNow/i);
  assert.match(prompt, /sayNow/i);
  assert.match(prompt, /askClient/i);
  assert.match(prompt, /relatedTopics/i);
  assert.match(prompt, /PROCESS BLOCK/);
  assert.match(prompt, /Тестовый процесс/);
  assert.doesNotMatch(prompt, /пользователь — клиент/i);
});

test('buildCoachUserMessage includes employee situation', () => {
  const msg = buildCoachUserMessage('клиент просит скидку 20%');
  assert.match(msg, /Ситуация от сотрудника/i);
  assert.match(msg, /скидку 20%/);
});

test('parseCoachLlmJson parses valid coach JSON with limits', () => {
  const raw = JSON.stringify({
    summary: 'Кратко.',
    doNow: ['a', 'b', 'c', 'd'],
    sayNow: ['f1', 'f2', 'f3'],
    askClient: ['q1'],
    readNext: [{ view: 'processes', sectionId: 'section-script', label: 'Скрипт' }],
    relatedTopics: ['Оплата', 'Расторжение', 'лишнее'],
    warnings: ['w1'],
    clarifyQuestion: null,
  });
  const { coach, adviceMarkdown } = parseCoachLlmJson(raw);
  assert.equal(adviceMarkdown, null);
  assert.equal(coach.doNow.length, 3);
  assert.equal(coach.sayNow.length, 2);
  assert.equal(coach.relatedTopics.length, 2);
  assert.equal(coach.readNext[0].sectionId, 'section-script');
});

test('parseCoachLlmJson maps legacy steps and samplePhrases', () => {
  const raw = JSON.stringify({
    summary: 'S',
    steps: ['шаг 1', 'шаг 2'],
    samplePhrases: ['фраза'],
  });
  const { coach } = parseCoachLlmJson(raw);
  assert.deepEqual(coach.doNow, ['шаг 1', 'шаг 2']);
  assert.deepEqual(coach.sayNow, ['фраза']);
});

test('parseCoachLlmJson returns adviceMarkdown on invalid JSON', () => {
  const { coach, adviceMarkdown } = parseCoachLlmJson('Не JSON, просто текст.');
  assert.equal(coach, null);
  assert.match(adviceMarkdown, /текст/);
});

test('normalizeReadNext defaults to script section', () => {
  const items = normalizeReadNext([]);
  assert.equal(items.length, 1);
  assert.equal(items[0].sectionId, 'section-script');
});

test('resolveProcessForQuery finds process for quality complaint without OpenAI', async () => {
  const { meta } = loadCallData();
  const resolved = await resolveProcessForQuery(
    'клиент жалуется на качество ковров волны на резине',
    meta,
    { useLlm: false }
  );
  assert.ok(resolved.processCode);
  assert.notEqual(resolved.processCode, BASE_OPERATOR_CODE);
});

test('resolveProcessForQuery handles discount debt churn query without OpenAI', async () => {
  const { meta } = loadCallData();
  const resolved = await resolveProcessForQuery(
    'клиент просит скидку 20% и не платит вовремя 1 маленький ковер грозится уйти',
    meta,
    { useLlm: false }
  );
  assert.ok(resolved.processCode);
  assert.ok(['high', 'medium', 'low'].includes(resolved.confidence));
});

test('assistant-coach API module exports handler', () => {
  const handler = require('../api/assistant-coach');
  assert.equal(typeof handler, 'function');
});

test('app.js wires assistant coach API and renderCoachResponse', () => {
  const appJs = fs.readFileSync(path.join(process.cwd(), 'frontend/app.js'), 'utf8');
  assert.match(appJs, /\/api\/assistant-coach/);
  assert.match(appJs, /renderCoachResponse/);
  assert.match(appJs, /Подбираем/);
  assert.match(appJs, /initialSectionId/);
  assert.match(appJs, /runAssistantQuery/);
});

test('local-dev registers assistant-coach route', () => {
  const devJs = fs.readFileSync(path.join(process.cwd(), 'scripts/local-dev.js'), 'utf8');
  assert.match(devJs, /\/api\/assistant-coach/);
});

test('index.html has assistant status and updated copy', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'frontend/index.html'), 'utf8');
  assert.match(html, /assistantStatus/);
  assert.match(html, /Получить рекомендации/);
  assert.match(html, /что сделать в телефонном разговоре/);
});
