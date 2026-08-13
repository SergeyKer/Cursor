'use client'

import type { ReactNode } from 'react'

export const VOCAB_SPACE_HOST_CLASS =
  'vocab-space-host relative flex h-0 min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]'

export const VOCAB_SPACE_SCROLL_CLASS =
  'vocab-space-scroll chat-shell-x mx-auto min-h-0 w-full max-w-[29rem] flex-1 space-y-3 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] py-3'

const VOCAB_SPACE_SCROLL_PAD =
  'pb-[calc(var(--app-footer-chrome-height)+0.75rem)]'

type Props = {
  children: ReactNode
  footer?: ReactNode
}

/** One bounded scroller for vocab hub/list — avoids nested overflow freeze under dialog-scroll-shell. */
export default function VocabularySpaceScroll({ children, footer }: Props) {
  return (
    <div className={VOCAB_SPACE_HOST_CLASS}>
      <div className={`${VOCAB_SPACE_SCROLL_CLASS} ${footer ? 'pb-3' : VOCAB_SPACE_SCROLL_PAD}`}>{children}</div>
      {footer}
    </div>
  )
}
