'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppIconFrame } from '@/components/AppIconFrame'
import MedalBadge from '@/components/MedalBadge'
import { QuickTestNotice } from '@/components/quickTest/QuickTestNotice'
import type { AppColumnBounds } from '@/hooks/useAppColumnBounds'
import { resolveAppPanelHorizontalStyle } from '@/lib/appPanelLayout'
import type { QuickTestFinaleAction } from '@/lib/quickTest/buildQuickTestFinaleActions'
import {
  QUICK_TEST_FINALE_GRID_CLASS,
  QUICK_TEST_FINALE_PRIMARY_CLASS,
  QUICK_TEST_FINALE_TERTIARY_CLASS,
} from '@/lib/quickTest/quickTestFinaleLayout'
import type { QuickTestFinalePresentation } from '@/lib/quickTest/resolveQuickTestFinalePresentation'
import {
  POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS,
  POST_LESSON_NEUTRAL_BUTTON_CLASS,
} from '@/lib/homeCtaStyles'
import { manropeHome } from '@/lib/manropeHome'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

const NOTE_LABEL_CLASS = `${manropeHome.className} text-[15px] font-bold uppercase tracking-[0.06em]`
const LOGO_SRC = '/engvo-logo-1024-plus5-eqletters.png'

type ShowcaseError = {
  questionId: string
  prompt: string
  explanationRu: string
}

