import type { ProgressLaunchTarget } from '@/lib/progress/progressActions'
import { getReferenceLessonTopics } from '@/lib/reference/getReferenceLessonTopics'
import {
  myPlanQuickActionLabel,
  type MyPlanAudience,
  type MyPlanQuickActionId,
} from '@/lib/uiCopy/myPlan'

export type MyPlanModeDoorFlags = {
  engvoVoiceV1: boolean
  practiceEngineV1: boolean
  tutorChatV1: boolean
  accentTrainerV1: boolean
  referenceV1: boolean
}

export type MyPlanModeDoor = {
  id: MyPlanQuickActionId
  label: string
  target: ProgressLaunchTarget
}

function door(
  id: MyPlanQuickActionId,
  audience: MyPlanAudience,
  target: ProgressLaunchTarget
): MyPlanModeDoor {
  return { id, label: myPlanQuickActionLabel(id, audience), target }
}

/**
 * Слот 6: те же флаги, что полоса Прогресса, без «Урок».
 * Справка — только если referenceV1 и в каталоге есть тема.
 */
export function buildMyPlanModeDoors(
  flags: MyPlanModeDoorFlags,
  audience: MyPlanAudience = 'adult'
): MyPlanModeDoor[] {
  const rows: MyPlanModeDoor[] = [door('communication', audience, { kind: 'communication' })]

  if (flags.engvoVoiceV1) {
    rows.push(door('engvo', audience, { kind: 'engvo' }))
  }

  if (flags.practiceEngineV1) {
    rows.push(door('practice', audience, { kind: 'quick_practice' }))
  }

  rows.push(
    door('translation', audience, { kind: 'translation' }),
    door('dialogue', audience, { kind: 'dialogue' }),
    door('vocabulary', audience, { kind: 'vocabulary' })
  )

  if (flags.tutorChatV1) {
    rows.push(door('tutor', audience, { kind: 'tutor' }))
  }

  if (flags.accentTrainerV1) {
    rows.push(door('pronunciation', audience, { kind: 'pronunciation' }))
  }

  if (flags.referenceV1) {
    const first = getReferenceLessonTopics()[0]
    if (first) {
      rows.push(door('reference', audience, { kind: 'reference', lessonId: first.id }))
    }
  }

  return rows
}
