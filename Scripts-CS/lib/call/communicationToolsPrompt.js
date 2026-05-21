const { applyBrandPlaceholders } = require('./brandText');

const SKIP_TITLE_EXACT = new Set([
  'Блок',
  'Инструмент',
  'ИНСТРУМЕНТЫ КОММУНИКАЦИИ С КЛИЕНТОМ',
  'ОГЛАВЛЕНИЕ:',
  'ВВОДНЫЙ БЛОК',
  'Инструменты коммуникации',
  'ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ',
]);

const PLACEHOLDER_BODIES = new Set(['Информация о Компании']);

/** Обязательные техники КС при жалобе, задержке, недовольстве. */
const PINNED_TOOL_TITLES = [
  'Эмпатия',
  'Демонстрация эмпатии',
  'Уточняющие вопросы',
  'Активное слушание',
  'Перефразирование',
  'Спокойная интонация',
];

function isExtraSectionLine(line) {
  return /^\d+\.\s+.+:$/.test(String(line).trim());
}

function parseToolBody(bodyText) {
  const lines = String(bodyText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !isExtraSectionLine(line));
  let description = lines[0] || '';
  let when = '';
  const exampleParts = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (/^[«"]/.test(lines[i])) {
      exampleParts.push(lines[i]);
    } else if (i === 1) {
      when = lines[i];
    }
  }
  return {
    description,
    when,
    example: exampleParts.join(' '),
  };
}

function findIntroTool(communicationTools) {
  return (communicationTools || []).find((item) => {
    if (!item) return false;
    const title = String(item.title || '');
    const body = String(item.body || '');
    return title.includes('рабочий помощник') || body.includes('рабочий помощник');
  });
}

function findToolByTitle(communicationTools, title) {
  const needle = String(title || '').trim().toLowerCase();
  return (communicationTools || []).find(
    (item) => String(item.title || '').trim().toLowerCase() === needle
  );
}

function formatToolRow(tool) {
  const title = String(tool.title || '').trim();
  const body = String(tool.body || '').trim();
  if (!title || !body) return '';
  const parsed = parseToolBody(body);
  return [
    `• ${title}`,
    parsed.description ? `Описание: ${parsed.description}` : '',
    parsed.when ? `Когда: ${parsed.when}` : '',
    parsed.example ? `Пример: ${parsed.example}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

function serializePinnedTools(communicationTools) {
  const rows = PINNED_TOOL_TITLES.map((title) => {
    const tool = findToolByTitle(communicationTools, title);
    return tool ? formatToolRow(tool) : '';
  }).filter(Boolean);
  if (!rows.length) return '';
  return applyBrandPlaceholders(
    [
      'ОБЯЗАТЕЛЬНЫЕ инструменты (при жалобе, задержке, недовольстве — в каждой реплике):',
      rows.join('\n'),
    ].join('\n')
  );
}

function serializeCommunicationToolsForCall(communicationTools) {
  const intro = findIntroTool(communicationTools);
  const chunks = [];
  const pinned = serializePinnedTools(communicationTools);
  if (pinned) chunks.push(pinned);

  if (intro) {
    const introTitle = String(intro.title || '').trim();
    if (introTitle.includes('рабочий помощник')) {
      chunks.push(`Вводный блок (принципы сервиса):\n${introTitle}`);
    }
    const introBody = String(intro.body || '').trim();
    if (introBody && !PLACEHOLDER_BODIES.has(introBody)) {
      chunks.push(introBody);
    }
  }

  const pinnedSet = new Set(PINNED_TOOL_TITLES.map((t) => t.toLowerCase()));
  const rows = [];
  for (const tool of communicationTools || []) {
    const title = String(tool.title || '').trim();
    const body = String(tool.body || '').trim();
    if (!title || !body || SKIP_TITLE_EXACT.has(title) || PLACEHOLDER_BODIES.has(body)) {
      continue;
    }
    if (intro && tool === intro) continue;
    if (pinnedSet.has(title.toLowerCase())) continue;

    const row = formatToolRow(tool);
    if (row) rows.push(row);
  }

  if (rows.length) {
    chunks.push(
      [
        'Инструменты коммуникации (основа поведения оператора — применяй по ситуации):',
        rows.join('\n'),
      ].join('\n')
    );
  }

  return applyBrandPlaceholders(chunks.filter(Boolean).join('\n\n'));
}

module.exports = {
  findIntroTool,
  serializeCommunicationToolsForCall,
};
