const TERMINATION_TOPIC_PATTERN =
  /расторг|расторжен|прекрат.*договор|отказ.*от\s+услуг|разорв.*договор|увольн.*компан/i;

const NATURAL_REASONS = [
  { id: 'business_closure', pattern: /закрыт|ликвид|сверя|банкрот|прекрат.*деятель|обанкрот/i, label: 'закрытие бизнеса' },
  { id: 'relocation', pattern: /переезд|переезжа|перенос.*офис|смен.*адрес|новый\s+офис|объект.*закры/i, label: 'переезд / смена объекта' },
  { id: 'lease_end', pattern: /аренд.*законч|законч.*аренд|аренд.*истек|конец\s+аренд|срок\s+аренд|освобод.*помещ/i, label: 'окончание аренды помещения' },
  { id: 'no_need', pattern: /не\s+нужн.*ковр|ковр.*не\s+нуж|убрали\s+ковр|формат.*измен|ковр.*убра/i, label: 'ковры больше не нужны' },
  { id: 'reorganization', pattern: /реорганизац|оптимизац.*расход|сокращ.*объект|сокращ.*штат/i, label: 'реорганизация / оптимизация' },
];

const RETENTION_REASONS = [
  {
    id: 'quality',
    pattern: /качеств|грязн|пятн|износ|ветх|плох.*ковр|ковр.*плох/i,
    label: 'качество ковров',
    playbook:
      'Эмпатия → уточни объект/дату последней замены → предложи проверку партии и ускоренную замену/контроль качества. Не признавай вину без фактов.',
  },
  {
    id: 'price',
    pattern: /дорог|цен|тариф|стоимост|подорожал|дешевле.*конкур|накрут/i,
    label: 'цена / тариф',
    playbook:
      'Эмпатия → уточни, что именно изменилось в стоимости → разбор тарифа и ценности (регулярные замены, сервис). Без необоснованных скидок; допустима корректировка частоты замен.',
  },
  {
    id: 'service_general',
    pattern: /плохо\s+работ|не\s+устраива.*сервис|ужасн.*сервис|кошмар|безобраз/i,
    label: 'недовольство сервисом',
    playbook:
      'Эмпатия → один конкретный вопрос «что именно не устроило» → предложи решение по факту и контроль со стороны компании.',
  },
  {
    id: 'delivery_delay',
    pattern: /задерж|не\s+приехал|опоздал|жд.*замен|график.*сорв|машин.*не/i,
    label: 'задержки / график замен',
    playbook:
      'Эмпатия → уточни адрес и дату → статус замены и следующий шаг со сроком. Используй логику процесса «Когда будет была замена».',
  },
  {
    id: 'driver',
    pattern: /водител|хамил|груб.*сотрудник/i,
    label: 'поведение водителя',
    playbook:
      'Эмпатия → зафиксируй факты → эскалация по жалобе на водителя + контроль замены.',
  },
  {
    id: 'billing',
    pattern: /счет|счёт|оплат|начисл|переплат/i,
    label: 'оплата / счета',
    playbook:
      'Эмпатия → уточни номер договора/период → проверка и переотправка/разбор начислений на линии.',
  },
  {
    id: 'vague_dissatisfaction',
    pattern: /недовол|не\s+нрав|всё\s+плох|все\s+плох|надоел|устал.*от/i,
    label: 'общее недовольство',
    playbook:
      'Эмпатия → один уточняющий вопрос по конкретике (качество, цена, график) → предложи решение по выявленной причине.',
  },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTerminationTopic(text) {
  return TERMINATION_TOPIC_PATTERN.test(normalizeText(text));
}

function matchReasonGroups(text, groups) {
  const normalized = normalizeText(text);
  return groups
    .filter((entry) => entry.pattern.test(normalized))
    .map((entry) => ({ id: entry.id, label: entry.label, playbook: entry.playbook }));
}

function classifyTerminationReason(query, conversationText) {
  const combined = normalizeText([conversationText, query].filter(Boolean).join(' '));
  const natural = matchReasonGroups(combined, NATURAL_REASONS);
  if (natural.length) {
    return { reasonCategory: 'natural', reasons: natural, primary: natural[0] };
  }
  const retention = matchReasonGroups(combined, RETENTION_REASONS);
  if (retention.length) {
    return { reasonCategory: 'retention', reasons: retention, primary: retention[0] };
  }
  return { reasonCategory: 'unknown', reasons: [], primary: null };
}

function hasTerminationReason(query, conversationText) {
  return classifyTerminationReason(query, conversationText).reasonCategory !== 'unknown';
}

function buildTerminationClarifyPrompt() {
  return 'Подскажите, пожалуйста, что стало причиной — переезд, закрытие объекта, окончание аренды, качество, цена, график замен, сервис или другое?';
}

function countTerminationMentions(text) {
  const normalized = normalizeText(text);
  const matches = normalized.match(
    /расторг\w*|расторжен\w*|прекрат\w*\s+договор|отказ\w*\s+от\s+услуг|разорв\w*\s+договор/g
  );
  return matches ? matches.length : 0;
}

function assessChurnPressure(conversationText) {
  const normalized = normalizeText(conversationText);
  const signals = [];
  let score = 0;

  const mentions = countTerminationMentions(normalized);
  if (mentions >= 3) {
    score += 4;
    signals.push('повторное требование расторжения (3+)');
  } else if (mentions === 2) {
    score += 3;
    signals.push('повторное требование расторжения');
  } else if (mentions === 1) {
    score += 1;
  }

  if (/угрож|крич|хам|идиот|дурак|бесполезн|надоел|немедленно|сейчас\s+же|достал/i.test(normalized)) {
    score += 2;
    signals.push('агрессия / жёсткий тон');
  }
  if (/не\s+буду\s+обсуж|не\s+интерес|просто\s+расторг|уже\s+решил|без\s+разговор|не\s+хочу\s+слушать|не\s+убед/i.test(normalized)) {
    score += 2;
    signals.push('отказ от диалога');
  }
  if (/оформ.*расторг|фиксиру.*расторг|закрыв.*договор|пишите\s+расторжен/i.test(normalized)) {
    score += 2;
    signals.push('явное требование оформить расторжение');
  }

  let level = 'low';
  if (score >= 5) level = 'high';
  else if (score >= 3) level = 'medium';

  return { level, score, signals, terminationMentions: mentions };
}

function shouldSkipTerminationReasonClarify(pressure) {
  return (
    pressure.level === 'high' ||
    pressure.signals.includes('отказ от диалога') ||
    pressure.signals.includes('явное требование оформить расторжение') ||
    pressure.signals.includes('агрессия / жёсткий тон')
  );
}

function shouldTerminateDespiteRetention(pressure) {
  return shouldSkipTerminationReasonClarify(pressure);
}

function resolveTerminationScenario(query, conversationText) {
  const context = conversationText || query;
  const reason = classifyTerminationReason(query, context);
  const pressure = assessChurnPressure(context);
  let path = 'clarify';
  let summary = '';

  if (reason.reasonCategory === 'unknown') {
    if (shouldSkipTerminationReasonClarify(pressure)) {
      path = 'terminate';
      summary =
        pressure.signals.includes('агрессия / жёсткий тон') ||
        pressure.signals.includes('отказ от диалога')
          ? 'Причина не названа, но клиент агрессивен или отказывается от диалога — оформление без удержания.'
          : 'Причина не названа, но давление на расторжение высокое — оформление без удержания.';
    } else {
      path = 'clarify';
      summary = 'Причина не ясна — сначала уточни причину одним вопросом.';
    }
  } else if (reason.reasonCategory === 'natural') {
    path = 'terminate';
    summary = `Естественная причина (${reason.primary.label}) — удержание не дави; сопроводи расторжение корректно.`;
  } else if (shouldTerminateDespiteRetention(pressure)) {
    path = 'terminate';
    summary =
      pressure.level === 'high'
        ? 'Обратимая причина, но высокое давление — оформление расторжения без дальнейшего удержания.'
        : 'Обратимая причина, но клиент настаивает или отказывается от диалога — оформление без удержания.';
  } else {
    path = 'retain';
    summary =
      pressure.level === 'medium'
        ? 'Обратимая причина, среднее давление — одна попытка удержания по алгоритму, без давления.'
        : 'Обратимая причина — удержание по алгоритму; к оформлению только после явного повторного требования.';
  }

  return {
    path,
    summary,
    reasonCategory: reason.reasonCategory,
    reasons: reason.reasons,
    primaryReason: reason.primary,
    pressure,
    clarifyPrompt: path === 'clarify' ? buildTerminationClarifyPrompt() : null,
    scenarioBlock: buildTerminationScenarioBlock({
      path,
      summary,
      reason,
      pressure,
    }),
  };
}

function buildTerminationScenarioBlock({ path, summary, reason, pressure }) {
  const lines = [
    'РАСТОРЖЕНИЕ / УДЕРЖАНИЕ (приоритет для темы расторжения):',
    summary,
    '',
    'Категории причин:',
    'A) Естественные (не удерживать): закрытие, переезд, окончание аренды, объект не нужен, реорганизация.',
    'B) Обратимые (удержание): качество, цена, сервис, задержки, водитель, счета, общее недовольство.',
  ];

  if (reason.primary) {
    lines.push(`Определённая причина: ${reason.primary.label} (${reason.reasonCategory === 'natural' ? 'естественная' : 'обратимая'}).`);
  }

  if (pressure.signals.length) {
    lines.push(`Сигналы давления (${pressure.level}): ${pressure.signals.join('; ')}.`);
  }

  if (path === 'clarify') {
    lines.push(
      'ОБЯЗАТЕЛЬНО СЕЙЧАС: эмпатия + один вопрос о причине (переезд, закрытие, аренда, качество, цена, график, сервис).',
      'Запрещено: подтверждать расторжение, оформление, письменную заявку, «зафиксировала», «приняла к сведению» без названной причины.',
      'Исключение — только при явной агрессии, отказе от диалога или повторном жёстком требовании расторжения (см. сигналы давления выше).'
    );
    return lines.join('\n');
  }

  if (path === 'terminate') {
    lines.push(
      'Сценарий «Расторжение по естественным причинам / высокое давление»:',
      '1) Эмпатия без спора.',
      '2) Кратко зафиксируй причину своими словами.',
      '3) Объясни следующий шаг закрытия (письменная заявка/фиксация в CRM, сроки расчёта) — без уговоров.',
      '4) Не предлагай скидки и не спорь, если клиент отказывается от диалога.'
    );
    return lines.join('\n');
  }

  lines.push('Сценарий «Удержание» (до явного повторного требования расторжения):');
  reason.reasons.forEach((item) => {
    if (item.playbook) lines.push(`• ${item.label}: ${item.playbook}`);
  });
  if (!reason.reasons.length && reason.primary && reason.primary.playbook) {
    lines.push(`• ${reason.primary.label}: ${reason.primary.playbook}`);
  }
  lines.push(
    'Правила удержания:',
    '- Max 1 цикл удержания за реплику; один вопрос — одна реплика.',
    '- Не переходи к оформлению расторжения, пока клиент не повторит требование 2+ раз или не откажется от диалога.',
    '- При новой агрессии или «просто расторгните» — переключись на сценарий расторжения.'
  );
  return lines.join('\n');
}

function analyzeTerminationContext(query, conversationText, options = {}) {
  const context = conversationText || query;
  const terminationRelevant =
    Boolean(options.forceTermination) ||
    isTerminationTopic(context) ||
    isTerminationTopic(query);
  if (!terminationRelevant) {
    return null;
  }
  return resolveTerminationScenario(query, context);
}

function applyTerminationContext(resolved, query, conversationText) {
  if (!resolved) return resolved;

  const context = [conversationText, query].filter(Boolean).join('\n');
  const forceTermination = resolved.processCode === 'Расторжение договора';
  const terminationRelevant =
    forceTermination || isTerminationTopic(context) || isTerminationTopic(query);
  if (!terminationRelevant) return resolved;

  const analysis = analyzeTerminationContext(query, conversationText, { forceTermination });
  if (!analysis) return resolved;

  const next = {
    ...resolved,
    termination: {
      path: analysis.path,
      reasonCategory: analysis.reasonCategory,
      pressureLevel: analysis.pressure.level,
      primaryReason: analysis.primaryReason && analysis.primaryReason.label,
    },
    terminationScenarioBlock: analysis.scenarioBlock,
  };

  if (analysis.path === 'clarify') {
    next.clarifyPrompt = analysis.clarifyPrompt || buildTerminationClarifyPrompt();
  } else {
    next.clarifyPrompt = undefined;
  }

  return next;
}

module.exports = {
  TERMINATION_TOPIC_PATTERN,
  NATURAL_REASONS,
  RETENTION_REASONS,
  normalizeText,
  isTerminationTopic,
  classifyTerminationReason,
  hasTerminationReason,
  buildTerminationClarifyPrompt,
  assessChurnPressure,
  shouldSkipTerminationReasonClarify,
  shouldTerminateDespiteRetention,
  resolveTerminationScenario,
  buildTerminationScenarioBlock,
  analyzeTerminationContext,
  applyTerminationContext,
};
