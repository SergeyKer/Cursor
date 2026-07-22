import { describe, expect, it } from 'vitest'
import {
  applyTeacherMatchAttach,
  buildTeacherAcceptedNote,
  findLastUserMessageIndex,
  patchMessagesWithTeacherMatchAttach,
  resolveTeacherMatchAttach,
} from '@/lib/engvo/teacherMatch'
import type { ChatMessage } from '@/lib/types'
import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

describe('teacherMatch', () => {
  it('builds already_good local note without review topics', () => {
    const note = buildTeacherAcceptedNote('I am a teacher')
    expect(note.status).toBe('already_good')
    expect(note.original).toBe('I am a teacher')
    expect(note.correct).toBe('I am a teacher')
    expect(note.correctReasons).toEqual([LANGUAGE_NOTE_COPY.teacherAcceptedReason])
    expect(note.reviewTopics).toEqual([])
    expect(note.better).toBeNull()
  })

  it('resolves error attach from Скажи target', () => {
    const attach = resolveTeacherMatchAttach({
      userText: 'I teacher',
      assistantRawText: 'Почти. Скажи: I am a teacher.',
    })
    expect(attach).toEqual({ kind: 'error', expectedEnglish: 'I am a teacher.' })
  })

  it('resolves accepted attach when no correction marker', () => {
    const attach = resolveTeacherMatchAttach({
      userText: 'I am a teacher',
      assistantRawText: 'Отлично. Переведи: Я студент.',
    })
    expect(attach?.kind).toBe('accepted')
    if (attach?.kind === 'accepted') {
      expect(attach.note.correct).toBe('I am a teacher')
    }
  })

  it('skips non-latin user attempts', () => {
    expect(
      resolveTeacherMatchAttach({
        userText: 'работа',
        assistantRawText: 'Ок. Скажи: I work.',
      })
    ).toBeNull()
  })

  it('finds last user index and patches idempotently', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'I am a teacher' },
      { role: 'assistant', content: 'Good.' },
    ]
    expect(findLastUserMessageIndex(messages)).toBe(0)

    const attach = resolveTeacherMatchAttach({
      userText: 'I am a teacher',
      assistantRawText: 'Good. Next.',
    })
    const once = patchMessagesWithTeacherMatchAttach(messages, attach)
    const twice = patchMessagesWithTeacherMatchAttach(once, attach)
    expect(once[0]?.languageNote?.status).toBe('already_good')
    expect(twice[0]).toBe(once[0])
  })

  it('error attach clears stale languageNote and sets expectedEnglish', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'I teacher',
      languageNote: buildTeacherAcceptedNote('I teacher'),
    }
    const next = applyTeacherMatchAttach(message, {
      kind: 'error',
      expectedEnglish: 'I am a teacher',
    })
    expect(next.teacherExpectedEnglish).toBe('I am a teacher')
    expect(next.languageNote).toBeUndefined()
  })
})
