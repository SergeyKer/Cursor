import { describe, expect, it } from 'vitest'
import {
  isTutorMicroChoiceFrozen,
  resolveTutorMicroChipsResetKey,
  shouldShowTutorMicroOptions,
} from '@/lib/tutor/tutorMicroChoicePanel'

describe('tutorMicroChoicePanel', () => {
  describe('shouldShowTutorMicroOptions', () => {
    it('shows options while active', () => {
      expect(shouldShowTutorMicroOptions('active', false)).toBe(true)
      expect(shouldShowTutorMicroOptions('active', true)).toBe(true)
    })

    it('shows options on answer revealing only when reveal is set', () => {
      expect(shouldShowTutorMicroOptions('revealing', true)).toBe(true)
      expect(shouldShowTutorMicroOptions('revealing', false)).toBe(false)
    })

    it('hides options on idle and finale', () => {
      expect(shouldShowTutorMicroOptions('idle', false)).toBe(false)
      expect(shouldShowTutorMicroOptions('idle', true)).toBe(false)
      expect(shouldShowTutorMicroOptions('finale', true)).toBe(false)
    })
  })

  describe('isTutorMicroChoiceFrozen', () => {
    it('freezes only answer revealing', () => {
      expect(isTutorMicroChoiceFrozen('revealing', true)).toBe(true)
      expect(isTutorMicroChoiceFrozen('revealing', false)).toBe(false)
      expect(isTutorMicroChoiceFrozen('active', true)).toBe(false)
      expect(isTutorMicroChoiceFrozen('finale', true)).toBe(false)
    })
  })

  describe('resolveTutorMicroChipsResetKey', () => {
    it('keeps the same key from active through answer revealing', () => {
      const activeKey = resolveTutorMicroChipsResetKey('active', 'q1', 0, false)
      const revealKey = resolveTutorMicroChipsResetKey('revealing', 'q1', 0, true)
      expect(activeKey).toBe('q1-0')
      expect(revealKey).toBe(activeKey)
    })

    it('has no key during opening revealing', () => {
      expect(resolveTutorMicroChipsResetKey('revealing', 'q1', 0, false)).toBeUndefined()
    })

    it('changes key for the next item', () => {
      expect(resolveTutorMicroChipsResetKey('active', 'q2', 1, false)).toBe('q2-1')
    })
  })
})
