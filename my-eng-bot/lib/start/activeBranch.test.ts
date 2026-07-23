import { describe, expect, it } from 'vitest'
import { resolveActiveBranch } from '@/lib/start/activeBranch'

const base = {
  dialogStarted: false,
  homeMenuView: 'root',
  engvoVoiceMode: false,
  isVocabularyHubActive: false,
  isAccentActive: false,
  isPracticeActive: false,
  isStructuredLessonActive: false,
  isLessonIntroActive: false,
  isLessonTipsActive: false,
  isLessonBriefingActive: false,
  isTutorLessonPending: false,
  isReferenceSheetActive: false,
}

describe('resolveActiveBranch', () => {
  it('returns hub when home menu is open', () => {
    expect(resolveActiveBranch({ ...base, homeMenuView: 'lessons' })).toBe('hub')
  })

  it('returns chat when dialog started', () => {
    expect(resolveActiveBranch({ ...base, dialogStarted: true })).toBe('chat')
  })

  it('returns lesson for intro stage', () => {
    expect(resolveActiveBranch({ ...base, isLessonIntroActive: true })).toBe('lesson')
  })

  it('returns hub for progress space even when dialog started', () => {
    expect(
      resolveActiveBranch({
        ...base,
        dialogStarted: true,
        isProgressSpaceActive: true,
      })
    ).toBe('hub')
  })
})
