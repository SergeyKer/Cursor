'use client'

import { useState } from 'react'
import { formatIntroBlockBullets, resolveIntroChipLabel } from '@/lib/lessonIntroBlocks'
import { resolveIntroPanelToggle, type LessonIntroPanelKind } from '@/lib/lessonIntroBlockPanelState'
import type { LessonIntroBlock } from '@/types/lesson'

const introPanelEnterCompleted = new Set<LessonIntroPanelKind>()

const CHIP_BUTTON_CLASS =
  'chat-assistant-chip-button chat-action-button flex w-fit items-center justify-center gap-1.5 rounded-full border border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] px-2.5 py-0.5 text-xs text-[var(--chat-speaker-text)]'

type LessonIntroBlockControlsProps = {
  theory: LessonIntroBlock | null
  how: LessonIntroBlock | null
  openPanel: LessonIntroPanelKind | null
  onOpenPanelChange: (panel: LessonIntroPanelKind | null) => void
  /** Внутри пузыря шага - без внешнего отступа под composer. */
  embedded?: boolean
  chipsVisible?: boolean
  chipsUseEnterAnimation?: boolean
  prefersReducedMotion?: boolean
}

type LessonIntroBlockControlsSlotProps = Omit<
  LessonIntroBlockControlsProps,
  'openPanel' | 'onOpenPanelChange'
> & {
  openPanel: LessonIntroPanelKind | null
  onOpenPanelChange: (panel: LessonIntroPanelKind | null) => void
}

/** Обёртка для единообразного API в ленте (current и history). */
export function LessonIntroBlockControlsSlot({
  openPanel,
  onOpenPanelChange,
  ...controlsProps
}: LessonIntroBlockControlsSlotProps) {
  return (
    <LessonIntroBlockControls
      {...controlsProps}
      openPanel={openPanel}
      onOpenPanelChange={onOpenPanelChange}
    />
  )
}

function IntroBlockPanel({ block, panelKind }: { block: LessonIntroBlock; panelKind: LessonIntroPanelKind }) {
  const skipEnter = introPanelEnterCompleted.has(panelKind)
  const [enterActive, setEnterActive] = useState(!skipEnter)

  return (
    <section
      className={`chat-section-surface glass-surface mt-2 block min-w-0 w-full max-w-full self-stretch rounded-xl border border-[var(--chat-section-slate-border)] bg-[var(--chat-section-slate)] px-3 py-2${
        enterActive ? ' lesson-text-soft-enter' : ''
      }`}
      role="note"
      onAnimationEnd={(event) => {
        if (event.animationName !== 'lessonTextSoftIn') return
        introPanelEnterCompleted.add(panelKind)
        setEnterActive(false)
      }}
    >
      <p className="whitespace-pre-wrap break-words font-sans text-[14px] leading-snug text-[var(--text)]">
        <span className="font-medium text-[var(--chat-label-slate)]">{block.label}:</span>{' '}
        {formatIntroBlockBullets(block)}
      </p>
    </section>
  )
}

export default function LessonIntroBlockControls({
  theory,
  how,
  openPanel,
  onOpenPanelChange,
  embedded = false,
  chipsVisible = true,
  chipsUseEnterAnimation = false,
}: LessonIntroBlockControlsProps) {
  const activeBlock = openPanel === 'theory' ? theory : openPanel === 'how' ? how : null

  if (!theory && !how) return null

  const chipEnterClass = chipsVisible && chipsUseEnterAnimation ? 'lesson-text-soft-enter' : ''
  const chipReserveClass = chipsVisible ? '' : 'invisible pointer-events-none'

  return (
    <div className={embedded ? undefined : 'mb-2'}>
      <div className="flex flex-wrap items-center gap-2">
        {theory ? (
          <button
            type="button"
            tabIndex={chipsVisible ? undefined : -1}
            onClick={() => {
              if (!chipsVisible) return
              const nextPanel = resolveIntroPanelToggle(openPanel, 'theory')
              if (nextPanel === null) introPanelEnterCompleted.delete('theory')
              onOpenPanelChange(nextPanel)
            }}
            className={`${CHIP_BUTTON_CLASS} ${chipReserveClass} ${chipEnterClass}`}
            title={resolveIntroChipLabel('theory', openPanel === 'theory')}
            aria-label={resolveIntroChipLabel('theory', openPanel === 'theory')}
            aria-expanded={chipsVisible ? openPanel === 'theory' : undefined}
            aria-hidden={!chipsVisible ? true : undefined}
          >
            {resolveIntroChipLabel('theory', chipsVisible && openPanel === 'theory')}
          </button>
        ) : null}
        {how ? (
          <button
            type="button"
            tabIndex={chipsVisible ? undefined : -1}
            onClick={() => {
              if (!chipsVisible) return
              const nextPanel = resolveIntroPanelToggle(openPanel, 'how')
              if (nextPanel === null) introPanelEnterCompleted.delete('how')
              onOpenPanelChange(nextPanel)
            }}
            className={`${CHIP_BUTTON_CLASS} ${chipReserveClass} ${chipEnterClass}`}
            title={resolveIntroChipLabel('how', openPanel === 'how')}
            aria-label={resolveIntroChipLabel('how', openPanel === 'how')}
            aria-expanded={chipsVisible ? openPanel === 'how' : undefined}
            aria-hidden={!chipsVisible ? true : undefined}
          >
            {resolveIntroChipLabel('how', chipsVisible && openPanel === 'how')}
          </button>
        ) : null}
      </div>
      {activeBlock ? (
        <IntroBlockPanel block={activeBlock} panelKind={openPanel === 'theory' ? 'theory' : 'how'} />
      ) : null}
    </div>
  )
}
