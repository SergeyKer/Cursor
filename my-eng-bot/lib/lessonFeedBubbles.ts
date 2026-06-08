import { getLessonSingleWordRuCue } from '@/lib/lessonSingleWordCue'
import type { LessonTimelineEntry } from '@/hooks/useLessonEngine'
import type { Bubble } from '@/types/lesson'

function normalizeTranslatePromptPunctuation(text: string): string {
  return text.replace(/(Переведите на английский:\s*"[^"\n]*")([.!?…]+)/g, '$1')
}

function injectRussianSingleWordCue(
  question: string,
  exercise: LessonTimelineEntry['step']['exercise']
): string {
  if (!exercise || exercise.answerFormat !== 'single_word') return question
  if (!/^Дополните одним словом:/i.test(question)) return question
  if (/^Дополните одним словом:\s*"[^"\n]+"\s*-\s*/i.test(question)) return question

  const ruHint = exercise.singleWordCueRu?.trim() || getLessonSingleWordRuCue(exercise.correctAnswer)
  if (!ruHint) return question

  const questionTailMatch = question.match(/^Дополните одним словом:\s*(.+)$/i)
  if (!questionTailMatch) return question
  return `Дополните одним словом: "${ruHint}" - ${questionTailMatch[1]}`
}

export function injectVariantQuestionIntoTaskBubble(
  bubbles: Bubble[],
  exercise: LessonTimelineEntry['step']['exercise']
): Bubble[] {
  if (!exercise?.variants || exercise.variants.length <= 1) return bubbles
  const question = normalizeTranslatePromptPunctuation(
    injectRussianSingleWordCue(exercise.question?.trim() ?? '', exercise)
  )
  if (!question) return bubbles

  let taskBubbleIndex = -1
  for (let index = bubbles.length - 1; index >= 0; index -= 1) {
    if (bubbles[index]?.type === 'task') {
      taskBubbleIndex = index
      break
    }
  }
  if (taskBubbleIndex === -1) return bubbles
  if (bubbles[taskBubbleIndex].content.trim() === question) return bubbles

  const nextBubbles = [...bubbles]
  nextBubbles[taskBubbleIndex] = {
    ...nextBubbles[taskBubbleIndex],
    content: question,
  }
  return nextBubbles
}
