function isLegacyHeadingItem(meta) {
  const name = (meta && (meta.name || meta.code) ? String(meta.name || meta.code) : '').trim();
  const sheet = (meta && meta.sheet_name ? String(meta.sheet_name) : '').trim();
  return !sheet && /:\s*$/.test(name);
}

function filterProcessCatalog(metaList) {
  return (metaList || []).filter((item) => item && item.code && !isLegacyHeadingItem(item));
}

function compactCatalogEntry(meta) {
  const triggers = (meta.searchable_text || meta.short_description || '').replace(/\s+/g, ' ').trim();
  const shortTriggers = triggers.length > 120 ? `${triggers.slice(0, 117)}…` : triggers;
  return `- ${meta.code} (${meta.name || meta.code})${shortTriggers ? `: ${shortTriggers}` : ''}`;
}

function buildCompactCatalog(metaList) {
  return filterProcessCatalog(metaList)
    .map(compactCatalogEntry)
    .join('\n');
}

const { canonicalProcessCode } = require('./processAliases');

function findMetaByCode(metaList, code) {
  if (!code) return null;
  const canonical = canonicalProcessCode(code);
  const normalized = String(canonical).trim().toLowerCase();
  return (
    filterProcessCatalog(metaList).find(
      (item) =>
        String(item.code || '').trim().toLowerCase() === normalized ||
        String(item.sheet_name || '').trim().toLowerCase() === normalized ||
        String(canonicalProcessCode(item.code || '')).trim().toLowerCase() === normalized
    ) || null
  );
}

function resolveRichProcessMeta(metaList, code) {
  let meta = findMetaByCode(metaList, code);
  if (!meta) return null;
  const aliasCode = canonicalProcessCode(meta.code);
  if (aliasCode !== meta.code) {
    const aliased = findMetaByCode(metaList, aliasCode);
    if (aliased) meta = aliased;
  }
  const textLen = String(meta.searchable_text || '').replace(/\s+/g, ' ').trim().length;
  if (textLen < 80 && /замен/i.test(String(meta.code || meta.name || ''))) {
    const rich = findMetaByCode(metaList, 'Когда будет была замена');
    if (rich) meta = rich;
  }
  return meta;
}

function resolveProcessKey(meta, processesData) {
  if (!meta || !processesData) return null;
  if (meta.sheet_name && processesData[meta.sheet_name]) return meta.sheet_name;
  if (meta.code && processesData[meta.code]) return meta.code;
  const name = (meta.name || '').toLowerCase();
  return Object.keys(processesData).find((key) => key.toLowerCase().indexOf(name) >= 0) || null;
}

function findKnowledgeEntry(knowledgeList, meta) {
  if (!Array.isArray(knowledgeList) || !meta) return null;
  const code = (meta.code || '').trim();
  const sheet = (meta.sheet_name || '').trim();
  const name = (meta.name || '').trim();
  return (
    knowledgeList.find((item) => item.sheet_name === sheet || item.name === code || item.name === name) ||
    null
  );
}

module.exports = {
  isLegacyHeadingItem,
  filterProcessCatalog,
  buildCompactCatalog,
  findMetaByCode,
  resolveRichProcessMeta,
  resolveProcessKey,
  findKnowledgeEntry,
};
