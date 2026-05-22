const { findKnowledgeEntry, resolveProcessKey } = require('./processCatalog');
const { serializeCommunicationToolsForCall } = require('./communicationToolsPrompt');
const { applyBrandPlaceholders } = require('./brandText');
const { shouldInjectBaseOperatorRecs, DEFAULT_CALL_ROLE } = require('./processRole');

const EMAIL_REFRAME_NOTE =
  '[В звонке: не проси написать на почту — фиксируй в звонке или исходящий канал компании]';

function hasEmailRedirect(text) {
  return /почт|e-mail|email|sms|смс|напишите|направьте.*пис/i.test(String(text || ''));
}

function serializeStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) return '';
  return stages
    .map((stage) => {
      const parts = [`${stage.stage || ''}: ${stage.description || ''}`.trim()];
      if (stage.operator_actions) parts.push(`Действия: ${stage.operator_actions}`);
      if (stage.recommendations) parts.push(`Рекомендации: ${stage.recommendations}`);
      return parts.join('\n');
    })
    .join('\n\n');
}

function serializeScriptSteps(scriptSteps) {
  if (!Array.isArray(scriptSteps) || scriptSteps.length === 0) return '';
  return scriptSteps
    .filter((step) => step && (step.phrase || step.reply))
    .map((step) => {
      const label = step.step_name || step.complaint || step.type || 'Шаг';
      const rawPhrase = applyBrandPlaceholders(step.phrase || step.reply || '');
      const phrase = hasEmailRedirect(rawPhrase)
        ? `${EMAIL_REFRAME_NOTE} Смысл шага: ${rawPhrase}`
        : rawPhrase;
      const goal = step.goal ? ` Цель: ${step.goal}` : '';
      return `${label} (перефразируй, не зачитывай): ${phrase}${goal}`;
    })
    .join('\n');
}

function serializeDifficultPhrases(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .map((item) => {
      if (typeof item === 'string') return applyBrandPlaceholders(item);
      const header = item.situation_type || 'Ситуация';
      const phrases = Array.isArray(item.phrases) ? item.phrases.join('\n') : '';
      const body = applyBrandPlaceholders(phrases);
      return hasEmailRedirect(body)
        ? `${header}:\n${EMAIL_REFRAME_NOTE}\n${body}`
        : `${header}:\n${body}`;
    })
    .join('\n\n');
}

function serializeOperatorRecommendations(block) {
  if (!block || !Array.isArray(block.steps) || block.steps.length === 0) return '';
  const title = block.title || 'Общие рекомендации';
  const lines = block.steps.map((step) => {
    const parts = [step.step, step.action, step.phrases].filter(Boolean);
    return parts.join(' — ');
  });
  return `${title}:\n${lines.join('\n')}`;
}

function serializeGeneralRules(communicationTools, baseProcess) {
  const chunks = [];
  const toolsBlock = serializeCommunicationToolsForCall(communicationTools);
  if (toolsBlock) chunks.push(toolsBlock);
  const baseRec = baseProcess && baseProcess.operator_recommendations;
  const recText = serializeOperatorRecommendations(baseRec);
  if (recText) chunks.push(recText);
  return chunks.join('\n\n');
}

function serializeMetaScriptHints(meta) {
  if (!meta) return '';
  const text = String(meta.searchable_text || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length < 80) return '';
  return applyBrandPlaceholders(`Доп. материал по теме (перефразируй):\n${text.slice(0, 600)}`);
}

function serializeFullProcess(process) {
  if (!process) return '';
  const chunks = [];
  if (process.goal) chunks.push(`Цель: ${process.goal}`);
  if (process.description) chunks.push(`Описание: ${process.description}`);
  const stages = serializeStages(process.stages);
  if (stages) chunks.push(`Этапы:\n${stages}`);
  const scripts = serializeScriptSteps(process.script_steps);
  if (scripts) chunks.push(`Скрипт (смысл, не дословно):\n${scripts}`);
  const difficult = serializeDifficultPhrases(process.difficult_phrases);
  if (difficult) chunks.push(`Сложные ситуации:\n${difficult}`);
  const cheatsheet = (process.cheatsheet || [])
    .filter(Boolean)
    .map((line) => applyBrandPlaceholders(line))
    .join('\n');
  if (cheatsheet) chunks.push(`Шпаргалка:\n${cheatsheet}`);
  const rec = serializeOperatorRecommendations(process.operator_recommendations);
  if (rec) chunks.push(rec);
  return chunks.join('\n\n');
}

function serializePartialKnowledge(entry) {
  if (!entry) return '';
  const chunks = [];
  if (entry.goal) chunks.push(`Цель: ${entry.goal}`);
  if (entry.description) chunks.push(`Описание: ${entry.description}`);
  const stages = serializeStages(entry.stages);
  if (stages) chunks.push(`Этапы:\n${stages}`);
  const phrases = (entry.script_phrases || [])
    .filter((p) => p && !/^(Вопрос|Уточн|Изменение)/.test(p))
    .map((p) => applyBrandPlaceholders(p))
    .join('\n');
  if (phrases) chunks.push(`Фразы:\n${phrases}`);
  return chunks.join('\n\n');
}

function mergePartialFromProcess(process) {
  if (!process) return '';
  const chunks = [];
  const scripts = serializeScriptSteps(process.script_steps);
  if (scripts) chunks.push(`Доп. скрипт:\n${scripts}`);
  const rec = serializeOperatorRecommendations(process.operator_recommendations);
  if (rec) chunks.push(rec);
  return chunks.join('\n\n');
}

function buildProcessPrompt(meta, processesData, knowledgeList, communicationTools, baseProcessKey, options = {}) {
  const callRole = options.callRole || DEFAULT_CALL_ROLE;
  const processKey = resolveProcessKey(meta, processesData);
  const fullProcess = processKey ? processesData[processKey] : null;
  const knowledgeEntry = findKnowledgeEntry(knowledgeList, meta);
  const baseProcess = baseProcessKey ? processesData[baseProcessKey] : null;
  const toolsBlock = serializeCommunicationToolsForCall(communicationTools, options);
  const injectBaseRec = shouldInjectBaseOperatorRecs(callRole, meta && meta.code);
  const baseRec = injectBaseRec
    ? serializeOperatorRecommendations(baseProcess && baseProcess.operator_recommendations)
    : '';

  let processBlock = '';
  if (meta.menu_done) {
    processBlock = serializeFullProcess(fullProcess);
  } else {
    const partial = serializePartialKnowledge(knowledgeEntry);
    const extra = mergePartialFromProcess(fullProcess);
    const hints = serializeMetaScriptHints(meta);
    processBlock = [partial, extra, hints].filter(Boolean).join('\n\n');
  }

  const transferNote =
    meta && meta.code === 'Вопрос по сотрудничеству'
      ? 'Partner inbox — только для подтверждённого партнёра/продавца после tri-filter.'
      : '';

  return applyBrandPlaceholders(
    [
      processBlock,
      transferNote,
      toolsBlock,
      baseRec ? `Рекомендации базового процесса «Ответ оператора»:\n${baseRec}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
  );
}

module.exports = {
  applyBrandPlaceholders,
  buildProcessPrompt,
  serializeFullProcess,
  serializeGeneralRules,
  serializePartialKnowledge,
  EMAIL_REFRAME_NOTE,
  hasEmailRedirect,
};
