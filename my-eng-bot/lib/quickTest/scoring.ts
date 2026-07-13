import type { QuickTestAnswerRecord, QuickTestQuestion, QuickTestScoreBand } from '@/lib/quickTest/types'

export function scoreBandFromCorrect(correct: number, total = 5): QuickTestScoreBand {
  if (correct >= total) return 'perfect'
  if (correct >= 3) return 'strong'
  return 'start'
}

export function countCorrect(answers: QuickTestAnswerRecord[]): number {
  return answers.filter((a) => a.correct).length
}

export function pickPrimaryMistakeTag(answers: QuickTestAnswerRecord[]): string | null {
  const wrong = answers.filter((a) => !a.correct)
  if (wrong.length === 0) return null
  const counts = new Map<string, number>()
  for (const answer of wrong) {
    counts.set(answer.mistakeTag, (counts.get(answer.mistakeTag) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [tag, count] of counts) {
    if (count > bestCount) {
      best = tag
      bestCount = count
    }
  }
  return best
}

export function pickShowcaseErrors(
  answers: QuickTestAnswerRecord[],
  questions: QuickTestQuestion[],
  limit = 2
): Array<{ questionId: string; prompt: string; explanationRu: string; mistakeTag: string }> {
  const byId = new Map(questions.map((q) => [q.id, q]))
  const wrong = answers.filter((a) => !a.correct)
  const out: Array<{ questionId: string; prompt: string; explanationRu: string; mistakeTag: string }> = []
  for (const answer of wrong) {
    const question = byId.get(answer.questionId)
    if (!question) continue
    out.push({
      questionId: question.id,
      prompt: question.prompt,
      explanationRu: question.explanationRu,
      mistakeTag: answer.mistakeTag,
    })
    if (out.length >= limit) break
  }
  return out
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function durationBucket(ms: number): string {
  const sec = ms / 1000
  if (sec < 60) return 'under_1m'
  if (sec < 120) return '1_2m'
  if (sec < 180) return '2_3m'
  return 'over_3m'
}

const MISTAKE_INSIGHT_RU: Record<string, string> = {
  'who-extra-does': 'Ты знаешь форму, но в вопросах с Who добавляешь лишнее does.',
  'who-agreement': 'С Who в роли подлежащего нужен глагол в 3-м лице (likes, plays).',
  'who-double-mark': 'Не ставь две метки 3-го лица сразу (does + likes).',
  'be-agreement': 'С I нужна форма am: I am / I’m.',
  'missing-be': 'Без am/is/are фраза знакомства ломается.',
  'time-to-prep': 'После It’s time обычно идёт to + глагол.',
  'missing-to': 'Не пропускай to: It’s time to…',
  'time-ing': 'После It’s time to — базовая форма, не -ing.',
  'embedded-aux': 'Во вложенном вопросе порядок как в утверждении, без лишнего does.',
}

export function insightForMistakeTag(tag: string | null, band: QuickTestScoreBand): string | null {
  if (band === 'perfect') return null
  if (!tag) return null
  return MISTAKE_INSIGHT_RU[tag] ?? 'Разбери ошибку в уроке — там будет полный контекст.'
}
