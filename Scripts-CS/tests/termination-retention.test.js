const test = require('node:test');
const assert = require('node:assert/strict');
const { clearCallDataCache, loadCallData } = require('../lib/call/dataLoader');
const { resolveProcessByScoring } = require('../lib/call/resolveProcess');
const {
  classifyTerminationReason,
  assessChurnPressure,
  resolveTerminationScenario,
  applyTerminationContext,
} = require('../lib/call/terminationRetention');

test('classifies natural termination reasons', () => {
  const relocation = classifyTerminationReason('мы переезжаем, расторгните договор');
  assert.equal(relocation.reasonCategory, 'natural');
  assert.equal(relocation.primary.id, 'relocation');

  const lease = classifyTerminationReason('закончилась аренда помещения');
  assert.equal(lease.reasonCategory, 'natural');
  assert.equal(lease.primary.id, 'lease_end');
});

test('classifies retention-eligible termination reasons', () => {
  const price = classifyTerminationReason('хотим расторгнуть, у вас слишком дорого');
  assert.equal(price.reasonCategory, 'retention');
  assert.equal(price.primary.id, 'price');

  const quality = classifyTerminationReason('расторгаем из-за плохого качества ковров');
  assert.equal(quality.reasonCategory, 'retention');
  assert.equal(quality.primary.id, 'quality');
});

test('assesses churn pressure from conversation', () => {
  const low = assessChurnPressure('хотим расторгнуть договор');
  assert.equal(low.level, 'low');

  const medium = assessChurnPressure('хотим расторгнуть договор\n уже говорил расторгните');
  assert.ok(['medium', 'high'].includes(medium.level));

  const high = assessChurnPressure(
    'расторгните договор\n просто расторгните\n оформите расторжение\n не буду обсуждать'
  );
  assert.equal(high.level, 'high');
});

test('natural reason leads to termination scenario', () => {
  const scenario = resolveTerminationScenario('переезжаем, нужно расторгнуть договор', 'переезжаем, нужно расторгнуть договор');
  assert.equal(scenario.path, 'terminate');
  assert.match(scenario.scenarioBlock, /естественн/i);
  assert.match(scenario.scenarioBlock, /не удерживать/i);
});

test('retention reason with low pressure leads to retention scenario', () => {
  const scenario = resolveTerminationScenario(
    'расторгните договор, слишком дорого',
    'расторгните договор, слишком дорого'
  );
  assert.equal(scenario.path, 'retain');
  assert.match(scenario.scenarioBlock, /Удержание/i);
  assert.match(scenario.scenarioBlock, /цена/i);
});

test('retention reason with high pressure leads to termination scenario', () => {
  const conversation = [
    'расторгните договор дорого',
    'просто расторгните',
    'оформите расторжение уже',
    'не буду обсуждать',
  ].join('\n');
  const scenario = resolveTerminationScenario('оформите расторжение уже', conversation);
  assert.equal(scenario.path, 'terminate');
  assert.match(scenario.scenarioBlock, /оформление/i);
});

test('resolveProcessByScoring attaches termination scenario block', () => {
  clearCallDataCache();
  const { meta } = loadCallData();
  const bare = resolveProcessByScoring(meta, 'хотим расторгнуть договор');
  assert.equal(bare.processCode, 'Расторжение договора');
  assert.ok(bare.clarifyPrompt);
  assert.match(bare.terminationScenarioBlock, /уточни причину/i);

  const nounPhrase = resolveProcessByScoring(meta, 'расторжение договора', {
    conversationText: 'расторжение договора',
  });
  assert.equal(nounPhrase.processCode, 'Расторжение договора');
  assert.equal(nounPhrase.termination.path, 'clarify');
  assert.ok(nounPhrase.clarifyPrompt);
  assert.match(nounPhrase.terminationScenarioBlock, /Запрещено/i);

  const priced = resolveProcessByScoring(meta, 'хотим расторгнуть договор, слишком дорого');
  assert.equal(priced.termination.path, 'retain');
  assert.match(priced.terminationScenarioBlock, /Удержание/i);
});

test('applyTerminationContext clears clarify when reason is known', () => {
  const resolved = applyTerminationContext(
    {
      processCode: 'Расторжение договора',
      confidence: 'high',
      clarifyPrompt: 'old',
    },
    'переезжаем, расторгните договор',
    'переезжаем, расторгните договор'
  );
  assert.equal(resolved.clarifyPrompt, undefined);
  assert.equal(resolved.termination.path, 'terminate');
});
