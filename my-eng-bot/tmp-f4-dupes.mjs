import { readFileSync, writeFileSync } from 'fs'

const dataFiles = [
  'lib/tutor/localFaq/data/a1.ts',
  'lib/tutor/localFaq/data/a2.ts',
  'lib/tutor/localFaq/data/b1_nuance.ts',
  'lib/tutor/localFaq/data/b2_gems.ts',
]

function parseEntries(text) {
  const entries = []
  const chunks = text.split(/\n\s*\{\s*\n/)
  for (const chunk of chunks) {
    const id = chunk.match(/id:\s*['"]([^'"]+)['"]/)
    if (!id) continue
    const questionRu =
      chunk.match(/questionRu:\s*['"]([^'"]+)['"]/) || chunk.match(/questionRu:\s*`([^`]+)`/)
    const genre = chunk.match(/genre:\s*['"]([^'"]+)['"]/)
    const idle = chunk.match(/idleEligible:\s*(true|false)/)
    const level = chunk.match(/level:\s*['"]([^'"]+)['"]/)
    const popularity = chunk.match(/popularity:\s*(\d+)/)
    const needlesBlock = chunk.match(/enNeedles:\s*\[([\s\S]*?)\]/)
    if (!questionRu || !genre || !idle) continue
    const needles = []
    if (needlesBlock) {
      for (const m of needlesBlock[1].matchAll(/['"]([^'"]+)['"]/g)) needles.push(m[1])
    }
    entries.push({
      id: id[1],
      questionRu: questionRu[1],
      genre: genre[1],
      idleEligible: idle[1] === 'true',
      level: level?.[1],
      popularity: popularity ? Number(popularity[1]) : 0,
      enNeedles: needles,
    })
  }
  return entries
}

function normEn(s) {
  return s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[’‘‛ʼ]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[.…]+$/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ') // drop (that) style
    .trim()
}

function extractQuoted(q) {
  const out = []
  for (const m of q.matchAll(/«([^»]+)»/g)) out.push(m[1])
  return out
}

/** Collapse trivial variants for grouping */
function groupKey(en) {
  let s = normEn(en)
  // strip trailing …
  s = s.replace(/…/g, '').replace(/\.\.\./g, '').trim()
  return s
}

let all = []
for (const f of dataFiles) all = all.concat(parseEntries(readFileSync(f, 'utf8')))

/** Map: groupKey -> { displayEn, entries: [{id, level, questionRu, source}] } */
const byQuote = new Map()

function add(key, displayEn, entry, source) {
  if (!key || key.length < 2) return
  // skip pure Russian / too generic single tokens that aren't useful
  if (!/[a-z]/i.test(key)) return
  if (!byQuote.has(key)) {
    byQuote.set(key, { displayEn, members: [] })
  }
  const g = byQuote.get(key)
  if (!g.members.some((m) => m.id === entry.id)) {
    g.members.push({
      id: entry.id,
      level: entry.level,
      genre: entry.genre,
      idle: entry.idleEligible,
      popularity: entry.popularity,
      questionRu: entry.questionRu,
      source,
    })
  }
}

for (const e of all) {
  for (const q of extractQuoted(e.questionRu)) {
    add(groupKey(q), q, e, 'questionRu')
  }
  // also group by primary enNeedles (often cleaner than full quote lists)
  for (const n of e.enNeedles) {
    add(groupKey(n), n, e, 'enNeedle')
  }
}

/** Duplicate groups: 2+ distinct ids */
const dupes = [...byQuote.entries()]
  .map(([key, g]) => ({
    key,
    displayEn: g.displayEn,
    members: g.members.sort((a, b) => a.level.localeCompare(b.level) || a.id.localeCompare(b.id)),
    levels: [...new Set(g.members.map((m) => m.level))].sort(),
    count: g.members.length,
  }))
  .filter((g) => g.count >= 2)
  .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))

/** Prefer groups that look like real cross-level / same-phrase duplicates:
 * - same EN phrase appears in 2+ FAQ questionRu quotes (not only weak needles like "yes")
 * - or multi-word phrases
 */
function isNoise(g) {
  const k = g.key
  // single short tokens / ultra-generic
  if (/^(yes|no|i|me|a|an|the|to|in|on|at|of|for|and|or|is|are|was|were|do|does|did|have|has|had|be|am|it|he|she|we|they|you|x)$/i.test(k))
    return true
  if (k.length <= 3) return true
  // only needle-only membership without questionRu quote share — keep if multi-word
  const fromQ = g.members.filter((m) => {
    const quotes = extractQuoted(m.questionRu).map(groupKey)
    return quotes.some((q) => q === g.key || q.includes(g.key) || g.key.includes(q))
  })
  // If phrase is multi-word and 2+ ids, keep even if needle-only
  const words = k.split(/\s+/).filter(Boolean)
  if (words.length >= 2 && g.count >= 2) return false
  // single word but appears in 2+ questionRu quotes
  if (fromQ.length >= 2) return false
  // single word only via needles → noise
  if (words.length === 1) return true
  return fromQ.length < 2
}

const signal = dupes.filter((g) => !isNoise(g))
const noise = dupes.filter((g) => isNoise(g))

/** Cross-level groups (strongest F4 signal) */
const crossLevel = signal.filter((g) => g.levels.length >= 2)

/** Same-level multi-id */
const sameLevel = signal.filter((g) => g.levels.length === 1 && g.count >= 2)

const report = {
  catalog: all.length,
  rawDupeGroups: dupes.length,
  signalGroups: signal.length,
  crossLevel: crossLevel.length,
  sameLevel: sameLevel.length,
  noiseGroups: noise.length,
  groups: signal.map((g, i) => ({
    n: i + 1,
    en: g.displayEn,
    key: g.key,
    levels: g.levels.join('+'),
    count: g.count,
    crossLevel: g.levels.length >= 2,
    ids: g.members.map((m) => `${m.id} [${m.level}${m.idle ? ',idle' : ''}]`).join(' | '),
    chips: g.members.map((m) => ({ id: m.id, level: m.level, q: m.questionRu })),
  })),
}

writeFileSync('tmp-f4-dupes.json', JSON.stringify(report, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      catalog: report.catalog,
      rawDupeGroups: report.rawDupeGroups,
      signalGroups: report.signalGroups,
      crossLevel: report.crossLevel,
      sameLevel: report.sameLevel,
      noiseGroups: report.noiseGroups,
    },
    null,
    2
  )
)

// Print compact table for agent
for (const g of report.groups) {
  const mark = g.crossLevel ? 'CROSS' : 'same'
  console.log(`\n#${g.n} [${mark}] «${g.en}» (${g.levels}, n=${g.count})`)
  for (const c of g.chips) {
    console.log(`  - ${c.id}: ${c.q}`)
  }
}
