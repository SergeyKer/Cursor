const { CALL_COMPANY_NAME, CALL_OPERATOR_NAME, buildCallGreetingPhrase } = require('./constants');
const { buildCompactCatalog } = require('./processCatalog');
const { applyBrandPlaceholders } = require('./brandText');
const { serializeFullProcess } = require('./buildProcessPrompt');
const { serializeCommunicationToolsForCall } = require('./communicationToolsPrompt');

const BASE_OPERATOR_CODE = 'Ответ оператора';

function buildCallConversationRules() {
  return [
    'ПРАВИЛА КАЖДОЙ РЕПЛИКИ ПОСЛЕ ЖАЛОБЫ, ЗАДЕРЖКИ ИЛИ НЕДОВОЛЬСТВА КЛИЕНТА:',
    '1) Сначала эмпатия — фраза из «Эмпатия» / «Демонстрация эмпатии» или шага «Если клиент в эмоциях» активного процесса (не обходи этот шаг).',
    '2) Затем 1–2 уточняющих вопроса из «Уточняющие вопросы» и скрипта процесса (адрес, номер договора/заявки, дата замены).',
    '3) Запрещено отвечать только «я понимаю» или «давайте уточним детали» без конкретных вопросов из скрипта.',
    '4) Не называй тему «доставка», если клиент говорит о замене/машине — веди по процессу о замене.',
  ].join('\n');
}

function buildSourcePriorityPreamble() {
  return [
    'ГЛАВНЫЙ ИСТОЧНИК ДЛЯ ЗВОНКА (строго в этом порядке):',
    '1) Скрипт и этапы активного процесса из базы процессов.',
    '2) Инструменты коммуникации (техники, когда применять, примеры фраз).',
    '3) Краткая роль оператора ниже — только тон и формат, без выдуманных фактов.',
    'Не импровизируй вне материалов процессов и инструментов.',
  ].join('\n');
}

function buildRoleBlock() {
  return [
    'Ты — оператор клиентского сервиса компании.',
    `Компания: ${CALL_COMPANY_NAME}. Твоё имя: ${CALL_OPERATOR_NAME}.`,
    'Пользователь — клиент, который позвонил.',
    'Говори только по-русски, коротко и по телефону.',
    'Фразы и логику бери из скрипта процесса и таблицы инструментов коммуникации.',
    'Если запрос неясен — уточни категорию и веди по процессу «Ответ оператора».',
  ].join(' ');
}

function buildBaseInstructions(metaList, baseProcess, communicationTools) {
  const catalog = buildCompactCatalog(metaList);
  const baseScript = baseProcess ? serializeFullProcess(baseProcess) : '';
  const toolsBlock = serializeCommunicationToolsForCall(communicationTools);

  return applyBrandPlaceholders(
    [
      buildSourcePriorityPreamble(),
      buildCallConversationRules(),
      toolsBlock,
      'Базовый процесс «Ответ оператора» (до определения темы клиента):',
      baseScript,
      buildRoleBlock(),
      'Каталог тем (определи подходящую по речи клиента):',
      catalog,
    ]
      .filter(Boolean)
      .join('\n\n')
  );
}

function buildCallFirstTurnInstructions() {
  return applyBrandPlaceholders(
    [
      'Начни звонок одной короткой репликой оператора.',
      `Пример: «${buildCallGreetingPhrase()}»`,
      'Не называй своё имя в приветствии.',
      'Не добавляй второй вопрос и не уходи в длинное объяснение.',
    ].join(' ')
  );
}

function buildSessionInstructions(baseInstructions, processBlock) {
  if (!processBlock || !processBlock.trim()) return baseInstructions;
  return applyBrandPlaceholders(
    [
      baseInstructions,
      'Активный процесс для этого звонка (приоритет №1 — веди разговор строго по нему):',
      processBlock,
      buildCallConversationRules(),
      'Повтор: не отходи от скрипта процесса и инструментов коммуникации выше.',
    ].join('\n\n')
  );
}

function buildExplainSystemPrompt(processPrompt) {
  return [
    'Ты — коуч для операторов клиентского сервиса.',
    'Объясни за 1–3 короткие фразы на русском, почему оператор сказал именно так.',
    'Опирайся в первую очередь на script_steps, этапы процесса и инструменты коммуникации.',
    'Не переводи текст. Не пересказывай реплику. Только причина/смысл.',
    processPrompt ? `Контекст процесса и инструментов:\n${processPrompt}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

module.exports = {
  BASE_OPERATOR_CODE,
  buildBaseInstructions,
  buildCallConversationRules,
  buildCallFirstTurnInstructions,
  buildSessionInstructions,
  buildExplainSystemPrompt,
  buildRoleBlock,
};
