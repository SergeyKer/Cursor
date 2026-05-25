const STATUS_LABELS = {
  scheduled: 'Запланировано',
  issued: 'К оплате',
  paid: 'Оплачен',
};

function formatDateRu(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatVisitDateRu(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'long' });
  return `${date}, ${weekday}`;
}

function formatMoneyRu(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function siteTitle(site) {
  return `${site.siteType}, ${site.label}`;
}

function formatDraft(intent, facts) {
  switch (intent) {
    case 'next_visit': {
      if (!facts.visits.length) {
        return 'Запланированных замен не найдено по выбранным объектам.';
      }
      const lines = facts.visits.map(
        (v) => `• **${v.siteTitle}** — ${formatVisitDateRu(v.date)} (${STATUS_LABELS.scheduled})`
      );
      return `Ближайшие запланированные замены:\n\n${lines.join('\n')}`;
    }
    case 'unpaid_invoices': {
      if (!facts.invoices.length) {
        return 'Неоплаченных счетов нет — все счета оплачены.';
      }
      const lines = facts.invoices.map(
        (inv) =>
          `• **${inv.period}** — ${formatMoneyRu(inv.amount)} (${STATUS_LABELS.issued})`
      );
      return `Счета к оплате:\n\n${lines.join('\n')}`;
    }
    case 'carpets': {
      if (!facts.sites.length) {
        return 'Объекты не найдены.';
      }
      const blocks = facts.sites.map((site) => {
        const carpetLines = site.carpets.map(
          (c) =>
            `  - ${c.zone}: ${c.size}, ${c.color}, ${c.type}${c.qty > 1 ? `, ${c.qty} шт.` : ''} (${c.sku})`
        );
        return `**${site.siteTitle}** (${site.frequencyLabel}):\n${carpetLines.join('\n')}`;
      });
      return `Ковры на объектах:\n\n${blocks.join('\n\n')}`;
    }
    case 'general':
    default: {
      const g = facts.general;
      return (
        `По договору **${g.contractNumber}** обслуживается **${g.siteCount}** объект(ов). ` +
        `Клиент: ${g.companyName}. Менеджер: ${g.managerName}. ` +
        `Уточните вопрос — например, о заменах, счетах или коврах на объектах.`
      );
    }
  }
}

module.exports = { formatDraft, formatDateRu, formatVisitDateRu, formatMoneyRu, siteTitle, STATUS_LABELS };
