'use client'

import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import {
  DIALOG_SESSION_COLUMN_MAX_CLASS,
  DIALOG_SESSION_FRAME_CLASS,
  DIALOG_SESSION_GUTTER_CLASS,
  DIALOG_SESSION_READING_INNER_CLASS,
} from '@/lib/dialogSessionChrome'

type LessonReadingShellProps = {
  children: ReactNode
  composer?: ReactNode
  scrollRef?: Ref<HTMLDivElement>
  scrollClassName?: string
  composerClassName?: string
  composerStyle?: CSSProperties
  composerStackRef?: Ref<HTMLDivElement>
  /** When false, feed keeps color gradient but skips chat pattern PNG. Default true. */
  showChatWallpaper?: boolean
}

/**
 * Shared chrome for reading screens (intro / reference / briefing / tips).
 * Wallpaper full width; reading cards fill `max-w-[29rem]`.
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
      showChatWallpaper = true,
    },
    _ref
  ) {
    return (
      <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
        <div className={DIALOG_SESSION_GUTTER_CLASS}>
          <div className={DIALOG_SESSION_FRAME_CLASS}>
              <DialogGlassScrollHost showChatWallpaper={showChatWallpaper}>
                <div
                  ref={scrollRef}
                  className={scrollClassName.trim()}
                >
                  <div className={DIALOG_SESSION_READING_INNER_CLASS}>
                    {children}
                  </div>
                </div>
              </DialogGlassScrollHost>

              {composer != null ? (
              <DialogComposerStack
                ref={composerStackRef}
                className={composerClassName}
                style={composerStyle}
                contentMaxWidthClass={DIALOG_SESSION_COLUMN_MAX_CLASS}
              >
                <div className="w-full px-0 sm:px-0">{composer}</div>
              </DialogComposerStack>
              ) : null}
          </div>
        </div>
      </div>
    )
  }
)

export default LessonReadingShell
