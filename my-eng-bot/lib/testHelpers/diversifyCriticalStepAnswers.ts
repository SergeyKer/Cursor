import type { GeneratedStepPayload } from '@/lib/structuredLessonFactory'

function rewriteAnswerForNovelty(answer: string): string {
  const trimmed = answer.trim()
  if (/^It's\b/i.test(trimmed) || /^It is\b/i.test(trimmed)) {
    if (/\bnow[.!?]?$/i.test(trimmed)) {
      return trimmed.replace(/\bnow([.!?]?)$/i, 'today$1')
    }
    if (/[.!?]$/.test(trimmed)) {
      return trimmed.replace(/([.!?])$/, ' now$1')
    }
    return `${trimmed} now`
  }
  if (/^Who\b/i.test(trimmed) || /^I am\b/i.test(trimmed) || /^I'm\b/i.test(trimmed)) {
    const lexical = trimmed
      .replace(/\bAnna\b/g, 'Tom')
      .replace(/\bmusic\b/gi, 'jazz')
      .replace(/\btea\b/gi, 'coffee')
      .replace(/\bpizza\b/gi, 'pasta')
      .replace(/\bbrother\b/gi, 'sister')
      .replace(/\bdad\b/gi, 'mom')
    if (lexical !== trimmed) return lexical
    if (/\?\s*$/.test(trimmed)) return trimmed.replace(/\?\s*$/, ' now?')
    return `${trimmed} now`
  }
  if (/\?\s*$/.test(trimmed)) return trimmed.replace(/\?\s*$/, ' now?')
  if (/[.!]$/.test(trimmed)) return trimmed.replace(/([.!])$/, ' now$1')
  return `${trimmed} now`
}

function tokensFromAnswer(answer: string): string[] {
  return answer
    .replace(/[?!.]/g, '')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Makes translate/puzzle answers differ from a verbatim source copy while keeping grammar anchors. */
export function diversifyCriticalStepAnswers(steps: GeneratedStepPayload[]): GeneratedStepPayload[] {
  return steps.map((step) => {
    const bubbles = Array.isArray(step.bubbles)
      ? step.bubbles.map((bubble, index) => {
          if (typeof bubble?.content !== 'string') return bubble
          if (index === 2) {
            return { ...bubble, content: `${bubble.content} · новый сюжет` }
          }
          if (index === 1 && Number(step.stepNumber) <= 3) {
            return { ...bubble, content: `${bubble.content} Новая микро-ситуация.` }
          }
          return bubble
        })
      : step.bubbles

    if (!step.exercise) {
      return { ...step, bubbles }
    }

    const nextExercise = { ...step.exercise }
    if (typeof nextExercise.question === 'string') {
      nextExercise.question = `${nextExercise.question} (сюжет)`
    }
    if (Array.isArray(nextExercise.options) && Number(step.stepNumber) === 1) {
      const options = nextExercise.options.filter((item): item is string => typeof item === 'string')
      if (options.length === 3) {
        nextExercise.options = [options[0], options[2], options[1]]
      }
    }

    if (![4, 5, 6].includes(Number(step.stepNumber))) {
      return { ...step, bubbles, exercise: nextExercise }
    }

    const rewriteAccepted = (accepted: unknown): string[] | undefined => {
      if (!Array.isArray(accepted)) return undefined
      return accepted
        .filter((item): item is string => typeof item === 'string')
        .map((item) => rewriteAnswerForNovelty(item))
    }

    if (typeof nextExercise.correctAnswer === 'string') {
      nextExercise.correctAnswer = rewriteAnswerForNovelty(nextExercise.correctAnswer)
    }
    if (Array.isArray(nextExercise.acceptedAnswers)) {
      nextExercise.acceptedAnswers = rewriteAccepted(nextExercise.acceptedAnswers)
    }
    if (Array.isArray(nextExercise.variants)) {
      nextExercise.variants = nextExercise.variants.map((variant) => {
        const item = variant as {
          correctAnswer?: unknown
          acceptedAnswers?: unknown
          question?: unknown
        }
        const correctAnswer =
          typeof item.correctAnswer === 'string' ? rewriteAnswerForNovelty(item.correctAnswer) : item.correctAnswer
        return {
          ...item,
          correctAnswer,
          acceptedAnswers: rewriteAccepted(item.acceptedAnswers) ?? item.acceptedAnswers,
          question: typeof item.question === 'string' ? `${item.question} (сюжет)` : item.question,
        }
      })
    }
    if (Array.isArray(nextExercise.puzzleVariants)) {
      nextExercise.puzzleVariants = nextExercise.puzzleVariants.map((variant) => {
        const item = variant as {
          correctAnswer?: unknown
          words?: unknown
          correctOrder?: unknown
          title?: unknown
        }
        const correctAnswer =
          typeof item.correctAnswer === 'string' ? rewriteAnswerForNovelty(item.correctAnswer) : item.correctAnswer
        const tokens = typeof correctAnswer === 'string' ? tokensFromAnswer(correctAnswer) : null
        return {
          ...item,
          correctAnswer,
          ...(tokens
            ? {
                words: tokens,
                correctOrder: tokens,
              }
            : {}),
          title: typeof item.title === 'string' ? item.title.replace(/Пазл/, 'Сцена') : item.title,
        }
      })
    }

    return {
      ...step,
      bubbles,
      exercise: nextExercise,
    }
  })
}
