import type { BranchId } from '@/lib/start/branchRegistry'

export type ActiveBranchInput = {
  dialogStarted: boolean
  homeMenuView: string
  engvoVoiceMode: boolean
  isVocabularyHubActive: boolean
  isAccentActive: boolean
  isPracticeActive: boolean
  isStructuredLessonActive: boolean
  isLessonIntroActive: boolean
  isLessonTipsActive: boolean
  isLessonBriefingActive: boolean
  isTutorLessonPending: boolean
  isReferenceSheetActive?: boolean
  isProgressSpaceActive?: boolean
  isMyPlanSpaceActive?: boolean
}

export function resolveActiveBranch(input: ActiveBranchInput): BranchId | null {
  if (input.isVocabularyHubActive) return 'vocabulary'
  if (input.isAccentActive) return 'accent'
  if (input.isPracticeActive) return 'practice'
  if (input.engvoVoiceMode) return 'engvo'
  if (input.isProgressSpaceActive || input.isMyPlanSpaceActive) return 'hub'
  if (
    input.isStructuredLessonActive ||
    input.isLessonIntroActive ||
    input.isLessonTipsActive ||
    input.isLessonBriefingActive ||
    input.isTutorLessonPending ||
    input.isReferenceSheetActive
  ) {
    return 'lesson'
  }
  if (input.dialogStarted) return 'chat'
  if (!input.dialogStarted && input.homeMenuView !== 'root') return 'hub'
  return null
}
