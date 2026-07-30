/**
 * One-shot importer: English_Grammar_QA_A1_to_B2_800.txt → lib/tutor/localFaq/data/*.ts
 * Run: node scripts/generateLocalFaq.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcPath = path.join(root, 'English_Grammar_QA_A1_to_B2_800.txt')
const outDir = path.join(root, 'lib', 'tutor', 'localFaq', 'data')

/** Sections fully dropped (exam/meta monsters). */
const DROP_SECTIONS = new Set([
  'inversion',
  'cleft_sentences_emphasis',
  'participle_clauses',
  'nominalisation',
  'subjunctive_formal_structures',
  'advanced_relative_clauses_reduced_forms',
  'future_perfect_future_perfect_continuous',
  'hedging_academic_tone',
  'cohesion_coherence',
  'exam_real_life_balance',
  'closing_reflections_b2',
  'emphasis_with_negative_restrictive_adverbs',
  'complex_sentences_information_structure',
  'nominal_clauses_complex_structures',
])

/** Soft phrasebook sections → genre phrase, rarely idle. */
const PHRASE_SECTIONS = new Set([
  'вежливость_и_устойчивые_фразы',
  'everyday_functional_language_a2',
  'everyday_situations_functional',
  'functional_discourse_markers_b1',
  'discourse_fluency_markers',
  'discourse_markers_register_b2',
  'pragmatics_politeness_understatement',
])

/** Curated aliases / idle / popularity overrides (seed + high-value). */
const OVERRIDES = {
  'a1.to_be.001': {
    aliases: ['i am busy а не i busy', 'почему i busy', 'зачем am is are'],
    popularity: 95,
    idleEligible: true,
  },
  'a1.to_be.002': {
    aliases: ['i am he is you are', 'формы to be'],
    popularity: 90,
    idleEligible: false,
  },
  'a1.to_be.008': {
    aliases: ['i have hungry', 'голод через be'],
    popularity: 92,
    idleEligible: true,
  },
  'a1.articles.016': {
    aliases: ['чем отличаются a и an', 'a или an', 'когда a когда an'],
    enNeedles: ['a university', 'an apple', 'a book'],
    popularity: 96,
    idleEligible: true,
  },
  'a1.mistakes.131': {
    aliases: ['i have 20 years', 'возраст через be'],
    enNeedles: ['i have 20 years', 'i am 20'],
    popularity: 97,
    idleEligible: true,
  },
  'a1.mistakes.135': {
    aliases: ['do you can', 'can без do'],
    enNeedles: ['do you can swim', 'can you swim'],
    popularity: 93,
    idleEligible: true,
  },
  'a1.have_got.093': {
    aliases: ['i have a car и ive got', 'have или have got', 'чем i have и ive got'],
    enNeedles: ['i have a car', "i've got a car", 'i have got a car'],
    popularity: 89,
    idleEligible: true,
  },
  'a1.prepositions.069': {
    aliases: ['in on at время', 'чем отличаются in on at'],
    enNeedles: ['on monday', 'in july', "at 5 o'clock"],
    popularity: 90,
    idleEligible: true,
  },
  'a2.present_perfect.015': {
    aliases: ['i have been to', 'been to опыт'],
    enNeedles: ['i have been to paris', "i've been to"],
    popularity: 94,
    idleEligible: true,
  },
  'a2.present_perfect.022': {
    aliases: ['for и since', 'чем for since'],
    enNeedles: ['for three years', 'since 2020'],
    popularity: 91,
    idleEligible: true,
  },
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 48)
}

