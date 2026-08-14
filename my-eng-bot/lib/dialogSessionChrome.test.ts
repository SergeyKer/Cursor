import { describe, expect, it } from 'vitest'
import {
  DIALOG_SESSION_COLUMN_CLASS,
  DIALOG_SESSION_COLUMN_MAX_CLASS,
  DIALOG_SESSION_FEED_INNER_CLASS,
  DIALOG_SESSION_FRAME_CLASS,
  DIALOG_SESSION_GUTTER_CLASS,
  DIALOG_SESSION_READING_INNER_CLASS,
  usesDialogSessionColumn,
} from '@/lib/dialogSessionChrome'

describe('dialogSessionChrome', () => {
  it('keeps chat-shell-x on the gutter for useAppColumnBounds', () => {
    expect(DIALOG_SESSION_GUTTER_CLASS.split(/\s+/)).toContain('chat-shell-x')
    expect(DIALOG_SESSION_GUTTER_CLASS.split(/\s+/)).toContain('dialog-session-gutter')
  })

  it('does not use lg:chat-shell-x as the only shell class', () => {
    expect(DIALOG_SESSION_GUTTER_CLASS).not.toContain('lg:chat-shell-x')
  })

  it('caps working content at 29rem always', () => {
    expect(DIALOG_SESSION_COLUMN_MAX_CLASS).toBe('max-w-[29rem]')
  })

  it('keeps column class as inner content, not a flex shell', () => {
    expect(DIALOG_SESSION_COLUMN_CLASS).toContain('mx-auto')
    expect(DIALOG_SESSION_COLUMN_CLASS).toContain('max-w-[29rem]')
    expect(DIALOG_SESSION_COLUMN_CLASS).not.toContain('flex-1')
  })

  it('puts padding on feed/reading inner, not on the wallpaper frame', () => {
    expect(DIALOG_SESSION_FEED_INNER_CLASS).toContain('max-w-[29rem]')
    expect(DIALOG_SESSION_FEED_INNER_CLASS).toContain('p-2.5')
    expect(DIALOG_SESSION_READING_INNER_CLASS).toContain('max-w-[29rem]')
    expect(DIALOG_SESSION_READING_INNER_CLASS).toContain('px-3')
    expect(DIALOG_SESSION_FRAME_CLASS).not.toContain('max-w-[29rem]')
  })

  it('does not round the full-bleed wallpaper frame', () => {
    expect(DIALOG_SESSION_FRAME_CLASS).toContain('dialog-session-frame')
    expect(DIALOG_SESSION_FRAME_CLASS).not.toContain('rounded-[1.15rem]')
    expect(DIALOG_SESSION_FRAME_CLASS).not.toContain('lg:rounded-[1.15rem]')
  })

  it('uses dialog column for my plan and progress without dialogStarted', () => {
    expect(usesDialogSessionColumn({ dialogStarted: false, isMyPlanSpaceActive: true })).toBe(true)
    expect(usesDialogSessionColumn({ dialogStarted: false, isProgressSpaceActive: true })).toBe(true)
  })

  it('does not use dialog column for vocabulary worlds/pack/feed', () => {
    expect(
      usesDialogSessionColumn({
        dialogStarted: false,
        isVocabularyHubActive: true,
        vocabularyWorldsActive: true,
      })
    ).toBe(false)
    expect(
      usesDialogSessionColumn({
        dialogStarted: false,
        isVocabularyHubActive: true,
        vocabularyFeedActive: true,
      })
    ).toBe(false)
    expect(
      usesDialogSessionColumn({
        dialogStarted: false,
        isVocabularyHubActive: true,
        vocabularyPackId: 'pack-1',
      })
    ).toBe(false)
  })

  it('uses dialog column for vocab hub catalog', () => {
    expect(
      usesDialogSessionColumn({
        dialogStarted: false,
        isVocabularyHubActive: true,
      })
    ).toBe(true)
  })
})
