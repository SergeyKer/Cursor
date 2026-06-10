'use client'

import { forwardRef, useImperativeHandle, useRef, type CSSProperties, type ReactNode } from 'react'
import { CHAT_COMPOSER_STACK_CLASS } from '@/lib/chatComposerMetrics'
import { useDialogComposerStackHeight } from '@/hooks/useDialogComposerStackHeight'
import { useIosWebKitDialogActive } from '@/hooks/useIosWebKitDialogActive'

export const DIALOG_COMPOSER_DOCK_CLASS = 'dialog-composer-dock'

type DialogComposerStackProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  contentMaxWidthClass?: string
}

const DialogComposerStack = forwardRef<HTMLDivElement, DialogComposerStackProps>(
  function DialogComposerStack(
    { children, className = '', style, contentMaxWidthClass = 'max-w-[29rem]' },
    ref
  ) {
    const innerRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => innerRef.current as HTMLDivElement)
    useDialogComposerStackHeight(innerRef)
    const reserveFlowSpace = useIosWebKitDialogActive()

    return (
      <>
        {reserveFlowSpace ? (
          <div
            className="dialog-composer-flow-spacer shrink-0"
            aria-hidden
            style={{ height: 'var(--chat-composer-stack-height, 9rem)' }}
          />
        ) : null}
        <div
          ref={innerRef}
          className={`${CHAT_COMPOSER_STACK_CLASS} ${DIALOG_COMPOSER_DOCK_CLASS} ${className}`.trim()}
          style={style}
        >
          <div className={`dialog-composer-dock-inner mx-auto w-full ${contentMaxWidthClass}`}>
            {children}
          </div>
        </div>
      </>
    )
  }
)

export default DialogComposerStack
