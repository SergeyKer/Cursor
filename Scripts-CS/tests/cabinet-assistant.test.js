const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { detectIntent } = require('../lib/cabinet/intent');
const { buildFacts } = require('../lib/cabinet/buildFacts');
const { parseLlmAnswer } = require('../lib/cabinet/parseLlmAnswer');
const { clearCabinetDataCache } = require('../lib/cabinet/loadCabinetData');

test.before(() => {
  clearCabinetDataCache();
});

test('detectIntent classifies sample questions', () => {
  assert.equal(detectIntent('Когда следующая замена?'), 'next_visit');
  assert.equal(detectIntent('Какие неоплаченные счета?'), 'unpaid_invoices');
  assert.equal(detectIntent('Какие ковры и где?'), 'carpets');
  assert.equal(detectIntent('Привет'), 'general');
});

test('buildFacts next_visit includes site-1 scheduled date', () => {
  const { intent, citations, draftAnswer } = buildFacts('следующая замена');
  assert.equal(intent, 'next_visit');
  const cite = citations.find((c) => c.siteId === 'site-1');
  assert.ok(cite);
  assert.equal(cite.tab, 'visits');
  assert.match(cite.evidence, /26/);
  assert.match(draftAnswer, /Тверская|ТЦ/i);
});

test('buildFacts unpaid_invoices finds inv-2', () => {
  const { intent, citations, facts } = buildFacts('неоплаченные счета');
  assert.equal(intent, 'unpaid_invoices');
  assert.equal(facts.invoices.length, 1);
  assert.equal(facts.invoices[0].id, 'inv-2');
  assert.equal(citations[0].tab, 'invoices');
  assert.match(citations[0].evidence, /184/);
});

test('buildFacts carpets returns citations per site', () => {
  const { intent, citations } = buildFacts('какие ковры');
  assert.equal(intent, 'carpets');
  assert.ok(citations.length >= 5);
  assert.ok(citations.every((c) => c.tab === 'sites'));
});

test('buildFacts respects siteId filter', () => {
  const { citations } = buildFacts('ковры', 'site-1');
  assert.ok(citations.length >= 1);
  assert.ok(citations.every((c) => c.siteId === 'site-1'));
});

test('parseLlmAnswer parses JSON answer', () => {
  const { answer } = parseLlmAnswer('{"answer":"Тест ответа"}');
  assert.equal(answer, 'Тест ответа');
});

test('cabinet-assistant API module exports handler', () => {
  const handler = require('../api/cabinet-assistant');
  assert.equal(typeof handler, 'function');
});

test('local-dev registers cabinet-assistant route', () => {
  const devJs = fs.readFileSync(path.join(process.cwd(), 'scripts/local-dev.js'), 'utf8');
  assert.match(devJs, /\/api\/cabinet-assistant/);
});

test('cabinet.js wires ask_ai section and API', () => {
  const cabinetJs = fs.readFileSync(path.join(process.cwd(), 'frontend/cabinet.js'), 'utf8');
  assert.match(cabinetJs, /ask_ai/);
  assert.match(cabinetJs, /\/api\/cabinet-assistant/);
  assert.match(cabinetJs, /Спросить у ИИ/);
  assert.match(cabinetJs, /coach-results cabinet-ai-results/);
  assert.match(cabinetJs, /coach-section-card/);
  assert.match(cabinetJs, /data-cabinet-back/);
  assert.match(cabinetJs, /cabinet-crumb/);
});
