const { detectIntent } = require('./intent');
const { formatDraft, formatDateRu, formatMoneyRu, siteTitle, STATUS_LABELS } = require('./formatDraft');
const { loadCabinetData } = require('./loadCabinetData');

const TAB_LABELS = {
  visits: 'Замены ковров',
  invoices: 'Счета и оплата',
  sites: 'Объекты и ковры',
  overview: 'Главная',
  help: 'Помощь',
};

function filterSites(data, siteId) {
  const sites = data.sites || [];
  if (!siteId) return sites;
  return sites.filter((s) => s.id === siteId);
}

function nextScheduledVisit(site) {
  const scheduled = (site.visits || [])
    .filter((v) => v.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date));
  return scheduled[0] || null;
}

function buildNextVisitFacts(sites) {
  const visits = [];
  const citations = [];

  sites.forEach((site) => {
    const visit = nextScheduledVisit(site);
    if (!visit) return;
    const title = siteTitle(site);
    visits.push({ siteId: site.id, siteTitle: title, date: visit.date });
    citations.push({
      id: `cite-visit-${site.id}`,
      label: `${TAB_LABELS.visits} → ${site.siteType}, ${site.label}`,
      tab: 'visits',
      siteId: site.id,
      evidence: `${STATUS_LABELS.scheduled}: ${formatDateRu(visit.date)}`,
    });
  });

  visits.sort((a, b) => a.date.localeCompare(b.date));
  return { visits, citations };
}

function buildUnpaidInvoicesFacts(data, siteId) {
  let invoices = (data.invoices || []).filter((i) => i.status === 'issued');
  if (siteId) {
    invoices = invoices.filter((i) => (i.siteIds || []).includes(siteId));
  }

  const citations = invoices.map((inv) => ({
    id: `cite-inv-${inv.id}`,
    label: TAB_LABELS.invoices,
    tab: 'invoices',
    siteId: siteId || null,
    evidence: `${inv.period} — ${formatMoneyRu(inv.amount)}, ${STATUS_LABELS.issued}`,
  }));

  return {
    invoices: invoices.map((inv) => ({
      id: inv.id,
      period: inv.period,
      amount: inv.amount,
    })),
    citations,
  };
}

function buildCarpetsFacts(sites) {
  const siteFacts = sites.map((site) => ({
    siteId: site.id,
    siteTitle: siteTitle(site),
    frequencyLabel: site.replacementFrequencyLabel,
    carpets: (site.carpets || []).map((c) => ({
      zone: c.zone,
      size: c.size,
      color: c.color,
      type: c.type,
      sku: c.sku,
      qty: c.qty || 1,
    })),
  }));

  const citations = sites.flatMap((site) =>
    (site.carpets || []).map((c, idx) => ({
      id: `cite-carpet-${site.id}-${idx}`,
      label: `${TAB_LABELS.sites} → ${site.siteType}, ${site.label}`,
      tab: 'sites',
      siteId: site.id,
      evidence: `${c.zone}: ${c.size}, ${c.color}, ${c.type} (${c.sku})`,
    }))
  );

  return { sites: siteFacts, citations };
}

function buildGeneralFacts(data, sites) {
  const co = data.company || {};
  const m = data.manager || {};
  return {
    general: {
      companyName: co.name || '',
      contractNumber: co.contractNumber || '',
      siteCount: sites.length,
      managerName: m.name || '',
    },
    citations: [
      {
        id: 'cite-overview',
        label: TAB_LABELS.overview,
        tab: 'overview',
        siteId: null,
        evidence: `Договор ${co.contractNumber}, ${sites.length} объект(ов)`,
      },
      {
        id: 'cite-help',
        label: TAB_LABELS.help,
        tab: 'help',
        siteId: null,
        evidence: 'Частые вопросы и контакты поддержки',
      },
    ],
  };
}

function buildFacts(query, siteId) {
  const data = loadCabinetData();
  const sites = filterSites(data, siteId);
  const intent = detectIntent(query);

  let facts = {};
  let citations = [];

  switch (intent) {
    case 'next_visit': {
      const r = buildNextVisitFacts(sites);
      facts = { visits: r.visits };
      citations = r.citations;
      break;
    }
    case 'unpaid_invoices': {
      const r = buildUnpaidInvoicesFacts(data, siteId);
      facts = { invoices: r.invoices };
      citations = r.citations;
      break;
    }
    case 'carpets': {
      const r = buildCarpetsFacts(sites);
      facts = { sites: r.sites };
      citations = r.citations;
      break;
    }
    case 'general':
    default: {
      const r = buildGeneralFacts(data, sites);
      facts = r;
      citations = r.citations;
      break;
    }
  }

  const draftAnswer = formatDraft(intent, facts);
  return { intent, facts, citations, draftAnswer };
}

module.exports = { buildFacts, TAB_LABELS };
