const { findKnowledgeEntry, resolveProcessKey } = require('./processCatalog');
const { serializeCommunicationToolsForCall } = require('./communicationToolsPrompt');
const { applyBrandPlaceholders } = require('./brandText');

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
      const phrase = applyBrandPlaceholders(step.phrase || step.reply || '');
      const goal = step.goal ? ` Цель: ${step.goal}` : '';
      return `${label}: ${phrase}${goal}`;
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
      return `${header}:\n${applyBrandPlaceholders(phrases)}`;
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
  return applyBrandPlaceholders(`Доп. материал по теме:\n${text}`);
}

function serializeFullProcess(process) {
  if (!process) return '';
  const chunks = [];
  if (process.goal) chunks.push(`Цель: ${process.goal}`);
  if (process.description) chunks.push(`Описание: ${process.description}`);
  const stages = serializeStages(process.stages);
  if (stages) chunks.push(`Этапы:\n${stages}`);
  const scripts = serializeScriptSteps(process.script_steps);
  if (scripts) chunks.push(`Скрипт разговора:\n${scripts}`);
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

function buildProcessPrompt(meta, processesData, knowledgeList, communicationTools, baseProcessKey) {
  const processKey = resolveProcessKey(meta, processesData);
  const fullProcess = processKey ? processesData[processKey] : null;
  const knowledgeEntry = findKnowledgeEntry(knowledgeList, meta);
  const baseProcess = baseProcessKey ? processesData[baseProcessKey] : null;
  const toolsBlock = serializeCommunicationToolsForCall(communicationTools);
  const baseRec = serializeOperatorRecommendations(
    baseProcess && baseProcess.operator_recommendations
  );

  let processBlock = '';
  if (meta.menu_done) {
    processBlock = serializeFullProcess(fullProcess);
  } else {
    const partial = serializePartialKnowledge(knowledgeEntry);
    const extra = mergePartialFromProcess(fullProcess);
    const hints = serializeMetaScriptHints(meta);
    processBlock = [partial, extra, hints].filter(Boolean).join('\n\n');
  }

  return applyBrandPlaceholders(
    [
      processBlock,
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
};
