'use client'

import { forwardRef, useImperativeHandle, useRef, type CSSProperties, type ReactNode } from 'react'
import { CHAT_COMPOSER_STACK_CLASS } from '@/lib/chatComposerMetrics'
import { useDialogComposerStackHeight } from '@/hooks/useDialogComposerStackHeight'

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

    return (
      <div
        ref={innerRef}
        className={`${CHAT_COMPOSER_STACK_CLASS} ${DIALOG_COMPOSER_DOCK_CLASS} ${className}`.trim()}
        style={style}
      >
        <div className={`dialog-composer-dock-inner mx-auto w-full ${contentMaxWidthClass}`}>
          {children}
        </div>
      </div>
    )
  }
)

export default DialogComposerStack
