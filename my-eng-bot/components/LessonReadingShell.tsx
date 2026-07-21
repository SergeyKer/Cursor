'use client'

import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import { READING_COLUMN_MAX_CLASS } from '@/lib/lessonReadingLayout'

type LessonReadingShellProps = {
  children: ReactNode
  composer: ReactNode
  scrollRef?: Ref<HTMLDivElement>
  scrollClassName?: string
  composerClassName?: string
  composerStyle?: CSSProperties
  composerStackRef?: Ref<HTMLDivElement>
}

/**
 * Shared chrome for reading screens (intro / reference / briefing / tips).
 * Keeps dialog-flex / glass / iOS composer chain; same column width as Chat (`29rem`).
 */
const LessonReadingShell = forwardRef<HTMLDivElement, LessonReadingShellProps>(
  function LessonReadingShell(
    {
      children,
      composer,
      scrollRef,
      scrollClassName = '',
      composerClassName = '',
      composerStyle,
      composerStackRef,
    },
    _ref
  ) {
    return (
      <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
        <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
          <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${READING_COLUMN_MAX_CLASS}`}>
            <div
              className="glass-surface flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
              style={{ boxShadow: 'var(--chat-shell-shadow)' }}
            >
              <DialogGlassScrollHost>
                <div
                  ref={scrollRef}
                  className={`px-3 sm:px-4 ${scrollClassName}`.trim()}
                >
                  {children}
                </div>
              </DialogGlassScrollHost>

              <DialogComposerStack
                ref={composerStackRef}
                className={composerClassName}
                style={composerStyle}
                contentMaxWidthClass={READING_COLUMN_MAX_CLASS}
              >
                <div className="w-full px-0 sm:px-0">{composer}</div>
              </DialogComposerStack>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

export default LessonReadingShell
