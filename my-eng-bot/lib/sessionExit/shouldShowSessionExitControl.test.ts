import { describe, expect, it } from 'vitest'
import {
  resolveSessionExitKind,
  shouldShowSessionExitControl,
} from '@/lib/sessionExit/shouldShowSessionExitControl'

const base = {
  menuOpen: false,
  isStructuredLessonActive: false,
  activeStructuredLessonStatus: null as string | null,
  isPracticeActive: false,
  practiceSessionStatus: null as string | null,
  practiceFlowState: null as string | null,
  translationChatActive: false,
  translationSessionStatus: null as string | null,
  dialogueChatActive: false,
  dialogueSessionStatus: null as string | null,
  communicationChatActive: false,
  communicationSessionStatus: null as string | null,
  isVocabularyHubActive: false,
  isAccentActive: false,
  isReferenceSheetActive: false,
  tutorMicroLocked: false,
}

describe('shouldShowSessionExitControl', () => {
  it('hides when menu is open', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        menuOpen: true,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
      })
    ).toBe(false)
  })

  it('shows for active structured lesson steps', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
      })
    ).toBe(true)
    expect(
      shouldShowSessionExitControl({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'checking',
      })
    ).toBe(true)
  })

  it('hides when lesson is completed / finale', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'completed',
      })
    ).toBe(false)
  })

  it('shows for practice active, correction, error', () => {
    for (const state of ['active', 'correction', 'error'] as const) {
      expect(
        shouldShowSessionExitControl({
          ...base,
          isPracticeActive: true,
          practiceSessionStatus: 'active',
          practiceFlowState: state,
        })
      ).toBe(true)
    }
  })

  it('hides for practice briefing, completed, idle', () => {
    for (const state of ['briefing', 'completed', 'idle'] as const) {
      expect(
        shouldShowSessionExitControl({
          ...base,
          isPracticeActive: true,
          practiceSessionStatus: 'active',
          practiceFlowState: state,
        })
      ).toBe(false)
    }
  })

  it('hides when practice session is not active', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        isPracticeActive: true,
        practiceSessionStatus: 'completed',
        practiceFlowState: 'active',
      })
    ).toBe(false)
  })

  it('shows for translation/dialogue/communication in_progress', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        translationChatActive: true,
        translationSessionStatus: 'in_progress',
      })
    ).toBe(true)
    expect(
      shouldShowSessionExitControl({
        ...base,
        dialogueChatActive: true,
        dialogueSessionStatus: 'in_progress',
      })
    ).toBe(true)
    expect(
      shouldShowSessionExitControl({
        ...base,
        communicationChatActive: true,
        communicationSessionStatus: 'in_progress',
      })
    ).toBe(true)
  })

  it('hides chat sessions when completed, not_started, or abandoned', () => {
    for (const status of ['completed', 'not_started', 'abandoned'] as const) {
      expect(
        shouldShowSessionExitControl({
          ...base,
          translationChatActive: true,
          translationSessionStatus: status,
        })
      ).toBe(false)
      expect(
        shouldShowSessionExitControl({
          ...base,
          dialogueChatActive: true,
          dialogueSessionStatus: status,
        })
      ).toBe(false)
      expect(
        shouldShowSessionExitControl({
          ...base,
          communicationChatActive: true,
          communicationSessionStatus: status,
        })
      ).toBe(false)
    }
  })

  it('hides chat mid-session when menu is open', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        menuOpen: true,
        translationChatActive: true,
        translationSessionStatus: 'in_progress',
      })
    ).toBe(false)
  })

  it('hides chat mid-session on vocabulary or accent overlays', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        translationChatActive: true,
        translationSessionStatus: 'in_progress',
        isVocabularyHubActive: true,
      })
    ).toBe(false)
    expect(
      shouldShowSessionExitControl({
        ...base,
        communicationChatActive: true,
        communicationSessionStatus: 'in_progress',
        isAccentActive: true,
      })
    ).toBe(false)
  })

  it('hides when chat is not active (call / inactive)', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        translationChatActive: false,
        translationSessionStatus: 'in_progress',
      })
    ).toBe(false)
  })

  it('hides all mid-cycle exits on reference sheet', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        translationChatActive: true,
        translationSessionStatus: 'in_progress',
        isReferenceSheetActive: true,
      })
    ).toBe(false)
    expect(
      shouldShowSessionExitControl({
        ...base,
        dialogueChatActive: true,
        dialogueSessionStatus: 'in_progress',
        isReferenceSheetActive: true,
      })
    ).toBe(false)
    expect(
      shouldShowSessionExitControl({
        ...base,
        communicationChatActive: true,
        communicationSessionStatus: 'in_progress',
        isReferenceSheetActive: true,
      })
    ).toBe(false)
    expect(
      shouldShowSessionExitControl({
        ...base,
        isPracticeActive: true,
        practiceSessionStatus: 'active',
        practiceFlowState: 'active',
        isReferenceSheetActive: true,
      })
    ).toBe(false)
    expect(
      shouldShowSessionExitControl({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
        isReferenceSheetActive: true,
      })
    ).toBe(false)
    expect(
      shouldShowSessionExitControl({
        ...base,
        tutorMicroLocked: true,
        isReferenceSheetActive: true,
      })
    ).toBe(false)
  })

  it('shows for tutor micro mid-cycle', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        tutorMicroLocked: true,
      })
    ).toBe(true)
  })

  it('hides tutor micro when menu is open', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        menuOpen: true,
        tutorMicroLocked: true,
      })
    ).toBe(false)
  })
})

