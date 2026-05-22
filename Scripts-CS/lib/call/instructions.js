const {
  CALL_COMPANY_NAME,
  buildCallGreetingPhrase,
  resolveOperatorName,
} = require('./constants');
const { serializeCommunicationToolsForCall } = require('./communicationToolsPrompt');
const { applyBrandPlaceholders } = require('./brandText');
const { DEFAULT_CALL_ROLE } = require('./processRole');
const { buildVoiceLayerBlock, buildClosingReminder } = require('./voiceBehaviorPrompt');

const BASE_OPERATOR_CODE = 'Ответ оператора';

function buildCallConversationRules() {
  return [
    'ПРАВИЛА КАЖДОЙ РЕПЛИКИ ПОСЛЕ ЖАЛОБЫ, ЗАДЕРЖКИ ИЛИ НЕДОВОЛЬСТВА КЛИЕНТА:',
    '1) Сначала эмпатия — фраза из «Эмпатия» / «Демонстрация эмпатии» или шага «Если клиент в эмоциях» активного процесса.',
    '2) Затем 1–2 уточняющих вопроса из скрипта процесса (адрес, номер договора/заявки, дата замены).',
    '3) Запрещено отвечать только «я понимаю» без конкретных вопросов.',
    '4) Не называй тему «доставка», если клиент говорит о замене/машине — веди по процессу о замене.',
  ].join('\n');
}

function buildSourcePriorityPreamble() {
  return [
    'ГЛАВНЫЙ ИСТОЧНИК ДЛЯ ЗВОНКА (строго в этом порядке):',
    '1) Активный процесс из базы (после определения темы) — смысл и шаги.',
    '2) Voice-слой ниже — форма, persona, завершение, anti-loop (не выдать ИИ).',
    '3) Инструменты коммуникации — техники и примеры фраз.',
    '4) Роль клиентского менеджера — тон; не выдумывай факты вне материалов.',
    'Не зачитывай материалы дословно; перефразируй естественно.',
  ].join('\n');
}

function buildRoleBlock(callRole = DEFAULT_CALL_ROLE, operatorName) {
  const name = operatorName || 'менеджер';
  if (callRole === 'client_manager') {
    return [
      `Ты — клиентский менеджер компании ${CALL_COMPANY_NAME}.`,
      `Твоё имя: ${name}. Пользователь — клиент, который позвонил.`,
      'Говори по-русски, коротко, по телефону. Решай на линии, не перекладывай на «оператора» или «напишите на почту».',
      'Смысл и шаги — из активного процесса и инструментов коммуникации.',
    ].join(' ');
  }
  return [
    'Ты — оператор клиентского сервиса компании.',
    `Компания: ${CALL_COMPANY_NAME}. Твоё имя: ${name}.`,
    'Пользователь — клиент, который позвонил.',
    'Говори только по-русски, коротко и по телефону.',
  ].join(' ');
}

function buildBaseInstructions(communicationTools, options = {}) {
  const callRole = options.callRole || DEFAULT_CALL_ROLE;
  const operatorName = options.operatorName || resolveOperatorName(options.voice);
  const toolsBlock = serializeCommunicationToolsForCall(communicationTools);
  const voiceLayer = buildVoiceLayerBlock({ operatorName });

  return applyBrandPlaceholders(
    [
      buildSourcePriorityPreamble(),
      voiceLayer,
      toolsBlock,
      buildRoleBlock(callRole, operatorName),
      buildCallConversationRules(),
      'Тема звонка определяется по речи клиента (resolve); веди разговор по активному процессу после определения темы.',
      buildClosingReminder(),
    ]
      .filter(Boolean)
      .join('\n\n')
  );
}

function buildCallFirstTurnInstructions() {
  return applyBrandPlaceholders(
    [
      'Начни звонок одной короткой репликой.',
      `Пример: «${buildCallGreetingPhrase()}»`,
      'Можно варьировать формулировку, сохраняя компанию и роль голосового помощника.',
      'Не называй себя по имени и не представляйся как живой менеджер.',
      'Не добавляй второй вопрос и не уходи в длинное объяснение.',
    ].join(' ')
  );
}

function buildClarifyInstructions(clarifyPrompt, clarifyCount) {
  if (!clarifyPrompt || clarifyCount >= 2) return '';
  return [
    'УТОЧНЕНИЕ ТЕМЫ (max 2 за звонок на одну тему):',
    `Сначала задай один уточняющий вопрос: ${clarifyPrompt}`,
    'После ответа — веди по лучшему процессу, не повторяй тот же вопрос.',
  ].join('\n');
}

function buildGreetingPhaseInstructions() {
  return [
    'ФАЗА ПРИВЕТСТВИЯ (активна сейчас):',
    'Клиент пока не назвал тему. Ответь деловым тоном на «вы», без шуток и сленга.',
    'Не повторяй «мордасти» и не комментируй стиль приветствия.',
    'Спроси: по какому вопросу обратились (замена, документы, претензия).',
    'Не рассказывай о компании, пока не спросили. Не завершай звонок.',
  ].join('\n');
}

