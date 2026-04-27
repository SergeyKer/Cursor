'use client'

import type { CSSProperties, ReactNode } from 'react'

export type BubbleRole = 'assistant' | 'user'
export type BubblePosition = 'solo' | 'first' | 'middle' | 'last'

type ChatBubbleFrameProps = {
  role: BubbleRole
  position?: BubblePosition
  children: ReactNode
  className?: string
  rowClassName?: string
  style?: CSSProperties
  'data-role'?: string
  'data-message-index'?: number
}

export function getBubblePosition(
  previousRole: string | undefined,
  currentRole: string,
  nextRole: string | undefined
): BubblePosition {
  const sameAsPrev = previousRole === currentRole
  const sameAsNext = nextRole === currentRole
  if (!sameAsPrev && !sameAsNext) return 'solo'
  if (!sameAsPrev && sameAsNext) return 'first'
  if (sameAsPrev && sameAsNext) return 'middle'
  return 'last'
}

function bubbleRadiusClass(role: BubbleRole, position: BubblePosition): string {
  if (role === 'user') {
    if (position === 'solo') return 'rounded-[var(--bubble-radius)] rounded-br-md'
    if (position === 'first') return 'rounded-[var(--bubble-radius)] rounded-br-md'
    if (position === 'middle') return 'rounded-[var(--bubble-radius)] rounded-tr-lg rounded-br-md'
    return 'rounded-[var(--bubble-radius)] rounded-tr-lg rounded-br-md'
  }

  if (position === 'solo') return 'rounded-[var(--bubble-radius)] rounded-bl-md'
  if (position === 'first') return 'rounded-[var(--bubble-radius)] rounded-bl-md'
  if (position === 'middle') return 'rounded-[var(--bubble-radius)] rounded-tl-lg rounded-bl-md'
  return 'rounded-[var(--bubble-radius)] rounded-tl-lg rounded-bl-md'
}

export function ChatBubbleFrame({
  role,
  position = 'solo',
  children,
  className = '',
  rowClassName = '',
  style,
  'data-role': dataRole,
  'data-message-index': dataMessageIndex,
}: ChatBubbleFrameProps) {
  const radiusClass = bubbleRadiusClass(role, position)
  const isUser = role === 'user'
  const rowAlignClass = isUser ? 'justify-end' : 'justify-start'
  const surfaceClass = isUser
    ? 'chat-user-surface border border-[var(--chat-user-bubble-border)] text-[var(--chat-user-text)]'
    : 'chat-assistant-surface glass-surface border border-[var(--chat-assistant-border)] bg-[var(--chat-assistant-shell)] text-[var(--text)]'

  return (
    <div
      data-message-index={dataMessageIndex}
      data-role={dataRole ?? role}
      className={`flex ${rowAlignClass}${rowClassName ? ` ${rowClassName}` : ''}`}
    >
      <div
        className={`relative flex min-w-0 max-w-[90%] flex-col px-3 py-2 text-[15px] leading-[1.45] ${radiusClass} ${surfaceClass}${
          className ? ` ${className}` : ''
        }`}
        style={isUser ? { background: 'var(--chat-user-bubble)', ...style } : style}
      >
        {children}
      </div>
    </div>
  )
}
