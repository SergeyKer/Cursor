import { getLessonTopicById } from '@/lib/lessonCatalog'
import { resolveHowBlock, resolveTheoryBlock } from '@/lib/lessonIntroBlocks'
import type { ReferenceSheet } from '@/lib/reference/types'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { LessonData, LessonIntro } from '@/types/lesson'

function trimText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function normalizeBullets(items: string[] | undefined): string[] {
  if (!items?.length) return []
  return items.map((item) => item.trim()).filter(Boolean)
}

export function isIntroSuitableForReference(intro: LessonIntro | null | undefined): boolean {
  if (!intro) return false
  const hook = trimText(intro.quick.takeaway)
  const rule = resolveTheoryBlock(intro)?.bullets ?? []
  const formula = resolveHowBlock(intro)?.bullets ?? []
  const examples = intro.quick.examples?.filter((ex) => trimText(ex.en)) ?? []
  const hasHookOrRule = Boolean(hook) || rule.length > 0
  const hasFormulaOrExamples = formula.length > 0 || examples.length > 0
  return hasHookOrRule && hasFormulaOrExamples
}

export function buildReferenceSheetFromLesson(lesson: LessonData | null | undefined): ReferenceSheet | null {
  if (!lesson?.intro || !isIntroSuitableForReference(lesson.intro)) return null

  const intro = lesson.intro
  const catalog = getLessonTopicById(lesson.id)
  const hook = trimText(intro.quick.takeaway) || null
  const rule = resolveTheoryBlock(intro)?.bullets ?? []
  const formula = resolveHowBlock(intro)?.bullets ?? []
  const traps = normalizeBullets(intro.deepDive?.commonMistakes)
  const examples = (intro.quick.examples ?? []).filter((ex) => trimText(ex.en))
  const title = trimText(intro.topic) || catalog?.title || trimText(lesson.topic) || `Урок ${lesson.id}`
  const teaser = hook || rule[0] || formula[0] || examples[0]?.en || title

  return {
    id: lesson.id,
    title,
    teaser,
    level: catalog?.level ?? null,
    hasPractice: Boolean(catalog?.hasPractice),
    hook,
    rule,
    formula,
    traps,
    examples,
    relatedLessonId: lesson.id,
  }
}

export function buildReferenceSheetByLessonId(lessonId: string): ReferenceSheet | null {
  const id = lessonId.trim()
  if (!id) return null
  return buildReferenceSheetFromLesson(getStructuredLessonById(id))
}

export function getReferenceTeaserForLessonId(lessonId: string): string | null {
  return buildReferenceSheetByLessonId(lessonId)?.teaser ?? null
}