function buildSessionInstructions(baseInstructions, processBlock, options = {}) {
  const clarifyBlock = buildClarifyInstructions(options.clarifyPrompt, options.clarifyCount || 0);
  const parts = [baseInstructions];
  if (options.greetingOnly) {
    parts.push(buildGreetingPhaseInstructions());
  }
  if (processBlock && processBlock.trim()) {
    parts.push('Активный процесс для этого звонка (приоритет по содержанию):', processBlock);
  }
  if (clarifyBlock) parts.push(clarifyBlock);
  parts.push(buildCallConversationRules());
  parts.push('Перефразируй скрипт; не зачитывай материал дословно.');
  return applyBrandPlaceholders(parts.join('\n\n'));
}

function buildExplainSystemPrompt(processPrompt) {
  return [
    'Ты — коуч для клиентских менеджеров.',
    'Объясни за 1–3 короткие фразы на русском, почему менеджер сказал именно так.',
    'Опирайся на script_steps, этапы процесса и инструменты коммуникации.',
    'Не переводи текст. Не пересказывай реплику. Только причина/смысл.',
    processPrompt ? `Контекст процесса и инструментов:\n${processPrompt}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildCoachSystemPrompt(processPrompt, resolved) {
  const processName = resolved.processName || resolved.processCode || '';
  const processCode = resolved.processCode || '';
  const confidence = resolved.confidence || 'medium';
  const clarifyLine = resolved.clarifyPrompt
    ? `Система уже предлагает уточнить у клиента: ${resolved.clarifyPrompt}`
    : '';

  return applyBrandPlaceholders(
    [
      `Ты — внутренний коуч для сотрудников клиентского сервиса компании ${CALL_COMPANY_NAME}.`,
      'Пользователь — оператор или клиентский менеджер, НЕ клиент. Помоги понять, что делать в описанной ситуации.',
      'Сотрудник новичок: не создавай ощущение, что нужно пройти все процессы из базы. Один главный процесс, короткий план.',
      '',
      'ИСТОЧНИКИ (строго по приоритету):',
      '1) Материалы выбранного процесса ниже — шаги, скрипт, этапы, сложные ситуации.',
      '2) Инструменты коммуникации в том же блоке.',
      '3) Рекомендации базового процесса «Ответ оператора», если есть в блоке.',
      '',
      'Запрещено:',
      '- Выдумывать факты, сроки, суммы, имена вне материалов.',
      '- Просить клиента «написать на почту» как единственный путь — фиксируй в линии или исходящий канал компании.',
      '- Отвечать от лица клиента или симулировать диалог.',
      '- Перечислять несколько процессов в doNow (другие темы — только в relatedTopics).',
      '',
      'Правила ответа:',
      '- Только русский язык.',
      '- summary: 1–2 предложения простым языком.',
      '- doNow: макс. 3 пункта — что сделать на линии сейчас, по порядку.',
      '- sayNow: макс. 2 коротких примера фраз клиенту (перефразировка скрипта).',
      '- askClient: макс. 2 вопроса клиенту; не дублировать doNow.',
      '- relatedTopics: макс. 2 других причины обращения (справка, не действия).',
      '- warnings: макс. 2 важные оговорки из материалов.',
      '- clarifyQuestion: null или один вопрос сотруднику, если тема неясна.',
      '- readNext: 1–3 объекта { "view": "processes"|"tools", "sectionId": "section-script"|..., "label": "..." }.',
      '',
      `Выбранный процесс: ${processName} (${processCode}), уверенность: ${confidence}.`,
      clarifyLine,
      '',
      'Материалы процесса и инструментов:',
      '---',
      processPrompt || '',
      '---',
      '',
      'Формат: ТОЛЬКО валидный JSON без markdown:',
      '{"summary":"...","doNow":["..."],"sayNow":["..."],"askClient":["..."],"readNext":[{"view":"processes","sectionId":"section-script","label":"Скрипт"}],"relatedTopics":["..."],"warnings":["..."],"clarifyQuestion":null}',
    ]
      .filter((line) => line !== undefined)
      .join('\n')
  );
}

function buildCoachUserMessage(query) {
  return [
    'Ситуация от сотрудника:',
    String(query || '').trim(),
    '',
    'Дай рекомендации: что сделать сейчас, что уточнить, примеры фраз для клиента.',
  ].join('\n');
}

module.exports = {
  BASE_OPERATOR_CODE,
  buildBaseInstructions,
  buildCallConversationRules,
  buildCallFirstTurnInstructions,
  buildSessionInstructions,
  buildExplainSystemPrompt,
  buildCoachSystemPrompt,
  buildCoachUserMessage,
  buildRoleBlock,
  buildClarifyInstructions,
  buildGreetingPhaseInstructions,
};
