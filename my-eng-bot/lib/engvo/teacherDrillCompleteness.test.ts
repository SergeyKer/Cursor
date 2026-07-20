import { describe, expect, it } from 'vitest'
import {
  hasRussianDrillPayload,
  hasTranslateInvite,
  isIncompleteTeacherAssistantTurn,
  looksLikeInterview,
  stripTranslateInvite,
} from '@/lib/engvo/teacherDrillCompleteness'

describe('teacherDrillCompleteness', () => {
  it('detects EN and RU translate invites including anti-cliche variants', () => {
    expect(hasTranslateInvite('Translate into English.')).toBe(true)
    expect(hasTranslateInvite('Your turn — in English.')).toBe(true)
    expect(hasTranslateInvite('Go ahead — English.')).toBe(true)
    expect(hasTranslateInvite('Переведи на английский.')).toBe(true)
    expect(hasTranslateInvite('Переведи.')).toBe(true)
    expect(hasTranslateInvite('Твоя очередь — на английском.')).toBe(true)
    expect(hasTranslateInvite("We'll stay on this topic.")).toBe(false)
  })

  it('strips invite so A2 Переведи-only has no drill payload', () => {
    expect(hasRussianDrillPayload('Переведи на английский.')).toBe(false)
    expect(stripTranslateInvite('Переведи на английский.')).toBe('')
  })

  it('keeps Russian drill when invite is present', () => {
    expect(hasRussianDrillPayload('Завтра мы едем на море. Переведи на английский.')).toBe(true)
    expect(hasRussianDrillPayload("We'll go to the sea tomorrow. Translate into English.")).toBe(false)
  })

  it('marks B1 confirm-only incomplete while awaiting first drill', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: "A trip to the sea — sounds good. We'll stay on this topic.",
      phase: 'drill',
      awaitingFirstDrill: true,
    })
    expect(r.incomplete).toBe(true)
    expect(r.reason).toBe('no_first_drill')
  })

  it('marks B1 translate-without-RU incomplete', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: "Here's the first sentence. Translate into English.",
      phase: 'drill',
      awaitingFirstDrill: true,
    })
    expect(r.incomplete).toBe(true)
    expect(r.reason).toBe('no_first_drill')
  })

  it('marks Your turn without RU incomplete after first drill', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: 'Natural. Your turn — in English.',
      phase: 'drill',
      awaitingFirstDrill: false,
    })
    expect(r.incomplete).toBe(true)
    expect(r.reason).toBe('invite_without_ru')
  })

  it('marks A2 Переведи-only incomplete', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: 'Переведи на английский.',
      phase: 'drill',
      awaitingFirstDrill: true,
    })
    expect(r.incomplete).toBe(true)
    expect(r.reason).toBe('no_first_drill')
  })

  it('marks A2 RU-confirm without invite incomplete while awaiting first drill', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: 'Хорошо, остаёмся на теме моря.',
      phase: 'drill',
      awaitingFirstDrill: true,
    })
    expect(r.incomplete).toBe(true)
    expect(r.reason).toBe('no_first_drill')
  })

  it('accepts complete RU + invite', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: 'Завтра мы едем на море. Переведи на английский.',
      phase: 'drill',
      awaitingFirstDrill: true,
    })
    expect(r.incomplete).toBe(false)
    expect(r.isCompleteDrill).toBe(true)
  })

  it('does not reclaim greeting / topic_choice phase', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: 'Hi — what would you like to talk about today?',
      phase: 'topic_choice',
      awaitingFirstDrill: false,
    })
    expect(r.incomplete).toBe(false)
  })

  it('does not reclaim ERROR with Say / You meant / Скажи', () => {
    expect(
      isIncompleteTeacherAssistantTurn({
        text: 'Close — so: sea — not: the sea. Say: "I go to the sea."',
        phase: 'drill',
        awaitingFirstDrill: false,
      }).incomplete
    ).toBe(false)
    expect(
      isIncompleteTeacherAssistantTurn({
        text: 'Close — You meant: "I go to the sea." Try that.',
        phase: 'drill',
        awaitingFirstDrill: false,
      }).incomplete
    ).toBe(false)
    expect(
      isIncompleteTeacherAssistantTurn({
        text: 'Почти. Скажи: I go to the sea.',
        phase: 'drill',
        awaitingFirstDrill: true,
      }).incomplete
    ).toBe(false)
  })

  it('skips empty text', () => {
    expect(
      isIncompleteTeacherAssistantTurn({
        text: '   ',
        phase: 'drill',
        awaitingFirstDrill: true,
      }).incomplete
    ).toBe(false)
  })

  it('accepts post-first-drill SUCCESS with RU + invite', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: 'Natural. Завтра пляж пустой. Translate into English.',
      phase: 'drill',
      awaitingFirstDrill: false,
    })
    expect(r.incomplete).toBe(false)
    expect(r.isCompleteDrill).toBe(true)
  })

  it('looksLikeInterview catches content interview, not short praise', () => {
    expect(looksLikeInterview('Where do you usually go?')).toBe(true)
    expect(looksLikeInterview('Tell me about your trips.')).toBe(true)
    expect(looksLikeInterview('Расскажите, куда вы ездите?')).toBe(true)
    expect(looksLikeInterview("Good — you've got it.")).toBe(false)
  })

  it('marks post-first-drill interview as missing_drill', () => {
    for (const text of [
      'Where do you usually go?',
      'Tell me about your trips.',
      'Расскажите, куда вы ездите?',
    ]) {
      const r = isIncompleteTeacherAssistantTurn({
        text,
        phase: 'drill',
        awaitingFirstDrill: false,
      })
      expect(r.incomplete).toBe(true)
      expect(r.reason).toBe('missing_drill')
    }
  })

  it('does not treat short warm close as missing_drill', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: "Good — you've got it.",
      phase: 'drill',
      awaitingFirstDrill: false,
    })
    expect(r.incomplete).toBe(false)
    expect(r.reason).toBeNull()
  })

  it('keeps awaiting-first-drill interview as no_first_drill', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text: 'Where do you usually go?',
      phase: 'drill',
      awaitingFirstDrill: true,
    })
    expect(r.incomplete).toBe(true)
    expect(r.reason).toBe('no_first_drill')
  })
})
