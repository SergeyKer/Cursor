import { loadCustomWordPacks } from '@/lib/adaptiveRetention/customWordPackStorage'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { practiceStorage } from '@/lib/practice/storage/practiceStorage'
import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'
import { loadVocabularyProgress } from '@/lib/vocabulary/storage'
import { isWordDue } from '@/lib/vocabulary/srs'
import type { Settings } from '@/lib/types'
import type { LearnerSnapshot, WeakSpot } from '@/types/adaptiveRetention'
import type { VocabularyWorldId } from '@/types/vocabulary'

const DAY_MS = 24 * 60 * 60 * 1000
const STALE_FOCUS_MS = 48 * 60 * 60 * 1000

function daysSince(timestamp: number | null, now: number): number | null {
  if (!timestamp) return null
  return Math.max(0, Math.floor((now - timestamp) / DAY_MS))
}

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function latest(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return filtered.length > 0 ? Math.max(...filtered) : null
}

function buildVocabularyWeakSpots(
  progress: ReturnType<typeof loadVocabularyProgress>,
  now: number = Date.now()
): WeakSpot[] {
  const mistakes = loadVocabMistakes()
  if (mistakes.length > 0) {
    const first = mistakes[0]
    return [
      {
        id: 'vocab-mistakes-inbox',
        label: `Закрепи ошибку: ${first.en}`,
        reason: `${mistakes.length} слов из ошибок ждут закрепления в переводе или звонке.`,
        severity: mistakes.length >= 5 ? 'high' : mistakes.length >= 2 ? 'medium' : 'low',
        actionHint: 'Закрепить ошибку в переводе.',
      },
    ]
  }

  const waitingBank = Object.values(progress.words).filter((word) => {
    if (word.feedStatus !== 'in_feed') return false
    if (!word.lastFocusUsedAt) return true
    return now - word.lastFocusUsedAt > STALE_FOCUS_MS
  })
  if (waitingBank.length > 0) {
    const n = waitingBank.length
    return [
      {
        id: 'vocab-bank-waiting',
        label: `${n} слова ждут перевод`,
        reason: 'Слова давно не использовались как фокус в переводе.',
        severity: n >= 8 ? 'high' : n >= 3 ? 'medium' : 'low',
        actionHint: 'Открыть слова, которые ждут речи, и закрепить в переводе.',
      },
    ]
  }

  const weakWords = Object.values(progress.words).filter((word) => word.failures > 0 && word.failures >= word.successes)
  if (weakWords.length === 0) return []
  return [
    {
      id: 'vocab-errors',
      label: 'Слова с ошибками',
      reason: `${weakWords.length} слов чаще забываются или отвечаются неверно.`,
      severity: weakWords.length >= 8 ? 'high' : weakWords.length >= 3 ? 'medium' : 'low',
      actionHint: 'Коротко повторить слабые слова.',
    },
  ]
}

export function buildLearnerSnapshot(settings: Settings, now: number = Date.now()): LearnerSnapshot {
  const vocabularyProgress = loadVocabularyProgress()
  const completedPractice = practiceStorage.listCompletedSessions()
  const lessonProgressMap = loadLessonProgressMap()
  const customPacks = loadCustomWordPacks()

  const vocabularyWords = Object.values(vocabularyProgress.words)
  const dueWordCount = vocabularyWords.filter((word) => isWordDue(word, now)).length
  const learnedWordCount = vocabularyWords.filter((word) => word.successes > 0).length
  const weakWordCount = vocabularyWords.filter((word) => word.failures > 0 && word.failures >= word.successes).length
  const latestVocabAt = latest(vocabularyProgress.history.map((item) => item.completedAt))
  const latestPracticeAt = latest(completedPractice.map((item) => item.completedAt ?? item.startedAt))
  const lessonProgress = Object.values(lessonProgressMap)
  const latestLessonAt = latest(lessonProgress.map((item) => toTimestamp(item.lastCompleted)))
  const lastActiveAt = latest([latestVocabAt, latestPracticeAt, latestLessonAt, customPacks[0]?.updatedAt])
  const weakPracticeAnswers = completedPractice.flatMap((session) => session.answers).filter((answer) => !answer.isCorrect).length
  const weakSpots = [
    ...buildVocabularyWeakSpots(vocabularyProgress, now),
    ...(weakPracticeAnswers > 0
      ? [
          {
            id: 'practice-errors',
            label: 'Ошибки в практике',
            reason: `${weakPracticeAnswers} ответов в практике требуют закрепления.`,
            severity: weakPracticeAnswers >= 8 ? 'high' : weakPracticeAnswers >= 3 ? 'medium' : 'low',
            actionHint: 'Закрепить ошибку другим форматом.',
          } as WeakSpot,
        ]
      : []),
  ]

  return {
    generatedAt: now,
    audience: settings.audience,
    segment: settings.audience === 'child' ? 'child' : 'adult',
    level: settings.level,
    daysSinceLastActive: daysSince(lastActiveAt, now),
    hasAnyHistory:
      vocabularyProgress.stats.completedSessions > 0 ||
      completedPractice.length > 0 ||
      lessonProgress.length > 0 ||
      customPacks.length > 0,
    vocabulary: {
      coins: vocabularyProgress.stats.coins,
      streak: vocabularyProgress.stats.streak,
      completedSessions: vocabularyProgress.stats.completedSessions,
      unlockedWorldIds: vocabularyProgress.stats.unlockedWorldIds as VocabularyWorldId[],
      dueWordCount,
      learnedWordCount,
      weakWordCount,
    },
    practice: {
      completedSessions: completedPractice.length,
      lastCompletedAt: latestPracticeAt,
      weakAnswerCount: weakPracticeAnswers,
    },
    lessons: {
      completedLessons: lessonProgress.length,
      lastCompletedAt: latestLessonAt,
    },
    customPacks: {
      total: customPacks.length,
      latestPackId: customPacks[0]?.id ?? null,
      latestPackTitle: customPacks[0]?.title ?? null,
    },
    weakSpots,
  }
}
