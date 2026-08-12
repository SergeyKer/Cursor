import { describe, expect, it } from 'vitest'
import {
  buildCallReviewFooterSheetContext,
  buildFooterSheetContext,
  buildLanguageNoteFooterSheetContext,
  buildLessonHudFooterSheetContext,
  FOOTER_SHEET_PLACEHOLDER_TEXT,
  isLanguageNoteSkin,
  resolveFooterSheetTitle,
  shouldCloseFooterSheetOnRowPress,
} from '@/lib/footerSheet'
import type { CallReviewSession } from '@/lib/engvo/callReview/types'
import { buildLessonFooterSheetView } from '@/lib/lessonFooterSheet/buildView'
import { LESSON_FOOTER_SHEET_TITLE } from '@/lib/uiCopy/lessonFooterSheet'

describe('footerSheet', () => {
  it('resolveFooterSheetTitle returns labels per source', () => {
    expect(resolveFooterSheetTitle('dynamic')).toBe('Подсказка')
    expect(resolveFooterSheetTitle('static')).toBe('Статистика')
    expect(resolveFooterSheetTitle('language-note')).toBe('Подсказка')
    expect(resolveFooterSheetTitle('call-review')).toBe('Подсказка')
    expect(resolveFooterSheetTitle('lesson-hud')).toBe(LESSON_FOOTER_SHEET_TITLE)
  })

  it('isLanguageNoteSkin includes lesson-hud with note skins', () => {
    expect(isLanguageNoteSkin('language-note')).toBe(true)
    expect(isLanguageNoteSkin('call-review')).toBe(true)
    expect(isLanguageNoteSkin('lesson-hud')).toBe(true)
    expect(isLanguageNoteSkin('dynamic')).toBe(false)
    expect(isLanguageNoteSkin('static')).toBe(false)
  })

  it('buildFooterSheetContext maps footer fields for v2 and placeholder mode', () => {
    const context = buildFooterSheetContext({
      source: 'static',
      dynamicText: 'Урок завершен',
      staticText: '⭐ 2008 · ⚡ 1',
      typingKey: 'footer-key',
      tone: 'celebrate',
      emphasis: 'pulse',
      lessonTitle: 'Present Simple',
      segmentKinds: ['goal', 'xp', 'medal'],
    })

    expect(context).toEqual({
      source: 'static',
      title: 'Статистика',
      mode: 'placeholder',
      typingKey: 'footer-key',
      tone: 'celebrate',
      emphasis: 'pulse',
      dynamicText: 'Урок завершен',
      staticText: '⭐ 2008 · ⚡ 1',
      lessonTitle: 'Present Simple',
      segmentKinds: ['goal', 'xp', 'medal'],
    })
  })

  it('buildLessonHudFooterSheetContext builds smart view', () => {
    const view = buildLessonFooterSheetView({
      moment: 'intro',
      audience: 'adult',
      dynamicText: 'Сначала коротко разберём смысл темы.',
      staticText: 'Введение | 0/7 шагов',
    })
    const context = buildLessonHudFooterSheetContext(view)
    expect(context.source).toBe('lesson-hud')
    expect(context.mode).toBe('smart')
    expect(context.title).toBe(LESSON_FOOTER_SHEET_TITLE)
    expect(context.lessonHudView?.now.body).toContain('смысл')
    expect(context.lessonHudView?.status.body).toContain('Введение')
  })

  it('buildLanguageNoteFooterSheetContext builds smart loading/ready/error', () => {
    const loading = buildLanguageNoteFooterSheetContext({
      status: 'loading',
      messageIndex: 2,
      originalText: 'I like drive byke',
    })
    expect(loading.source).toBe('language-note')
    expect(loading.mode).toBe('smart')
    expect(loading.languageNoteStatus).toBe('loading')

    const ready = buildLanguageNoteFooterSheetContext({
      status: 'ready',
      messageIndex: 2,
      originalText: 'I like drive byke',
      note: {
        status: 'needs_fix',
        original: 'I like drive byke',
        correct: 'I like riding a bike.',
        correctHighlights: [],
        correctReasons: ['После like обычно нужен -ing: like riding.'],
        better: null,
        betterHighlights: [],
        betterReasons: [],
        betterAlternatives: [],
        reviewTopics: [],
        lessonId: null,
        lessonTitle: null,
      },
    })
    expect(ready.languageNoteStatus).toBe('ready')
    expect(ready.languageNote?.correct).toContain('riding')

    const error = buildLanguageNoteFooterSheetContext({
      status: 'error',
      messageIndex: 2,
      originalText: 'I like drive byke',
      error: 'Не удалось загрузить подсказку.',
    })
    expect(error.languageNoteStatus).toBe('error')
    expect(error.languageNoteError).toBe('Не удалось загрузить подсказку.')
  })

  it('exposes placeholder copy constant', () => {
    expect(FOOTER_SHEET_PLACEHOLDER_TEXT).toBe('В разработке')
  })

  it('shouldCloseFooterSheetOnRowPress toggles same source and always closes language-note', () => {
    const dynamic = buildFooterSheetContext({ source: 'dynamic' })
    const staticContext = buildFooterSheetContext({ source: 'static' })
    const languageNote = buildLanguageNoteFooterSheetContext({
      status: 'loading',
      messageIndex: 0,
      originalText: 'hello',
    })
    const callReviewSession: CallReviewSession = {
      kind: 'free_call',
      cards: [],
      topics: [],
      summaryLine: 'Что заметили · 0 мест',
    }
    const callReview = buildCallReviewFooterSheetContext(callReviewSession)
    const lessonHud = buildLessonHudFooterSheetContext(
      buildLessonFooterSheetView({ moment: 'intro', audience: 'adult' })
    )

    expect(shouldCloseFooterSheetOnRowPress(null, 'dynamic')).toBe(false)
    expect(shouldCloseFooterSheetOnRowPress(dynamic, 'dynamic')).toBe(true)
    expect(shouldCloseFooterSheetOnRowPress(dynamic, 'static')).toBe(false)
    expect(shouldCloseFooterSheetOnRowPress(staticContext, 'static')).toBe(true)
    expect(shouldCloseFooterSheetOnRowPress(languageNote, 'dynamic')).toBe(true)
    expect(shouldCloseFooterSheetOnRowPress(languageNote, 'static')).toBe(true)
    expect(shouldCloseFooterSheetOnRowPress(callReview, 'dynamic')).toBe(true)
    expect(shouldCloseFooterSheetOnRowPress(lessonHud, 'dynamic')).toBe(true)
    expect(shouldCloseFooterSheetOnRowPress(lessonHud, 'static')).toBe(true)
    expect(callReview.source).toBe('call-review')
    expect(callReview.callReviewStatus).toBe('ready')
  })
})
