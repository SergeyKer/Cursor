const INTENT_PRIORITY = ['unpaid_invoices', 'next_visit', 'carpets', 'general'];

const INTENT_RULES = {
  unpaid_invoices: [/сч[её]т/i, /оплат/i, /неоплач/i, /долг/i, /задолж/i],
  next_visit: [/замен/i, /следующ/i, /когда/i, /дата/i, /визит/i, /приезд/i],
  carpets: [/ковр/i, /размер/i, /зон/i, /где\s+стоят/i, /артикул/i, /sku/i],
};

function normalizeQuery(query) {
  return String(query || '')
    .trim()
    .toLowerCase();
}

function scoreIntent(q, intent) {
  const rules = INTENT_RULES[intent] || [];
  return rules.reduce((n, re) => (re.test(q) ? n + 1 : n), 0);
}

function detectIntent(query) {
  const q = normalizeQuery(query);
  if (!q) return 'general';

  let best = 'general';
  let bestScore = 0;

  for (const intent of INTENT_PRIORITY) {
    if (intent === 'general') continue;
    const score = scoreIntent(q, intent);
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  return bestScore > 0 ? best : 'general';
}

module.exports = { detectIntent, INTENT_PRIORITY };
