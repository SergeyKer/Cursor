import { describe, expect, it } from 'vitest'
import {
  ENGVO_TEACHER_HANDOFF_RECLAIM_MAX_ATTEMPTS,
  resolveTeacherDetectPhase,
  shouldAllowTeacherDrillReclaim,
  shouldAllowTeacherHandoffReclaim,
} from '@/lib/engvo/teacherHandoffReclaim'
import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'

describe('resolveTeacherDetectPhase', () => {
  it('forces drill when topic named and first drill pending', () => {
    expect(
      resolveTeacherDetectPhase({
        phase: 'topic_choice',
        userFinalCount: 1,
        awaitingFirstDrill: true,
      })
    ).toBe('drill')
  })

  it('keeps topic_choice before any user final', () => {
    expect(
      resolveTeacherDetectPhase({
        phase: 'topic_choice',
        userFinalCount: 0,
        awaitingFirstDrill: false,
      })
    ).toBe('topic_choice')
  })

  it('keeps drill after first drill completed', () => {
    expect(
      resolveTeacherDetectPhase({
        phase: 'drill',
        userFinalCount: 2,
        awaitingFirstDrill: false,
      })
    ).toBe('drill')
  })
})

describe('shouldAllowTeacherHandoffReclaim', () => {
  it('blocks greeting (no user final)', () => {
    expect(
      shouldAllowTeacherHandoffReclaim({
        userFinalCount: 0,
        awaitingFirstDrill: true,
        attemptsThisUserTurn: 0,
      })
    ).toBe(false)
  })

  it('allows up to max attempts while awaiting first drill', () => {
    expect(
      shouldAllowTeacherHandoffReclaim({
        userFinalCount: 1,
        awaitingFirstDrill: true,
        attemptsThisUserTurn: 0,
      })
    ).toBe(true)
    expect(
      shouldAllowTeacherHandoffReclaim({
        userFinalCount: 1,
        awaitingFirstDrill: true,
        attemptsThisUserTurn: 1,
      })
    ).toBe(true)
    expect(
      shouldAllowTeacherHandoffReclaim({
        userFinalCount: 1,
        awaitingFirstDrill: true,
        attemptsThisUserTurn: ENGVO_TEACHER_HANDOFF_RECLAIM_MAX_ATTEMPTS,
      })
    ).toBe(false)
  })
})

describe('shouldAllowTeacherDrillReclaim', () => {
  it('allows one invite_without_ru reclaim after first drill', () => {
    expect(
      shouldAllowTeacherDrillReclaim({
        userFinalCount: 2,
        awaitingFirstDrill: false,
        attemptsThisUserTurn: 0,
        usedThisUserTurn: false,
      })
    ).toBe(true)
    expect(
      shouldAllowTeacherDrillReclaim({
        userFinalCount: 2,
        awaitingFirstDrill: false,
        attemptsThisUserTurn: 0,
        usedThisUserTurn: true,
      })
    ).toBe(false)
  })
})

describe('handoff free-talk detect with forced drill phase', () => {
  it('marks bicycle free-talk incomplete when awaiting first drill', () => {
    const r = isIncompleteTeacherAssistantTurn({
      text:
        'Конечно! Велосипеды — отличная тема. Расскажи, пожалуйста: У тебя есть велосипед? Что тебе ближе?',
      phase: resolveTeacherDetectPhase({
        phase: 'topic_choice',
        userFinalCount: 1,
        awaitingFirstDrill: true,
      }),
      awaitingFirstDrill: true,
    })
    expect(r.incomplete).toBe(true)
    expect(r.reason).toBe('no_first_drill')
  })
})
