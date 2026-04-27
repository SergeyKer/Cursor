import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import type { OpenAiChatPreset, Audience } from '@/lib/types'
import type { BubbleType, Exercise, ExerciseType, LessonData, LessonStep } from '@/types/lesson'

type Body = {
  provider?: 'openrouter' | 'openai'
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  lesson?: LessonData
}

type RepeatStepResponse = {
  stepNumber?: unknown
  bubbles?: Array<{ type?: unknown; content?: unknown }>
  exercise?: {
    question?: unknown
    options?: unknown
    correctAnswer?: unknown
    hint?: unknown
  }
  footerDynamic?: unknown
}

function createRunKey(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneLessonWithNewRunKey(lesson: LessonData): LessonData {
  return {
    ...lesson,
    runKey: createRunKey(),
    steps: lesson.steps.map((step) => ({
      ...step,
      bubbles: step.bubbles.map((bubble) => ({ ...bubble })) as LessonStep['bubbles'],
      ...(step.exercise ? { exercise: { ...step.exercise } } : {}),
      ...(step.postLesson
        ? {
            postLesson: {
              ...step.postLesson,
              options: step.postLesson.options.map((option) => ({ ...option })),
              ...(step.postLesson.examples
                ? { examples: [...step.postLesson.examples] }
                : {}),
            },
          }
        : {}),
    })),
  }
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function isBubbleType(value: unknown): value is BubbleType {
  return value === 'positive' || value === 'info' || value === 'task'
}

function isExerciseType(value: unknown): value is ExerciseType {
  return value === 'fill_choice' || value === 'translate' || value === 'write_own' || value === 'match'
}

function isValidExerciseShape(source: Exercise, candidate: RepeatStepResponse['exercise']): candidate is Exercise {
  if (!candidate) return false
  if (typeof candidate.question !== 'string' || typeof candidate.correctAnswer !== 'string') return false
  if (candidate.hint !== undefined && typeof candidate.hint !== 'string') return false
  if (source.type === 'fill_choice') {
    if (!Array.isArray(candidate.options) || candidate.options.length !== 3) return false
    const options = candidate.options.filter((item): item is string => typeof item === 'string')
    if (options.length !== 3) return false
    return options.includes(candidate.correctAnswer)
  }
  if (candidate.options !== undefined && !Array.isArray(candidate.options)) return false
  return true
}

function validateRepeatSteps(sourceSteps: LessonStep[], candidateSteps: unknown): RepeatStepResponse[] | null {
  if (!Array.isArray(candidateSteps) || candidateSteps.length !== sourceSteps.length) return null
  const validated: RepeatStepResponse[] = []
  for (let index = 0; index < sourceSteps.length; index += 1) {
    const sourceStep = sourceSteps[index]
    const row = candidateSteps[index] as RepeatStepResponse
    if (typeof row !== 'object' || row === null) return null
    if (row.stepNumber !== sourceStep.stepNumber) return null
    if (!Array.isArray(row.bubbles) || row.bubbles.length !== 3) return null
    const validBubbles = row.bubbles.every(
      (bubble) => bubble && isBubbleType(bubble.type) && typeof bubble.content === 'string'
    )
    if (!validBubbles) return null
    if (sourceStep.exercise) {
      if (!isExerciseType(sourceStep.exercise.type) || !isValidExerciseShape(sourceStep.exercise, row.exercise)) return null
    } else if (row.exercise !== undefined) {
      return null
    }
    if (typeof row.footerDynamic !== 'string') return null
    validated.push(row)
  }
  return validated
}

function buildRepeatedLesson(sourceLesson: LessonData, generatedSteps: RepeatStepResponse[]): LessonData {
  const sourceRepeatableSteps = sourceLesson.steps.filter((step) => step.stepType !== 'completion')
  const completionStep = sourceLesson.steps.find((step) => step.stepType === 'completion')
  const repeatedSteps = sourceRepeatableSteps.map((sourceStep, index) => {
    const generated = generatedSteps[index]
    return {
      ...sourceStep,
      bubbles: generated.bubbles!.map((bubble) => ({
        type: bubble.type as BubbleType,
        content: bubble.content as string,
      })) as LessonStep['bubbles'],
      ...(sourceStep.exercise && generated.exercise
        ? {
            exercise: {
              ...sourceStep.exercise,
              question: generated.exercise.question as string,
              correctAnswer: generated.exercise.correctAnswer as string,
              ...(Array.isArray(generated.exercise.options)
                ? { options: generated.exercise.options as string[] }
                : {}),
              ...(typeof generated.exercise.hint === 'string' ? { hint: generated.exercise.hint } : {}),
            },
          }
        : {}),
      footerDynamic: generated.footerDynamic as string,
    }
  })

  return {
    ...sourceLesson,
    runKey: createRunKey(),
    steps: completionStep ? [...repeatedSteps, completionStep] : repeatedSteps,
  }
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const lesson = body.lesson
  if (!lesson || !lesson.repeatConfig) {
    return NextResponse.json({ error: 'Нет данных structured-урока для повтора.' }, { status: 400 })
  }

  const sourceRepeatableSteps = lesson.steps.filter((step) => step.stepType !== 'completion')
  if (!sourceRepeatableSteps.length) {
    return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
  }

  const provider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'

  const system = [
    'Ты методист MyEng и генерируешь новый повтор уже существующего structured-урока.',
    'Верни ТОЛЬКО JSON без пояснений.',
    'Сгенерируй только новые ситуации, примеры и формулировки.',
    'Нельзя менять правило, сложность, порядок шагов, stepNumber и тип упражнения.',
    'Не добавляй новую грамматику.',
    'Объяснения и подсказки на русском, правильные ответы на английском.',
    'Формат ответа:',
    '{',
    '  "steps": [',
    '    {',
    '      "stepNumber": 1,',
    '      "bubbles": [',
    '        {"type":"positive","content":"..."},',
    '        {"type":"info","content":"..."},',
    '        {"type":"task","content":"..."}',
    '      ],',
    '      "exercise": {',
    '        "question": "...",',
    '        "options": ["...", "...", "..."],',
    '        "correctAnswer": "...",',
    '        "hint": "..."',
    '      },',
    '      "footerDynamic": "..."',
    '    }',
    '  ]',
    '}',
  ].join('\n')

  const user = JSON.stringify(
    {
      topic: lesson.topic,
      level: lesson.level,
      audience: body.audience ?? 'adult',
      repeatMode: 'change_situations_only',
      ruleSummary: lesson.repeatConfig.ruleSummary,
      grammarFocus: lesson.repeatConfig.grammarFocus,
      sourceSituations: lesson.repeatConfig.sourceSituations,
      stepBlueprints: lesson.repeatConfig.stepBlueprints,
      sourceSteps: sourceRepeatableSteps.map((step) => ({
        stepNumber: step.stepNumber,
        stepType: step.stepType,
        bubbles: step.bubbles,
        exercise: step.exercise,
        footerDynamic: step.footerDynamic,
      })),
    },
    null,
    2
  )

  const model = await callProviderChat({
    provider,
    req,
    apiMessages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens: 1800,
    openAiChatPreset,
  })

  if (!model.ok) {
    return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
  }

  const json = extractJsonObject(model.content)
  if (!json) {
    return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
  }

  try {
    const parsed = JSON.parse(json) as { steps?: unknown }
    const validatedSteps = validateRepeatSteps(sourceRepeatableSteps, parsed.steps)
    if (!validatedSteps) {
      return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
    }
    return NextResponse.json({
      lesson: buildRepeatedLesson(lesson, validatedSteps),
      generated: true,
      fallback: false,
    })
  } catch {
    return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
  }
}
