import type { StructuredLessonRunOrigin } from '@/lib/lessonAntiFarm'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'

const CYCLE1_LOCAL_HINT: Record<FooterCopyAudience, string> = {
  adult:
    'Урок уже начинали и вышли без золота.\nНа этом локальном проходе — максимум серебро.\nЗолото — в сгенерированном варианте урока.',
  child:
    'Урок уже начинали и вышли.\nСейчас локально — до серебра. Золото — в новом варианте от ИИ!',
}

const CYCLE1_GENERATE_HINT: Record<FooterCopyAudience, string> = {
  adult:
    'Урок уже начинали раньше.\nВ этом сгенерированном варианте золото снова возможно при отличном результате.',
  child: 'Урок уже начинали. В этом новом варианте снова можно получить золото!',
}

export function buildLessonCycle1Hint(params: {
  audience: FooterCopyAudience
  origin: StructuredLessonRunOrigin
}): string {
  if (params.origin === 'menu_generate') {
    return CYCLE1_GENERATE_HINT[params.audience]
  }
  return CYCLE1_LOCAL_HINT[params.audience]
}
