const { filterProcessCatalog } = require('./processCatalog');
const { canonicalProcessCode } = require('./processAliases');

const MIN_SCORE = 0.35;
const FALLBACK_PROCESS_CODE = 'Ответ оператора';

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

const BUSINESS_TOPIC_MARKERS =
  /ковр|замен|достав|счет|счёт|жалоб|договор|оплат|бухгалтер|водител|претенз|документ|сотруднич|реклам|машин|пропуск|акт|сверк|тариф|цен|прайс|расторг|партнер|поставщик/i;

/** Только приветствие без темы — не уводить в «Информация о Компании» / «день замены». */
function isGreetingOnlyQuery(query) {
  const normalized = normalizeQueryForScoring(query);
  if (!normalized) return false;
  if (BUSINESS_TOPIC_MARKERS.test(normalized)) return false;
  if (/расскаж.*компан|что\s+за\s+компан|кто\s+вы\s+так|о\s+компан/i.test(normalized)) {
    return false;
  }
  const words = normalized.split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  if (words.length === 0) return true;
  const greetingWord =
    /^(?:здраст|здравств|привет|добр|доброе|алло|мордаст|слушаю|здравствуйте|добрый|утро|вечер|день)/;
  return words.every((w) => greetingWord.test(w));
}

function buildGreetingClarifyPrompt() {
  return 'Подскажите, пожалуйста, по какому вопросу вы обратились — замена ковров, документы, претензия или другое?';
}

/** Порядок: от специфичного к общему. */
const INTENT_RULES = [
  {
    pattern: /ты\s+робот|ты\s+ии|chatgpt|openai|системн.*промпт|ignore\s+previous|dan\s+mode/i,
    processCode: FALLBACK_PROCESS_CODE,
    confidence: 'high',
    skipScoring: true,
    isMetaProvocation: true,
  },
  {
    pattern: /^(?:здраст|здравств|привет|добр|доброе\s+утро|алло)(?:\s+мордаст)?[!.?\s]*$/i,
    processCode: FALLBACK_PROCESS_CODE,
    confidence: 'high',
    greetingOnly: true,
    clarifyPrompt: buildGreetingClarifyPrompt(),
  },
  {
    pattern: /заключ.*договор|аренд.*ковр|стать.*клиент|нужн.*ковр|обслуживан.*ковр|хотим.*ковр/i,
    processCode: 'Новые клиенты',
    confidence: 'high',
  },
  {
    pattern: /реклам.*агент|медиаплан|размещен.*реклам/i,
    processCode: 'Вопрос по сотрудничеству',
    confidence: 'high',
  },
  {
    pattern: /возить.*ковр|логист.*для\s+вас|перевоз.*ковр|автокомпан/i,
    processCode: 'Вопрос по сотрудничеству',
    confidence: 'high',
  },
  {
    pattern: /предлож.*сотруднич|партнер|поставщик|коммерческ.*предлож/i,
    processCode: 'Вопрос по сотрудничеству',
    confidence: 'high',
  },
  {
    pattern: /с\s+кем.*(поговор|связ)|ключев.*лиц|по\s+поводу\s+сотруднич/i,
    processCode: 'Вопрос по сотрудничеству',
    confidence: 'medium',
    clarifyPrompt:
      'Подскажите, вы хотите стать клиентом по аренде ковров или предложить сотрудничество как партнёр?',
  },
  {
    pattern: /переключ.*бухгалтер|соедин.*бухгалтер|бухгалтер/i,
    processCode: 'Запрос о направлении счета',
    confidence: 'medium',
    clarifyPrompt: 'Уточните, пожалуйста: счёт, акт сверки или вопрос по оплате?',
  },
  {
    pattern: /акт\s*свер|сверк|задолжен|не\s+оплат|счет\s+не\s+приш/i,
    processCode: 'Оплата и задолженность',
    confidence: 'high',
  },
  {
    pattern: /расторг|прекрат.*договор|отказ.*от\s+услуг/i,
    processCode: 'Расторжение договора',
    confidence: 'high',
  },
  {
    pattern: /жалоб.*водител|водител.*груб|груб.*водител|хамил/i,
    processCode: 'Жалоба на водителя',
    confidence: 'high',
  },
  {
    pattern: /машин|не\s+приехал|не\s+приехала|опоздал|опоздала|задерж|жд[ауём]|не\s+был[аи]?\s+замен/i,
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
  {
    pattern: /ускор|потороп|быстрее|срочно.*замен/i,
    processCode: 'Ускорение процесса',
    confidence: 'high',
  },
  {
    pattern: /стоимост|цен|прайс|кп|коммерческ.*предлож.*получ/i,
    processCode: 'Вопрос по стоимости',
    confidence: 'high',
  },
  {
    pattern: /расскаж.*компан|что\s+за\s+компан|кто\s+вы\s+так/i,
    processCode: 'Информация о Компании',
    confidence: 'medium',
  },
  {
    pattern: /пропуск|проходн|охран/i,
    processCode: 'Заказ пропуска',
    confidence: 'medium',
  },
  {
    pattern: /документ|акт|счет|счёт|накладн/i,
    processCode: 'Входящий запрос документов',
    confidence: 'medium',
  },
  {
    pattern: /измен.*график|другой\s+день|сред[ау]|понедельник|вторник|среда|четверг|пятниц/i,
    processCode: 'Уточнение/согласование нового дня замены / маршрута',
    confidence: 'medium',
  },
  {
    pattern: /качеств.*ковр|ковер.*плох|грязн.*ковр|пятн/i,
    processCode: 'Претензия по качеству',
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
  if (/машин/.test(normalized)) extra.push('замена', 'доставка', 'маршрут');
  if (/приехал/.test(normalized)) extra.push('замена', 'доставка', 'задержка');
  if (/жд/.test(normalized)) extra.push('замена', 'срок');
  if (/водител/.test(normalized)) extra.push('жалоба', 'сотрудник');
  return [...new Set([...tokens, ...extra])];
}

function resolveProcessByIntent(query) {
  const normalized = normalizeQueryForScoring(query);
  if (!normalized) return null;
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        processCode: canonicalProcessCode(rule.processCode),
        confidence: rule.confidence,
        score: 1,
        clarifyPrompt: rule.clarifyPrompt,
        isMetaProvocation: Boolean(rule.isMetaProvocation),
        skipScoring: Boolean(rule.skipScoring),
      };
    }
  }
  return null;
}

