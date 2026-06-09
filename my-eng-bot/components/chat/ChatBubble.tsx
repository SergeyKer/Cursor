'use client'

import type { AnimationEventHandler, CSSProperties, ReactNode } from 'react'

export type BubbleRole = 'assistant' | 'user'
export type BubblePosition = 'solo' | 'first' | 'middle' | 'last'

const ASSISTANT_BUBBLE_RADIUS = 'rounded-[var(--bubble-radius-assistant,var(--bubble-radius))]'
const USER_BUBBLE_RADIUS = 'rounded-[var(--bubble-radius-user,var(--bubble-radius))]'

/** Симметричные углы карточки урока (1–3 полосы); не мессенджерный «хвост». */
export const LESSON_CARD_RADIUS_CLASS = ASSISTANT_BUBBLE_RADIUS

/** Сервисная строка в ленте (проверка ответа и т.п.) — без карточки, с отступом как у пузырей ассистента. */
export const CHAT_FEED_SERVICE_STATUS_ROW_CLASS =
  'mb-2.5 flex justify-start pl-3.5 pr-1 sm:pl-4'

type ChatBubbleFrameProps = {
  role: BubbleRole
  position?: BubblePosition
  children: ReactNode
  className?: string
  rowClassName?: string
  style?: CSSProperties
  onAnimationEnd?: AnimationEventHandler<HTMLDivElement>
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

/**
 * Углы пузыря: три угла — радиус темы (20px в Basic); четвёртый «хвост» — md.
 * На стыке группы левый/правый стык тоже md, как хвост, а не 20px.
 */
export function getChatBubbleRadiusClass(role: BubbleRole, position: BubblePosition): string {
  if (role === 'user') {
    if (position === 'solo') return `${USER_BUBBLE_RADIUS} rounded-br-md`
    if (position === 'first') return `${USER_BUBBLE_RADIUS} rounded-br-md`
    if (position === 'middle') return `${USER_BUBBLE_RADIUS} rounded-tr-md rounded-br-md`
    return `${USER_BUBBLE_RADIUS} rounded-tr-md rounded-br-md`
  }

  if (position === 'solo') return `${ASSISTANT_BUBBLE_RADIUS} rounded-bl-md`
  if (position === 'first') return `${ASSISTANT_BUBBLE_RADIUS} rounded-bl-md`
  if (position === 'middle') return `${ASSISTANT_BUBBLE_RADIUS} rounded-tl-md rounded-bl-md`
  return `${ASSISTANT_BUBBLE_RADIUS} rounded-tl-md rounded-bl-md`
}

export function ChatBubbleFrame({
  role,
  position = 'solo',
  children,
  className = '',
  rowClassName = '',
  style,
  onAnimationEnd,
  'data-role': dataRole,
  'data-message-index': dataMessageIndex,
}: ChatBubbleFrameProps) {
  const radiusClass = getChatBubbleRadiusClass(role, position)
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
        onAnimationEnd={onAnimationEnd}
      >
        {children}
      </div>
    </div>
  )
}