function topicFromSection(sectionTitle) {
  const t = sectionTitle.toLowerCase()
  const map = [
    [/to be|am \/ is/, 'to_be'],
    [/артикл|articles/, 'articles'],
    [/present simple/, 'present_simple'],
    [/present continuous/, 'present_continuous'],
    [/past simple/, 'past_simple'],
    [/past continuous/, 'past_continuous'],
    [/present perfect continuous/, 'present_perfect_continuous'],
    [/present perfect/, 'present_perfect'],
    [/past perfect/, 'past_perfect'],
    [/future:|future forms|future time|will \/ going/, 'future'],
    [/comparativ|superlativ/, 'comparatives'],
    [/countable|quantifier/, 'quantifiers'],
    [/modal|can \/ can|have to, must|deduction|perfect modal/, 'modals'],
    [/gerund|infinit/, 'gerunds_infinitives'],
    [/conditional|wish|if only|hypothetical/, 'conditionals'],
    [/used to/, 'used_to'],
    [/too \/ enough/, 'too_enough'],
    [/relative/, 'relative_clauses'],
    [/connector|linking|discourse|fluency marker/, 'connectors'],
    [/something \/ anything/, 'indefinites'],
    [/passive|causative/, 'passive_causative'],
    [/so \/ neither|question tags|agreement/, 'agreement'],
    [/adverb|word order|questions/, 'word_order'],
    [/preposition/, 'prepositions'],
    [/mistake|ошибк|nuance|pitfall|avoiding/, 'mistakes'],
    [/have \/ have got|have got/, 'have_got'],
    [/there is/, 'there_is'],
    [/местоимен|притяжательн/, 'pronouns'],
    [/множественн/, 'plurals'],
    [/императив/, 'imperative'],
    [/прилагательн|adjective|description/, 'adjectives'],
    [/нареч|frequency|time expression/, 'adverbs_time'],
    [/вежливост|everyday|functional|politeness|pragmatic|understatement/, 'functional'],
    [/время, числа|time,|dates/, 'time_numbers'],
    [/phrasal/, 'phrasal_verbs'],
    [/reported speech/, 'reported_speech'],
    [/collocation|lexical/, 'collocations'],
    [/verb pattern|verb \+ object/, 'verb_patterns'],
    [/register|formality|style/, 'register'],
    [/ellipsis/, 'ellipsis'],
    [/emphasis|fronting/, 'emphasis'],
  ]
  for (const [re, key] of map) {
    if (re.test(t)) return key
  }
  return slugify(sectionTitle) || 'misc'
}

function microEdit(q) {
  let s = q.trim()
  s = s.replace(/^Почему мы говорим\s+/i, 'Почему ')
  s = s.replace(/^Почему в разговоре часто говорят\s+/i, 'Почему в речи ')
  s = s.replace(/^Почему в разговоре часто говорят/i, 'Почему в речи')
  return s
}

function extractEnNeedles(q) {
  const needles = []
  const re = /[«"]([^»"]{2,80})[»"]/g
  let m
  while ((m = re.exec(q))) {
    const frag = m[1].trim()
    if (/[A-Za-z]/.test(frag)) {
      needles.push(frag.toLowerCase().replace(/\s+/g, ' '))
    }
  }
  return [...new Set(needles)].slice(0, 6)
}

function autoAliases(q) {
  const aliases = []
  const stripped = q
    .replace(/^[Аа]\s+/, '')
    .replace(/^(Почему|Зачем|Когда|Можно ли|Чем|Как)\s+/i, '')
    .replace(/[?？]+$/, '')
    .trim()
  if (stripped && stripped.length >= 8 && stripped !== q.replace(/[?？]+$/, '').trim()) {
    aliases.push(stripped.toLowerCase())
  }
  const en = extractEnNeedles(q)
  if (en[0]) aliases.push(en[0])
  if (en[1] && /а не|или|vs|≠|\/|и «/.test(q.toLowerCase())) {
    aliases.push(`${en[0]} а не ${en[1]}`.slice(0, 60))
  }
  return [...new Set(aliases.map((a) => a.toLowerCase()))].slice(0, 4)
}

function detectGenre(q, sectionSlug) {
  if (PHRASE_SECTIONS.has(sectionSlug)) return 'phrase'
  const low = q.toLowerCase()
  if (/а не |или |vs\.? |≠|чем отлича|нельзя «/.test(low)) return 'contrast'
  return 'grammar'
}

function isMetaQuestion(q, num, level) {
  const low = q.toLowerCase()
  if (/почему на (уровне|a1|a2|b1|b2)/i.test(low)) return true
  if (/closing|рефлекс|экзамен|fce|cae|на этом уровне важно/i.test(low)) return true
  if (level === 'a1' && num === 200) return true
  if (level === 'a2' && (num === 199 || num === 200)) return true
  if (level === 'b1' && num >= 195 && /почему.*(b1|уровне)/i.test(low)) return true
  if (level === 'b2' && /почему.*(b2|уровне|экзамен)/i.test(low)) return true
  return false
}