function isMetaProvocationQuery(query) {
  const intent = resolveProcessByIntent(query);
  return Boolean(intent && intent.isMetaProvocation);
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
  return score / (words.length * 2);
}

function buildSafeClarifyPrompt() {
  return 'Уточните, пожалуйста, с чем связан ваш звонок?';
}

function resolveProcessByScoring(metaList, query) {
  if (isGreetingOnlyQuery(query)) {
    return {
      processCode: FALLBACK_PROCESS_CODE,
      confidence: 'high',
      score: 1,
      clarifyPrompt: buildGreetingClarifyPrompt(),
      greetingOnly: true,
    };
  }

  const intent = resolveProcessByIntent(query);
  if (intent) {
    return {
      processCode: intent.processCode,
      confidence: intent.confidence,
      score: intent.score,
      clarifyPrompt: intent.clarifyPrompt,
    };
  }

  const catalog = filterProcessCatalog(metaList);
  const ranked = catalog
    .map((process) => ({ process, score: scoreProcessForQuery(process, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return searchableRichness(a.process) - searchableRichness(b.process);
    });

  if (ranked.length === 0) {
    return {
      processCode: FALLBACK_PROCESS_CODE,
      confidence: 'low',
      score: 0,
      clarifyPrompt: buildSafeClarifyPrompt(),
    };
  }

  const top = ranked[0];
  const second = ranked[1];
  const gap = second ? top.score - second.score : top.score;
  let confidence = 'medium';
  if (top.score >= 0.6 && gap >= 0.2) confidence = 'high';
  if (top.score < MIN_SCORE) confidence = 'low';

  if (confidence === 'low') {
    return {
      processCode: FALLBACK_PROCESS_CODE,
      confidence: 'low',
      score: top.score,
      clarifyPrompt: buildSafeClarifyPrompt(),
      suggestedProcessCode: canonicalProcessCode(top.process.code),
    };
  }

  if (confidence === 'medium' && gap < 0.12 && !BUSINESS_TOPIC_MARKERS.test(normalizeQueryForScoring(query))) {
    return {
      processCode: FALLBACK_PROCESS_CODE,
      confidence: 'medium',
      score: top.score,
      clarifyPrompt: buildGreetingClarifyPrompt(),
      greetingOnly: true,
    };
  }

  return {
    processCode: canonicalProcessCode(top.process.code),
    confidence,
    score: top.score,
    clarifyPrompt:
      confidence === 'medium' && gap < 0.15
        ? buildSafeClarifyPrompt()
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
      processCode: canonicalProcessCode(meta.code),
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
    'Покупатель ковров (договор, аренда) → «Новые клиенты».',
    'Партнёр/реклама/логистика для нас → «Вопрос по сотрудничеству».',
    'Жалоба на водителя → «Жалоба на водителя».',
    'Машина/замена не приехала → «Когда будет была замена».',
    'Реплика только приветствие без темы → «Ответ оператора», не «Информация о Компании».',
    'Каталог:',
    catalog,
    'Реплика клиента:',
    query,
  ].join('\n');
}

module.exports = {
  MIN_SCORE,
  FALLBACK_PROCESS_CODE,
  scoreProcessForQuery,
  resolveProcessByIntent,
  resolveProcessByScoring,
  isMetaProvocationQuery,
  isGreetingOnlyQuery,
  buildGreetingClarifyPrompt,
  parseLlmResolveResult,
  buildLlmResolvePrompt,
  buildSafeClarifyPrompt,
};
