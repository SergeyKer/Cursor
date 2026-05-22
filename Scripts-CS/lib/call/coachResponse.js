const { extractJsonObject } = require('./resolveProcess');

const MAX_DO_NOW = 3;
const MAX_SAY_NOW = 2;
const MAX_ASK_CLIENT = 2;
const MAX_RELATED = 2;
const MAX_WARNINGS = 2;

function asStringArray(value, maxLen) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, maxLen);
}

function normalizeReadNext(value) {
  if (!Array.isArray(value)) {
    return [{ view: 'processes', sectionId: 'section-script', label: 'Скрипт' }];
  }
  const items = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const view = item.view === 'tools' ? 'tools' : 'processes';
      const sectionId = String(item.sectionId || '').trim();
      const label = String(item.label || '').trim();
      if (!sectionId && view === 'processes') return null;
      return {
        view,
        sectionId: sectionId || (view === 'tools' ? 'tools-section-intro' : 'section-script'),
        label: label || (view === 'tools' ? 'Инструменты' : 'Скрипт'),
      };
    })
    .filter(Boolean)
    .slice(0, 4);
  if (items.length === 0) {
    return [{ view: 'processes', sectionId: 'section-script', label: 'Скрипт' }];
  }
  return items;
}

/**
 * @param {string} raw
 * @returns {{ coach: object, adviceMarkdown: string|null }}
 */
function parseCoachLlmJson(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { coach: null, adviceMarkdown: null };
  }

  try {
    const jsonText = extractJsonObject(trimmed) || trimmed;
    const parsed = JSON.parse(jsonText);
    const coach = {
      summary: String(parsed.summary || '').trim(),
      doNow: asStringArray(parsed.doNow || parsed.steps, MAX_DO_NOW),
      sayNow: asStringArray(parsed.sayNow || parsed.samplePhrases, MAX_SAY_NOW),
      askClient: asStringArray(parsed.askClient, MAX_ASK_CLIENT),
      readNext: normalizeReadNext(parsed.readNext),
      relatedTopics: asStringArray(parsed.relatedTopics, MAX_RELATED),
      warnings: asStringArray(parsed.warnings, MAX_WARNINGS),
      clarifyQuestion:
        parsed.clarifyQuestion === null || parsed.clarifyQuestion === undefined
          ? null
          : String(parsed.clarifyQuestion).trim() || null,
    };
    return { coach, adviceMarkdown: null };
  } catch {
    return { coach: null, adviceMarkdown: trimmed };
  }
}

module.exports = {
  parseCoachLlmJson,
  normalizeReadNext,
  MAX_DO_NOW,
  MAX_SAY_NOW,
  MAX_ASK_CLIENT,
};