describe('resolveSessionExitKind', () => {
  it('prefers lesson when both could apply', () => {
    expect(
      resolveSessionExitKind({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
        isPracticeActive: true,
        translationChatActive: true,
        translationSessionStatus: 'in_progress',
      })
    ).toBe('lesson')
  })

  it('returns practice when only practice is active', () => {
    expect(
      resolveSessionExitKind({
        ...base,
        isPracticeActive: true,
      })
    ).toBe('practice')
  })

  it('returns translation, dialogue, communication kinds', () => {
    expect(
      resolveSessionExitKind({
        ...base,
        translationChatActive: true,
        translationSessionStatus: 'in_progress',
      })
    ).toBe('translation')
    expect(
      resolveSessionExitKind({
        ...base,
        dialogueChatActive: true,
        dialogueSessionStatus: 'in_progress',
      })
    ).toBe('dialogue')
    expect(
      resolveSessionExitKind({
        ...base,
        communicationChatActive: true,
        communicationSessionStatus: 'in_progress',
      })
    ).toBe('communication')
  })

  it('returns null for completed chat or overlays', () => {
    expect(
      resolveSessionExitKind({
        ...base,
        translationChatActive: true,
        translationSessionStatus: 'completed',
      })
    ).toBe(null)
    expect(
      resolveSessionExitKind({
        ...base,
        dialogueChatActive: true,
        dialogueSessionStatus: 'in_progress',
        isVocabularyHubActive: true,
      })
    ).toBe(null)
  })

  it('returns null on reference even when lesson/chat mid would apply', () => {
    expect(
      resolveSessionExitKind({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
        isReferenceSheetActive: true,
      })
    ).toBe(null)
    expect(
      resolveSessionExitKind({
        ...base,
        translationChatActive: true,
        translationSessionStatus: 'in_progress',
        isReferenceSheetActive: true,
      })
    ).toBe(null)
    expect(
      resolveSessionExitKind({
        ...base,
        tutorMicroLocked: true,
        isReferenceSheetActive: true,
      })
    ).toBe(null)
  })

  it('returns tutor when micro locked and no higher priority mid-cycle', () => {
    expect(
      resolveSessionExitKind({
        ...base,
        tutorMicroLocked: true,
      })
    ).toBe('tutor')
  })

  it('prefers lesson over tutor when both could apply', () => {
    expect(
      resolveSessionExitKind({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
        tutorMicroLocked: true,
      })
    ).toBe('lesson')
  })
})
