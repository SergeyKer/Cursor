import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'

/** RU: семья и близкие люди (частые формы и склонения). */
const FAMILY_CLOSE_RU_RE =
  /мама|маму|мамы|маме|мамой|папа|папу|папы|матер|мать|отец|родител|брат|брата|сестр|сын|сына|дочь|дочк|ребёнк|ребенок|дети|детей|внук|внучк|бабушк|дедушк|жена|жену|жены|муж|мужа|мужу|жених|невест|парень|парня|девушк|подруг|(^|\s)друг(?=[\s,.;:!?]|$)|друзей|друга|семь|родствен|крестн|золовк|свёкор|свекор|тещ|тесть/i

/** EN в эталоне: семья / близкие. */
const FAMILY_CLOSE_EN_RE =
  /\b(my|your|her|his|our|their)\s+(mother|mom|mum|father|dad|parent|brother|sister|son|daughter|child|children|kids|wife|husband|boyfriend|girlfriend|spouse|family|grandmother|grandma|grandfather|grandpa|cousin)\b/i

export function isFamilyOrClosePeopleContext(ruPrompt: string, goldEnglish: string): boolean {
  const ru = ruPrompt.trim()
  const g = goldEnglish.trim()
  if (!ru && !g) return false
  if (ru && FAMILY_CLOSE_RU_RE.test(ru)) return true
  if (g && FAMILY_CLOSE_EN_RE.test(g)) return true
  return false
}

export function isPetLexicalContext(ruPrompt: string, goldEnglish: string): boolean {
  const ru = ruPrompt.trim()
  const g = goldEnglish.trim()
  if (ru && /собак|кошк|кот[а-яё]*|пёс|пес|щенк|щенят|котён|котен|питомц/i.test(ru)) return true
  if (g && /\b(my|your|her|his|our|their)\s+(dog|cat|puppy|kitten|pet)s?\b/i.test(g)) return true
  return false
}

/** Сильная привязанность к питомцу в одном русском задании (не нейтральное «есть собака»). */
export function isNarrowPetAffectionRu(ruPrompt: string): boolean {
  const ru = ruPrompt.trim()
  if (!ru) return false
  if (!/собак|кошк|кот[а-яё]*|пёс|пес|щенк|щенят|котён|котен|питомц/i.test(ru)) return false
  return /люблю|обожаю|очень\s+люблю|очень\s+нрав/i.test(ru)
}

/**
 * Разрешить подмену like/love между ответом и эталоном только в семье/близких
 * или при питомце и явной эмоции в RU.
 */
export function allowsLikeLoveEquivalence(ruPrompt: string, goldEnglish: string): boolean {
  if (isFamilyOrClosePeopleContext(ruPrompt, goldEnglish)) return true
  if (isPetLexicalContext(ruPrompt, goldEnglish) && isNarrowPetAffectionRu(ruPrompt)) return true
  return false
}

export function likeLoveUserCandidates(user: string): string[] {
  const seen = new Set<string>()
  const add = (s: string) => {
    const t = s.trim()
    if (t) seen.add(t)
  }
  add(user)
  if (/\blove\b/i.test(user)) add(user.replace(/\blove\b/gi, 'like'))
  if (/\blike\b/i.test(user)) add(user.replace(/\blike\b/gi, 'love'))
  return [...seen]
}

export function answersMatchAllowingLikeLove(
  userText: string,
  referenceEnglish: string,
  ruPrompt: string
): boolean {
  const ref = referenceEnglish.trim()
  const ru = ruPrompt.trim()
  if (!ref || !ru) return false
  if (!allowsLikeLoveEquivalence(ru, ref)) return false
  const r = normalizeEnglishForLearnerAnswerMatch(ref, 'translation')
  if (!r) return false
  for (const cand of likeLoveUserCandidates(userText.trim())) {
    if (normalizeEnglishForLearnerAnswerMatch(cand, 'translation') === r) return true
  }
  return false
}
