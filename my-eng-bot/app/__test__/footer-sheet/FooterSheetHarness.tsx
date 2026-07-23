'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppFooter from '@/components/AppFooter'
import FooterDetailSheet, { type FooterDetailSheetHandle } from '@/components/FooterDetailSheet'
import { useAppColumnBounds } from '@/hooks/useAppColumnBounds'
import {
  buildFooterSheetContext,
  buildLanguageNoteFooterSheetContext,
  shouldCloseFooterSheetOnRowPress,
  type FooterSheetContext,
  type FooterSheetSource,
} from '@/lib/footerSheet'
import type { LanguageNote } from '@/lib/languageNote/types'
import type { Theme } from '@/lib/theme'

const THEMES: Theme[] = ['basic', 'bubble2', 'glass1']

const LONG_REASON =
  'Палец тянет текст вниз в середине контента — панель не должна ехать вместе со скроллом. '

function buildLongHarnessNote(): LanguageNote {
  const reasons = Array.from({ length: 12 }, (_, i) => `${LONG_REASON}Блок ${i + 1}.`)
  return {
    status: 'needs_fix',
    original: 'I watch final of the Football World Cup 2026.',
    correct: 'I watched the final of the Football World Cup 2026.',
    correctHighlights: ['watched', 'the'],
    correctReasons: reasons.slice(0, 3),
    better: 'I saw the World Cup final in 2026.',
    betterHighlights: ['saw'],
    betterReasons: [reasons[0]!],
    betterAlternatives: ['I caught the World Cup final in 2026.'],
    reviewTopics: [
      { id: 'past-simple', title: 'Past Simple' },
      { id: 'articles', title: 'Артикли' },
      { id: 'watch-see', title: 'watch vs see' },
    ],
    lessonId: null,
    lessonTitle: null,
  }
}

function isHarnessTheme(value: string | null): value is Theme {
  return value != null && (THEMES as string[]).includes(value)
}

export default function FooterSheetHarness() {
  const searchParams = useSearchParams()
  const themeParam = searchParams.get('theme')
  const sourceParam = searchParams.get('source')
  const openParam = searchParams.get('open')
  const longParam = searchParams.get('long')

  const theme = isHarnessTheme(themeParam) ? themeParam : 'bubble2'
  const source: FooterSheetSource = sourceParam === 'static' ? 'static' : 'dynamic'
  const initiallyOpen = openParam === '1'
  const longContent = longParam === '1'

  const appColumnRef = useRef<HTMLDivElement | null>(null)
  const footerSheetRef = useRef<FooterDetailSheetHandle>(null)
  const [footerSheetContext, setFooterSheetContext] = useState<FooterSheetContext | null>(() => {
    if (!initiallyOpen) return null
    if (longContent) {
      return buildLanguageNoteFooterSheetContext({
        status: 'ready',
        messageIndex: 0,
        originalText: 'I watch final of the Football World Cup 2026.',
        note: buildLongHarnessNote(),
      })
    }
    return buildFooterSheetContext({
      source,
      dynamicText: 'Подсказка урока',
      staticText: '⭐ 2008 · ⚡ 1',
      typingKey: 'harness-footer',
    })
  })
  const columnBounds = useAppColumnBounds(appColumnRef, {
    remeasureWhen: Boolean(footerSheetContext),
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.audience = 'adult'
  }, [theme])

  const handleFooterRowPress = useCallback(
    (nextSource: Exclude<FooterSheetSource, 'language-note' | 'call-review'>) => {
      if (shouldCloseFooterSheetOnRowPress(footerSheetContext, nextSource)) {
        footerSheetRef.current?.close()
        return
      }
      setFooterSheetContext(
        buildFooterSheetContext({
          source: nextSource,
          dynamicText: 'Подсказка урока',
          staticText: '⭐ 2008 · ⚡ 1',
          typingKey: 'harness-footer',
        })
      )
    },
    [footerSheetContext]
  )

  return (
    <div className="min-h-[100dvh] bg-[var(--chat-wallpaper)]">
      <header
        className="app-header-surface fixed left-0 right-0 top-0 z-[65] border-b border-[var(--app-header-border)]"
        style={{ paddingTop: 'var(--app-safe-top-inset)' }}
      >
        <div className="chat-shell-x flex min-h-[var(--app-header-row-height)] items-center px-4">
          <div ref={appColumnRef} className="relative mx-auto w-full max-w-[23.2rem]">
            <h1 className="text-base font-semibold text-[var(--app-header-text)]">Footer sheet harness</h1>
          </div>
        </div>
      </header>

      <main
        className="mx-auto max-w-[23.2rem] px-4"
        style={{
          paddingTop: 'calc(var(--app-top-offset) + 1rem)',
          paddingBottom: 'calc(var(--app-footer-chrome-height) + 1rem)',
        }}
      >
        <p className="text-sm text-[var(--text)]">
          Theme: {theme}. Source: {source}. Open: {initiallyOpen ? 'yes' : 'no'}. Long:{' '}
          {longContent ? 'yes' : 'no'}.
        </p>
      </main>

      <footer
        className="app-dialog-chrome-footer pointer-events-none fixed bottom-0 left-0 right-0 z-[55] flex flex-col overflow-visible"
        data-testid="footer-sheet-harness-footer"
      >
        <div className="app-footer-surface h-[var(--app-footer-row-height)] min-h-[var(--app-footer-row-height)] shrink-0 border-t border-[var(--app-footer-border)]">
          <AppFooter
            dynamicText="Подсказка урока"
            staticText="⭐ 2008 · ⚡ 1"
            typingKey="harness-footer"
            showWhenIdle
            instantDynamicText
            onFooterRowPress={handleFooterRowPress}
          />
        </div>
        <div
          className="shrink-0 bg-[var(--app-footer-bg)]"
          style={{ height: 'var(--app-footer-safe-inset)' }}
          aria-hidden
        />
      </footer>

      <FooterDetailSheet
        ref={footerSheetRef}
        context={footerSheetContext}
        columnBounds={columnBounds}
        onClose={() => setFooterSheetContext(null)}
      />
    </div>
  )
}
