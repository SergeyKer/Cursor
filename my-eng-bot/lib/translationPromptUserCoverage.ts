import { foldLatinHomoglyphsForEnglishMatch } from '@/lib/normalizeEnglishForRepeatMatch'
import { RU_TOPIC_KEYWORD_TO_EN, normalizeTopicToken } from '@/lib/ruTopicKeywordMap'
import { extractPromptKeywords } from '@/lib/translationRepeatClamp'
import {
  extractTranslationConceptIdsFromEnglish,
  extractTranslationConceptIdsFromPrompt,
} from '@/lib/translationPromptConcepts'

const TRANSLATION_PROMPT_KEYWORDS_EN = new Set(Object.values(RU_TOPIC_KEYWORD_TO_EN))

const TRANSLATION_EN_EQUIV: Record<string, string> = {
  holiday: 'vacation',
  holidays: 'vacation',
  vacations: 'vacation',
  travelling: 'travel',
  traveling: 'travel',
  traveled: 'travel',
  travelled: 'travel',
  travels: 'travel',
}

const RU_TRANSLATION_COVERAGE_STOPWORDS = new Set([
  'это',
  'все',
  'всё',
  'как',
  'что',
  'эта',
  'этот',
  'эти',
  'тот',
  'та',
  'те',
  'то',
  'для',
  'при',
  'над',
  'под',
  'про',
  'без',
  'на',
  'в',
  'во',
  'к',
  'ко',
  'от',
  'до',
  'по',
  'за',
  'из',
  'у',
  'о',
  'об',
  'с',
  'со',
  'и',
  'а',
  'но',
  'да',
  'нет',
  'ли',
  'же',
  'бы',
  'не',
  'ни',
  'когда',
  'где',
  'куда',
  'откуда',
  'почему',
  'зачем',
  'пока',
  'я',
  'ты',
  'он',
  'она',
  'оно',
  'мы',
  'вы',
  'они',
  'меня',
  'тебя',
  'его',
  'её',
  'нас',
  'вас',
  'их',
  'мне',
  'тебе',
  'ему',
  'ей',
  'нам',
  'вам',
  'им',
  'мой',
  'моя',
  'моё',
  'мои',
  'твой',
  'твоя',
  'твоё',
  'ваш',
  'ваша',
  'наш',
  'наша',
  'свой',
  'своя',
  'своё',
  'там',
  'тут',
  'тогда',
  'сейчас',
  'уже',
  'ещё',
  'еще',
  'очень',
  'тоже',
  'также',
  'будет',
  'быть',
  'есть',
  'был',
  'была',
  'были',
])

function tokenizeEnglishWords(text: string): string[] {
  return foldLatinHomoglyphsForEnglishMatch(text)
    .toLowerCase()
    .match(/[a-z']+/g)
    ?.map((token) => token.replace(/^'+|'+$/g, ''))
    .filter(Boolean) ?? []
}

export function extractSignificantRuTokensForTranslationCoverage(prompt: string): string[] {
  const tokens = prompt.toLowerCase().match(/[а-яё]+/gi) ?? []
  const out: string[] = []
  for (const raw of tokens) {
    const t = normalizeTopicToken(raw)
    if (t.length < 3) continue
    if (RU_TRANSLATION_COVERAGE_STOPWORDS.has(t)) continue
    out.push(t)
  }
  return out
}

export function isTranslationPromptKeywordCoverageInsufficient(
  prompt: string,
  promptKeywords: string[]
): boolean {
  const significant = extractSignificantRuTokensForTranslationCoverage(prompt)
  if (significant.length >= 2 && promptKeywords.length === 0) return true
  if (significant.length >= 3 && promptKeywords.length < 2) return true
  return false
}

export function extractTranslationAnswerKeywordsForPrompt(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const token of tokenizeEnglishWords(text)) {
    const canon = TRANSLATION_EN_EQUIV[token] ?? token
    if (!TRANSLATION_PROMPT_KEYWORDS_EN.has(canon)) continue
    if (seen.has(canon)) continue
    seen.add(canon)
    out.push(canon)
  }
  return out
}

function hasEnoughKeywordCoverage(promptKeywords: string[], userKeywords: string[]): boolean {
  if (promptKeywords.length === 0) return true
  if (userKeywords.length === 0) return false

  const overlapCount = promptKeywords.filter((keyword) => userKeywords.includes(keyword)).length
  const requiredMatches =
    promptKeywords.length === 1
      ? 1
      : Math.min(promptKeywords.length, Math.max(2, Math.ceil(promptKeywords.length * 0.85)))
  return overlapCount >= requiredMatches
}

/**
 * true = ответ пользователя по ключевым смыслам не покрывает русское задание (нужен повтор / ошибка).
 */
export function hasTranslationPromptUserKeywordMismatch(prompt: string, userText: string): boolean {
  const promptKeywords = extractPromptKeywords(prompt)
  if (isTranslationPromptKeywordCoverageInsufficient(prompt, promptKeywords)) return true
  const userKeywords = extractTranslationAnswerKeywordsForPrompt(userText)
  const keywordMismatch = promptKeywords.length > 0 ? !hasEnoughKeywordCoverage(promptKeywords, userKeywords) : false

  const promptConcepts = extractTranslationConceptIdsFromPrompt(prompt)
  const userConcepts = extractTranslationConceptIdsFromEnglish(userText)
  const conceptMismatch =
    promptConcepts.length > 0
      ? userConcepts.length === 0 || !promptConcepts.some((conceptId) => userConcepts.includes(conceptId))
      : false

  return keywordMismatch || conceptMismatch
}
