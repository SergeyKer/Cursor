/**
 * Сводит к одному виду пары вроде «I like cooking» / «I like to cook» для глаголов отношения:
 * like, hate, don't like, don't mind (после базовой нормализации — lower case, одиночные пробелы).
 */

const ATTITUDE_PATTERN = String.raw`don't like|don't mind|like|hate`

/** Частые герундии в учебных фразах → инфинитив без to. */
const GERUND_TO_BASE: Readonly<Record<string, string>> = {
  cooking: 'cook',
  baking: 'bake',
  making: 'make',
  reading: 'read',
  writing: 'write',
  waiting: 'wait',
  going: 'go',
  coming: 'come',
  swimming: 'swim',
  running: 'run',
  trying: 'try',
  doing: 'do',
  watching: 'watch',
  listening: 'listen',
  speaking: 'speak',
  learning: 'learn',
  working: 'work',
  sleeping: 'sleep',
  eating: 'eat',
  drinking: 'drink',
  staying: 'stay',
  leaving: 'leave',
  waking: 'wake',
  lying: 'lie',
  dying: 'die',
  sitting: 'sit',
  standing: 'stand',
  playing: 'play',
  studying: 'study',
  living: 'live',
  driving: 'drive',
  shopping: 'shop',
  traveling: 'travel',
  travelling: 'travel',
  walking: 'walk',
  talking: 'talk',
  singing: 'sing',
  dancing: 'dance',
  painting: 'paint',
  drawing: 'draw',
  cleaning: 'clean',
  washing: 'wash',
  opening: 'open',
  closing: 'close',
  starting: 'start',
  stopping: 'stop',
  helping: 'help',
  looking: 'look',
  feeling: 'feel',
  thinking: 'think',
  knowing: 'know',
  seeing: 'see',
  hearing: 'hear',
  saying: 'say',
  telling: 'tell',
  asking: 'ask',
  answering: 'answer',
  meeting: 'meet',
  visiting: 'visit',
  fixing: 'fix',
  jumping: 'jump',
  fishing: 'fish',
  hiking: 'hike',
  skiing: 'ski',
  flying: 'fly',
  crying: 'cry',
  smiling: 'smile',
  laughing: 'laugh',
  fighting: 'fight',
  planning: 'plan',
  paying: 'pay',
  buying: 'buy',
  selling: 'sell',
  sending: 'send',
  spending: 'spend',
  winning: 'win',
  losing: 'lose',
  choosing: 'choose',
  rising: 'rise',
  panicking: 'panic',
  beginning: 'begin',
}

const VBI_MARK = '__vbi__'

function gerundToVerbBase(gerund: string): string | null {
  const g = gerund.toLowerCase()
  if (!g.endsWith('ing') || g.length < 4) return null
  if (GERUND_TO_BASE[g]) return GERUND_TO_BASE[g]
  let stem = g.slice(0, -3)
  if (!stem) return null
  if (stem.length >= 2) {
    const last = stem[stem.length - 1]!
    const prev = stem[stem.length - 2]!
    if (last === prev && /[bcdfghjklmnpqrstvwxz]/i.test(last)) {
      stem = stem.slice(0, -1)
    }
  }
  if (stem.length < 2) return null
  return stem
}

function markAttitudeInfinitive(att: string, verb: string): string {
  return `${att.toLowerCase()} ${VBI_MARK}${verb.toLowerCase()}${VBI_MARK}`
}

/**
 * Нормализует строку уже после `normalizeEnglishForRepeatMatch`.
 */
export function normalizeAttitudeVerbGerundOrInfinitive(normalizedLower: string): string {
  if (!normalizedLower) return normalizedLower
  let s = normalizedLower
  const reTo = new RegExp(String.raw`\b(${ATTITUDE_PATTERN})\s+to\s+([a-z']+)\b`, 'gi')
  s = s.replace(reTo, (_, att: string, verb: string) => markAttitudeInfinitive(att, verb))
  const reGerund = new RegExp(String.raw`\b(${ATTITUDE_PATTERN})\s+([a-z']+ing)\b`, 'gi')
  s = s.replace(reGerund, (_, att: string, gr: string) => {
    const base = gerundToVerbBase(gr)
    if (!base) return `${att.toLowerCase()} ${gr.toLowerCase()}`
    return markAttitudeInfinitive(att, base)
  })
  return s
}