function isPureEtiquette(q) {
  const low = q.toLowerCase()
  const pure = [
    'nice to meet you',
    'have a nice day',
    'merry christmas',
    'bless you',
    'take care',
    'how do you do',
    'see you later',
    'good luck',
    'happy birthday',
    'congratulations',
  ]
  return pure.some((p) => low.includes(p)) && !/а не |нельзя|почему нельзя|чем /.test(low)
}

function popularityScore(q, genre, topicKey) {
  let p = 55
  if (genre === 'contrast') p += 12
  if (/нельзя|ошиб|а не /.test(q.toLowerCase())) p += 10
  const boost = {
    articles: 15,
    to_be: 14,
    present_simple: 12,
    present_perfect: 14,
    have_got: 10,
    prepositions: 11,
    common_mistakes: 16,
    mistakes: 16,
    modals: 10,
    conditionals: 9,
    used_to: 10,
    gerunds_infinitives: 8,
  }
  p += boost[topicKey] ?? 0
  if (q.length > 110) p -= 8
  if (q.length > 140) p -= 10
  return Math.max(20, Math.min(99, p))
}

function idleEligibleFor(q, genre, popularity, topicKey) {
  if (genre === 'phrase') return false
  if (q.length > 95) return false
  if (popularity < 62) return false
  // Cap noise: very niche long contrasts stay match-only
  if (q.length > 80 && popularity < 75) return false
  return true
}

function parseSource(text) {
  const lines = text.split(/\r?\n/)
  let level = null
  let sectionTitle = ''
  let sectionSlug = ''
  /** @type {Array<{level:string,num:number,question:string,sectionTitle:string,sectionSlug:string}>} */
  const items = []

  for (const raw of lines) {
    const line = raw.trim()
    if (/^A1 —/.test(line)) {
      level = 'a1'
      continue
    }
    if (/^A2 —/.test(line)) {
      level = 'a2'
      continue
    }
    if (/^B1 —/.test(line)) {
      level = 'b1'
      continue
    }
    if (/^B2 —/.test(line)) {
      level = 'b2'
      continue
    }
    if (line.startsWith('### ')) {
      sectionTitle = line.slice(4).trim()
      sectionSlug = slugify(sectionTitle)
      continue
    }
    if (!level) continue
    const qm = line.match(/^(\d+)\.\s+(.+)$/)
    if (qm) {
      items.push({
        level,
        num: Number(qm[1]),
        question: qm[2].trim(),
        sectionTitle,
        sectionSlug,
      })
    }
  }
  return items
}

function buildEntry(item) {
  const { level, num, sectionTitle, sectionSlug } = item
  if (DROP_SECTIONS.has(sectionSlug)) return null
  if (level === 'b2') {
    // Tight gems only (~20–40): modals/pitfalls/pragmatics/collocations + a few patterns
    const keepB2 = new Set([
      'advanced_modals_perfect_modals',
      'common_b2_pitfalls',
      'pragmatics_politeness_understatement',
      'collocation_lexical_precision',
      'verb_patterns_subtle_differences',
      'advanced_passive_causative',
    ])
    if (!keepB2.has(sectionSlug)) return null
  }

  if (level === 'b1') {
    // Drop exam-ish / long marker packs; keep core nuance
    const dropB1 = new Set([
      'future_forms_b1',
      'discourse_fluency_markers',
      'functional_discourse_markers_b1',
      'discourse_fluency_markers',
      'advanced_basic_structures',
      'vocabulary_grammar_interfaces',
      'narrative_time_clauses',
      'passive_causative_extensions',
      'emphasis_fronting', // if present
    ])
    if (dropB1.has(sectionSlug)) return null
    if (/discourse|fluency_marker|academic/.test(sectionSlug)) return null
  }

  let questionRu = microEdit(item.question)
  if (isMetaQuestion(questionRu, num, level)) return null

  const topicKey = topicFromSection(sectionTitle)
  let genre = detectGenre(questionRu, sectionSlug)
  if (isPureEtiquette(questionRu)) genre = 'phrase'

  const topicSlug = topicKey
  const id = `${level}.${topicSlug}.${String(num).padStart(3, '0')}`

  let aliases = autoAliases(questionRu)
  let enNeedles = extractEnNeedles(questionRu)
  let popularity = popularityScore(questionRu, genre, topicKey)
  let idleEligible = idleEligibleFor(questionRu, genre, popularity, topicKey)

  const ov = OVERRIDES[id]
  if (ov) {
    if (ov.aliases) aliases = ov.aliases
    if (ov.enNeedles) enNeedles = ov.enNeedles
    if (typeof ov.popularity === 'number') popularity = ov.popularity
    if (typeof ov.idleEligible === 'boolean') idleEligible = ov.idleEligible
  }

  // Legacy seed ids used have.093 — also emit override key have_got
  const ovAlt = OVERRIDES[`${level}.have_got.${String(num).padStart(3, '0')}`]
  if (ovAlt && topicKey === 'have_got') {
    if (ovAlt.aliases) aliases = ovAlt.aliases
    if (typeof ovAlt.popularity === 'number') popularity = ovAlt.popularity
    if (typeof ovAlt.idleEligible === 'boolean') idleEligible = ovAlt.idleEligible
  }

  return {
    id,
    level,
    topicKey,
    genre,
    questionRu,
    aliases,
    enNeedles,
    popularity,
    idleEligible,
  }
}

