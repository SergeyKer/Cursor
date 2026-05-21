const { filterProcessCatalog } = require('./processCatalog');
const { canonicalProcessCode } = require('./processAliases');

const STOP_WORDS = new Set([
  'по',
  'на',
  'в',
  'и',
  'или',
  'что',
  'как',
  'для',
  'у',
  'из',
  'за',
  'от',
  'до',
  'не',
  'ли',
  'ко',
  'мне',
  'ещё',
  'еще',
]);

/** Высокий приоритет: типовые реплики клиента → процесс со скриптом. */
const INTENT_RULES = [
  {
    pattern: /машин|не\s+приехал|не\s+приехала|опоздал|опоздала|задерж|жд[ауём]|водител|не\s+был[аи]?\s+замен/i,
    processCode: 'Когда будет была замена',
    confidence: 'high',
  },
  {
    pattern: /доставк|не\s+достав|не\s+привез/i,
    processCode: 'Претензия по доставке ',
    confidence: 'high',
  },
  {
    pattern: /когда\s+будет|когда\s+была|дата\s+замен|график\s+замен|следующая\s+замен/i,
    processCode: 'Когда будет была замена',
    confidence: 'high',
  },
];

function normalizeQueryForScoring(query) {
  return String(query || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandQueryTokens(query) {
  const normalized = normalizeQueryForScoring(query);
  const tokens = normalized.split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  const extra = [];
  if (/машин/.test(normalized)) extra.push('замена', 'доставка', 'водитель', 'маршрут');
  if (/приехал/.test(normalized)) extra.push('замена', 'доставка', 'задержка');
  if (/жд/.test(normalized)) extra.push('замена', 'срок');
  return [...new Set([...tokens, ...extra])];
}

function resolveProcessByIntent(query) {
  const normalized = normalizeQueryForScoring(query);
  if (!normalized) return null;
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        processCode: rule.processCode,
        confidence: rule.confidence,
        score: 1,
      };
    }
  }
  return null;
}

function searchableRichness(meta) {
  return String(meta.searchable_text || '').replace(/\s+/g, ' ').trim().length;
}

function scoreProcessForQuery(processMeta, query) {
  const nameText = ((processMeta.name || '') + ' ' + (processMeta.code || '')).toLowerCase();
  const bodyText = (
    (processMeta.short_description || '') + ' ' + (processMeta.searchable_text || '')
  ).toLowerCase();
  const words = expandQueryTokens(query);
  if (words.length === 0) return 0;
  let score = 0;
  words.forEach((word) => {
    if (nameText.indexOf(word) !== -1) score += 2;
    else if (bodyText.indexOf(word) !== -1) score += 1;
  });
  const base = score / (words.length * 2);
  const richnessBoost = Math.min(searchableRichness(processMeta) / 2000, 0.15);
  return base + richnessBoost;
}

function resolveProcessByScoring(metaList, query) {
  const intent = resolveProcessByIntent(query);
  if (intent) {
    return {
      ...intent,
      clarifyPrompt: undefined,
    };
  }

  const catalog = filterProcessCatalog(metaList);
  const ranked = catalog
    .map((process) => ({ process, score: scoreProcessForQuery(process, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return searchableRichness(b.process) - searchableRichness(a.process);
    });

  if (ranked.length === 0) {
    return {
      processCode: 'Ответ оператора',
      confidence: 'low',
      score: 0,
      clarifyPrompt: 'Уточните, пожалуйста, с чем связан ваш звонок?',
    };
  }

  const top = ranked[0];
  const second = ranked[1];
  const gap = second ? top.score - second.score : top.score;
  let confidence = 'medium';
  if (top.score >= 0.6 && gap >= 0.2) confidence = 'high';
  if (top.score < 0.35) confidence = 'low';

  return {
    processCode: canonicalProcessCode(top.process.code),
    confidence,
    score: top.score,
    clarifyPrompt:
      confidence === 'low'
        ? 'Правильно ли я понял, что ваш вопрос связан с темой «' + (top.process.name || top.process.code) + '»?'
        : undefined,
  };
}

function extractJsonObject(raw) {
  const trimmed = String(raw || '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return '';
}

function parseLlmResolveResult(raw, metaList) {
  try {
    const jsonText = extractJsonObject(raw);
    if (!jsonText) return null;
    const parsed = JSON.parse(jsonText);
    const code = String(parsed.processCode || parsed.code || '').trim();
    if (!code) return null;
    const meta = filterProcessCatalog(metaList).find(
      (item) =>
        item.code === code ||
        item.sheet_name === code ||
        String(item.name || '').toLowerCase() === code.toLowerCase()
    );
    if (!meta) return null;
    return {
      processCode: meta.code,
      confidence: parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'medium',
      clarifyPrompt: typeof parsed.clarifyPrompt === 'string' ? parsed.clarifyPrompt : undefined,
    };
  } catch {
    return null;
  }
}

function buildLlmResolvePrompt(metaList, query) {
  const catalog = filterProcessCatalog(metaList)
    .map((item) => `${item.code} | ${item.name || item.code}`)
    .join('\n');
  return [
    'Определи процесс клиентского сервиса по реплике клиента.',
    'Верни JSON: {"processCode":"...","confidence":"high|medium|low","clarifyPrompt":"..."}',
    'processCode — code из каталога. clarifyPrompt — только если confidence low.',
    'Если клиент жалуется, что машина/замена не приехала — processCode: «Когда будет была замена».',
    'Если доставка не состоялась — «Претензия по доставке ».',
    'Каталог:',
    catalog,
    'Реплика клиента:',
    query,
  ].join('\n');
}

module.exports = {
  scoreProcessForQuery,
  resolveProcessByIntent,
  resolveProcessByScoring,
  parseLlmResolveResult,
  buildLlmResolvePrompt,
};
