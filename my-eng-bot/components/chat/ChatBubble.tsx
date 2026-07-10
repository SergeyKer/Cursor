'use client'

import type { AnimationEventHandler, CSSProperties, ReactNode } from 'react'

export type BubbleRole = 'assistant' | 'user'
export type BubblePosition = 'solo' | 'first' | 'middle' | 'last'

/**
 * Per-corner radii — never combine a single `rounded-[…]` with `rounded-br-md`:
 * Tailwind stylesheet order can wipe the messenger tail on short bubbles.
 * Class strings must stay static for Tailwind JIT content detection.
 */
const USER_BUBBLE_RADIUS_SOLO =
  'rounded-tl-[var(--bubble-radius-user,var(--bubble-radius))] rounded-tr-[var(--bubble-radius-user,var(--bubble-radius))] rounded-bl-[var(--bubble-radius-user,var(--bubble-radius))] rounded-br-md'
const USER_BUBBLE_RADIUS_STACK =
  'rounded-tl-[var(--bubble-radius-user,var(--bubble-radius))] rounded-tr-md rounded-bl-[var(--bubble-radius-user,var(--bubble-radius))] rounded-br-md'
const ASSISTANT_BUBBLE_RADIUS_SOLO =
  'rounded-tl-[var(--bubble-radius-assistant,var(--bubble-radius))] rounded-tr-[var(--bubble-radius-assistant,var(--bubble-radius))] rounded-br-[var(--bubble-radius-assistant,var(--bubble-radius))] rounded-bl-md'
const ASSISTANT_BUBBLE_RADIUS_STACK =
  'rounded-tr-[var(--bubble-radius-assistant,var(--bubble-radius))] rounded-br-[var(--bubble-radius-assistant,var(--bubble-radius))] rounded-tl-md rounded-bl-md'

/** Симметричные углы карточки урока (1–3 полосы); не мессенджерный «хвост». */
export const LESSON_CARD_RADIUS_CLASS =
  'rounded-[var(--bubble-radius-assistant,var(--bubble-radius))]'

/** Сервисная строка в ленте (проверка ответа и т.п.) - без карточки, с отступом как у пузырей ассистента. */
export const CHAT_FEED_SERVICE_STATUS_ROW_CLASS =
  'mb-2.5 flex justify-start pl-3.5 pr-1 sm:pl-4'

/** «Engvo проверяет…»: воздух над композером (все типы шагов, как на fill_choice). */
export const CHAT_FEED_SERVICE_STATUS_ROW_PUZZLE_CHECKING_CLASS =
  'mb-7 flex justify-start pl-3.5 pr-1 sm:pl-4'

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
 * Углы пузыря: три угла - радиус темы; четвёртый «хвост» - md.
 * На стыке группы левый/правый стык тоже md, как хвост.
 */
export function getChatBubbleRadiusClass(role: BubbleRole, position: BubblePosition): string {
  if (role === 'user') {
    if (position === 'solo' || position === 'first') return USER_BUBBLE_RADIUS_SOLO
    return USER_BUBBLE_RADIUS_STACK
  }

  if (position === 'solo' || position === 'first') return ASSISTANT_BUBBLE_RADIUS_SOLO
  return ASSISTANT_BUBBLE_RADIUS_STACK
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
      className={`flex ${rowAlignClass}${isUser ? ' pr-1.5' : ''}${rowClassName ? ` ${rowClassName}` : ''}`}
    >
      <div
        className={`relative flex min-w-0 max-w-[90%] flex-col py-2 text-[15px] leading-[1.45] ${
          isUser ? 'px-3.5' : 'px-3'
        } ${radiusClass} ${surfaceClass}${className ? ` ${className}` : ''}`}
        style={isUser ? { background: 'var(--chat-user-bubble)', ...style } : style}
        onAnimationEnd={onAnimationEnd}
      >
        {children}
      </div>
    </div>
  )
}