function serializeFile(varName, entries, comment) {
  const body = entries
    .map((e) => {
      const aliases = JSON.stringify(e.aliases)
      const needles = JSON.stringify(e.enNeedles)
      const q = JSON.stringify(e.questionRu)
      return `  {
    id: ${JSON.stringify(e.id)},
    level: ${JSON.stringify(e.level)},
    topicKey: ${JSON.stringify(e.topicKey)},
    genre: ${JSON.stringify(e.genre)},
    questionRu: ${q},
    aliases: ${aliases},
    enNeedles: ${needles},
    popularity: ${e.popularity},
    idleEligible: ${e.idleEligible},
  }`
    })
    .join(',\n')

  return `import type { LocalFaqEntry } from '@/lib/tutor/localFaq/types'

/** ${comment} */
export const ${varName}: readonly LocalFaqEntry[] = [
${body},
]
`
}

function thinIdlePerTopic(entries, maxIdlePerTopic = 4) {
  const counts = new Map()
  return entries.map((e) => {
    if (!e.idleEligible) return e
    const n = counts.get(e.topicKey) ?? 0
    if (n >= maxIdlePerTopic) return { ...e, idleEligible: false }
    counts.set(e.topicKey, n + 1)
    return e
  })
}

function main() {
  const text = fs.readFileSync(srcPath, 'utf8')
  const raw = parseSource(text)
  const built = []
  const seenQ = new Set()

  for (const item of raw) {
    const entry = buildEntry(item)
    if (!entry) continue
    const key = `${entry.level}|${entry.questionRu.toLowerCase()}`
    if (seenQ.has(key)) continue
    seenQ.add(key)
    built.push(entry)
  }

  // Prefer shorter for idle first within topic
  built.sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level)
    if (a.topicKey !== b.topicKey) return a.topicKey.localeCompare(b.topicKey)
    return a.id.localeCompare(b.id)
  })

  const byLevel = { a1: [], a2: [], b1: [], b2: [] }
  for (const e of built) byLevel[e.level].push(e)

  for (const lvl of Object.keys(byLevel)) {
    byLevel[lvl] = thinIdlePerTopic(byLevel[lvl], lvl === 'b2' ? 3 : 4)
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(
    path.join(outDir, 'a1.ts'),
    serializeFile('LOCAL_FAQ_A1', byLevel.a1, `A1 FAQ pool (${byLevel.a1.length} items) — generated`)
  )
  fs.writeFileSync(
    path.join(outDir, 'a2.ts'),
    serializeFile('LOCAL_FAQ_A2', byLevel.a2, `A2 FAQ pool (${byLevel.a2.length} items) — generated`)
  )
  fs.writeFileSync(
    path.join(outDir, 'b1_nuance.ts'),
    serializeFile('LOCAL_FAQ_B1_NUANCE', byLevel.b1, `B1 nuance FAQ (${byLevel.b1.length} items) — generated`)
  )
  fs.writeFileSync(
    path.join(outDir, 'b2_gems.ts'),
    serializeFile('LOCAL_FAQ_B2_GEMS', byLevel.b2, `B2 gems FAQ (${byLevel.b2.length} items) — generated`)
  )

  const idle = built.filter((e) => e.idleEligible).length
  console.log(
    JSON.stringify(
      {
        total: built.length,
        a1: byLevel.a1.length,
        a2: byLevel.a2.length,
        b1: byLevel.b1.length,
        b2: byLevel.b2.length,
        idleEligible: idle,
      },
      null,
      2
    )
  )
}

main()