type QuickTestFinaleSheetProps = {
  open: boolean
  columnBounds?: AppColumnBounds | null
  presentation: QuickTestFinalePresentation
  topicTitle: string
  correct: number
  total: number
  durationLabel: string
  insight: string | null
  showcaseErrors: ShowcaseError[]
  actions: {
    primary: QuickTestFinaleAction
    secondary: QuickTestFinaleAction[]
    tertiary: QuickTestFinaleAction
  }
  shareNotice: string | null
  onPrimary: () => void
  onSecondary: (action: QuickTestFinaleAction) => void
  onTertiary: () => void
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

function NoteSectionCard({
  marker,
  title,
  children,
}: {
  marker: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      className="chat-section-surface language-note-card language-note-card--shared relative block min-w-0 w-full max-w-full overflow-hidden rounded-xl border font-sans"
      role="note"
    >
      <p className={`${NOTE_LABEL_CLASS} text-[var(--language-note-card-label)]`}>
        <span aria-hidden>{marker}</span> {title}
      </p>
      <div className="language-note-card__body min-w-0 font-sans text-[15px] leading-[1.45] text-[var(--text)]">
        {children}
      </div>
    </section>
  )
}

function actionButtonClass(action: QuickTestFinaleAction): string {
  if (action.tone === 'primary') return POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS
  if (action.tone === 'secondary') return POST_LESSON_NEUTRAL_BUTTON_CLASS
  return QUICK_TEST_FINALE_TERTIARY_CLASS
}

export function QuickTestFinaleSheet({
  open,
  columnBounds = null,
  presentation,
  topicTitle,
  correct,
  total,
  durationLabel,
  insight,
  showcaseErrors,
  actions,
  shareNotice,
  onPrimary,
  onSecondary,
  onTertiary,
}: QuickTestFinaleSheetProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [visible, setVisible] = useState(open)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const panelHorizontalStyle = resolveAppPanelHorizontalStyle(columnBounds)

  useEffect(() => {
    if (open) setVisible(true)
    else if (prefersReducedMotion) setVisible(false)
  }, [open, prefersReducedMotion])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => primaryRef.current?.focus(), prefersReducedMotion ? 0 : 320)
    return () => window.clearTimeout(timer)
  }, [open, prefersReducedMotion])

  const panelClassName = useMemo(
    () =>
      [
        'footer-sheet-panel',
        'footer-sheet-panel--language-note',
        open ? 'footer-sheet-panel--open' : '',
      ]
        .filter(Boolean)
        .join(' '),
    [open]
  )

  if (!visible && !open) return null

  return (
    <>
      <div
        className={`footer-sheet-backdrop ${open ? 'footer-sheet-backdrop--open' : ''}`}
        aria-hidden
      />
      <div
        className={panelClassName}
        style={panelHorizontalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-test-finale-title"
      >
        <div className="footer-sheet__grab">
          <div className="footer-sheet__handle" aria-hidden />
          <div className="footer-sheet__head">
            <h2 id="quick-test-finale-title" className="footer-sheet__title">
              <span className="footer-sheet__title-row">
                <AppIconFrame
                  variant="header"
                  src={LOGO_SRC}
                  alt=""
                  className="footer-sheet__title-icon"
                  sizes="40px"
                />
                <span className="footer-sheet__title-text">{QUICK_TEST_COPY.finaleSheetTitle}</span>
              </span>
            </h2>
          </div>
        </div>

        <div className="footer-sheet__body footer-sheet__body--language-note flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-2 font-sans">
            <NoteSectionCard marker="📊" title={QUICK_TEST_COPY.finaleSectionResult}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[28px] font-semibold leading-none text-[var(--text)]">
                    {QUICK_TEST_COPY.finaleScore(correct, total)}
                  </p>
                  <p className="mt-2 text-[16px] font-medium leading-snug text-[var(--text)]">
                    {presentation.title}
                  </p>
                  <p className="mt-1 text-[14px] leading-snug text-[var(--text-muted)]">
                    {durationLabel} · {topicTitle}
                  </p>
                </div>
                {presentation.showMedalGhost ? (
                  <MedalBadge tier="gold" muted size="md" title="Призрак медали" />
                ) : null}
              </div>
            </NoteSectionCard>

            {presentation.showAnalysisCard ? (
              <NoteSectionCard marker="🔍" title={QUICK_TEST_COPY.finaleSectionAnalysis}>
                {presentation.emptyRunMessage ? (
                  <p className="text-[15px] leading-relaxed text-[var(--text)]">
                    {presentation.emptyRunMessage}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {insight ? (
                      <p className="text-[15px] leading-relaxed text-[var(--text)]">{insight}</p>
                    ) : null}
                    {showcaseErrors.length > 0 ? (
                      <ul className="space-y-2">
                        {showcaseErrors.map((item) => (
                          <li
                            key={item.questionId}
                            className="rounded-lg border border-[var(--border-subtle,rgba(0,0,0,0.1))] bg-white/35 px-3 py-2 text-[14px] leading-relaxed"
                          >
                            <div className="font-medium">{item.prompt}</div>
                            <div className="mt-1 opacity-80">{item.explanationRu}</div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </NoteSectionCard>
            ) : null}

            <NoteSectionCard marker="📖" title={QUICK_TEST_COPY.finaleSectionNext}>
              <div className="space-y-2">
                <div className="language-note-topic-chip w-fit max-w-full rounded-lg border px-2.5 py-1 font-sans text-[13px] leading-snug text-[var(--text)]">
                  {topicTitle}
                </div>
                <p className="text-[15px] leading-relaxed text-[var(--text)]">{presentation.valueLine}</p>
              </div>
            </NoteSectionCard>
          </div>

          <div className="shrink-0 space-y-2 border-t border-[var(--footer-sheet-divider)] bg-[var(--footer-sheet-bg)] px-3 pb-2 pt-3">
            <button
              ref={primaryRef}
              type="button"
              onClick={onPrimary}
              className={`${actionButtonClass(actions.primary)} ${QUICK_TEST_FINALE_PRIMARY_CLASS}`}
            >
              <span className="min-w-0 flex flex-col items-center leading-tight">
                <span>{actions.primary.label}</span>
                <span className="text-[9px] leading-tight text-white/90 sm:text-[10px]">
                  {presentation.primaryHint}
                </span>
              </span>
            </button>

            {actions.secondary.length > 0 ? (
              <div className={QUICK_TEST_FINALE_GRID_CLASS}>
                {actions.secondary.map((action) => (
                  <button
                    key={`${action.id}-${action.ctaPosition}`}
                    type="button"
                    onClick={() => onSecondary(action)}
                    className={`${actionButtonClass(action)} ${action.spanFull ? 'col-span-2' : ''}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}

            <button type="button" onClick={onTertiary} className={actionButtonClass(actions.tertiary)}>
              {actions.tertiary.label}
            </button>

            <QuickTestNotice message={shareNotice} />
          </div>
        </div>
      </div>
    </>
  )
}
